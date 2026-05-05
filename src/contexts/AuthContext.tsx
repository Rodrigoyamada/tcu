import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface User {
    id: string
    email: string
    name: string
    initials: string
    role: 'admin' | 'user'
    credits_balance?: number
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    register: (email: string, name: string, password: string, telefone: string) => Promise<void>
    forgotPassword: (email: string) => Promise<void>
    updateProfile: (data: Partial<User>) => void
}

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
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const loadUserProfile = useCallback(async (userId: string, email: string) => {
        const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', userId)
            .single()

        if (data) {
            setUser({
                id: data.id,
                email: data.email || email,
                name: data.name || email,
                initials: getInitials(data.name || email),
                role: data.role as 'admin' | 'user',
                credits_balance: data.credits_balance ?? 0,
            })
        } else {
            // Perfil ainda não existe (pode acontecer em race condition com o trigger)
            setUser({
                id: userId,
                email: email,
                name: email.split('@')[0],
                initials: email[0].toUpperCase(),
                role: 'user',
                credits_balance: 0,
            })
        }
    }, [])

    useEffect(() => {
        // Carrega sessão existente ao iniciar
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                await loadUserProfile(session.user.id, session.user.email!)
            }
            setLoading(false)
        })

        // Escuta mudanças de autenticação em tempo real
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                await loadUserProfile(session.user.id, session.user.email!)
            } else if (event === 'SIGNED_OUT') {
                setUser(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [loadUserProfile])

    const login = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('E-mail ou senha inválidos.')
            }
            throw new Error('Erro ao autenticar. Tente novamente.')
        }
    }, [])

    const register = useCallback(async (email: string, name: string, password: string, telefone: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, telefone },
            },
        })

        if (error) {
            if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                throw new Error('Este e-mail já está cadastrado.')
            }
            throw new Error('Erro ao criar conta. Tente novamente.')
        }

        // Salva nome e telefone na tabela app_users
        // (o trigger já cria o registro; aqui atualizamos com os dados extras)
        // A atualização ocorre após o login, via loadUserProfile
    }, [])

    const forgotPassword = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/redefinir-senha`,
        })
        if (error) throw new Error('Erro ao enviar e-mail de recuperação. Verifique o endereço e tente novamente.')
    }, [])

    const logout = useCallback(async () => {
        await supabase.auth.signOut()
        setUser(null)
    }, [])

    const updateProfile = useCallback((data: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev
            const newData = { ...prev, ...data }
            if (data.name) newData.initials = getInitials(data.name)
            return newData
        })
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register, forgotPassword, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
