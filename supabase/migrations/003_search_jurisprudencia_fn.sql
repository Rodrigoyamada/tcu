-- ============================================================
-- Migração 003: Função de busca full-text search
-- Utilizada pelo n8n via RPC: /rest/v1/rpc/search_jurisprudencia
-- ============================================================

CREATE OR REPLACE FUNCTION search_jurisprudencia(query text)
RETURNS SETOF jurisprudencia
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM jurisprudencia
  WHERE
    ementa  ILIKE '%' || query || '%'
    OR conteudo ILIKE '%' || query || '%'
    OR numero   ILIKE '%' || query || '%'
    OR orgao    ILIKE '%' || query || '%'
  ORDER BY
    -- Prioriza correspondência na ementa (mais relevante)
    CASE WHEN ementa ILIKE '%' || query || '%' THEN 0 ELSE 1 END,
    data_pub DESC NULLS LAST
  LIMIT 10;
$$;

-- Permite acesso via API (anon key)
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO authenticated;
