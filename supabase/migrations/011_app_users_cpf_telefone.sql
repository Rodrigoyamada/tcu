-- Adiciona CPF e telefone ao cadastro de usuários
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS cpf      TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT;
