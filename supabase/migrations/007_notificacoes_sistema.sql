-- Tabela para o robô lembrar a última atualização vista no TCU
CREATE TABLE IF NOT EXISTS monitores_tcu (
    fonte TEXT PRIMARY KEY,
    ultima_leitura TEXT NOT NULL,
    checagem_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para armazenar as notificações do sistema (Sininho)
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    url_acao TEXT,
    lida BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS (Opcional, mas boa prática, permitindo todos acessarem por enquanto ou vincular ao user_id depois se houver auth RLS real)
-- Por enquanto, nosso Supabase usa anon key aberta no cliente.
