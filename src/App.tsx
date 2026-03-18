
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { AdminRoute } from './components/AdminRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import NovoParecerPage from './pages/NovoParecerPage'
import AreaPrincipalPage from './pages/AreaPrincipalPage'
import MeusPareceres from './pages/MeusPareceres'
import ImportacaoPage from './pages/ImportacaoPage'
import UsuariosPage from './pages/UsuariosPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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

              {/* Admin-only */}
              <Route element={<AdminRoute />}>
                <Route path="/dashboard/importar" element={<ImportacaoPage />} />
                <Route path="/dashboard/usuarios" element={<UsuariosPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
