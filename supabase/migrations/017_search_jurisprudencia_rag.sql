-- ============================================================
-- Migração 017 v6
-- Correções:
-- 1. Acórdãos sem ementa são excluídos (causa principal de alucinação)
-- 2. Colegiado NOT extraído do documento pai — usa "TCU" neutro para
--    evitar atribuição errada de Plenário a decisões de Câmara
-- 3. Contexto inclui flag "sem_conteudo" para o prompt detectar e não citar
-- ============================================================

DROP FUNCTION IF EXISTS search_jurisprudencia_rag(text);

CREATE OR REPLACE FUNCTION search_jurisprudencia_rag(query text)
RETURNS TABLE (
  id          UUID,
  numero      TEXT,
  citacao     TEXT,
  titulo      TEXT,
  ementa      TEXT,
  excerto     TEXT,
  conteudo    TEXT,
  orgao       TEXT,
  data_pub    DATE,
  relator     TEXT,
  tipo        TEXT,
  area        TEXT,
  tema        TEXT,
  snippet     TEXT,
  tem_conteudo BOOLEAN,
  rank        FLOAT8
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  ts_q tsquery;
BEGIN
  ts_q := websearch_to_tsquery('portuguese', query);

  RETURN QUERY
  SELECT
    j.id,
    j.numero,

    -- ─── Campo citacao ────────────────────────────────────────────────────────
    CASE
      -- Acórdão: extrai XXXX/AAAA do titulo
      WHEN j.tipo = 'acordao' AND j.titulo IS NOT NULL THEN
        'Acórdão ' ||
        COALESCE((regexp_match(j.titulo, '(\d{1,5}/\d{4})'))[1], 'n/n') ||
        ' (TCU, ' || j.orgao || ')'

      -- Súmula: extrai número do campo numero
      WHEN j.tipo = 'sumula' THEN
        'Súmula TCU nº ' ||
        COALESCE((regexp_match(j.numero, '(\d+)$'))[1]::integer::text, j.numero)

      -- Jurisprudência Selecionada: extrai o nº do acórdão citado no excerto/ementa
      -- Usa "TCU" neutro como colegiado para não atribuir colegiado errado
      WHEN j.tipo = 'jurisprudencia_selecionada' THEN
        CASE
          WHEN (regexp_match(
            coalesce(j.excerto, '') || coalesce(j.ementa, ''),
            '[Aa]c[oó]rd[aã]o\s+([\d\.]{1,7}/\d{4})')
          )[1] IS NOT NULL THEN
            'Acórdão ' ||
            regexp_replace(
              (regexp_match(
                coalesce(j.excerto, '') || coalesce(j.ementa, ''),
                '[Aa]c[oó]rd[aã]o\s+([\d\.]{1,7}/\d{4})')
              )[1],
              '\.', '', 'g'
            ) ||
            ' (TCU) [Jurisprudência Selecionada – verifique colegiado no portal]'
          ELSE
            'Jurisprudência Selecionada – TCU, ' || j.orgao ||
            COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
        END

      WHEN j.tipo = 'publicacao_boletim_jurisprudencia' THEN
        'Boletim de Jurisprudência – TCU, ' || j.orgao ||
        COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')

      WHEN j.tipo = 'consulta' THEN
        CASE
          WHEN (regexp_match(
            coalesce(j.excerto,'') || coalesce(j.ementa,''),
            '[Aa]c[oó]rd[aã]o\s+([\d\.]{1,7}/\d{4})')
          )[1] IS NOT NULL THEN
            'Acórdão ' ||
            regexp_replace(
              (regexp_match(
                coalesce(j.excerto,'') || coalesce(j.ementa,''),
                '[Aa]c[oó]rd[aã]o\s+([\d\.]{1,7}/\d{4})')
              )[1],
              '\.', '', 'g'
            ) ||
            ' (TCU) [via Resposta a Consulta – verifique colegiado no portal]'
          ELSE
            'Resposta a Consulta – TCU, ' || j.orgao ||
            COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
        END

      ELSE
        'Precedente – TCU, ' || COALESCE(j.orgao, '') ||
        COALESCE(' (' || extract(year from j.data_pub)::text || ')', '')
    END AS citacao,

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
      'MaxWords=100, MinWords=60, ShortWord=3, MaxFragments=2, FragmentDelimiter=" [...] "'
    ) AS snippet,

    -- Flag que indica se o documento tem conteúdo real (usado pelo prompt para evitar alucinação)
    (length(coalesce(j.ementa,'')) + length(coalesce(j.excerto,'')) + length(coalesce(j.conteudo,''))) > 80
      AS tem_conteudo,

    ts_rank_cd(
      setweight(to_tsvector('portuguese', coalesce(j.titulo,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.ementa,    '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(j.excerto,   '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.indexacao, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(j.conteudo,  '')), 'C') ||
      setweight(to_tsvector('portuguese', coalesce(j.numero,    '')), 'D'),
      ts_q
    ) * CASE
        WHEN j.tipo = 'sumula'                    THEN 3.0
        WHEN j.tipo = 'jurisprudencia_selecionada' THEN 1.5
        -- Penaliza acórdãos sem ementa para evitar alucinação de conteúdo
        WHEN j.tipo = 'acordao'
          AND length(coalesce(j.ementa,'')) < 50   THEN 0.3
        ELSE 1.0
      END AS rank

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

GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_rag(text) TO service_role;
