import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
    Scale,
    LayoutDashboard,
    FolderOpen,
    FilePlus,
    LogOut,
    UploadCloud,
    Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/dashboard/pareceres', label: 'Meus Pareceres', icon: FolderOpen, end: false },
    { to: '/dashboard/novo-parecer', label: 'Novo Parecer', icon: FilePlus, end: false },
]

const adminItems = [
    { to: '/dashboard/importar', label: 'Importar Dados', icon: UploadCloud, end: false },
    { to: '/dashboard/usuarios', label: 'Gerenciar Usuários', icon: Users, end: false },
]

export default function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Header full-width ── */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 bg-[#1F4E79] border-b border-white/10 shadow-md z-10">
                {/* Brand / Logo */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 bg-white/15 rounded-lg">
                        <Scale className="w-5 h-5 text-white" />
                    </div>
                    <div className="leading-tight">
                        <span className="font-bold text-base text-white tracking-tight">Acordeon</span>
                        <span className="font-light text-white/70 text-xs ml-1">TCU</span>
                        <p className="text-white/50 text-[10px] font-normal">Pesquisa em Jurisprudência</p>
                    </div>
                </div>

                {/* Right: user + logout */}
                <div className="flex items-center gap-3">
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

                    {/* Version */}
                    <div className="px-5 py-3 text-white/30 text-xs border-t border-white/10">
                        v1.0 · Tribunal de Contas da União
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-auto bg-[#F0F4F8]">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
