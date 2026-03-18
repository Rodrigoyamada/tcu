import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function PrivateRoute() {
    const { user } = useAuth()
    if (!user) return <Navigate to="/" replace />
    return <Outlet />
}
