import { useEffect, useState } from 'react'
import {
    Users, FileText, TrendingUp, Calendar, Clock,
    Sun, BarChart2, RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupStats {
    total: number
    mes: number
    semana: number
    hoje: number
}

interface AdminStats {
    usuarios: GroupStats
    pareceres: GroupStats
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
    accent: string         // Tailwind bg class for icon bg
    iconColor: string      // Tailwind text class for icon
    loading: boolean
    suffix?: string
}

function StatCard({ label, value, icon, accent, iconColor, loading, suffix }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
                    <span className={iconColor}>{icon}</span>
                </div>
                <span className="text-slate-500 text-sm leading-tight">{label}</span>
            </div>
            {loading ? (
                <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
            ) : (
                <p className="text-4xl font-bold text-[#1F4E79] leading-none">
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
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#1A4268]/10 flex items-center justify-center text-[#1A4268]">
                    {icon}
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-800">{title}</h2>
                    <p className="text-xs text-slate-400">{subtitle}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(c => (
                    <StatCard
                        key={c.key}
                        label={c.label}
                        value={stats ? stats[c.key] : null}
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

            const [
                uTotal, uMes, uSemana, uHoje,
                pTotal, pMes, pSemana, pHoje,
            ] = await Promise.all([
                countQuery('app_users'),
                countQuery('app_users', som),
                countQuery('app_users', sow),
                countQuery('app_users', sod),
                countQuery('pareceres'),
                countQuery('pareceres', som),
                countQuery('pareceres', sow),
                countQuery('pareceres', sod),
            ])

            setStats({
                usuarios:  { total: uTotal, mes: uMes, semana: uSemana, hoje: uHoje },
                pareceres: { total: pTotal, mes: pMes, semana: pSemana, hoje: pHoje },
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

                    {/* ── Usuários ── */}
                    <StatsSection
                        title="Usuários"
                        subtitle="Contas cadastradas no portal"
                        icon={<Users size={16} />}
                        stats={stats?.usuarios ?? null}
                        loading={loading}
                        cards={usuariosCards}
                    />

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* ── Pareceres ── */}
                    <StatsSection
                        title="Pareceres"
                        subtitle="Documentos gerados por todos os usuários"
                        icon={<FileText size={16} />}
                        stats={stats?.pareceres ?? null}
                        loading={loading}
                        cards={pareceresCards}
                    />

                </div>
            </main>
        </div>
    )
}
