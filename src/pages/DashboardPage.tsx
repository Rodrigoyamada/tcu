import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePlus, FileText, Clock, ChevronRight, LayoutDashboard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Parecer } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [pareceres, setPareceres] = useState<Parecer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        const fetchPareceres = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('pareceres')
                .select('*')
                .eq('user_id', user.email)
                .order('created_at', { ascending: false })

            if (!error && data) setPareceres(data as Parecer[])
            setLoading(false)
        }
        fetchPareceres()
    }, [user])

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
        })
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#1F4E79]">Dashboard</h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Olá, {user?.name?.split(' ')[0]} — bem-vindo ao Acordeon TCU
                        </p>
                    </div>
                    <Link
                        id="btn-novo-parecer-header"
                        to="/dashboard/novo-parecer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow hover:shadow-md transition-all duration-200 hover:from-[#1a4368] hover:to-[#2563a0]"
                    >
                        <FilePlus className="w-4 h-4" />
                        Novo Parecer
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <FileText className="w-4.5 h-4.5 text-[#2E75B6]" size={18} />
                        </div>
                        <span className="text-slate-500 text-sm">Total de Pareceres</span>
                    </div>
                    <p className="text-3xl font-bold text-[#1F4E79]">{pareceres.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                            <Clock className="w-4.5 h-4.5 text-green-600" size={18} />
                        </div>
                        <span className="text-slate-500 text-sm">Com conteúdo IA</span>
                    </div>
                    <p className="text-3xl font-bold text-green-700">
                        {pareceres.filter(p => p.content).length}
                    </p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                            <FilePlus className="w-4.5 h-4.5 text-amber-600" size={18} />
                        </div>
                        <span className="text-slate-500 text-sm">Em andamento</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-700">
                        {pareceres.filter(p => !p.content).length}
                    </p>
                </div>
            </div>

            {/* Pareceres list */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-700 text-sm">Pareceres Recentes</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <div className="w-6 h-6 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Carregando pareceres…</span>
                        </div>
                    </div>
                ) : pareceres.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                            <FileText className="w-7 h-7 text-[#2E75B6]" />
                        </div>
                        <h3 className="font-semibold text-slate-700 mb-1">Nenhum parecer encontrado</h3>
                        <p className="text-slate-400 text-sm mb-5 max-w-xs">
                            Crie seu primeiro parecer e utilize a IA para pesquisar jurisprudência do TCU.
                        </p>
                        <Link
                            to="/dashboard/novo-parecer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F4E79] text-white text-sm font-semibold rounded-xl hover:bg-[#1a4368] transition-colors"
                        >
                            <FilePlus className="w-4 h-4" />
                            Criar Parecer
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {pareceres.map((p) => (
                            <li key={p.id}>
                                <button
                                    onClick={() => navigate(`/dashboard/parecer/${p.id}`)}
                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left group"
                                >
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                            <FileText className="w-4.5 h-4.5 text-[#2E75B6]" size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">{p.title}</p>
                                            {p.description && (
                                                <p className="text-slate-400 text-xs mt-0.5 truncate">{p.description}</p>
                                            )}
                                            <p className="text-slate-300 text-xs mt-1">{formatDate(p.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                        {p.content ? (
                                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                Processado
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                                                Pendente
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
