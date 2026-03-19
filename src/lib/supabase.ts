import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Categorias do TCU (Dados Abertos) ──────────────────────────────────────
// Ref: https://sites.tcu.gov.br/dados-abertos/jurisprudencia/
export type CategoriaTCU =
    | 'acordao'
    | 'sumula'
    | 'jurisprudencia_selecionada'
    | 'consulta'
    | 'publicacao_boletim_jurisprudencia'
    | 'publicacao_boletim_pessoal'
    | 'publicacao_informativo_licitacoes'

export const CATEGORIAS_TCU: { value: CategoriaTCU; label: string; pasta: string }[] = [
    { value: 'acordao',                            label: 'Acórdãos',                      pasta: 'acordaos/' },
    { value: 'sumula',                             label: 'Súmulas',                       pasta: 'sumulas/' },
    { value: 'jurisprudencia_selecionada',         label: 'Jurisprudência Selecionada',    pasta: 'jurisprudencia_selecionada/' },
    { value: 'consulta',                           label: 'Respostas a Consultas',         pasta: 'consultas/' },
    { value: 'publicacao_boletim_jurisprudencia',  label: 'Boletim de Jurisprudência',     pasta: 'publicacoes/boletim_jurisprudencia/' },
    { value: 'publicacao_boletim_pessoal',         label: 'Boletim de Pessoal',            pasta: 'publicacoes/boletim_pessoal/' },
    { value: 'publicacao_informativo_licitacoes',  label: 'Informativo de Licitações',     pasta: 'publicacoes/informativo_licitacoes/' },
]

export const STORAGE_BUCKET = 'jurisprudencia-tcu'

// ─── Status de processamento ─────────────────────────────────────────────────
export type StatusProcessamento = 'pendente' | 'processando' | 'concluido' | 'erro'

// ─── Tabelas Supabase ────────────────────────────────────────────────────────
export interface Jurisprudencia {
    id: string
    tipo: CategoriaTCU
    numero: string | null
    ano: number | null              // coluna gerada automaticamente via data_pub
    relator: string | null
    orgao: string | null
    data_pub: string | null         // formato ISO: YYYY-MM-DD
    ementa: string | null
    conteudo: string | null
    url: string | null
    created_at: string
    updated_at: string
}

export interface ArquivoTCU {
    id: string
    nome_arquivo: string
    categoria: CategoriaTCU
    ano: number | null
    url_storage: string             // path no bucket jurisprudencia-tcu
    tamanho_bytes: number | null
    status_processamento: StatusProcessamento
    registros_importados: number
    erro_detalhe: string | null
    created_at: string
    updated_at: string
}

// ─── Tipos legados (mantidos para compatibilidade) ───────────────────────────
export interface Parecer {
    id: string
    user_id: string
    title: string
    description: string | null
    content: string | null
    created_at: string
}
