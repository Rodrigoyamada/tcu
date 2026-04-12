-- ============================================================
-- Migração 010: Pesquisa Ponderada com Snippets (RAG Precision)
-- Melhora a qualidade dos pareceres ao buscar no Conteúdo e na Ementa.
-- ============================================================

CREATE OR REPLACE FUNCTION search_jurisprudencia_v2(query_text text)
RETURNS TABLE (
    id UUID,
    numero TEXT,
    ementa TEXT,
    conteudo TEXT,
    orgao TEXT,
    data_pub DATE,
    relator TEXT,
    snippet TEXT,
    rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    ts_query tsquery;
BEGIN
    -- Limpa e prepara a query para o formato do Postgres
    ts_query := plainto_tsquery('portuguese', query_text);

    RETURN QUERY
    SELECT 
        j.id,
        j.numero,
        j.ementa,
        j.conteudo,
        j.orgao,
        j.data_pub,
        j.relator,
        -- Extrai o "Snippet" (Recorte do texto onde as palavras batem)
        -- Configurado para 500 caracteres em volta do match
        ts_headline('portuguese', COALESCE(j.ementa, '') || ' ' || COALESCE(j.conteudo, ''), ts_query, 'MaxWords=80, MinWords=50, ShortWord=3, MaxFragments=2, FragmentDelimiter=" [...] "') as snippet,
        -- Ranking ponderado: A (Ementa) tem peso maior que B (Conteúdo)
        ts_rank_cd(
            setweight(to_tsvector('portuguese', COALESCE(j.ementa, '')), 'A') || 
            setweight(to_tsvector('portuguese', COALESCE(j.conteudo, '')), 'B'),
            ts_query
        ) as rank
    FROM jurisprudencia j
    WHERE 
        (setweight(to_tsvector('portuguese', COALESCE(j.ementa, '')), 'A') || 
         setweight(to_tsvector('portuguese', COALESCE(j.conteudo, '')), 'B')) @@ ts_query
    ORDER BY rank DESC, j.data_pub DESC NULLS LAST
    LIMIT 10;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION search_jurisprudencia_v2(text) TO anon;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_v2(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_jurisprudencia_v2(text) TO service_role;
