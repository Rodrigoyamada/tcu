-- ============================================================
-- Migração 015: RPC para Bio/Dashboard Admin
-- Retorna a contagem de registros agrupada por tipo de categoria.
-- ============================================================

DROP FUNCTION IF EXISTS count_jurisprudencia_by_type();
CREATE OR REPLACE FUNCTION count_jurisprudencia_by_type()
RETURNS TABLE (tipo public.categoria_tcu, count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que o admin conte mesmo que as políticas de RLS mudem
AS $$
BEGIN
  RETURN QUERY
  SELECT j.tipo, count(*)
  FROM public.jurisprudencia j
  GROUP BY j.tipo;
END;
$$;
