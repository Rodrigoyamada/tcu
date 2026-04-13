import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, ChevronRight, FilePlus, Clock, Search, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Parecer } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function MeusPareceres() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [pareceres, setPareceres] = useState<Parecer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Estado de apagar
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Estado de editar
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!user) return
        const fetch = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('pareceres')
                .select('id, title, description, content, created_at')
                .eq('user_id', user.email)
                .order('created_at', { ascending: false })
            if (!error && data) setPareceres(data as Parecer[])
            setLoading(false)
        }
        fetch()
    }, [user])

    const filtered = pareceres.filter(
        (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(search.toLowerCase())
    )

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric',
        })

    // ── Apagar ────────────────────────────────────────────────────────────────

    const handleDelete = async (id: string) => {
        setDeleting(true)
        const { error } = await supabase.from('pareceres').delete().eq('id', id)
        if (!error) {
            setPareceres((prev) => prev.filter((p) => p.id !== id))
        }
        setDeleting(false)
        setConfirmDeleteId(null)
    }

    // ── Editar ────────────────────────────────────────────────────────────────

    const startEdit = (p: Parecer, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingId(p.id)
        setEditTitle(p.title)
        setEditDesc(p.description || '')
        setConfirmDeleteId(null)
    }

    const cancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingId(null)
    }

    const saveEdit = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!editTitle.trim()) return
        setSaving(true)
        const { error } = await supabase
            .from('pareceres')
            .update({ title: editTitle.trim(), description: editDesc.trim() })
            .eq('id', id)
        if (!error) {
            setPareceres((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, title: editTitle.trim(), description: editDesc.trim() } : p
                )
            )
        }
        setSaving(false)
        setEditingId(null)
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Meus Pareceres</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{pareceres.length} parecer(es) encontrado(s)</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/novo-parecer')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl hover:from-[#1a4368] hover:to-[#2563a0] transition-all shadow"
                >
                    <FilePlus className="w-4 h-4" /> Novo Parecer
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar parecer por título ou descrição…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                />
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="w-6 h-6 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <FileText className="w-10 h-10 mb-3 text-slate-300" />
                        <p className="text-sm">{search ? 'Nenhum resultado encontrado.' : 'Nenhum parecer criado ainda.'}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {filtered.map((p) => (
                            <li key={p.id} className="group">
                                {editingId === p.id ? (
                                    /* ── Modo edição ─────────────────────────────── */
                                    <div
                                        className="px-6 py-4 bg-blue-50 border-l-4 border-[#2E75B6]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            autoFocus
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            placeholder="Título"
                                            className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                                        />
                                        <input
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            placeholder="Descrição (opcional)"
                                            className="w-full text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => saveEdit(p.id, e)}
                                                disabled={saving || !editTitle.trim()}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F4E79] text-white text-xs font-semibold rounded-lg hover:bg-[#1a4368] disabled:opacity-50 transition-colors"
                                            >
                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                Salvar
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                <X className="w-3 h-3" /> Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Modo normal ─────────────────────────────── */
                                    <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                                        {/* Área clicável → navegar */}
                                        <button
                                            onClick={() => navigate(`/dashboard/parecer/${p.id}`)}
                                            className="flex items-start gap-4 min-w-0 flex-1 text-left"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                                <FileText className="text-[#2E75B6]" size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{p.title}</p>
                                                {p.description && (
                                                    <p className="text-slate-400 text-xs mt-0.5 truncate">{p.description}</p>
                                                )}
                                                <div className="flex items-center gap-1.5 mt-1 text-slate-300 text-xs">
                                                    <Clock size={11} />
                                                    {formatDate(p.created_at)}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Ações direita */}
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                            {p.content ? (
                                                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Processado</span>
                                            ) : (
                                                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                                            )}

                                            {/* Botão Editar */}
                                            <button
                                                onClick={(e) => startEdit(p, e)}
                                                title="Editar título e descrição"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#2E75B6] hover:bg-blue-50 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                            {/* Botão Apagar / Confirmação */}
                                            {confirmDeleteId === p.id ? (
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <span className="text-xs text-red-600 font-medium whitespace-nowrap">Apagar?</span>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        disabled={deleting}
                                                        className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                                                        className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); setEditingId(null) }}
                                                    title="Apagar parecer"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
