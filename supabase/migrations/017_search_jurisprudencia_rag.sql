-- ============================================================
-- Migração 017 v7
-- - Extração do número da citação também via campo titulo
-- - Jurisprudência Selecionada e Resposta a Consulta com número real
-- - ts_headline limitada a 2000 chars por campo
-- - tem_conteudo como campo calculado
-- - Penalização de acórdãos sem ementa
-- ============================================================

DROP FUNCTION IF EXISTS search_jurisprudencia_rag(text);

CREATE OR REPLACE FUNCTION search_jurisprudencia_rag(query text)
RETURNS TABLE (
  id           UUID,
  numero       TEXT,
  citacao      TEXT,
  titulo       TEXT,
  ementa       TEXT,
  excerto      TEXT,
  orgao        TEXT,
  data_pub     DATE,
  tipo         TEXT,
  area         TEXT,
  tema         TEXT,
  snippet      TEXT,
  tem_conteudo BOOLEAN,
  rank         FLOAT8
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    j.id,
    j.numero,

    -- Campo citacao pré-formatado
    CASE
      WHEN j.tipo = 'acordao' AND j.titulo IS NOT NULL THEN
        'Acórdão ' ||
        COALESCE((regexp_match(j.titulo, '(\d{1,5}/\d{4})'))[1], 'n/n') ||
        ' (TCU, ' || j.orgao || ')'

      WHEN j.tipo = 'sumula' THEN
        'Súmula TCU nº ' ||
        COALESCE((regexp_match(j.numero, '(\d+)$'))[1]::integer::text, j.numero)

      WHEN j.tipo = 'jurisprudencia_selecionada' THEN
        -- Busca número: primeiro no titulo (ex: "Acordao 1604/2015 - Plenario"),
        -- depois no excerto e ementa
        CASE
          WHEN (regexp_match(
            coalesce(j.titulo,'') || ' ' ||
            left(coalesce(j.excerto,''),2000) || ' ' ||
            coalesce(j.ementa,''),
            '[Aa]c[oó]?rd[aã]o\s+([\d\.]{1,7}/\d{4})'))[1] IS NOT NULL
          THEN
            'Acórdão ' ||
            regexp_replace(
              (regexp_match(
                coalesce(j.titulo,'') || ' ' ||
                left(coalesce(j.excerto,''),2000) || ' ' ||
                coalesce(j.ementa,''),
                '[Aa]c[oó]?rd[aã]o\s+([\d\.]{1,7}/\d{4})'))[1],
              '\.', '', 'g') ||
            ' (TCU, ' || COALESCE(j.orgao, 'Plenário') || ') [Jurisprudência Selecionada]'
          ELSE
            'Jurisprudência Selecionada – TCU, ' || COALESCE(j.orgao,'') ||
            COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
        END

      WHEN j.tipo = 'consulta' THEN
        -- Busca número: primeiro no titulo, depois no excerto e ementa
        CASE
          WHEN (regexp_match(
            coalesce(j.titulo,'') || ' ' ||
            left(coalesce(j.excerto,''),2000) || ' ' ||
            coalesce(j.ementa,''),
            '[Aa]c[oó]?rd[aã]o\s+([\d\.]{1,7}/\d{4})'))[1] IS NOT NULL
          THEN
            'Acórdão ' ||
            regexp_replace(
              (regexp_match(
                coalesce(j.titulo,'') || ' ' ||
                left(coalesce(j.excerto,''),2000) || ' ' ||
                coalesce(j.ementa,''),
                '[Aa]c[oó]?rd[aã]o\s+([\d\.]{1,7}/\d{4})'))[1],
              '\.', '', 'g') ||
            ' (TCU, ' || COALESCE(j.orgao, 'Plenário') || ') [Resposta a Consulta]'
          ELSE
            'Resposta a Consulta – TCU, ' || COALESCE(j.orgao,'') ||
            COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
        END

      WHEN j.tipo = 'publicacao_boletim_jurisprudencia' THEN
        'Boletim de Jurisprudência – TCU, ' || j.orgao ||
        COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')

      ELSE
        'Precedente – TCU, ' || COALESCE(j.orgao,'') ||
        COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
    END AS citacao,

    j.titulo,
    j.ementa,
    j.excerto,
    j.orgao,
    j.data_pub,
    j.tipo::TEXT,
    j.area,
    j.tema,

    -- Snippet limitado a campos leves (sem conteudo HTML volumoso)
    ts_headline(
      'portuguese',
      left(coalesce(j.titulo,''),500)  || ' ' ||
      left(coalesce(j.ementa,''),1000) || ' ' ||
      left(coalesce(j.excerto,''),1000),
      websearch_to_tsquery('portuguese', query),
      'MaxWords=80, MinWords=40, ShortWord=3, MaxFragments=2'
    ) AS snippet,

    -- Flag de conteúdo disponível
    (length(coalesce(j.ementa,'')) + length(coalesce(j.excerto,''))) > 80
      AS tem_conteudo,

    -- Rank com penalização de acórdãos sem ementa
    ts_rank_cd(
      setweight(to_tsvector('portuguese', coalesce(j.titulo,  '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.ementa,  '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.excerto, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.indexacao,'')), 'B'),
      websearch_to_tsquery('portuguese', query)
    ) * CASE
        WHEN j.tipo = 'sumula'                    THEN 3.0
        WHEN j.tipo = 'jurisprudencia_selecionada' THEN 1.5
        WHEN j.tipo = 'acordao'
          AND length(coalesce(j.ementa,'')) < 50   THEN 0.3
        ELSE 1.0
      END AS rank

  FROM jurisprudencia j
  WHERE (
    setweight(to_tsvector('portuguese', coalesce(j.titulo,   '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(j.ementa,   '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(j.excerto,  '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(j.indexacao,'')), 'B')
  ) @@ websearch_to_tsquery('portuguese', query)
  ORDER BY rank DESC, j.data_pub DESC NULLS LAST
  LIMIT 15;
$$;

GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO service_role;
