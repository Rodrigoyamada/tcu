import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle2, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoImage from '../assets/logo.png'

// ── Máscaras ──────────────────────────────────────────────────
function maskCPF(v: string) {
    return v.replace(/\D/g, '')
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskTelefone(v: string) {
    return v.replace(/\D/g, '')
        .slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

// ── Critérios de força da senha ────────────────────────────────
const criterios = [
    { label: 'Mínimo 8 caracteres',       test: (s: string) => s.length >= 8 },
    { label: 'Uma letra maiúscula',        test: (s: string) => /[A-Z]/.test(s) },
    { label: 'Um número',                  test: (s: string) => /[0-9]/.test(s) },
    { label: 'Um caractere especial',      test: (s: string) => /[^A-Za-z0-9]/.test(s) },
]

export default function RegisterPage() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [name, setName]           = useState('')
    const [cpf, setCpf]             = useState('')
    const [email, setEmail]         = useState('')
    const [telefone, setTelefone]   = useState('')
    const [password, setPassword]   = useState('')
    const [confirm, setConfirm]     = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState('')
    const [success, setSuccess]     = useState(false)

    const senhaOk = criterios.every(c => c.test(password))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!name.trim() || !cpf || !email || !telefone || !password || !confirm) {
            setError('Preencha todos os campos.')
            return
        }
        if (cpf.replace(/\D/g, '').length !== 11) {
            setError('CPF inválido. Digite os 11 dígitos.')
            return
        }
        if (!senhaOk) {
            setError('A senha não atende aos critérios de segurança.')
            return
        }
        if (password !== confirm) {
            setError('As senhas não coincidem.')
            return
        }

        setLoading(true)
        try {
            await register(email, name, password, cpf, telefone)
            setSuccess(true)
            setTimeout(() => navigate('/'), 2500)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao criar conta.')
        } finally {
            setLoading(false)
        }
    }

    const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1F4E79] via-[#2E75B6] to-[#1a6aa8] p-4">
            {/* Background decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center justify-center w-auto h-24 mb-2">
                            <img src={logoImage} alt="TechDocsTCU" className="h-20 w-auto" />
                        </div>
                        <p className="text-sm text-slate-500 text-center font-medium">Crie sua conta para começar</p>
                    </div>

                    {success ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                            <p className="font-semibold text-slate-800">Conta criada com sucesso!</p>
                            <p className="text-sm text-slate-500">Redirecionando para o login…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">

                            {/* Label width fixo para alinhar todos os campos */}
                            {/* Nome Completo */}
                            <div className="flex items-center gap-3">
                                <label htmlFor="name" className="w-28 flex-shrink-0 text-sm font-medium text-slate-700 text-right">Nome completo</label>
                                <input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="João da Silva"
                                    className={inputClass}
                                    disabled={loading}
                                />
                            </div>

                            {/* CPF */}
                            <div className="flex items-center gap-3">
                                <label htmlFor="cpf" className="w-28 flex-shrink-0 text-sm font-medium text-slate-700 text-right">CPF</label>
                                <input
                                    id="cpf"
                                    type="text"
                                    inputMode="numeric"
                                    value={cpf}
                                    onChange={e => setCpf(maskCPF(e.target.value))}
                                    placeholder="000.000.000-00"
                                    className={inputClass}
                                    disabled={loading}
                                />
                            </div>

                            {/* E-mail */}
                            <div className="flex items-center gap-3">
                                <label htmlFor="email" className="w-28 flex-shrink-0 text-sm font-medium text-slate-700 text-right">E-mail</label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className={inputClass}
                                    disabled={loading}
                                />
                            </div>

                            {/* Telefone */}
                            <div className="flex items-center gap-3">
                                <label htmlFor="telefone" className="w-28 flex-shrink-0 text-sm font-medium text-slate-700 text-right">Telefone</label>
                                <input
                                    id="telefone"
                                    type="tel"
                                    inputMode="numeric"
                                    value={telefone}
                                    onChange={e => setTelefone(maskTelefone(e.target.value))}
                                    placeholder="(00) 00000-0000"
                                    className={inputClass}
                                    disabled={loading}
                                />
                            </div>

                            {/* Senha */}
                            <div className="flex items-start gap-3">
                                <label htmlFor="password" className="w-28 flex-shrink-0 text-sm font-medium text-slate-700 text-right pt-3">Senha</label>
                                <div className="flex-1">
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Crie uma senha segura"
                                            className={inputClass + ' pr-12'}
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

                                    {/* Indicador de força */}
                                    {password.length > 0 && (
                                        <div className="mt-2 space-y-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                                            {criterios.map(c => {
                                                const ok = c.test(password)
                                                return (
                                                    <div key={c.label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {ok
                                                            ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                                            : <X className="w-3.5 h-3.5 flex-shrink-0" />
                                                        }
                                                        {c.label}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Confirmar Senha */}
                            <div className="flex items-center gap-3">
                                <label htmlFor="confirm" className="w-28 flex-shrink-0 text-sm font-medium text-slate-700 text-right">Confirmar senha</label>
                                <input
                                    id="confirm"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    placeholder="Repita a senha"
                                    className={inputClass}
                                    disabled={loading}
                                />
                            </div>

                            {/* Erro */}
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
