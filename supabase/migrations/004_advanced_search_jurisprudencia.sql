-- ============================================================
-- Migração 004: Busca Avançada com Full-Text Search e Fallback
-- Utilizada pelo n8n via RPC: /rest/v1/rpc/search_jurisprudencia
-- Funciona melhor com acórdãos e súmulas extensas.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION search_jurisprudencia(query text)
RETURNS SETOF jurisprudencia
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  clean_query text;
  result_count integer;
BEGIN
  -- Processamento básico da string de pesquisa
  clean_query := trim(query);
  
  -- Retorna vazio se a query for vazia
  IF clean_query = '' THEN
    RETURN;
  END IF;

  -- Estratégia 1: Busca Full-Text (Semantic/Lexical) no idioma português
  -- Mais preciso, entende variações de palavras, plural, etc.
  RETURN QUERY 
  SELECT *
  FROM jurisprudencia
  WHERE to_tsvector('portuguese', coalesce(ementa, '') || ' ' || coalesce(orgao, '')) 
        @@ plainto_tsquery('portuguese', clean_query)
  ORDER BY 
    ts_rank(
      to_tsvector('portuguese', coalesce(ementa, '') || ' ' || coalesce(orgao, '')),
      plainto_tsquery('portuguese', clean_query)
    ) DESC,
    data_pub DESC NULLS LAST
  LIMIT 10;

  GET DIAGNOSTICS result_count = ROW_COUNT;

  -- Estratégia 2: Fallback (Se o FTS não achar nada) volta para o ILIKE
  -- O ILIKE é otimizado pelo índice trigram GIN já criado
  IF result_count = 0 THEN
    RETURN QUERY 
    SELECT *
    FROM jurisprudencia
    WHERE ementa ILIKE '%' || clean_query || '%'
       OR numero ILIKE '%' || clean_query || '%'
       OR conteudo ILIKE '%' || clean_query || '%'
    ORDER BY 
      CASE WHEN ementa ILIKE '%' || clean_query || '%' THEN 0 ELSE 1 END,
      data_pub DESC NULLS LAST
    LIMIT 10;
  END IF;
  
END;
$$;

-- Garante que o PostgREST (via n8n usando anon/service_role API keys) possa executar
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO service_role;
