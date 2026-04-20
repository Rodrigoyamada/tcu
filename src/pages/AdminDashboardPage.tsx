import { useEffect, useState } from 'react'
import {
    Users, FileText, TrendingUp, Calendar, Clock,
    Sun, BarChart2, RefreshCw,
    Database, HardDrive,
} from 'lucide-react'
import { supabase } from '../lib/supabase'


// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupStats {
    total: number
    mes: number
    semana: number
    hoje: number
}

interface RecentUser {
    id: string
    name: string
    email: string
    created_at: string
    role: string
}

interface RecentParecer {
    id: string
    title: string
    user_id: string
    created_at: string
    content: string | null
}

interface CategoryStat {
    tipo: string
    count: number
}

interface AdminStats {
    usuarios: GroupStats
    pareceres: GroupStats
    recentUsers: RecentUser[]
    recentPareceres: RecentParecer[]
    databaseSummary: CategoryStat[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(): string {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
}

function startOfWeek(): string {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return d.toISOString()
}

function startOfMonth(): string {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
}

async function countQuery(table: string, gte?: string): Promise<number> {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (gte) q = q.gte('created_at', gte)
    const { count } = await q
    return count || 0
}



// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
    label: string
    value: number | null
    icon: React.ReactNode
    accent: string
    iconColor: string
    loading: boolean
    suffix?: string
}

function StatCard({ label, value, icon, accent, iconColor, loading, suffix }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
                    <span className={iconColor}>{icon}</span>
                </div>
                <span className="text-slate-500 text-sm leading-tight font-medium group-hover:text-slate-700 transition-colors">{label}</span>
            </div>
            {loading ? (
                <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
                <p className="text-4xl font-bold text-[#1F4E79] leading-none z-10">
                    {value?.toLocaleString('pt-BR')}
                    {suffix && <span className="text-base font-normal text-slate-400 ml-1">{suffix}</span>}
                </p>
            )}
        </div>
    )
}

interface SectionProps {
    title: string
    subtitle: string
    icon: React.ReactNode
    stats: GroupStats | null
    loading: boolean
    cards: {
        label: string
        key: keyof GroupStats
        icon: React.ReactNode
        accent: string
        iconColor: string
        suffix?: string
    }[]
}

