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
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/dashboard/pareceres', label: 'Meus Pareceres', icon: FolderOpen, end: false },
    { to: '/dashboard/novo-parecer', label: 'Novo Parecer', icon: FilePlus, end: false },
]

const adminItems = [
    { to: '/dashboard/importar', label: 'Gerenciar Dados', icon: UploadCloud, end: false },
    { to: '/dashboard/usuarios', label: 'Gerenciar Usuários', icon: Users, end: false },
]

export default function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<any[]>([])

    useEffect(() => {
        const loadNotifications = async () => {
            const { data } = await supabase
                .from('notificacoes')
                .select('*')
                .eq('lida', false)
                .order('criado_em', { ascending: false })
            if (data) setNotifications(data)
        }
        loadNotifications()
    }, [])

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
                    <img src="/src/assets/logo.png" alt="TechDocsTCU" className="h-16 w-auto object-contain -ml-2" />
                </div>

                {/* Right: user + logout */}
                <div className="flex items-center gap-3 pr-6">
                    {/* Notifications */}
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

                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-white/20"
                        >
                            {user?.initials}
                        </div>
                        <span className="text-sm text-white/80 font-medium hidden sm:block">{user?.name}</span>
                    </div>
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
