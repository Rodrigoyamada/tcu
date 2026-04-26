-- Função segura para adicionar créditos e gerar log financeiro em uma única transação
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INT, p_description TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Permite rodar com privilégios de admin, garantindo a operação
AS $$
BEGIN
    -- 1. Soma os créditos com segurança matemática
    UPDATE app_users 
    SET credits_balance = COALESCE(credits_balance, 0) + p_amount
    WHERE id = p_user_id;

    -- 2. Insere o registro de histórico (extrato)
    INSERT INTO token_ledger (user_id, amount, description)
    VALUES (p_user_id, p_amount, p_description);
END;
$$;