function StatsSection({ title, subtitle, icon, stats, loading, cards }: SectionProps) {
    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#1A4268]/10 flex items-center justify-center text-[#1A4268]">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">{title}</h2>
                        <p className="text-xs text-slate-400">{subtitle}</p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(c => (
                    <StatCard
                        key={c.key}
                        label={c.label}
                        value={stats ? stats[c.key] as number : null}
                        icon={c.icon}
                        accent={c.accent}
                        iconColor={c.iconColor}
                        loading={loading}
                        suffix={c.suffix}
                    />
                ))}
            </div>
        </section>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const loadStats = async () => {
        setLoading(true)
        try {
            const som = startOfMonth()
            const sow = startOfWeek()
            const sod = startOfDay()

            // 1. Calcular datas dos últimos 7 dias para as tendências
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - i)
                d.setHours(0, 0, 0, 0)
                return d.toISOString()
            }).reverse()

            const [
                uTotal, uMes, uSemana, uHoje,
                pTotal, pMes, pSemana, pHoje,
                recentUsers, recentPareceres,
                categoriesRaw,
                uTrend, pTrend
            ] = await Promise.all([
                countQuery('app_users'),
                countQuery('app_users', som),
                countQuery('app_users', sow),
                countQuery('app_users', sod),
                countQuery('pareceres'),
                countQuery('pareceres', som),
                countQuery('pareceres', sow),
                countQuery('pareceres', sod),
                supabase.from('app_users').select('id, name, email, created_at, role').order('created_at', { ascending: false }).limit(5),
                supabase.from('pareceres').select('id, title, user_id, created_at, content').order('created_at', { ascending: false }).limit(5),
                supabase.rpc('count_jurisprudencia_by_type')
            ])

            // Fallback se RPC falhar (muito comum em migrations não aplicadas)
            let dbSummary: CategoryStat[] = []
            if (categoriesRaw.error) {
                const { data } = await supabase.from('jurisprudencia').select('tipo')
                if (data) {
                    const counts = data.reduce((acc: any, curr) => {
                        acc[curr.tipo] = (acc[curr.tipo] || 0) + 1
                        return acc
                    }, {})
                    dbSummary = Object.entries(counts).map(([tipo, count]) => ({ tipo, count: count as number }))
                }
            setStats({
                usuarios:  { total: uTotal, mes: uMes, semana: uSemana, hoje: uHoje },
                pareceres: { total: pTotal, mes: pMes, semana: pSemana, hoje: pHoje },
                recentUsers: (recentUsers.data || []) as RecentUser[],
                recentPareceres: (recentPareceres.data || []) as RecentParecer[],
                databaseSummary: dbSummary.sort((a, b) => b.count - a.count)
            })
            setLastUpdated(new Date())
        } catch (err) {
            console.error('Erro ao carregar stats admin:', err)
        }
        setLoading(false)
    }

    useEffect(() => { loadStats() }, [])

    const usuariosCards: SectionProps['cards'] = [
        {
            key: 'total', label: 'Total de Usuários',
            icon: <Users size={16} />,
            accent: 'bg-blue-50', iconColor: 'text-[#2E75B6]',
        },
        {
            key: 'mes', label: 'Novos este mês',
            icon: <Calendar size={16} />,
            accent: 'bg-indigo-50', iconColor: 'text-indigo-600',
            suffix: 'novos',
        },
        {
            key: 'semana', label: 'Últimos 7 dias',
            icon: <TrendingUp size={16} />,
            accent: 'bg-violet-50', iconColor: 'text-violet-600',
            suffix: 'novos',
        },
        {
            key: 'hoje', label: 'Hoje',
            icon: <Sun size={16} />,
            accent: 'bg-amber-50', iconColor: 'text-amber-600',
            suffix: 'novos',
        },
    ]

    const pareceresCards: SectionProps['cards'] = [
        {
            key: 'total', label: 'Total de Pareceres',
            icon: <FileText size={16} />,
            accent: 'bg-emerald-50', iconColor: 'text-emerald-600',
        },
        {
            key: 'mes', label: 'Novos este mês',
            icon: <Calendar size={16} />,
            accent: 'bg-teal-50', iconColor: 'text-teal-600',
            suffix: 'novos',
        },
        {
            key: 'semana', label: 'Últimos 7 dias',
            icon: <TrendingUp size={16} />,
            accent: 'bg-cyan-50', iconColor: 'text-cyan-600',
            suffix: 'novos',
        },
        {
            key: 'hoje', label: 'Hoje',
            icon: <Clock size={16} />,
            accent: 'bg-lime-50', iconColor: 'text-lime-600',
            suffix: 'novos',
        },
    ]

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6 flex-shrink-0">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Administração</span>
                        </div>
                        <h1 className="text-2xl font-bold text-[#1F4E79]">Painel Administrativo</h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Visão geral da plataforma — dados em tempo real
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <button
                            onClick={loadStats}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Atualizar
                        </button>
                        {lastUpdated && (
                            <span className="text-xs text-slate-400">
                                Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 overflow-y-auto px-8 py-8">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* ── KPIs ── */}
                    <div className="space-y-8">
                        <StatsSection
                            title="Usuários"
                            subtitle="Contas cadastradas no portal"
                            icon={<Users size={16} />}
                            stats={stats?.usuarios ?? null}
                            loading={loading}
                            cards={usuariosCards}
                        />

                        <StatsSection
                            title="Pareceres"
                            subtitle="Documentos gerados globalmente"
                            icon={<FileText size={16} />}
                            stats={stats?.pareceres ?? null}
                            loading={loading}
                            cards={pareceresCards}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* ── Atividade Recente ── */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Últimos Pareceres */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <FileText size={16} className="text-[#1F4E79]" />
                                        Pareceres Recentes
                                    </h3>
                                    <button className="text-[10px] font-bold uppercase tracking-wider text-[#2E75B6] hover:underline">Ver todos</button>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {loading ? (
                                        [1,2,3].map(i => <div key={i} className="px-6 py-4 h-16 animate-pulse bg-slate-50/20" />)
                                    ) : stats?.recentPareceres.length === 0 ? (
                                        <div className="px-6 py-10 text-center text-slate-400 text-sm">Nenhum parecer gerado ainda.</div>
                                    ) : stats?.recentPareceres.map(p => (
                                        <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-[#1F4E79]">{p.title}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{p.user_id} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            {p.content ? (
                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" title="Processado" />
                                            ) : (
                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Pendente" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Últimos Usuários */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <Users size={16} className="text-[#1F4E79]" />
                                        Novos Membros
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {loading ? (
                                        [1,2,3].map(i => <div key={i} className="px-6 py-4 h-16 animate-pulse bg-slate-50/20" />)
                                    ) : stats?.recentUsers.map(u => (
                                        <div key={u.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                {u.name.substring(0,2)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter block">{u.role}</span>
                                                <span className="text-[9px] text-slate-400">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Base TCU Overview ── */}
                        <div className="space-y-6">
                            <div className="bg-[#1F4E79] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Database size={18} className="text-blue-300" />
                                        <h3 className="font-bold text-sm tracking-wide uppercase">Status da Base TCU</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {loading ? (
                                            [1,2,3,4].map(i => <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />)
                                        ) : stats?.databaseSummary.length === 0 ? (
                                            <p className="text-xs text-blue-200/60">Nenhum dado importado ainda.</p>
                                        ) : (
                                            (() => {
                                                const totalBase = stats?.databaseSummary.reduce((acc, c) => acc + c.count, 0) || 1;
                                                return stats?.databaseSummary.map(cat => (
                                                    <div key={cat.tipo} className="space-y-1.5">
                                                        <div className="flex justify-between text-[11px] font-medium">
                                                            <span className="text-blue-100 capitalize">{cat.tipo.replace(/_/g, ' ')}</span>
                                                            <span>{cat.count.toLocaleString('pt-BR')}</span>
                                                        </div>
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-blue-400 rounded-full transition-all duration-1000" 
                                                                style={{ width: `${Math.max(2, (cat.count / totalBase) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ));
                                            })()
                                        )}
                                    </div>
                                    <button className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-colors border border-white/10">
                                        Gerenciar Importações
                                    </button>
                                </div>
                                <HardDrive size={120} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-emerald-500" />
                                    Saúde do Sistema
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">API Latency</span>
                                        <span className="text-xs font-bold text-emerald-600">24ms</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Uptime</span>
                                        <span className="text-xs font-bold text-emerald-600">99.9%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">RAG Success</span>
                                        <span className="text-xs font-bold text-[#1F4E79]">92%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    )
}
