import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function NovoParecerPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setError('O título é obrigatório.')
            return
        }
        setLoading(true)
        setError('')

        const { data, error: dbError } = await supabase
            .from('pareceres')
            .insert({
                user_id: user?.email,
                title: title.trim(),
                description: description.trim() || null,
            })
            .select()
            .single()

        if (dbError || !data) {
            setError('Erro ao salvar o parecer. Tente novamente.')
            setLoading(false)
            return
        }

        navigate(`/dashboard/parecer/${data.id}`)
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-5">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-[#1F4E79] text-sm transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar ao Dashboard
                </button>
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1F4E79, #2E75B6)' }}>
                    <FilePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-[#1F4E79]">Novo Parecer</h1>
                    <p className="text-slate-400 text-xs">Preencha as informações para criar um novo parecer</p>
                </div>
            </div>

            {/* Form card */}
            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                    <label htmlFor="parecer-title" className="block text-sm font-medium text-slate-700">
                        Título <span className="text-red-400">*</span>
                    </label>
                    <input
                        id="parecer-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Dispensa de licitação para serviços de TI"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                        disabled={loading}
                    />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <label htmlFor="parecer-description" className="block text-sm font-medium text-slate-700">
                            Breve Descrição
                        </label>
                        <span className={`text-[10px] font-medium ${description.length >= 300 ? 'text-red-500' : 'text-slate-400'}`}>
                            {description.length}/300
                        </span>
                    </div>
                    <textarea
                        id="parecer-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={300}
                        placeholder="Resumo do assunto ou contexto do parecer…"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all resize-none"
                        disabled={loading}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        id="btn-salvar-parecer"
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow hover:shadow-md transition-all duration-200 hover:from-[#1a4368] hover:to-[#2563a0] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                        ) : (
                            <><FilePlus className="w-4 h-4" /> Salvar Parecer</>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-5 py-3 text-slate-500 text-sm font-medium hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
