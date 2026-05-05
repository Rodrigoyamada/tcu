import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoImage from '../assets/logo2.png'

type View = 'login' | 'forgot' | 'forgot_sent'

export default function LoginPage() {
    const { login, forgotPassword } = useAuth()
    const navigate = useNavigate()

    const [view, setView] = useState<View>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [forgotEmail, setForgotEmail] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) { setError('Preencha todos os campos.'); return }
        setLoading(true); setError('')
        try {
            await login(email, password)
            navigate('/dashboard')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao autenticar.')
        } finally {
            setLoading(false)
        }
    }

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!forgotEmail) { setError('Informe o seu e-mail.'); return }
        setLoading(true); setError('')
        try {
            await forgotPassword(forgotEmail)
            setView('forgot_sent')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1F4E79] via-[#2E75B6] to-[#1a6aa8] p-4">
            {/* Background decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-white/3 blur-2xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">

                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center justify-center w-auto h-24 mb-4">
                            <img src={logoImage} alt="TechDocsTCU" className="h-20 w-auto" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1 text-center leading-relaxed">
                            {view === 'login' && 'Inteligência Técnica em Jurisprudência do TCU'}
                            {view === 'forgot' && 'Recuperar acesso à sua conta'}
                            {view === 'forgot_sent' && 'Verifique o seu e-mail'}
                        </p>
                    </div>

                    {/* ── TELA: LOGIN ── */}
                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
                                <input
                                    id="email" type="email" autoComplete="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com" disabled={loading}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all duration-200"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Senha</label>
                                <div className="relative">
                                    <input
                                        id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••" disabled={loading}
                                        className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all duration-200"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

                            <button id="btn-entrar" type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] hover:from-[#1a4368] hover:to-[#2563a0] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : 'Entrar'}
                            </button>
                        </form>
                    )}

                    {/* ── TELA: ESQUECEU A SENHA ── */}
                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} className="space-y-5">
                            <p className="text-sm text-slate-500 text-center -mt-4">
                                Informe o e-mail da sua conta e enviaremos um link para redefinir a sua senha.
                            </p>
                            <div className="space-y-1.5">
                                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700">E-mail</label>
                                <input
                                    id="forgot-email" type="email" autoComplete="email"
                                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                    placeholder="seu@email.com" disabled={loading}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                />
                            </div>

                            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 text-sm">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</> : 'Enviar link de recuperação'}
                            </button>

                            <button type="button" onClick={() => { setView('login'); setError('') }}
                                className="w-full text-sm text-slate-500 hover:text-[#1F4E79] transition-colors font-medium">
                                ← Voltar ao login
                            </button>
                        </form>
                    )}

                    {/* ── TELA: E-MAIL ENVIADO ── */}
                    {view === 'forgot_sent' && (
                        <div className="flex flex-col items-center gap-4 text-center py-2">
                            <div className="bg-emerald-50 rounded-full p-4">
                                <Mail className="text-emerald-500 w-10 h-10" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">E-mail enviado!</p>
                                <p className="text-sm text-slate-500 mt-1">Verifique a caixa de entrada de <strong>{forgotEmail}</strong> e clique no link para redefinir sua senha.</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 w-full text-left">
                                Não recebeu? Verifique o spam ou aguarde alguns minutos.
                            </div>
                            <button type="button" onClick={() => { setView('login'); setError('') }}
                                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">
                                Voltar ao login
                            </button>
                        </div>
                    )}

                    {/* Footer links — visíveis apenas no login */}
                    {view === 'login' && (
                        <div className="mt-6 flex flex-col items-center gap-3">
                            <button type="button" onClick={() => { setView('forgot'); setError('') }}
                                className="text-sm text-[#2E75B6] hover:text-[#1F4E79] hover:underline transition-colors font-medium">
                                Esqueceu a senha?
                            </button>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Não tem conta?</span>
                                <Link to="/cadastro" className="text-[#2E75B6] hover:text-[#1F4E79] hover:underline transition-colors font-semibold">
                                    Cadastre-se
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Badge + Legal links */}
                <div className="text-center mt-6 space-y-2">
                    <p className="text-white/50 text-xs">© 2026 TechDocsTCU · Sistema Protegido</p>
                    <div className="flex items-center justify-center gap-3 text-xs text-white/40">
                        <Link to="/termos-de-uso" className="hover:text-white/70 transition-colors">Termos de Uso</Link>
                        <span>·</span>
                        <Link to="/politica-de-privacidade" className="hover:text-white/70 transition-colors">Privacidade</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
