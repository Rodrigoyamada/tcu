import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import logoImage from '../assets/logo2.png'

const criterios = [
    { label: 'Mínimo 8 caracteres',  test: (s: string) => s.length >= 8 },
    { label: 'Uma letra maiúscula',   test: (s: string) => /[A-Z]/.test(s) },
    { label: 'Um número',             test: (s: string) => /[0-9]/.test(s) },
    { label: 'Um caractere especial', test: (s: string) => /[^A-Za-z0-9]/.test(s) },
]

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [validSession, setValidSession] = useState(false)
    const [checking, setChecking] = useState(true)

    const senhaOk = criterios.every(c => c.test(password))

    useEffect(() => {
        // O Supabase redireciona com tokens na URL — ele mesmo cuida da sessão
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setValidSession(true)
            setChecking(false)
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!senhaOk) { setError('A senha não atende aos critérios de segurança.'); return }
        if (password !== confirm) { setError('As senhas não coincidem.'); return }

        setLoading(true)
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password })
            if (updateError) throw new Error('Erro ao atualizar a senha. O link pode ter expirado.')
            setSuccess(true)
            setTimeout(() => navigate('/'), 3000)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro inesperado.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1F4E79] via-[#2E75B6] to-[#1a6aa8] p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center justify-center w-auto h-24 mb-4">
                            <img src={logoImage} alt="TechDocsTCU" className="h-20 w-auto" />
                        </div>
                        <p className="text-sm text-slate-500 mt-1 text-center">Redefinição de senha</p>
                    </div>

                    {checking ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <Loader2 className="w-8 h-8 text-[#2E75B6] animate-spin" />
                            <p className="text-slate-500 text-sm">Verificando link...</p>
                        </div>
                    ) : !validSession ? (
                        <div className="flex flex-col items-center gap-4 text-center py-4">
                            <div className="bg-red-50 rounded-full p-4">
                                <KeyRound className="text-red-400 w-10 h-10" />
                            </div>
                            <p className="font-bold text-slate-800">Link inválido ou expirado</p>
                            <p className="text-sm text-slate-500">Solicite um novo link de recuperação de senha na tela de login.</p>
                            <Link to="/" className="w-full py-3 rounded-xl bg-[#1F4E79] text-white font-semibold text-sm text-center hover:bg-[#153654] transition-colors">
                                Ir para o Login
                            </Link>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center gap-4 text-center py-4">
                            <div className="bg-emerald-50 rounded-full p-4">
                                <CheckCircle2 className="text-emerald-500 w-12 h-12" />
                            </div>
                            <p className="font-bold text-xl text-slate-800">Senha atualizada!</p>
                            <p className="text-sm text-slate-500">Redirecionando para o login em instantes...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-sm text-slate-500 text-center -mt-4">Escolha uma nova senha segura para a sua conta.</p>

                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">Nova senha</label>
                                <div className="relative">
                                    <input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Crie uma senha segura"
                                        className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                        disabled={loading}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {password.length > 0 && (
                                    <div className="mt-2 space-y-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                                        {criterios.map(c => {
                                            const ok = c.test(password)
                                            return (
                                                <div key={c.label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                    {c.label}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar nova senha</label>
                                <input
                                    id="confirm-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    placeholder="Repita a senha"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                    disabled={loading}
                                />
                            </div>

                            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

                            <button type="submit" disabled={loading || !senhaOk}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Atualizando...</> : 'Redefinir senha'}
                            </button>
                        </form>
                    )}
                </div>
                <p className="text-center text-white/50 text-xs mt-6">© 2026 TechDocsTCU · Sistema Protegido</p>
            </div>
        </div>
    )
}
