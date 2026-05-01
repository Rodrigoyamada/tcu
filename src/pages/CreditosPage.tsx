import { useEffect, useState, useCallback } from 'react'
import {
    Coins, History, CreditCard, AlertCircle, ShoppingCart,
    Loader2, Zap, Copy, CheckCheck, X, QrCode, Clock,
    CreditCard as CardIcon, CheckCircle2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface LedgerEntry {
    id: string
    amount: number
    description: string
    created_at: string
}

interface PixData {
    paymentMethod: 'PIX'
    encodedImage: string
    payload: string
    expirationDate: string
    paymentId: string
    planName: string
    planCredits: number
    planPrice: number
}

interface CardResult {
    paymentMethod: 'CREDIT_CARD'
    status: string
    paymentId: string
    planName: string
    planCredits: number
    planPrice: number
}

type CheckoutResult = PixData | CardResult | null

export default function CreditosPage() {
    const { user, updateProfile } = useAuth()
    const [history, setHistory] = useState<LedgerEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [buying, setBuying] = useState<number | null>(null)
    const [checkoutResult, setCheckoutResult] = useState<CheckoutResult>(null)
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
    const [cardError, setCardError] = useState('')

    // Formulário do cartão
    const [cardForm, setCardForm] = useState({
        holderName: '',
        number: '',
        expiryMonth: '',
        expiryYear: '',
        ccv: '',
        cpfCnpj: '',
        postalCode: '',
        addressNumber: '',
        phone: '',
    })

    const fetchLedger = useCallback(async () => {
        if (!user?.id) return
        setLoading(true)
        const { data: userDb } = await supabase
            .from('app_users')
            .select('credits_balance')
            .eq('id', user.id)
            .single()
        if (userDb) updateProfile({ credits_balance: userDb.credits_balance })
        const { data } = await supabase
            .from('token_ledger')
            .select('id, amount, description, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)
        if (data) setHistory(data)
        setLoading(false)
    }, [user?.id, updateProfile])

    useEffect(() => { fetchLedger() }, [fetchLedger])

    const handleBuyCredits = async (credits: number, price: number, planName: string) => {
        if (!user) return
        setBuying(credits)
        setCardError('')
        try {
            const body: Record<string, unknown> = {
                user_id: user.id,
                user_email: user.email,
                user_name: (user as any).user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário',
                amount: price,
                credits,
                paymentMethod: activeTab,
            }

            if (activeTab === 'CREDIT_CARD') {
                body.creditCard = {
                    holderName: cardForm.holderName,
                    number: cardForm.number,
                    expiryMonth: cardForm.expiryMonth,
                    expiryYear: cardForm.expiryYear,
                    ccv: cardForm.ccv,
                }
                body.creditCardHolderInfo = {
                    name: cardForm.holderName,
                    cpfCnpj: cardForm.cpfCnpj,
                    postalCode: cardForm.postalCode,
                    addressNumber: cardForm.addressNumber,
                    phone: cardForm.phone,
                }
            }

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (!data.success) {
                setCardError(data.error ?? 'Erro ao processar pagamento. Tente novamente.')
                return
            }

            if (data.paymentMethod === 'PIX') {
                setCheckoutResult({ ...data, planName, planCredits: credits, planPrice: price })
            } else {
                setCheckoutResult({ ...data, planName, planCredits: credits, planPrice: price })
            }
        } catch (err) {
            console.error(err)
            setCardError('Erro de conexão com o servidor de pagamentos.')
        } finally {
            setBuying(null)
        }
    }

    const handleCopyPix = () => {
        if (!checkoutResult || checkoutResult.paymentMethod !== 'PIX') return
        navigator.clipboard.writeText(checkoutResult.payload)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    const handleCloseModal = () => {
        setCheckoutResult(null)
        setCopied(false)
        fetchLedger()
    }

    const formatCard = (v: string) => v.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19)
    const formatCPF = (v: string) => v.replace(/\D/g, '').slice(0, 14)

    const plans = [
        { name: 'Starter', credits: 75, docs: '~5 pareceres', price: 197, priceLabel: '---', popular: false, isEnterprise: false },
        { name: 'Profissional', credits: 300, docs: '~20 pareceres', price: 597, priceLabel: '---', popular: true, isEnterprise: false },
        { name: 'Institucional', credits: 1500, docs: '~100 pareceres', price: 1997, priceLabel: '---', popular: false, isEnterprise: false },
        { name: 'Enterprise', credits: 0, docs: 'Uso Livre', price: 4997, priceLabel: '---', popular: false, isEnterprise: true },
    ]

    return (
        <div className="flex-1 overflow-auto bg-[#F0F4F8] p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1F4E79] flex items-center gap-3">
                            <Coins className="text-amber-500 w-8 h-8" /> Meus Créditos
                        </h1>
                        <p className="text-slate-500 mt-2">Acompanhe o seu consumo e adicione mais créditos</p>
                    </div>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {/* Saldo */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-blue-200">
                            <CreditCard size={16} />
                            <span className="font-semibold tracking-wide uppercase text-[10px]">Seu Saldo Restante</span>
                        </div>
                        <div className="mt-8 mb-4">
                            <p className="text-2xl font-bold tracking-tight truncate">
                                {user?.credits_balance?.toLocaleString('pt-BR') || 0}
                            </p>
                            <p className="text-blue-100 text-[10px] mt-2 opacity-80 truncate">créditos disponíveis</p>
                        </div>
                    </div>

                    {/* Loja */}
                    <div className="lg:col-span-3 xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                        <h3 className="font-bold text-[#1F4E79] mb-4 flex items-center gap-2">
                            <ShoppingCart size={18} /> Comprar mais Créditos
                        </h3>

                        {/* Tabs de método de pagamento */}
                        <div className="flex gap-2 mb-5">
                            <button
                                onClick={() => setActiveTab('PIX')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${activeTab === 'PIX' ? 'bg-[#1F4E79] text-white border-[#1F4E79]' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                            >
                                <QrCode size={15} /> PIX
                            </button>
                            <button
                                onClick={() => setActiveTab('CREDIT_CARD')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${activeTab === 'CREDIT_CARD' ? 'bg-[#1F4E79] text-white border-[#1F4E79]' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                            >
                                <CardIcon size={15} /> Cartão de Crédito
                            </button>
                        </div>

                        {/* Formulário de cartão */}
                        {activeTab === 'CREDIT_CARD' && (
                            <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Nome no cartão</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="JOAO SILVA" value={cardForm.holderName} onChange={e => setCardForm(f => ({ ...f, holderName: e.target.value.toUpperCase() }))} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Número do cartão</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 font-mono" placeholder="0000 0000 0000 0000" value={cardForm.number} onChange={e => setCardForm(f => ({ ...f, number: formatCard(e.target.value) }))} maxLength={19} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Validade</label>
                                    <div className="flex gap-2">
                                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="MM" maxLength={2} value={cardForm.expiryMonth} onChange={e => setCardForm(f => ({ ...f, expiryMonth: e.target.value.replace(/\D/g, '') }))} />
                                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="AAAA" maxLength={4} value={cardForm.expiryYear} onChange={e => setCardForm(f => ({ ...f, expiryYear: e.target.value.replace(/\D/g, '') }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">CVV</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 font-mono" placeholder="123" maxLength={4} value={cardForm.ccv} onChange={e => setCardForm(f => ({ ...f, ccv: e.target.value.replace(/\D/g, '') }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">CPF/CNPJ do titular</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="00000000000" value={cardForm.cpfCnpj} onChange={e => setCardForm(f => ({ ...f, cpfCnpj: formatCPF(e.target.value) }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">CEP</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="00000000" maxLength={8} value={cardForm.postalCode} onChange={e => setCardForm(f => ({ ...f, postalCode: e.target.value.replace(/\D/g, '') }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Nº do endereço</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="123" value={cardForm.addressNumber} onChange={e => setCardForm(f => ({ ...f, addressNumber: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Telefone</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="62999999999" value={cardForm.phone} onChange={e => setCardForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} />
                                </div>
                                {cardError && <div className="sm:col-span-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{cardError}</div>}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {plans.map((plan) => (
                                <div key={plan.name} className={`border rounded-xl p-4 flex flex-col justify-between ${plan.popular ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                                    <div>
                                        {plan.popular && <span className="bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2 inline-block">Mais Popular</span>}
                                        <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                                        <div className="flex items-center gap-1 mt-2 mb-1 text-slate-700 font-semibold"><Coins size={16} className="text-amber-500" /> {plan.isEnterprise ? 'Ilimitado' : `${plan.credits} créditos`}</div>
                                        <p className="text-xs text-slate-500">{plan.docs}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                        <p className="text-2xl font-bold text-[#1F4E79]">{plan.priceLabel}</p>
                                        <button
                                            onClick={() => {
                                                if (plan.isEnterprise) { alert('Entre em contato com nossa equipe comercial.') }
                                                else { handleBuyCredits(plan.credits, plan.price, plan.name) }
                                            }}
                                            disabled={buying !== null}
                                            className={`w-full py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${plan.popular ? 'bg-[#1F4E79] text-white hover:bg-[#153654]' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} ${buying === plan.credits ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {buying === plan.credits ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                            {buying === plan.credits ? 'Processando...' : (plan.isEnterprise ? 'Vendas' : 'Comprar')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Histórico */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <History className="text-[#1F4E79] w-5 h-5" />
                        <h2 className="font-bold text-[#1F4E79]">Extrato de Consumo</h2>
                    </div>
                    {loading ? (
                        <div className="p-10 flex justify-center"><div className="w-8 h-8 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>
                    ) : history.length === 0 ? (
                        <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <AlertCircle className="w-8 h-8 text-slate-300" />
                            <p>Nenhuma transação registrada ainda.</p>
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

            {/* ─── Modal de Checkout ──────────────────────────────────────── */}
            {checkoutResult && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] p-6 text-white relative">
                            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-blue-200 hover:text-white transition-colors"><X size={20} /></button>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 rounded-xl p-2">
                                    {checkoutResult.paymentMethod === 'PIX' ? <QrCode size={22} /> : <CardIcon size={22} />}
                                </div>
                                <div>
                                    <p className="font-bold text-lg">
                                        {checkoutResult.paymentMethod === 'PIX' ? 'Pagamento via PIX' : 'Pagamento via Cartão'}
                                    </p>
                                    <p className="text-blue-200 text-sm">Plano {checkoutResult.planName} · {checkoutResult.planCredits} créditos</p>
                                </div>
                            </div>
                        </div>

                        {/* Corpo — PIX */}
                        {checkoutResult.paymentMethod === 'PIX' && (
                            <div className="p-6 flex flex-col items-center gap-5">
                                <div className="border-4 border-[#1F4E79]/10 rounded-2xl p-2 bg-white shadow-inner">
                                    <img src={`data:image/png;base64,${checkoutResult.encodedImage}`} alt="QR Code PIX" className="w-52 h-52 object-contain" />
                                </div>
                                <p className="text-slate-500 text-sm text-center">Escaneie o QR Code ou copie o código abaixo</p>
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                                    <p className="text-xs text-slate-500 font-mono flex-1 truncate">{checkoutResult.payload}</p>
                                    <button onClick={handleCopyPix} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-[#1F4E79] text-white hover:bg-[#153654]'}`}>
                                        {copied ? <><CheckCheck size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                                    </button>
                                </div>
                                {checkoutResult.expirationDate && (
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs w-full justify-center">
                                        <Clock size={14} />
                                        <span>Válido até: {new Date(checkoutResult.expirationDate).toLocaleString('pt-BR')}</span>
                                    </div>
                                )}
                                <p className="text-slate-400 text-xs text-center">Após confirmação, seus créditos serão adicionados automaticamente.</p>
                            </div>
                        )}

                        {/* Corpo — Cartão */}
                        {checkoutResult.paymentMethod === 'CREDIT_CARD' && (
                            <div className="p-6 flex flex-col items-center gap-5">
                                {checkoutResult.status === 'CONFIRMED' || checkoutResult.status === 'RECEIVED' ? (
                                    <>
                                        <div className="bg-emerald-50 rounded-full p-4">
                                            <CheckCircle2 className="text-emerald-500 w-16 h-16" />
                                        </div>
                                        <p className="font-bold text-xl text-slate-800">Pagamento Aprovado!</p>
                                        <p className="text-slate-500 text-sm text-center">Seus <strong>{checkoutResult.planCredits} créditos</strong> já foram adicionados à sua conta.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-amber-50 rounded-full p-4">
                                            <Clock className="text-amber-500 w-16 h-16" />
                                        </div>
                                        <p className="font-bold text-xl text-slate-800">Pagamento em Análise</p>
                                        <p className="text-slate-500 text-sm text-center">Seu pagamento está sendo processado. Os créditos serão liberados em breve.</p>
                                        <p className="text-xs text-slate-400">Status: <span className="font-mono">{checkoutResult.status}</span></p>
                                    </>
                                )}
                                <button onClick={handleCloseModal} className="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white font-semibold hover:bg-[#153654] transition-colors">Fechar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
