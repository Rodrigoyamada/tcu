CREATE OR REPLACE FUNCTION delete_import_safely(p_import_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Extende o timeout para 15 minutos (900000 ms) apenas para esta transação
    SET LOCAL statement_timeout = 900000;
    
    -- Deleta a importação (o ON DELETE CASCADE cuidará das jurisprudências)
    DELETE FROM importacoes WHERE id = p_import_id;
    
    RETURN true;
END;
$$;
