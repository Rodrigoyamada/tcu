-- ============================================================
-- Migração 017: Ajuste de RLS para Importação e Upsert
-- Libera permissões de UPDATE e ajusta políticas para o fluxo atual.
-- ============================================================

-- 1. Ajustes na tabela jurisprudencia
-- Adiciona permissão de UPDATE (necessária para o .upsert())
DROP POLICY IF EXISTS "auth_update_jurisprudencia" ON public.jurisprudencia;
CREATE POLICY "auth_update_jurisprudencia"
  ON public.jurisprudencia FOR UPDATE USING (true);

-- Flexibiliza o INSERT para o fluxo de importação atual
DROP POLICY IF EXISTS "auth_write_jurisprudencia" ON public.jurisprudencia;
CREATE POLICY "auth_write_jurisprudencia"
  ON public.jurisprudencia FOR INSERT WITH CHECK (true);

-- 2. Ajustes na tabela importacoes (Histórico)
-- Garante que a tabela de histórico aceite as gravações do progresso
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_importacoes" ON public.importacoes;
CREATE POLICY "public_all_importacoes"
  ON public.importacoes FOR ALL USING (true) WITH CHECK (true);

-- 3. Ajustes na tabela arquivos_tcu
DROP POLICY IF EXISTS "public_all_arquivos" ON public.arquivos_tcu;
CREATE POLICY "public_all_arquivos"
  ON public.arquivos_tcu FOR ALL USING (true) WITH CHECK (true);
