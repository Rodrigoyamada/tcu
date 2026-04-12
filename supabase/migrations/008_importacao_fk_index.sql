-- Adiciona índice na foreign key para otimizar exclusão em cascata (evitar statement timeout)
CREATE INDEX IF NOT EXISTS idx_jurisprudencia_importacao_id ON jurisprudencia(importacao_id);
