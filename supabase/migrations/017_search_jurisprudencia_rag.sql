-- ============================================================
-- Migração 017: Função RAG / Anti-Alucinação para a Central n8n
-- ============================================================
-- Baseada na search_jurisprudencia_v2 que já usa o índice GIN.
-- Adicionamos websearch_to_tsquery + boost para Súmulas.

DROP FUNCTION IF EXISTS search_jurisprudencia_rag(text);

CREATE OR REPLACE FUNCTION search_jurisprudencia_rag(query text)
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
  rank      FLOAT8
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  ts_q tsquery;
BEGIN
  -- websearch entende OR, aspas e - nativamente (ex: "revisão OR locação")
  ts_q := websearch_to_tsquery('portuguese', query);

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
    ts_headline(
      'portuguese',
      coalesce(j.titulo,  '') || ' ' ||
      coalesce(j.ementa,  '') || ' ' ||
      coalesce(j.excerto, '') || ' ' ||
      coalesce(j.conteudo,''),
      ts_q,
      'MaxWords=130, MinWords=70, ShortWord=3, MaxFragments=2, FragmentDelimiter=" [...] "'
    ) AS snippet,
    -- Boost x2 para Súmulas e Jurisprudência Selecionada
    ts_rank_cd(
      setweight(to_tsvector('portuguese', coalesce(j.titulo,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.ementa,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.excerto,   '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.indexacao, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.conteudo,  '')), 'C') ||
      setweight(to_tsvector('portuguese', coalesce(j.numero,    '')), 'D'),
      ts_q
    ) * CASE WHEN j.tipo IN ('sumula', 'jurisprudencia_selecionada') THEN 2.0 ELSE 1.0 END
    AS rank
  FROM jurisprudencia j
  WHERE (
    setweight(to_tsvector('portuguese', coalesce(j.titulo,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(j.ementa,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(j.excerto,   '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(j.indexacao, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(j.conteudo,  '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(j.numero,    '')), 'D')
  ) @@ ts_q
  ORDER BY rank DESC, j.data_pub DESC NULLS LAST
  LIMIT 15;
END;
$$;

-- ── Permissões ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO service_role;
