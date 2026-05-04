import { useEffect, useState, useCallback, useRef } from 'react'
import {
    Coins, History, CreditCard, AlertCircle, ShoppingCart,
    Loader2, Zap, Copy, CheckCheck, X, QrCode, Clock,
    CheckCircle2, ArrowLeft
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface LedgerEntry { id: string; amount: number; description: string; created_at: string }

type Step = 'method' | 'loading' | 'pix' | 'card_form' | 'card_loading' | 'polling' | 'result' | 'timeout'

interface PixResult { encodedImage: string; payload: string; expirationDate: string; paymentId: string }
interface CardResult { status: string; paymentId: string }

interface SelectedPlan { name: string; credits: number; price: number }

const CONFIRMED_STATUSES = ['CONFIRMED', 'RECEIVED']
const POLL_INTERVAL_MS = 4000
const POLL_MAX_ATTEMPTS = 30 // 30 × 4s = 2 minutos

export default function CreditosPage() {
    const { user, updateProfile } = useAuth()
    const [history, setHistory] = useState<LedgerEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null)
    const [step, setStep] = useState<Step>('method')
    const [pixResult, setPixResult] = useState<PixResult | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const pollCountRef = useRef(0)
    const [cardResult, setCardResult] = useState<CardResult | null>(null)
    const [copied, setCopied] = useState(false)
    const [apiError, setApiError] = useState('')
    const [cardForm, setCardForm] = useState({
        holderName: '', number: '', expiryMonth: '', expiryYear: '',
        ccv: '', cpfCnpj: '', postalCode: '', addressNumber: '', phone: '',
    })

    const fetchLedger = useCallback(async () => {
        if (!user?.id) return
        setLoading(true)
        const { data: userDb } = await supabase.from('app_users').select('credits_balance').eq('id', user.id).single()
        if (userDb) updateProfile({ credits_balance: userDb.credits_balance })
        const { data } = await supabase.from('token_ledger').select('id, amount, description, created_at')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        if (data) setHistory(data)
        setLoading(false)
    }, [user?.id, updateProfile])

    useEffect(() => { fetchLedger() }, [fetchLedger])

    const openCheckout = (plan: SelectedPlan) => {
        setSelectedPlan(plan)
        setStep('method')
        setPixResult(null)
        setCardResult(null)
        setApiError('')
        setCardForm({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '', cpfCnpj: '', postalCode: '', addressNumber: '', phone: '' })
    }

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        pollCountRef.current = 0
    }, [])

    const closeModal = () => { stopPolling(); setSelectedPlan(null); fetchLedger() }

    // Limpa polling ao desmontar
    useEffect(() => () => stopPolling(), [stopPolling])

    const startPolling = useCallback((paymentId: string, credits: number, changeStepTo?: Step) => {
        pollCountRef.current = 0
        if (changeStepTo) {
            setStep(changeStepTo)
        }

        pollRef.current = setInterval(async () => {
            pollCountRef.current += 1

            if (pollCountRef.current > POLL_MAX_ATTEMPTS) {
                stopPolling()
                setStep('timeout')
                return
            }

            try {
                const res = await fetch(`/api/checkout-status?paymentId=${paymentId}`)
                const data = await res.json()

                if (CONFIRMED_STATUSES.includes(data.status)) {
                    stopPolling()
                    setCardResult({ status: data.status, paymentId })
                    setStep('result')
                    // Dá 3 segundos para o N8n/Supabase processarem o Webhook
                    setTimeout(() => fetchLedger(), 3000)
                }
                // outros status (PENDING, AWAITING_RISK_ANALYSIS) → continua polling
            } catch {
                // erro de rede, tenta novamente na próxima iteração
            }
        }, POLL_INTERVAL_MS)
    }, [stopPolling, fetchLedger])

    const handleSelectPix = async () => {
        if (!selectedPlan || !user) return
        setStep('loading')
        setApiError('')
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id, user_email: user.email,
                    user_name: (user as any).user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário',
                    amount: selectedPlan.price, credits: selectedPlan.credits, paymentMethod: 'PIX',
                }),
            })
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Erro do servidor (${res.status}): ${txt.slice(0, 50)}`)
            }
            const data = await res.json()
            if (!data.success) { setApiError(data.error ?? 'Erro ao gerar PIX.'); setStep('method'); return }
            setPixResult(data)
            setStep('pix')
            // Inicia o polling para verificar se o PIX foi pago
            startPolling(data.paymentId, selectedPlan.credits)
        } catch (error: any) { 
            console.error("Erro no checkout:", error);
            setApiError('Falha: ' + (error.message || 'Erro de conexão. Verifique se o servidor local está rodando.')); 
            setStep('method') 
        }
    }

    const handlePayCard = async () => {
        if (!selectedPlan || !user) return
        setStep('card_loading')
        setApiError('')
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id, user_email: user.email,
                    user_name: (user as any).user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário',
                    amount: selectedPlan.price, credits: selectedPlan.credits, paymentMethod: 'CREDIT_CARD',
                    creditCard: { holderName: cardForm.holderName, number: cardForm.number, expiryMonth: cardForm.expiryMonth, expiryYear: cardForm.expiryYear, ccv: cardForm.ccv },
                    creditCardHolderInfo: { name: cardForm.holderName, cpfCnpj: cardForm.cpfCnpj, postalCode: cardForm.postalCode, addressNumber: cardForm.addressNumber, phone: cardForm.phone },
                }),
            })
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`Erro do servidor (${res.status}): ${txt.slice(0, 50)}`)
            }
            const data = await res.json()
            if (!data.success) { setApiError(data.error ?? 'Erro ao processar cartão.'); setStep('card_form'); return }
            setCardResult(data)
            // Se já veio confirmado (raro, mas possível)
            if (CONFIRMED_STATUSES.includes(data.status)) {
                setStep('result')
                setTimeout(() => fetchLedger(), 3000)
            } else {
                // Inicia polling para aguardar confirmação
                startPolling(data.paymentId, selectedPlan.credits, 'polling')
            }
        } catch (error: any) { 
            console.error("Erro no cartão:", error);
            setApiError('Falha: ' + (error.message || 'Erro de conexão com servidor.')); 
            setStep('card_form') 
        }
    }

    const handleCopy = () => {
        if (!pixResult) return
        navigator.clipboard.writeText(pixResult.payload)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    const plans = [
        { name: 'Starter', credits: 75, docs: '~5 pareceres', price: 197, priceLabel: '---', popular: false },
        { name: 'Profissional', credits: 300, docs: '~20 pareceres', price: 597, priceLabel: '---', popular: true },
        { name: 'Institucional', credits: 1500, docs: '~100 pareceres', price: 1997, priceLabel: '---', popular: false },
        { name: 'Enterprise', credits: 0, docs: 'Uso Livre', price: 4997, priceLabel: '---', popular: false },
    ]

    return (
        <div className="flex-1 overflow-auto bg-[#F0F4F8] p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#1F4E79] flex items-center gap-3">
                        <Coins className="text-amber-500 w-8 h-8" /> Meus Créditos
                    </h1>
                    <p className="text-slate-500 mt-2">Acompanhe o seu consumo e adicione mais créditos</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {/* Saldo */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-blue-200">
                            <CreditCard size={16} />
                            <span className="font-semibold tracking-wide uppercase text-[10px]">Seu Saldo Restante</span>
                        </div>
                        <div className="mt-8 mb-4">
                            <p className="text-2xl font-bold tracking-tight truncate">{user?.credits_balance?.toLocaleString('pt-BR') || 0}</p>
                            <p className="text-blue-100 text-[10px] mt-2 opacity-80 truncate">créditos disponíveis</p>
                        </div>
                    </div>

                    {/* Loja — página limpa, sem formulários */}
                    <div className="lg:col-span-3 xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-[#1F4E79] mb-4 flex items-center gap-2">
                            <ShoppingCart size={18} /> Comprar mais Créditos
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {plans.map((plan) => (
                                <div key={plan.name} className={`border rounded-xl p-4 flex flex-col justify-between ${plan.popular ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 hover:border-blue-300'}`}>
                                    <div>
                                        {plan.popular && <span className="bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2 inline-block">Mais Popular</span>}
                                        <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                                        <div className="flex items-center gap-1 mt-2 mb-1 text-slate-700 font-semibold">
                                            <Coins size={16} className="text-amber-500" />
                                            {plan.credits === 0 ? 'Ilimitado' : `${plan.credits} créditos`}
                                        </div>
                                        <p className="text-xs text-slate-500">{plan.docs}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                                        <p className="text-2xl font-bold text-[#1F4E79]">{plan.priceLabel}</p>
                                        <button
                                            onClick={() => plan.credits === 0 ? alert('Entre em contato com nossa equipe.') : openCheckout(plan)}
                                            className={`w-full py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${plan.popular ? 'bg-[#1F4E79] text-white hover:bg-[#153654]' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                        >
                                            <Zap size={16} />
                                            {plan.credits === 0 ? 'Falar com Vendas' : 'Comprar'}
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
                        <div className="p-10 flex flex-col items-center text-slate-400 gap-3">
                            <AlertCircle className="w-8 h-8 text-slate-300" /><p>Nenhuma transação registrada ainda.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {history.map((entry) => (
                                <div key={entry.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
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

            {/* ─── MODAL WIZARD ─── */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] p-5 text-white relative flex items-center gap-3">
                            {(step === 'card_form') && (
                                <button onClick={() => setStep('method')} className="text-blue-200 hover:text-white transition-colors"><ArrowLeft size={18} /></button>
                            )}
                            <div>
                                <p className="font-bold">Plano {selectedPlan.name}</p>
                                <p className="text-blue-200 text-xs">{selectedPlan.credits} créditos</p>
                            </div>
                            <button onClick={closeModal} className="absolute top-4 right-4 text-blue-200 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* PASSO 1 — Escolher método */}
                        {step === 'method' && (
                            <div className="p-6 flex flex-col gap-4">
                                <p className="text-center font-semibold text-slate-700 text-sm">Como deseja pagar?</p>
                                {apiError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{apiError}</p>}
                                <button onClick={handleSelectPix} className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-2xl hover:border-[#1F4E79] hover:bg-blue-50 transition-all group">
                                    <div className="bg-[#1F4E79] group-hover:bg-[#153654] text-white rounded-xl p-3 transition-colors"><QrCode size={24} /></div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">PIX</p>
                                        <p className="text-xs text-slate-500">Aprovação instantânea</p>
                                    </div>
                                    <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-full">Recomendado</span>
                                </button>
                                <button onClick={() => setStep('card_form')} className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-2xl hover:border-[#1F4E79] hover:bg-blue-50 transition-all group">
                                    <div className="bg-slate-700 group-hover:bg-slate-900 text-white rounded-xl p-3 transition-colors"><CreditCard size={24} /></div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">Cartão de Crédito</p>
                                        <p className="text-xs text-slate-500">Débito imediato no cartão</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* PASSO 2a — Carregando PIX */}
                        {step === 'loading' && (
                            <div className="p-10 flex flex-col items-center gap-4">
                                <Loader2 className="w-12 h-12 text-[#1F4E79] animate-spin" />
                                <p className="text-slate-600 font-semibold">Gerando QR Code PIX...</p>
                            </div>
                        )}

                        {/* PASSO 2b — QR Code PIX */}
                        {step === 'pix' && pixResult && (
                            <div className="p-6 flex flex-col items-center gap-4">
                                <div className="border-4 border-[#1F4E79]/10 rounded-2xl p-2">
                                    <img src={`data:image/png;base64,${pixResult.encodedImage}`} alt="QR Code PIX" className="w-48 h-48 object-contain" />
                                </div>
                                <p className="text-slate-500 text-sm text-center">Escaneie ou copie o código abaixo</p>
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                                    <p className="text-xs text-slate-500 font-mono flex-1 truncate">{pixResult.payload}</p>
                                    <button onClick={handleCopy} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-[#1F4E79] text-white hover:bg-[#153654]'}`}>
                                        {copied ? <><CheckCheck size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                                    </button>
                                </div>
                                {pixResult.expirationDate && (
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs w-full justify-center">
                                        <Clock size={14} /><span>Válido até: {new Date(pixResult.expirationDate).toLocaleString('pt-BR')}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mt-2 bg-blue-50/50 px-4 py-3 rounded-xl w-full justify-center">
                                    <Loader2 className="w-4 h-4 text-[#1F4E79] animate-spin" />
                                    <p className="text-slate-600 text-xs font-semibold">Aguardando pagamento do PIX...</p>
                                </div>
                            </div>
                        )}

                        {/* PASSO 2c — Formulário do Cartão */}
                        {step === 'card_form' && (
                            <div className="p-6 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                                <p className="text-sm font-semibold text-slate-600">Dados do cartão</p>
                                {apiError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{apiError}</p>}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Nome no cartão</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="NOME SOBRENOME" value={cardForm.holderName} onChange={e => setCardForm(f => ({ ...f, holderName: e.target.value.toUpperCase() }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Número do cartão</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400" placeholder="0000 0000 0000 0000" maxLength={19} value={cardForm.number} onChange={e => setCardForm(f => ({ ...f, number: e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19) }))} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Mês</label>
                                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="MM" maxLength={2} value={cardForm.expiryMonth} onChange={e => setCardForm(f => ({ ...f, expiryMonth: e.target.value.replace(/\D/g, '') }))} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Ano</label>
                                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="AAAA" maxLength={4} value={cardForm.expiryYear} onChange={e => setCardForm(f => ({ ...f, expiryYear: e.target.value.replace(/\D/g, '') }))} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">CVV</label>
                                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400" placeholder="123" maxLength={4} value={cardForm.ccv} onChange={e => setCardForm(f => ({ ...f, ccv: e.target.value.replace(/\D/g, '') }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">CPF/CNPJ do titular</label>
                                        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="00000000000" value={cardForm.cpfCnpj} onChange={e => setCardForm(f => ({ ...f, cpfCnpj: e.target.value.replace(/\D/g, '').slice(0, 14) }))} />
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
                                </div>
                                <button onClick={handlePayCard} className="w-full mt-2 py-3 bg-[#1F4E79] text-white rounded-xl font-bold hover:bg-[#153654] transition-colors flex items-center justify-center gap-2">
                                    <CreditCard size={16} /> Pagar agora
                                </button>
                            </div>
                        )}

                        {/* PASSO 2d — Processando cartão */}
                        {step === 'card_loading' && (
                            <div className="p-10 flex flex-col items-center gap-4">
                                <Loader2 className="w-12 h-12 text-[#1F4E79] animate-spin" />
                                <p className="text-slate-600 font-semibold">Processando pagamento...</p>
                            </div>
                        )}

                        {/* PASSO 2e — Polling: aguardando confirmação */}
                        {step === 'polling' && (
                            <div className="p-10 flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-[#1F4E79] animate-spin" />
                                    <CreditCard className="absolute inset-0 m-auto text-[#1F4E79] w-7 h-7" />
                                </div>
                                <p className="text-slate-700 font-bold text-lg">Aguardando confirmação</p>
                                <p className="text-slate-500 text-sm text-center">Seu pagamento está em análise antifraude.<br/>Avisaremos assim que for aprovado!</p>
                                <div className="flex gap-1 mt-2">
                                    {[0,1,2].map(i => (
                                        <div key={i} className="w-2 h-2 bg-[#1F4E79] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PASSO 3 — Aprovado */}
                        {step === 'result' && cardResult && (
                            <div className="p-6 flex flex-col items-center gap-4">
                                <div className="bg-emerald-50 rounded-full p-4"><CheckCircle2 className="text-emerald-500 w-16 h-16" /></div>
                                <p className="font-bold text-xl text-slate-800">Pagamento Aprovado!</p>
                                <p className="text-slate-500 text-sm text-center">Seus <strong>{selectedPlan?.credits} créditos</strong> foram adicionados à sua conta.</p>
                                <button onClick={closeModal} className="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white font-semibold hover:bg-[#153654] transition-colors">Fechar</button>
                            </div>
                        )}

                        {/* PASSO 3b — Timeout */}
                        {step === 'timeout' && (
                            <div className="p-6 flex flex-col items-center gap-4">
                                <div className="bg-amber-50 rounded-full p-4"><Clock className="text-amber-500 w-16 h-16" /></div>
                                <p className="font-bold text-xl text-slate-800">Pagamento Recebido</p>
                                <p className="text-slate-500 text-sm text-center">A análise está demorando mais que o normal. Seus créditos serão liberados automaticamente assim que confirmado pelo banco.</p>
                                <button onClick={closeModal} className="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white font-semibold hover:bg-[#153654] transition-colors">Entendido</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
