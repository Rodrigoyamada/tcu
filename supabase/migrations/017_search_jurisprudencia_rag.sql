-- ============================================================
-- Migração 017 v9 — Extrai número da tag XML <acordao_decisao_tcu>
-- - JS/Consulta: numero/ano/colegiado da tag proprietária TCU
-- - Súmula: titulo é o número direto
-- - Boletins: número do titulo
-- - Filtro temporal anti-anacronismo
-- ============================================================
-- - Súmula: usa campo titulo diretamente (ex: "292")
-- - JS/Consulta: busca número só em excerto+ementa (titulo é NULL)
-- - Boletins: extrai número do titulo (ex: "576/2026")
-- - Acórdão: mantém extração do titulo
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

    -- ── Citação pré-formatada com número real ──────────────────
    CASE

      -- Acórdão: número extraído do titulo (ex: "ACÓRDÃO 738/2009 ... - PLENÁRIO")
      WHEN j.tipo = 'acordao' AND j.titulo IS NOT NULL THEN
        'Acórdão ' ||
        COALESCE((regexp_match(j.titulo, '(\d{1,5}/\d{4})'))[1], 'n/n') ||
        ' (TCU, ' || COALESCE(j.orgao, '') || ')'

      -- Súmula: campo titulo É o número diretamente (ex: "292")
      WHEN j.tipo = 'sumula' THEN
        'Súmula TCU nº ' ||
        COALESCE(
          j.titulo,
          (regexp_match(j.numero, '(\d+)$'))[1],
          j.numero
        )

      -- JS: extrai numero/ano/colegiado da tag XML <acordao_decisao_tcu ...>
      WHEN j.tipo = 'jurisprudencia_selecionada' THEN
        CASE
          -- 1º tenta: tag XML propriétária do TCU com atributos numero e ano
          WHEN (regexp_match(coalesce(j.excerto,''),
            '<acordao_decisao_tcu[^>]*numero="(\d{1,5})"[^>]*ano="(\d{4})"'))[1] IS NOT NULL
          THEN
            'Acórdão ' ||
            (regexp_match(coalesce(j.excerto,''),
              '<acordao_decisao_tcu[^>]*numero="(\d{1,5})"[^>]*ano="(\d{4})"'))[1]
            || '/' ||
            (regexp_match(coalesce(j.excerto,''),
              '<acordao_decisao_tcu[^>]*numero="(\d{1,5})"[^>]*ano="(\d{4})"'))[2]
            || ' (TCU, ' ||
            COALESCE(
              (regexp_match(coalesce(j.excerto,''),
                '<acordao_decisao_tcu[^>]*colegiado="([^"]+)"'))[1],
              j.orgao, 'Plenário'
            ) || ') [Jurisprudência Selecionada]'

          -- 2º tenta: texto livre "Acórdão NNNN/YYYY"
          WHEN (regexp_match(
            left(coalesce(j.excerto,''),3000) || ' ' || coalesce(j.ementa,''),
            '[Aa]c[oó]?rd[aã]o\s+(\d{1,5}/\d{4})'))[1] IS NOT NULL
          THEN
            'Acórdão ' ||
            (regexp_match(
              left(coalesce(j.excerto,''),3000) || ' ' || coalesce(j.ementa,''),
              '[Aa]c[oó]?rd[aã]o\s+(\d{1,5}/\d{4})'))[1]
            || ' (TCU, ' || COALESCE(j.orgao,'Plenário') || ') [Jurisprudência Selecionada]'

          -- fallback: sem número disponível
          ELSE
            'Jurisprudência Selecionada – TCU, ' || COALESCE(j.orgao,'') ||
            COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
        END

      -- Consulta: mesma lógica da JS
      WHEN j.tipo = 'consulta' THEN
        CASE
          WHEN (regexp_match(coalesce(j.excerto,''),
            '<acordao_decisao_tcu[^>]*numero="(\d{1,5})"[^>]*ano="(\d{4})"'))[1] IS NOT NULL
          THEN
            'Acórdão ' ||
            (regexp_match(coalesce(j.excerto,''),
              '<acordao_decisao_tcu[^>]*numero="(\d{1,5})"[^>]*ano="(\d{4})"'))[1]
            || '/' ||
            (regexp_match(coalesce(j.excerto,''),
              '<acordao_decisao_tcu[^>]*numero="(\d{1,5})"[^>]*ano="(\d{4})"'))[2]
            || ' (TCU, ' ||
            COALESCE(
              (regexp_match(coalesce(j.excerto,''),
                '<acordao_decisao_tcu[^>]*colegiado="([^"]+)"'))[1],
              j.orgao, 'Plenário'
            ) || ') [Resposta a Consulta]'

          WHEN (regexp_match(
            left(coalesce(j.excerto,''),3000) || ' ' || coalesce(j.ementa,''),
            '[Aa]c[oó]?rd[aã]o\s+(\d{1,5}/\d{4})'))[1] IS NOT NULL
          THEN
            'Acórdão ' ||
            (regexp_match(
              left(coalesce(j.excerto,''),3000) || ' ' || coalesce(j.ementa,''),
              '[Aa]c[oó]?rd[aã]o\s+(\d{1,5}/\d{4})'))[1]
            || ' (TCU, ' || COALESCE(j.orgao,'Plenário') || ') [Resposta a Consulta]'

          ELSE
            'Resposta a Consulta – TCU, ' || COALESCE(j.orgao,'') ||
            COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
        END

      -- Boletim de Jurisprudência: número extraído do titulo (ex: "576/2026")
      WHEN j.tipo = 'publicacao_boletim_jurisprudencia' THEN
        'Boletim de Jurisprudência TCU nº ' ||
        COALESCE(
          (regexp_match(coalesce(j.titulo,''), '(\d+/\d{4})'))[1],
          (regexp_match(j.numero, '(\d+)'))[1],
          '?'
        ) ||
        ' (TCU)'

      -- Informativo de Licitações: número extraído do titulo (ex: "38/2010")
      WHEN j.tipo = 'publicacao_informativo_licitacoes' THEN
        'Informativo de Licitações e Contratos TCU nº ' ||
        COALESCE(
          (regexp_match(coalesce(j.titulo,''), '(\d+/\d{4})'))[1],
          (regexp_match(j.numero, '(\d+)'))[1],
          '?'
        ) ||
        ' (TCU)'

      -- Boletim de Pessoal: número extraído do titulo (ex: "139/2025")
      WHEN j.tipo = 'publicacao_boletim_pessoal' THEN
        'Boletim de Pessoal TCU nº ' ||
        COALESCE(
          (regexp_match(coalesce(j.titulo,''), '(\d+/\d{4})'))[1],
          (regexp_match(j.numero, '(\d+)'))[1],
          '?'
        )

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

    -- Snippet: campos leves apenas (sem HTML volumoso de conteudo)
    ts_headline(
      'portuguese',
      left(coalesce(j.titulo,''),500)  || ' ' ||
      left(coalesce(j.ementa,''),1000) || ' ' ||
      left(coalesce(j.excerto,''),1000),
      websearch_to_tsquery('portuguese', query),
      'MaxWords=80, MinWords=40, ShortWord=3, MaxFragments=2'
    ) AS snippet,

    -- Flag: documento tem conteúdo substantivo
    (length(coalesce(j.ementa,'')) + length(coalesce(j.excerto,''))) > 80
      AS tem_conteudo,

    -- Rank com boost por tipo e penalização por ementa vazia
    ts_rank_cd(
      setweight(to_tsvector('portuguese', coalesce(j.titulo,   '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.ementa,   '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.excerto,  '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.indexacao,'')), 'B'),
      websearch_to_tsquery('portuguese', query)
    ) * CASE
        WHEN j.tipo = 'sumula'                     THEN 3.0
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
