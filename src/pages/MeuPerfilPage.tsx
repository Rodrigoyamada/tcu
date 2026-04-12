import React, { useState, useEffect } from 'react'
import { User as UserIcon, Lock, Save, Loader2, CheckCircle2, AlertCircle, EyeOff, Eye } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function MeuPerfilPage() {
    const { user, updateProfile } = useAuth()
    const isHardcodedAdmin = user?.email.toLowerCase() === 'rodrigo.yamada@gmail.com'

    // Form states
    const [name, setName] = useState('')
    const [cpf, setCpf] = useState('')
    const [telefone, setTelefone] = useState('')

    // Pwd states
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Loading & Feedback
    const [loadingData, setLoadingData] = useState(!isHardcodedAdmin)
    const [savingData, setSavingData] = useState(false)
    const [savingPwd, setSavingPwd] = useState(false)
    const [msgData, setMsgData] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [msgPwd, setMsgPwd] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const criterios = [
        { label: 'Mínimo de 8 caracteres', test: (s: string) => s.length >= 8 },
        { label: 'Pelo menos 1 letra maiúscula', test: (s: string) => /[A-Z]/.test(s) },
        { label: 'Pelo menos 1 número', test: (s: string) => /[0-9]/.test(s) },
        { label: 'Pelo menos 1 caractere especial', test: (s: string) => /[^A-Za-z0-9]/.test(s) }
    ]

    useEffect(() => {
        if (isHardcodedAdmin) {
            setName(user?.name || '')
            return
        }

        const loadUserRecord = async () => {
            if (!user?.email) return
            setLoadingData(true)
            const { data, error } = await supabase
                .from('app_users')
                .select('name, cpf, telefone')
                .eq('email', user.email)
                .single()

            if (!error && data) {
                setName(data.name || '')
                setCpf(data.cpf || '')
                setTelefone(data.telefone || '')
            }
            setLoadingData(false)
        }

        loadUserRecord()
    }, [user?.email, isHardcodedAdmin, user?.name])

    const maskCPF = (val: string) => {
        return val.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const maskTelefone = (val: string) => {
        let v = val.replace(/\D/g, '')
        if (v.length <= 10) {
            v = v.replace(/(\d{2})(\d)/, '($1) $2')
            v = v.replace(/(\d{4})(\d)/, '$1-$2')
        } else {
            v = v.replace(/(\d{2})(\d)/, '($1) $2')
            v = v.replace(/(\d{5})(\d)/, '$1-$2')
            v = v.replace(/(-\d{4})\d+?$/, '$1')
        }
        return v
    }

    const handleSaveData = async (e: React.FormEvent) => {
        e.preventDefault()
        setMsgData(null)
        if (isHardcodedAdmin) {
            setMsgData({ type: 'error', text: 'Não é possível salvar alterações para a conta de sistema.' })
            return
        }

        if (!name.trim()) {
            setMsgData({ type: 'error', text: 'O nome é obrigatório.' })
            return
        }

        setSavingData(true)
        const { error } = await supabase
            .from('app_users')
            .update({ name: name.trim(), cpf: cpf.trim(), telefone: telefone.trim() })
            .eq('email', user?.email)

        if (error) {
            setMsgData({ type: 'error', text: 'Erro ao atualizar os dados. Tente novamente.' })
        } else {
            updateProfile({ name: name.trim() })
            setMsgData({ type: 'success', text: 'Dados atualizados com sucesso.' })
            setTimeout(() => setMsgData(null), 3000)
        }
        setSavingData(false)
    }

    const handleSavePwd = async (e: React.FormEvent) => {
        e.preventDefault()
        setMsgPwd(null)

        if (isHardcodedAdmin) {
            setMsgPwd({ type: 'error', text: 'Não é possível alterar a senha da conta de sistema.' })
            return
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            setMsgPwd({ type: 'error', text: 'Preencha todos os campos da senha.' })
            return
        }

        if (newPassword !== confirmPassword) {
            setMsgPwd({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' })
            return
        }

        const meetsAll = criterios.every(c => c.test(newPassword))
        if (!meetsAll) {
            setMsgPwd({ type: 'error', text: 'A nova senha não atende aos requisitos de força.' })
            return
        }

        setSavingPwd(true)

        // Verifica a senha atual
        const { data: userData, error: fetchError } = await supabase
            .from('app_users')
            .select('password')
            .eq('email', user?.email)
            .single()

        if (fetchError || !userData || userData.password !== currentPassword) {
            setMsgPwd({ type: 'error', text: 'A senha atual está incorreta.' })
            setSavingPwd(false)
            return
        }

        // Atualiza a senha nova
        const { error: updateError } = await supabase
            .from('app_users')
            .update({ password: newPassword })
            .eq('email', user?.email)

        if (updateError) {
            setMsgPwd({ type: 'error', text: 'Erro ao atualizar a senha. Tente novamente.' })
        } else {
            setMsgPwd({ type: 'success', text: 'Senha alterada com sucesso.' })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => setMsgPwd(null), 3000)
        }

        setSavingPwd(false)
    }

    const inputClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent transition-all duration-200 disabled:opacity-60 disabled:bg-slate-100"

    return (
        <div className="p-6 max-w-5xl mx-auto h-full overflow-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                    <UserIcon className="w-6 h-6" />
                    Meu Perfil
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Gerencie seus dados pessoais e de segurança
                </p>
            </div>

            {isHardcodedAdmin && (
                <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-red-800">Conta de Sistema</h3>
                        <p className="text-sm text-red-600 mt-1">Você está logado como a conta mestra do administrador. A edição de dados e senha está desabilitada para esta conta.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* ── Dados Pessoais ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-[#2E75B6]" />
                            Dados Cadastrais
                        </h2>
                    </div>

                    <div className="p-6">
                        {loadingData ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-[#2E75B6]" />
                            </div>
                        ) : (
                            <form onSubmit={handleSaveData} className="space-y-5">
                                {/* E-mail - Read Only */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">E-mail</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className={inputClass}
                                    />
                                    <p className="text-xs text-slate-400">* O e-mail não pode ser alterado pois é sua chave de login.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome completo</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={inputClass}
                                        disabled={savingData || isHardcodedAdmin}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="cpf" className="block text-sm font-medium text-slate-700">CPF</label>
                                    <input
                                        id="cpf"
                                        type="text"
                                        value={cpf}
                                        onChange={(e) => setCpf(maskCPF(e.target.value))}
                                        placeholder="000.000.000-00"
                                        className={inputClass}
                                        disabled={savingData || isHardcodedAdmin}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">Telefone</label>
                                    <input
                                        id="telefone"
                                        type="text"
                                        value={telefone}
                                        onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        className={inputClass}
                                        disabled={savingData || isHardcodedAdmin}
                                    />
                                </div>

                                {msgData && (
                                    <div className={`text-sm flex items-center gap-2 p-3 rounded-lg ${msgData.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {msgData.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {msgData.text}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={savingData || isHardcodedAdmin || !name.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl hover:from-[#1a4368] hover:to-[#2563a0] disabled:opacity-50 transition-all w-full justify-center"
                                    >
                                        {savingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* ── Alterar Senha ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-fit">
                    <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#2E75B6]" />
                            Alterar Senha
                        </h2>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSavePwd} className="space-y-5">
                            
                            <div className="space-y-1.5">
                                <label htmlFor="currentPwd" className="block text-sm font-medium text-slate-700">Senha atual</label>
                                <input
                                    id="currentPwd"
                                    type={showPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className={inputClass}
                                    disabled={savingPwd || isHardcodedAdmin}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="newPwd" className="block text-sm font-medium text-slate-700">Nova senha</label>
                                <div className="relative">
                                    <input
                                        id="newPwd"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={inputClass + ' pr-12'}
                                        disabled={savingPwd || isHardcodedAdmin}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                        disabled={isHardcodedAdmin}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                
                                {newPassword.length > 0 && !isHardcodedAdmin && (
                                    <div className="mt-2 space-y-1 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                        {criterios.map(c => {
                                            const ok = c.test(newPassword)
                                            return (
                                                <div key={c.label} className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {ok ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-slate-300 flex-shrink-0" />}
                                                    {c.label}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="confirmPwd" className="block text-sm font-medium text-slate-700">Confirmar nova senha</label>
                                <input
                                    id="confirmPwd"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={inputClass}
                                    disabled={savingPwd || isHardcodedAdmin}
                                />
                            </div>

                            {msgPwd && (
                                <div className={`text-sm flex items-center gap-2 p-3 rounded-lg ${msgPwd.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {msgPwd.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {msgPwd.text}
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={savingPwd || isHardcodedAdmin || !currentPassword || !newPassword || !confirmPassword || !criterios.every(c => c.test(newPassword))}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-all w-full justify-center"
                                >
                                    {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    Atualizar Senha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    )
}
