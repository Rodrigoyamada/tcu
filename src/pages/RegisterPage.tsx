import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!name.trim() || !email || !password || !confirm) {
            setError('Preencha todos os campos.')
            return
        }
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            return
        }
        if (password !== confirm) {
            setError('As senhas não coincidem.')
            return
        }

        setLoading(true)
        try {
            await register(email, name, password)
            setSuccess(true)
            setTimeout(() => navigate('/'), 2500)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao criar conta.')
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
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center justify-center w-auto h-24 mb-4">
                            <img src="/src/assets/logo.png" alt="TechDocsTCU" className="h-20 w-auto" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#1F4E79] tracking-tight">TechDocsTCU</h1>
                        <p className="text-sm text-slate-500 mt-1 text-center font-medium">Crie sua conta para começar</p>
                    </div>

                    {success ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                            <p className="font-semibold text-slate-800">Conta criada com sucesso!</p>
                            <p className="text-sm text-slate-500">Redirecionando para o login…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Nome */}
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome completo</label>
                                <input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="João Silva"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                    disabled={loading}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                    disabled={loading}
                                />
                            </div>

                            {/* Senha */}
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Senha</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirmar Senha */}
                            <div className="space-y-1.5">
                                <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">Confirmar senha</label>
                                <input
                                    id="confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="Repita a senha"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all"
                                    disabled={loading}
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                id="btn-cadastrar"
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] hover:from-[#1a4368] hover:to-[#2563a0] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta…</> : 'Criar conta'}
                            </button>
                        </form>
                    )}

                    {/* Back to login */}
                    {!success && (
                        <p className="mt-6 text-center text-sm text-slate-500">
                            Já tem conta?{' '}
                            <Link to="/" className="text-[#2E75B6] hover:text-[#1F4E79] hover:underline font-semibold">
                                Entrar
                            </Link>
                        </p>
                    )}
                </div>

                <p className="text-center text-white/50 text-xs mt-6">
                    © 2026 Tribunal de Contas da União · Sistema Protegido
                </p>
            </div>
        </div>
    )
}
