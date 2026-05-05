import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Storage customizado para desviar do bug de Web Locks (Deadlock) do Supabase
const customStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    storageKey: 'techdocstcu-auth-token',
    // Bypassa o Web Locks API do navegador que causa deadlock no Chrome ao recarregar
    lock: (_name: string, _timeout: number, fn: () => Promise<unknown>) => fn() as any,
  }
})
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

    // ─── Identificação / Cabeçalho ────────────────────────────────────────────
    relator: string | null          // RELATOR (acórdão), AUTORTESE (juris/consulta/súmula)
    orgao: string | null            // COLEGIADO
    data_pub: string | null         // DATASESSAO / DATASESSAOFORMATADA — formato ISO: YYYY-MM-DD
    titulo: string | null           // TITULO (acórdão, boletins, informativo)

    // ─── Conteúdo Principal ───────────────────────────────────────────────────
    ementa: string | null           // ASSUNTO (acórdão) | ENUNCIADO (demais) — FTS principal
    excerto: string | null          // SUMARIO (acórdão) | EXCERTO (juris/consulta/súmula) | TEXTOINFO (informativo)
    conteudo: string | null         // ACORDAO (acórdão) | EXCERTO/TEXTOACORDAO (demais) — RAG

    // ─── Classificação Temática ───────────────────────────────────────────────
    area: string | null             // AREA (juris_selecionada, consulta, súmula)
    tema: string | null             // TEMA (juris_selecionada, consulta, súmula)
    tipo_processo: string | null    // TIPOPROCESSO (4 categorias)
    situacao: string | null         // SITUACAO (acórdão) | VIGENTE (súmula)
    indexacao: string | null        // INDEXACAO — palavras-chave para FTS
    referencia_legal: string | null // REFERENCIALEGAL (juris/consulta/súmula) | REFERENCIA (boletins)

    // ─── Específico de Acórdãos ───────────────────────────────────────────────
    num_ata: string | null          // NUMATA
    interessados: string | null     // INTERESSADOS
    entidade: string | null         // ENTIDADE
    unidade_tecnica: string | null  // UNIDADETECNICA
    decisao: string | null          // DECISAO
    quorum: string | null           // QUORUM
    relatorio: string | null        // RELATORIO (texto longo)
    voto: string | null             // VOTO (texto longo)

    // ─── Metadados Flexíveis ──────────────────────────────────────────────────
    metadata: Record<string, unknown> // Campos extras não mapeados como colunas nativas
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
