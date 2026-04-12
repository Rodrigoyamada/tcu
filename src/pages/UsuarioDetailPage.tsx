import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, User, Mail, Phone, CreditCard, CalendarDays,
    ShieldCheck, FileText, Clock, ChevronRight, Loader2, ShieldAlert
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AppUser {
    id: string
    email: string
    name: string
    role: 'admin' | 'user'
    created_at: string
    cpf?: string
    telefone?: string
}

interface Parecer {
    id: string
    title: string
    description?: string
    created_at: string
    content?: string
}

export default function UsuarioDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [usuario, setUsuario] = useState<AppUser | null>(null)
    const [pareceres, setPareceres] = useState<Parecer[]>([])
    const [loadingUser, setLoadingUser] = useState(true)
    const [loadingPareceres, setLoadingPareceres] = useState(true)

    useEffect(() => {
        if (!id) return

        // Busca dados do usuário
        const fetchUser = async () => {
            setLoadingUser(true)
            const { data } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', id)
                .single()
            if (data) setUsuario(data as AppUser)
            setLoadingUser(false)
        }

        fetchUser()
    }, [id])

    useEffect(() => {
        if (!usuario?.email) return

        // Busca pareceres do usuário pelo e-mail
        const fetchPareceres = async () => {
            setLoadingPareceres(true)
            const { data } = await supabase
                .from('pareceres')
                .select('id, title, description, created_at, content')
                .eq('user_id', usuario.email)
                .order('created_at', { ascending: false })
            if (data) setPareceres(data as Parecer[])
            setLoadingPareceres(false)
        }

        fetchPareceres()
    }, [usuario?.email])

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric'
        })

    if (loadingUser) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-[#2E75B6]" />
            </div>
        )
    }

    if (!usuario) {
        return (
            <div className="p-6 text-center text-slate-400">
                <User className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p>Usuário não encontrado.</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">

            {/* Voltar */}
            <button
                onClick={() => navigate('/dashboard/usuarios')}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#1F4E79] mb-6 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Voltar para Gerenciar Usuários
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* ── Card de Perfil ── */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">

                        <div className="flex flex-col items-center text-center mb-6 pt-2">
                            <h1 className="text-base font-bold text-[#1F4E79] leading-tight mb-1">{usuario.name}</h1>
                            <span className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                usuario.role === 'admin'
                                    ? 'bg-blue-50 text-[#1F4E79] border border-blue-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                                {usuario.role === 'admin'
                                    ? <><ShieldCheck className="w-3.5 h-3.5" /> Admin</>
                                    : <><ShieldAlert className="w-3.5 h-3.5" /> Usuário</>
                                }
                            </span>
                        </div>

                        {/* Dados Cadastrais */}
                        <div className="space-y-3">
                            {[
                                { icon: Mail, label: 'E-mail', value: usuario.email },
                                { icon: CreditCard, label: 'CPF', value: usuario.cpf || '—' },
                                { icon: Phone, label: 'Telefone', value: usuario.telefone || '—' },
                                { icon: CalendarDays, label: 'Cadastro', value: formatDate(usuario.created_at) },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
                                        <p className="text-sm text-slate-700 break-all">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* ── Lista de Pareceres ── */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#2E75B6]" />
                                Pareceres de {usuario.name.split(' ')[0]} {!loadingPareceres && <span className="text-slate-400 font-normal">({pareceres.length})</span>}
                            </h2>
                        </div>

                        {loadingPareceres ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-5 h-5 animate-spin text-[#2E75B6]" />
                            </div>
                        ) : pareceres.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                                <FileText className="w-9 h-9 mb-3 text-slate-300" />
                                <p className="text-sm">Nenhum parecer criado ainda.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {pareceres.map(p => (
                                    <li key={p.id}>
                                        <button
                                            onClick={() => navigate(`/dashboard/parecer/${p.id}`)}
                                            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left group"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                                <FileText className="text-[#2E75B6]" size={17} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{p.title}</p>
                                                {p.description && (
                                                    <p className="text-slate-400 text-xs mt-0.5 truncate">{p.description}</p>
                                                )}
                                                <div className="flex items-center gap-1.5 mt-1 text-slate-300 text-xs">
                                                    <Clock size={10} />
                                                    {formatDate(p.created_at)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {p.content
                                                    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Processado</span>
                                                    : <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                                                }
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
