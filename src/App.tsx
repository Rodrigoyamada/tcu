import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { AdminRoute } from './components/AdminRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { Loader2 } from 'lucide-react'

// Lazy loaded pages to reduce initial bundle size
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NovoParecerPage = lazy(() => import('./pages/NovoParecerPage'))
const AreaPrincipalPage = lazy(() => import('./pages/AreaPrincipalPage'))
const MeusPareceres = lazy(() => import('./pages/MeusPareceres'))
const ImportacaoPage = lazy(() => import('./pages/ImportacaoPage'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'))
const NotificacoesPage = lazy(() => import('./pages/NotificacoesPage'))
const UsuarioDetailPage = lazy(() => import('./pages/UsuarioDetailPage'))
const MeuPerfilPage = lazy(() => import('./pages/MeuPerfilPage'))

// Loading fallback components
function PageLoader() {
  return (
    <div className="flex bg-[#F8FAFC] items-center justify-center w-full h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3 text-[#1F4E79]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E75B6]" />
        <span className="text-sm font-medium">Carregando módulo...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />

            {/* Protected */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/pareceres" element={<MeusPareceres />} />
                <Route path="/dashboard/novo-parecer" element={<NovoParecerPage />} />
                <Route path="/dashboard/parecer/:id" element={<AreaPrincipalPage />} />
                <Route path="/dashboard/meu-perfil" element={<MeuPerfilPage />} />

                {/* Admin-only */}
                <Route element={<AdminRoute />}>
                  <Route path="/dashboard/notificacoes" element={<NotificacoesPage />} />
                  <Route path="/dashboard/importar" element={<ImportacaoPage />} />
                  <Route path="/dashboard/usuarios" element={<UsuariosPage />} />
                  <Route path="/dashboard/usuarios/:id" element={<UsuarioDetailPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
