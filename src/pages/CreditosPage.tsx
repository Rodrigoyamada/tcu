import { useEffect, useState } from 'react'
import { Coins, History, CreditCard, AlertCircle, ShoppingCart, Loader2, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface LedgerEntry {
    id: string
    amount: number
    description: string
    created_at: string
}

export default function CreditosPage() {
    const { user, updateProfile } = useAuth()
    const [history, setHistory] = useState<LedgerEntry[]>([])
    const [loading, setLoading] = useState(true)

    // Sincroniza saldo e pega histórico
    useEffect(() => {
        const fetchLedger = async () => {
            if (!user?.id) return
            setLoading(true)

            // 1. Sempre renova o cache visual pegando do banco
            const { data: userDb } = await supabase
                .from('app_users')
                .select('credits_balance')
                .eq('id', user.id)
                .single()

            if (userDb) {
                updateProfile({ credits_balance: userDb.credits_balance })
            }

            // 2. Busca histórico
            const { data } = await supabase
                .from('token_ledger')
                .select('id, amount, description, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (data) setHistory(data)
            
            setLoading(false)
        }

        fetchLedger()
    }, [user?.id, updateProfile])

    const [buying, setBuying] = useState<number | null>(null)

    const handleBuyCredits = async (amount: number, price: number) => {
        if (!user) return
        setBuying(amount)
        try {
            const response = await fetch('https://n8n.srv1291896.hstgr.cloud/webhook/criar-cobranca-asaas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    user_email: user.email,
                    user_name: (user as any).full_name ?? (user as any).user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário TechDocsTCU',
                    amount: price,
                    credits: amount
                })
            })
            
            const data = await response.json()
            if (data.invoiceUrl) {
                window.open(data.invoiceUrl, '_blank')
            } else {
                alert('Erro ao gerar cobrança. Tente novamente.')
            }
        } catch (error) {
            console.error('Erro na compra:', error)
            alert('Erro de conexão com o servidor de pagamentos.')
        } finally {
            setBuying(null)
        }
    }

    return (
        <div className="flex-1 overflow-auto bg-[#F0F4F8] p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header Profile */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1F4E79] flex items-center gap-3">
                            <Coins className="text-amber-500 w-8 h-8" />
                            Meus Créditos
                        </h1>
                        <p className="text-slate-500 mt-2">
                            Acompanhe o seu consumo da Inteligência Artificial e adicione mais fichas
                        </p>
                    </div>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Saldo Atual */}
                    <div className="bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-blue-200">
                            <CreditCard size={18} />
                            <span className="font-semibold tracking-wide uppercase text-xs">Seu Saldo Restante</span>
                        </div>
                        <div className="mt-8 mb-4">
                            <p className="text-5xl font-bold tracking-tight">
                                {user?.credits_balance?.toLocaleString('pt-BR') || 0}
                            </p>
                            <p className="text-blue-100 text-sm mt-2 opacity-80">créditos disponíveis</p>
                        </div>
                    </div>

                    {/* Loja de Créditos */}
                    <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                            <ShoppingCart className="text-[#1F4E79] w-5 h-5" />
                            <h3 className="font-bold text-[#1F4E79]">Comprar mais Fichas</h3>
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="text-slate-600 border-b border-slate-200">
                                        <th className="pb-3 px-4 font-semibold">Pacote</th>
                                        <th className="pb-3 px-4 font-semibold">Créditos</th>
                                        <th className="pb-3 px-4 font-semibold">Pareceres equivalentes</th>
                                        <th className="pb-3 px-4 font-semibold">Preço</th>
                                        <th className="pb-3 px-4 font-semibold">Por crédito</th>
                                        <th className="pb-3 px-4 font-semibold"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        { name: 'Starter', credits: 75, docs: '~5 pareceres', price: 197, priceLabel: 'R$ 197', pricePerCredit: 'R$ 2,63', isEnterprise: false },
                                        { name: 'Profissional', credits: 300, docs: '~20 pareceres', price: 597, priceLabel: 'R$ 597', pricePerCredit: 'R$ 1,99', isEnterprise: false },
                                        { name: 'Institucional', credits: 1500, docs: '~100 pareceres', price: 1997, priceLabel: 'R$ 1.997', pricePerCredit: 'R$ 1,33', isEnterprise: false },
                                        { name: 'Enterprise', credits: 'Ilimitado/mês', docs: '—', price: 4997, priceLabel: 'R$ 4.997/mês', pricePerCredit: '—', isEnterprise: true }
                                    ].map((plan) => (
                                        <tr key={plan.name} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-4 font-medium text-slate-800">{plan.name}</td>
                                            <td className="py-4 px-4 text-slate-600">{typeof plan.credits === 'number' ? `${plan.credits} créditos` : plan.credits}</td>
                                            <td className="py-4 px-4 text-slate-600">{plan.docs}</td>
                                            <td className="py-4 px-4 text-slate-800 font-semibold">{plan.priceLabel}</td>
                                            <td className="py-4 px-4 text-slate-600">{plan.pricePerCredit}</td>
                                            <td className="py-4 px-4">
                                                <button 
                                                    onClick={() => {
                                                        if (plan.isEnterprise) {
                                                            alert('Entre em contato com nossa equipe comercial para o plano Enterprise.');
                                                        } else {
                                                            handleBuyCredits(plan.credits as number, plan.price);
                                                        }
                                                    }}
                                                    disabled={buying !== null}
                                                    className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center justify-center transition-colors ${plan.name === 'Profissional' ? 'bg-[#1F4E79] text-white hover:bg-[#153654]' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} ${buying === plan.credits ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                >
                                                    {buying === plan.credits ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                                                    {buying === plan.credits ? 'Gerando...' : (plan.isEnterprise ? 'Falar com Vendas' : 'Comprar')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Histórico Ledger */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <History className="text-[#1F4E79] w-5 h-5" />
                        <h2 className="font-bold text-[#1F4E79]">Extrato de Consumo</h2>
                    </div>
                    
                    {loading ? (
                        <div className="p-10 flex justify-center text-slate-400"><div className="w-8 h-8 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>
                    ) : history.length === 0 ? (
                        <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <AlertCircle className="w-8 h-8 text-slate-300" />
                            <p>Nenhuma transação financeira registrada ainda.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {history.map((entry) => (
                                <div key={entry.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-semibold text-slate-700">{entry.description}</p>
                                        <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className={`font-mono font-bold text-lg ${entry.amount > 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
                                        {entry.amount > 0 ? '+' : ''}{entry.amount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
