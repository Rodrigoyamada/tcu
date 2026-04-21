import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    FolderOpen,
    FilePlus,
    UploadCloud,
    Users,
    LogOut,
    Bell,
    BarChart2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import logoImage from '../assets/logo.png'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/dashboard/pareceres', label: 'Meus Pareceres', icon: FolderOpen, end: false },
    { to: '/dashboard/novo-parecer', label: 'Novo Parecer', icon: FilePlus, end: false },
]

const accountItems = [
    { to: '/dashboard/creditos', label: 'Meus Créditos', icon: () => <span className="w-4.5 h-4.5 flex-shrink-0 text-amber-400 text-lg leading-none text-center">🪙</span>, end: false },
]

const adminItems = [
    { to: '/dashboard/admin',    label: 'Painel Admin',        icon: BarChart2,  end: true },
    { to: '/dashboard/importar', label: 'Gerenciar Dados',     icon: UploadCloud, end: false },
    { to: '/dashboard/usuarios', label: 'Gerenciar Usuários',  icon: Users,       end: false },
]

export default function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<any[]>([])
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null)

    useEffect(() => {
        const loadNotifications = async () => {
            if (user?.role !== 'admin') return
            const { data } = await supabase
                .from('notificacoes')
                .select('*')
                .eq('lida', false)
                .order('criado_em', { ascending: false })
            if (data) setNotifications(data)
        }

        const loadUltimaAtualizacao = async () => {
            const { data } = await supabase
                .from('importacoes')
                .select('inicio_em, nome_arquivo')
                .eq('status', 'concluido')
                .order('inicio_em', { ascending: false })
                .limit(1)
                .single()
            if (data?.inicio_em) {
                setUltimaAtualizacao(
                    new Date(data.inicio_em).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    })
                )
            }
        }

        loadNotifications()
        loadUltimaAtualizacao()

        let subscription: any = null
        if (user?.role === 'admin') {
            subscription = supabase
                .channel('notificacoes-badge')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes' }, () => {
                    loadNotifications() // Recarrega quando houver alteração
                })
                .subscribe()
        }

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription)
            }
        }
    }, [user])

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Header full-width ── */}
            <header className="flex-shrink-0 flex items-center justify-between py-3 bg-[#1F4E79] border-b border-white/10 shadow-md z-10">
                {/* Brand / Logo */}
                <div className="w-60 flex-shrink-0 flex items-center pl-6">
                    <img src={logoImage} alt="TechDocsTCU" className="h-16 w-auto object-contain -ml-2" />
                </div>

                {/* Right: user + logout */}
                <div className="flex items-center gap-3 pr-6">
                    {/* Notifications (Admin only) */}
                    {user?.role === 'admin' && (
                        <div className="relative">
                            <NavLink
                                to="/dashboard/notificacoes"
                                title="Central de Notificações"
                                className={({ isActive }) => `p-2 hover:bg-white/10 rounded-lg transition-all duration-150 relative flex items-center justify-center ${isActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'}`}
                            >
                                <Bell size={18} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-[1.5px] border-[#1F4E79]"></span>
                                )}
                            </NavLink>
                        </div>
                    )}

                    <NavLink
                        to="/dashboard/creditos"
                        title="Meus Créditos"
                        className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-full transition-all duration-150 border ${isActive ? 'bg-[#2E75B6] border-[#2E75B6] text-white shadow-sm' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'}`}
                    >
                        <span className="text-amber-400 text-sm">🪙</span>
                        <span className="text-sm font-bold">{user?.credits_balance?.toLocaleString('pt-BR') || 0}</span>
                        <span className="text-[11px] font-medium pl-0.5 opacity-80 hidden sm:inline uppercase tracking-wider">Créditos</span>
                    </NavLink>

                    <NavLink
                        to="/dashboard/meu-perfil"
                        title="Meu Perfil"
                        className={({ isActive }) => `flex items-center gap-2.5 p-1.5 pr-3 rounded-xl transition-all duration-150 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-white/20"
                        >
                            {user?.initials}
                        </div>
                        <span className="text-sm text-white/80 font-medium hidden sm:block">{user?.name}</span>
                    </NavLink>
                    <button
                        id="btn-logout"
                        onClick={handleLogout}
                        title="Sair"
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-150"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* ── Body: sidebar + content ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar */}
                <aside className="w-60 flex-shrink-0 flex flex-col bg-[#1A4268] text-white">
                    {/* Nav */}
                    <nav className="flex-1 px-3 py-4 space-y-1">
                        {navItems.map(({ to, label, icon: Icon, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                        ? 'bg-[#2E75B6] text-white shadow-sm'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`
                                }
                            >
                                <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
                                {label}
                            </NavLink>
                        ))}

                        <div className="pt-3 pb-1">
                            <p className="px-3 text-white/30 text-[10px] uppercase tracking-widest font-semibold">Minha Conta</p>
                        </div>
                        {accountItems.map(({ to, label, icon: Icon, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                        ? 'bg-amber-500/20 text-amber-100 shadow-sm'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`
                                }
                            >
                                <Icon />
                                {label}
                            </NavLink>
                        ))}

                        {/* Seção admin — só para administradores */}
                        {user?.role === 'admin' && (
                            <>
                                <div className="pt-3 pb-1">
                                    <p className="px-3 text-white/30 text-[10px] uppercase tracking-widest font-semibold">Administração</p>
                                </div>

                                {adminItems.map(({ to, label, icon: Icon, end }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        end={end}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                                ? 'bg-[#2E75B6] text-white shadow-sm'
                                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                                            }`
                                        }
                                    >
                                        <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
                                        {label}
                                    </NavLink>
                                ))}
                            </>
                        )}
                    </nav>

                    {/* Última atualização — rodapé do sidebar */}
                    <div className="px-3 pb-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                            <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold mb-1">
                                Base atualizada em
                            </p>
                            {ultimaAtualizacao ? (
                                <p className="text-white/80 text-xs font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                    {ultimaAtualizacao}
                                </p>
                            ) : (
                                <p className="text-white/30 text-xs">—</p>
                            )}
                            <p className="text-white/25 text-[9px] mt-1.5">
                                Fonte: Dados Abertos TCU
                            </p>
                        </div>
                    </div>

                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-auto bg-[#F0F4F8]">
                    <Outlet />
                </main>
            </div>

            {/* ── Footer full-width ── */}
            <footer className="w-full flex-shrink-0 bg-[#0F2942] py-2.5 px-6 flex justify-center items-center gap-2 z-10">
                <div className="text-white/70 text-xs tracking-wide">
                    Tribunal de Contas da União
                </div>
                <div className="text-white/30 text-[11px] font-mono">
                    v1.0
                </div>
            </footer>
        </div>
    )
}
