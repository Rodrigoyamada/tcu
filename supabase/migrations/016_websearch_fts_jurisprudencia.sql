-- ============================================================
-- Migração 005: Busca FTS com websearch_to_tsquery
-- Entende operadores OR, aspas, exclusões, estilo Google.
-- ============================================================

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
  -- Processamento da string
  clean_query := trim(query);
  IF clean_query = '' THEN RETURN; END IF;

  -- 1. Full-Text Search Otimizado (websearch_to_tsquery)
  RETURN QUERY 
  SELECT * FROM jurisprudencia
  WHERE to_tsvector('portuguese', coalesce(ementa, '')) @@ websearch_to_tsquery('portuguese', clean_query)
  ORDER BY 
    ts_rank(to_tsvector('portuguese', coalesce(ementa, '')), websearch_to_tsquery('portuguese', clean_query)) DESC,
    data_pub DESC NULLS LAST
  LIMIT 10;

  GET DIAGNOSTICS result_count = ROW_COUNT;

  -- 2. Fallback (Índice Trigram ILIKE) se FTS falhar
  IF result_count = 0 THEN
    RETURN QUERY 
    SELECT * FROM jurisprudencia
    WHERE ementa ILIKE '%' || clean_query || '%' 
       OR numero ILIKE '%' || clean_query || '%'
    ORDER BY CASE WHEN ementa ILIKE '%' || clean_query || '%' THEN 0 ELSE 1 END,
             data_pub DESC NULLS LAST
    LIMIT 10;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO anon, authenticated, service_role;
