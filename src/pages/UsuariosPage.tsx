import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ShieldAlert, ShieldCheck, Trash2, Users, Loader2, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AppUser {
    id: string
    email: string
    name: string
    role: 'admin' | 'user'
    created_at: string
}

export default function UsuariosPage() {
    const { user: currentUser } = useAuth()
    const navigate = useNavigate()
    const [users, setUsers] = useState<AppUser[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Confirmações
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setUsers(data as AppUser[])
        }
        setLoading(false)
    }

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    )

    const toggleRole = async (id: string, currentRole: 'admin' | 'user') => {
        setProcessingId(id)
        const newRole = currentRole === 'admin' ? 'user' : 'admin'

        const { error } = await supabase
            .from('app_users')
            .update({ role: newRole })
            .eq('id', id)

        if (!error) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
        }
        setProcessingId(null)
    }

    const handleDelete = async (id: string) => {
        setProcessingId(id)
        const { error } = await supabase.from('app_users').delete().eq('id', id)

        if (!error) {
            setUsers(prev => prev.filter(u => u.id !== id))
        }
        setProcessingId(null)
        setConfirmDeleteId(null)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric'
        })
    }

    // O admin hardcoded não existe na tabela app_users, então não cai na lista. 
    // Se estivesse, protegeríamos contra auto-exclusão:
    const isHardcodedAdmin = (email: string) => email.toLowerCase() === 'rodrigo.yamada@gmail.com'

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Gerenciar Usuários
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    {users.length} usuário(s) cadastrado(s) no portal.
                </p>
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] transition-all"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Usuário</th>
                                <th className="px-6 py-4 font-medium">Permissão</th>
                                <th className="px-6 py-4 font-medium">Data de Cadastro</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2E75B6]" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/dashboard/usuarios/${u.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{u.name}</span>
                                                <span className="text-xs text-slate-500">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.role === 'admin' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1F4E79] border border-blue-100">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    User
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatDate(u.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {isHardcodedAdmin(u.email) ? (
                                                <span className="text-xs text-slate-400 italic">Conta Sistema</span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Toggle Role Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleRole(u.id, u.role);
                                                        }}
                                                        disabled={processingId === u.id || currentUser?.email.toLowerCase() === u.email.toLowerCase()}
                                                        title={u.role === 'admin' ? 'Rebaixar para Usuário' : 'Promover a Admin'}
                                                        className={`p-1.5 rounded-lg transition-colors ${u.role === 'admin'
                                                            ? 'text-[#2E75B6] hover:bg-blue-50'
                                                            : 'text-slate-400 hover:text-[#2E75B6] hover:bg-blue-50'
                                                            }`}
                                                    >
                                                        {processingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                                            u.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                                    </button>

                                                    {/* Delete Button */}
                                                    {confirmDeleteId === u.id ? (
                                                        <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100" onClick={(e) => e.stopPropagation()}>
                                                            <span className="text-xs text-red-600 font-medium mr-1">Excluir?</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(u.id);
                                                                }}
                                                                disabled={processingId === u.id}
                                                                className="p-1 rounded text-red-600 hover:bg-red-100 transition-colors"
                                                            >
                                                                {processingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteId(null);
                                                                }}
                                                                className="p-1 rounded text-slate-500 hover:bg-slate-200 transition-colors"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteId(u.id);
                                                            }}
                                                            disabled={processingId === u.id || currentUser?.email.toLowerCase() === u.email.toLowerCase()}
                                                            title="Excluir conta"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
