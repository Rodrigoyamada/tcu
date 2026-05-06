-- ====================================================================================
-- MIGRAÇÃO 021: Otimizações de Performance Globais (Dashboard & Usuários)
-- ====================================================================================

-- 1. Criação da função de segurança super rápida para evitar o loop do RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Substituição da política RLS falha da tabela de usuários pela versão instantânea
DROP POLICY IF EXISTS "Admin pode ler todos os usuários" ON public.app_users;
CREATE POLICY "Admin pode ler todos os usuários"
ON public.app_users FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin pode gerenciar usuários" ON public.app_users;
CREATE POLICY "Admin pode gerenciar usuários"
ON public.app_users FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Índices Estratégicos para o Painel (Fim dos Full Table Scans)
-- Índice crucial para o agrupamento por categoria no Dashboard (a tabela tem 525k+ linhas)
CREATE INDEX IF NOT EXISTS idx_jurisprudencia_tipo ON public.jurisprudencia(tipo);

-- Índices para as contagens por período (Últimos 7 dias, Hoje, etc) no Dashboard
CREATE INDEX IF NOT EXISTS idx_pareceres_created_at ON public.pareceres(created_at);
CREATE INDEX IF NOT EXISTS idx_app_users_created_at ON public.app_users(created_at);

-- 4. Otimização das Estatísticas de Busca do PostgreSQL (Pós Bulk-Insert)
-- Analisa o banco para que as novas 500k linhas tenham rotas otimizadas
ANALYZE public.jurisprudencia;
ANALYZE public.app_users;
ANALYZE public.pareceres;
