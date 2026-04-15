import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Notificacao {
    id: string
    titulo: string
    mensagem: string
    url_acao: string | null
    lida: boolean
    criado_em: string
}

const MAX_VISIBLE_ITEMS = 8

export default function NotificacoesPage() {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [deletingAll, setDeletingAll] = useState(false)

    useEffect(() => {
        loadNotificacoes()

        const subscription = supabase
            .channel('notificacoes-page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, () => {
                loadNotificacoes()
            })
            .subscribe()

        return () => { supabase.removeChannel(subscription) }
    }, [])

    const loadNotificacoes = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('notificacoes')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(100)
        if (data) setNotificacoes(data)
        setLoading(false)
    }

    const markAsRead = async (id: string) => {
        await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
        setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    }

    const markAllAsRead = async () => {
        const unreadIds = notificacoes.filter(n => !n.lida).map(n => n.id)
        if (unreadIds.length === 0) return
        await supabase.from('notificacoes').update({ lida: true }).in('id', unreadIds)
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    }

    const deleteNotification = async (id: string) => {
        await supabase.from('notificacoes').delete().eq('id', id)
        setNotificacoes(prev => prev.filter(n => n.id !== id))
    }

    const deleteAllNotifications = async () => {
        if (!window.confirm('Excluir TODAS as notificações permanentemente?')) return
        setDeletingAll(true)
        await supabase.from('notificacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        setNotificacoes([])
        setDeletingAll(false)
    }

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    /** Parseia a mensagem em linhas tipadas */
    const parseLines = (msg: string) => {
        return msg.split('\n').map(line => ({
            raw: line,
            isBullet: line.startsWith('- NOVO ARQUIVO:') || line.startsWith('- ATUALIZADO:'),
            isEmpty: line.trim() === '',
        }))
    }

    const renderMessage = (notificacao: Notificacao) => {
        const lines = parseLines(notificacao.mensagem)
        const bullets = lines.filter(l => l.isBullet)
        const isLong = bullets.length > MAX_VISIBLE_ITEMS
        const isOpen = expanded.has(notificacao.id)

        // Aviso de spam: mensagem com muitos itens (> 50)
        const isSpam = bullets.length > 50

        return (
            <div className="text-sm text-slate-600">
                {isSpam && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                        <AlertTriangle size={13} className="flex-shrink-0" />
                        Esta notificação contém {bullets.length} itens — possivelmente gerada com referência desatualizada.
                    </div>
                )}

                {/* Linhas não-bullet (cabeçalho/texto) */}
                {lines.filter(l => !l.isBullet && !l.isEmpty).map((l, i) => (
                    <p key={i} className="font-medium mb-2">{l.raw}</p>
                ))}

                {/* Lista de bullets com colapso */}
                {bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                        {(isLong && !isOpen ? bullets.slice(0, MAX_VISIBLE_ITEMS) : bullets).map((l, i) => (
                            <li key={i} className="text-slate-500">{l.raw.substring(2)}</li>
                        ))}
                    </ul>
                )}

                {isLong && (
                    <button
                        onClick={() => toggleExpand(notificacao.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                        {isOpen
                            ? <><ChevronUp size={13} /> Recolher</>
                            : <><ChevronDown size={13} /> Ver mais {bullets.length - MAX_VISIBLE_ITEMS} itens</>
                        }
                    </button>
                )}
            </div>
        )
    }

    const unreadCount = notificacoes.filter(n => !n.lida).length

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-[#1A4268]" />
                        Central de Notificações
                        {unreadCount > 0 && (
                            <span className="text-sm font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Histórico de atualizações do robô monitor do TCU
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={markAllAsRead}
                        disabled={loading || unreadCount === 0}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                    >
                        <Check size={15} />
                        Marcar todas como lidas
                    </button>
                    <button
                        onClick={deleteAllNotifications}
                        disabled={deletingAll || notificacoes.length === 0}
                        className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                    >
                        <Trash2 size={15} />
                        {deletingAll ? 'Excluindo...' : 'Excluir todas'}
                    </button>
                    <button
                        onClick={loadNotificacoes}
                        disabled={loading}
                        className="px-4 py-2 bg-[#1A4268] text-white rounded-lg hover:bg-[#133250] transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {loading ? 'Atualizando...' : 'Atualizar'}
                    </button>
                </div>
            </header>

            {/* List */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    {loading && notificacoes.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">Carregando notificações...</div>
                    ) : notificacoes.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-700">Nenhuma notificação</h3>
                            <p className="text-slate-500 mt-1">O histórico do robô aparecerá aqui.</p>
                        </div>
                    ) : (
                        notificacoes.map((notificacao) => (
                            <div
                                key={notificacao.id}
                                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                                    notificacao.lida ? 'border-slate-200' : 'border-blue-300 ring-1 ring-blue-100 shadow-md'
                                }`}
                            >
                                {/* Card Header */}
                                <div className={`px-6 py-4 flex justify-between items-start ${notificacao.lida ? 'bg-slate-50' : 'bg-[#f0f7ff]'}`}>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            {!notificacao.lida && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                                            )}
                                            <h2 className="text-base font-semibold text-slate-800">
                                                {notificacao.titulo}
                                            </h2>
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium ml-[22px]">
                                            {new Date(notificacao.criado_em).toLocaleString('pt-BR', {
                                                day: '2-digit', month: 'long', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        {!notificacao.lida && (
                                            <button
                                                onClick={() => markAsRead(notificacao.id)}
                                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                                            >
                                                <Check size={13} /> Lida
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notificacao.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="px-6 py-4 bg-white">
                                    {renderMessage(notificacao)}
                                    {notificacao.url_acao && (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <a
                                                href={notificacao.url_acao}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                                            >
                                                Ver no TCU
                                                <ExternalLink size={13} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    )
}
