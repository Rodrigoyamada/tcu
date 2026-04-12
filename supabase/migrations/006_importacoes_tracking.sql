-- Estrutura de rastreamento de importações
CREATE TABLE importacoes (
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
ALTER TABLE jurisprudencia ADD COLUMN importacao_id UUID REFERENCES importacoes(id) ON DELETE CASCADE;

-- Índice para acelerar deleções e contagens por importação
CREATE INDEX idx_jurisprudencia_importacao ON jurisprudencia(importacao_id);
