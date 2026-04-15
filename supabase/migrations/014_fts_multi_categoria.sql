-- ============================================================
-- Migração 014: FTS Multi-Categoria
-- Atualiza search_jurisprudencia e search_jurisprudencia_v2
-- para usar os novos campos: titulo, excerto, indexacao.
-- Mantém compatibilidade total com o RAG (n8n workflow).
-- ============================================================

-- ── search_jurisprudencia (busca simples — usada pelo n8n RAG) ──
CREATE OR REPLACE FUNCTION search_jurisprudencia(query text)
RETURNS SETOF jurisprudencia
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  clean_query text;
  ts_query    tsquery;
  result_count integer;
BEGIN
  clean_query := trim(query);
  IF clean_query = '' THEN RETURN; END IF;

  -- OR entre os termos (maior recall)
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

  -- Estratégia 1: FTS ponderado (titulo + ementa + excerto + indexacao + conteudo)
  RETURN QUERY
  SELECT *
  FROM jurisprudencia
  WHERE (
    setweight(to_tsvector('portuguese', coalesce(titulo,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(ementa,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(excerto,   '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(indexacao, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(conteudo,  '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(numero,    '')), 'D')
  ) @@ ts_query
  ORDER BY
    ts_rank_cd(
      setweight(to_tsvector('portuguese', coalesce(titulo,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(ementa,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(excerto,   '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(indexacao, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(conteudo,  '')), 'C'),
      ts_query
    ) DESC,
    data_pub DESC NULLS LAST
  LIMIT 20;

  GET DIAGNOSTICS result_count = ROW_COUNT;

  -- Estratégia 2: fallback ILIKE (substring match) se FTS não retornar
  IF result_count = 0 THEN
    RETURN QUERY
    SELECT *
    FROM jurisprudencia
    WHERE titulo    ILIKE '%' || clean_query || '%'
       OR ementa    ILIKE '%' || clean_query || '%'
       OR excerto   ILIKE '%' || clean_query || '%'
       OR indexacao ILIKE '%' || clean_query || '%'
       OR numero    ILIKE '%' || clean_query || '%'
       OR conteudo  ILIKE '%' || clean_query || '%'
    ORDER BY
      CASE
        WHEN ementa  ILIKE '%' || clean_query || '%' THEN 0
        WHEN titulo  ILIKE '%' || clean_query || '%' THEN 1
        ELSE 2
      END,
      data_pub DESC NULLS LAST
    LIMIT 20;
  END IF;
END;
$$;

-- ── search_jurisprudencia_v2 (com snippets — usada pela UI) ─────
CREATE OR REPLACE FUNCTION search_jurisprudencia_v2(query_text text)
RETURNS TABLE (
  id        UUID,
  numero    TEXT,
  titulo    TEXT,
  ementa    TEXT,
  excerto   TEXT,
  conteudo  TEXT,
  orgao     TEXT,
  data_pub  DATE,
  relator   TEXT,
  tipo      TEXT,
  area      TEXT,
  tema      TEXT,
  snippet   TEXT,
  rank      REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  ts_query := plainto_tsquery('portuguese', query_text);

  RETURN QUERY
  SELECT
    j.id,
    j.numero,
    j.titulo,
    j.ementa,
    j.excerto,
    j.conteudo,
    j.orgao,
    j.data_pub,
    j.relator,
    j.tipo::TEXT,
    j.area,
    j.tema,
    -- Snippet inteligente: busca o trecho mais relevante nos campos
    ts_headline(
      'portuguese',
      coalesce(j.titulo,  '') || ' ' ||
      coalesce(j.ementa,  '') || ' ' ||
      coalesce(j.excerto, '') || ' ' ||
      coalesce(j.conteudo,''),
      ts_query,
      'MaxWords=80, MinWords=50, ShortWord=3, MaxFragments=2, FragmentDelimiter=" [...] "'
    ) AS snippet,
    -- Ranking ponderado: título/ementa pesam mais
    ts_rank_cd(
      setweight(to_tsvector('portuguese', coalesce(j.titulo,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.ementa,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.excerto,   '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.indexacao, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.conteudo,  '')), 'C'),
      ts_query
    ) AS rank
  FROM jurisprudencia j
  WHERE (
    setweight(to_tsvector('portuguese', coalesce(j.titulo,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(j.ementa,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(j.excerto,   '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(j.indexacao, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(j.conteudo,  '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(j.numero,    '')), 'D')
  ) @@ ts_query
  ORDER BY rank DESC, j.data_pub DESC NULLS LAST
  LIMIT 10;
END;
$$;

-- ── Permissões ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text)    TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia(text)    TO service_role;

GRANT EXECUTE ON FUNCTION search_jurisprudencia_v2(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_v2(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_v2(text) TO service_role;
