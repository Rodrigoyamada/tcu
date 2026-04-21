-- Migration: 018_legislacao_rag
-- Description: Cria tabela, índices Full-Text e a função de busca RPC para Leis fatiadas

CREATE TABLE IF NOT EXISTS public.legislacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    norma TEXT NOT NULL,          -- Ex: "Lei 14.133/2021"
    identificador TEXT NOT NULL,  -- Ex: "Art. 75"
    texto TEXT NOT NULL,          -- Conteúdo completo
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (norma, identificador)
);

-- Criar a coluna vetorial (Full Text Search) para português
ALTER TABLE public.legislacao ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', norma || ' ' || identificador || ' ' || texto)
) STORED;

-- Criar o Índice de Performance
CREATE INDEX idx_legislacao_search ON public.legislacao USING GIN(search_vector);

-- Habilitar visualização/API (RLS)
ALTER TABLE public.legislacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura anonima para legislacao" ON public.legislacao FOR SELECT USING (true);
CREATE POLICY "Adicao autenticada para legislacao" ON public.legislacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Apagar autenticada para legislacao" ON public.legislacao FOR DELETE USING (true);

-- RPC de Busca RAG (Supabase n8n endpoint)
CREATE OR REPLACE FUNCTION search_legislacao_rag(
    query_text TEXT,
    match_count INT DEFAULT 5
) RETURNS TABLE (
    id UUID, 
    norma TEXT, 
    identificador TEXT, 
    texto TEXT, 
    rank REAL
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id, l.norma, l.identificador, l.texto,
        ts_rank(l.search_vector, websearch_to_tsquery('portuguese', query_text)) AS rank
    FROM public.legislacao l
    WHERE l.search_vector @@ websearch_to_tsquery('portuguese', query_text)
    ORDER BY rank DESC
    LIMIT match_count;
END;
$$;
