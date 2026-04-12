import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface User {
    email: string
    name: string
    initials: string
    role: 'admin' | 'user'
}

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    logout: () => void
    register: (email: string, name: string, password: string, cpf: string, telefone: string) => Promise<void>
    updateProfile: (data: Partial<User>) => void
}

// Admin hardcoded
const ADMIN_EMAIL = 'rodrigo.yamada@gmail.com'
const ADMIN_PASSWORD = '123456'
const ADMIN_NAME = 'Rodrigo Yamada'

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('')
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('acordeon_user')
        return stored ? JSON.parse(stored) : null
    })

    const login = useCallback(async (email: string, password: string) => {
        await new Promise((resolve) => setTimeout(resolve, 600))

        // Verifica admin hardcoded
        if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const adminUser: User = {
                email: ADMIN_EMAIL,
                name: ADMIN_NAME,
                initials: 'RY',
                role: 'admin',
            }
            setUser(adminUser)
            localStorage.setItem('acordeon_user', JSON.stringify(adminUser))
            return
        }

        // Verifica usuário comum na tabela Supabase
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('password', password)
            .single()

        if (error || !data) {
            throw new Error('E-mail ou senha inválidos.')
        }

        const loggedUser: User = {
            email: data.email,
            name: data.name,
            initials: getInitials(data.name),
            role: data.role as 'admin' | 'user',
        }
        setUser(loggedUser)
        localStorage.setItem('acordeon_user', JSON.stringify(loggedUser))
    }, [])

    const register = useCallback(async (email: string, name: string, password: string, cpf: string, telefone: string) => {
        // Bloqueia e-mail do admin
        if (email.toLowerCase() === ADMIN_EMAIL) {
            throw new Error('Este e-mail já está em uso.')
        }

        const { error } = await supabase.from('app_users').insert({
            email: email.toLowerCase(),
            name: name.trim(),
            password,
            role: 'user',
            cpf: cpf.trim(),
            telefone: telefone.trim(),
        })

        if (error) {
            if (error.code === '23505') throw new Error('Este e-mail já está cadastrado.')
            throw new Error('Erro ao criar conta. Tente novamente.')
        }
    }, [])

    const logout = useCallback(() => {
        setUser(null)
        localStorage.removeItem('acordeon_user')
    }, [])

    const updateProfile = useCallback((data: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev
            const newData = { ...prev, ...data }
            if (data.name) {
                newData.initials = getInitials(data.name)
            }
            localStorage.setItem('acordeon_user', JSON.stringify(newData))
            return newData
        })
    }, [])

    return (
        <AuthContext.Provider value={{ user, login, logout, register, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
