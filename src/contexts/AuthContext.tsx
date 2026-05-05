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
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', userId)
                .single()

            if (data && !error) {
                setUser({
                    id: data.id,
                    email: data.email || email,
                    name: data.name || email,
                    initials: getInitials(data.name || email),
                    role: data.role as 'admin' | 'user',
                    credits_balance: data.credits_balance ?? 0,
                })
            } else {
                setUser({
                    id: userId,
                    email: email,
                    name: email.split('@')[0],
                    initials: email[0].toUpperCase(),
                    role: 'user',
                    credits_balance: 0,
                })
            }
        } catch (err) {
            console.error('Falha ao carregar perfil:', err)
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
        let mounted = true;
        let profileLoaded = false; // flag para evitar duplo carregamento

        // Failsafe: se nada responder em 4s, libera o loading
        const failsafe = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 4000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            // Não interfere no fluxo de redefinição de senha
            if (window.location.pathname === '/redefinir-senha') return;

            try {
                if (event === 'INITIAL_SESSION') {
                    // Carrega perfil uma única vez na inicialização
                    if (session?.user && !profileLoaded) {
                        profileLoaded = true;
                        await loadUserProfile(session.user.id, session.user.email!);
                    }
                    clearTimeout(failsafe);
                    if (mounted) setLoading(false);

                } else if (event === 'SIGNED_IN' && session?.user) {
                    // Login do usuário — carrega perfil (sem delay)
                    await loadUserProfile(session.user.id, session.user.email!);

                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    // Refresh silencioso — não recarrega o perfil para não causar flicker
                    // só atualiza se não há user carregado ainda
                    if (!profileLoaded) {
                        profileLoaded = true;
                        await loadUserProfile(session.user.id, session.user.email!);
                    }

                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    profileLoaded = false;
                }
            } catch (err) {
                console.error('[Auth] Erro no onAuthStateChange:', err);
                if (mounted) setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        console.log('[Auth] Iniciando signInWithPassword...');
        
        // Timeout de 15 segundos para evitar travamento infinito
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tempo limite excedido ao conectar com o servidor.')), 15000)
        );

        const authPromise = supabase.auth.signInWithPassword({ email, password });
        
        const { error } = await Promise.race([authPromise, timeoutPromise]) as any;

        console.log('[Auth] Resposta do signInWithPassword:', { error });
        
        if (error) {
            if (error.message?.includes('Invalid login credentials')) {
                throw new Error('E-mail ou senha inválidos.')
            }
            throw new Error(error.message || 'Erro ao autenticar. Tente novamente.')
        }
        
        // onAuthStateChange (SIGNED_IN) vai carregar o perfil automaticamente
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
        const redirectUrl = 'https://techdocstcu.netlify.app/redefinir-senha'
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        })
        if (error) {
            if (error.message?.includes('rate limit') || error.message?.includes('Email rate limit')) {
                throw new Error('Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.')
            }
            // Expõe o erro real para diagnóstico (pode ser removido em produção)
            throw new Error(error.message || 'Erro ao enviar e-mail. Tente novamente.')
        }
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
