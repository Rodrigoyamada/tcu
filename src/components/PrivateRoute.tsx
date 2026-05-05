import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function PrivateRoute() {
    const { user, loading } = useAuth()
    if (loading) return (
        <div className="flex items-center justify-center w-full h-screen bg-[#F8FAFC]">
            <Loader2 className="w-8 h-8 animate-spin text-[#2E75B6]" />
        </div>
    )
    if (!user) return <Navigate to="/" replace />
    return <Outlet />
}
