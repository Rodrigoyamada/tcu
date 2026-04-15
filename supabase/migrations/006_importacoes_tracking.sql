-- Estrutura de rastreamento de importações
CREATE TABLE IF NOT EXISTS importacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_arquivo TEXT NOT NULL,
    tamanho_bytes BIGINT,
    inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    fim_em TIMESTAMPTZ,
    total_linhas INTEGER,
    linha_atual INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
    observacoes TEXT
);

-- Adiciona a coluna de vínculo e a exclusão em cascata na jurisprudencia
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jurisprudencia' AND column_name='importacao_id') THEN
        ALTER TABLE jurisprudencia ADD COLUMN importacao_id UUID REFERENCES importacoes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Índice para acelerar deleções e contagens por importação
CREATE INDEX IF NOT EXISTS idx_jurisprudencia_importacao ON jurisprudencia(importacao_id);
