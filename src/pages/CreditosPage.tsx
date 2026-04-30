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
                            Acompanhe o seu consumo da Inteligência Artificial e adicione mais créditos
                        </p>
                    </div>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {/* Saldo Atual */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
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

                    {/* Loja de Créditos - Oculto temporariamente */}
                    {false && (
                    <div className="lg:col-span-3 xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                        <h3 className="font-bold text-[#1F4E79] mb-4 flex items-center gap-2">
                            <ShoppingCart size={18}/> Comprar mais Créditos
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {[
                                { name: 'Starter', credits: 75, docs: '~5 pareceres', price: 197, priceLabel: 'R$ 197', popular: false, isEnterprise: false },
                                { name: 'Profissional', credits: 300, docs: '~20 pareceres', price: 597, priceLabel: 'R$ 597', popular: true, isEnterprise: false },
                                { name: 'Institucional', credits: 1500, docs: '~100 pareceres', price: 1997, priceLabel: 'R$ 1.997', popular: false, isEnterprise: false },
                                { name: 'Enterprise', credits: 'Ilimitado', docs: 'Uso Livre', price: 4997, priceLabel: 'R$ 4.997/mês', popular: false, isEnterprise: true }
                            ].map((plan) => (
                                <div key={plan.name} className={`border rounded-xl p-4 flex flex-col justify-between ${plan.popular ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                                    <div>
                                        {plan.popular && <span className="bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2 inline-block">Mais Popular</span>}
                                        <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                                        <div className="flex items-center gap-1 mt-2 mb-1 text-slate-700 font-semibold"><Coins size={16} className="text-amber-500"/> {plan.credits} {plan.isEnterprise ? '' : 'créditos'}</div>
                                        <p className="text-xs text-slate-500">{plan.docs}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                        <p className="text-2xl font-bold text-[#1F4E79]">{plan.priceLabel}</p>
                                        <button 
                                            onClick={() => {
                                                if (plan.isEnterprise) {
                                                    alert('Entre em contato com nossa equipe comercial para o plano Enterprise.');
                                                } else {
                                                    handleBuyCredits(plan.credits as number, plan.price);
                                                }
                                            }}
                                            disabled={buying !== null}
                                            className={`w-full py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${plan.popular ? 'bg-[#1F4E79] text-white hover:bg-[#153654]' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} ${buying === plan.credits ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {buying === plan.credits ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                            {buying === plan.credits ? 'Gerando...' : (plan.isEnterprise ? 'Vendas' : 'Comprar')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
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
