-- ============================================================
-- Migração 005: Busca Avançada com FTS Completo (ementa + conteudo + orgao + numero)
-- Substitui a migração 004 com cobertura total dos campos.
-- ============================================================

-- Extensão para remover acentos (caso não exista)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Índice GIN para FTS completo (performance em 100k+ registros)
CREATE INDEX IF NOT EXISTS idx_jurisprudencia_fts_full 
ON jurisprudencia 
USING GIN (
  to_tsvector('portuguese', 
    coalesce(ementa, '') || ' ' || 
    coalesce(conteudo, '') || ' ' || 
    coalesce(orgao, '') || ' ' || 
    coalesce(numero, '')
  )
);

-- Função de busca atualizada
CREATE OR REPLACE FUNCTION search_jurisprudencia(query text)
RETURNS SETOF jurisprudencia
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  clean_query text;
  ts_query tsquery;
  result_count integer;
BEGIN
  -- Limpeza da query
  clean_query := trim(query);
  
  IF clean_query = '' THEN
    RETURN;
  END IF;

  -- Converte termos separados por espaço em OR (|) ao invés de AND (&)
  -- Ex: 'licitação dispensa pregão' → 'licitação | dispensa | pregão'
  ts_query := to_tsquery('portuguese',
    array_to_string(
      array(
        SELECT plainto_tsquery('portuguese', word)::text
        FROM unnest(string_to_array(clean_query, ' ')) AS word
        WHERE trim(word) <> ''
      ),
      ' | '
    )
  );

  -- Estratégia 1: Full-Text Search completo com OR (ementa + conteudo + orgao + numero)
  RETURN QUERY 
  SELECT *
  FROM jurisprudencia
  WHERE to_tsvector('portuguese', 
          coalesce(ementa, '') || ' ' || 
          coalesce(conteudo, '') || ' ' || 
          coalesce(orgao, '') || ' ' || 
          coalesce(numero, '')
        ) @@ ts_query
  ORDER BY 
    ts_rank(
      to_tsvector('portuguese', 
        coalesce(ementa, '') || ' ' || 
        coalesce(conteudo, '') || ' ' || 
        coalesce(orgao, '')
      ),
      ts_query
    ) DESC,
    data_pub DESC NULLS LAST
  LIMIT 20;

  GET DIAGNOSTICS result_count = ROW_COUNT;

  -- Estratégia 2: Fallback ILIKE (substring match)
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
    LIMIT 20;
  END IF;
  
END;
$$;

-- Permissões de acesso
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text) TO service_role;
