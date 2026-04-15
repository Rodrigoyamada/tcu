import React, { useCallback, useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
    Upload, FileSpreadsheet, Check, X, Loader2,
    AlertCircle, ChevronDown, Info, Database, Trash2,
    BookMarked, Sparkles, ChevronRight, Pencil, Tag, Clock, Bell
} from 'lucide-react'
import { supabase, CATEGORIAS_TCU, type CategoriaTCU } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

// Todos os campos nativos do banco + __skip + __compose (campo composto)
type DbFieldKey =
    | 'numero' | 'titulo' | 'relator' | 'orgao' | 'data_pub'
    | 'ementa' | 'excerto' | 'conteudo' | 'url'
    | 'area' | 'tema' | 'tipo_processo' | 'situacao' | 'indexacao' | 'referencia_legal'
    | 'num_ata' | 'interessados' | 'entidade' | 'unidade_tecnica'
    | 'decisao' | 'quorum' | 'relatorio' | 'voto'
    | '__skip' | '__compose_num' | '__compose_ano'

interface DbFieldDef {
    key: DbFieldKey
    label: string
    hint?: string
}

// Campos mapeáveis por categoria — mostrados no dropdown de mapeamento
const CATEGORY_DB_FIELDS: Record<string, DbFieldDef[]> = {
    acordao: [
        { key: 'numero',          label: 'Número (composto NUMACORDAO/ANO)',   hint: 'Gerado automaticamente' },
        { key: '__compose_num',   label: 'Num. Acórdão ← parte do Número',    hint: 'Combina com coluna ANO' },
        { key: '__compose_ano',   label: 'Ano Acórdão ← parte do Número',     hint: 'Combina com coluna NUM' },
        { key: 'titulo',          label: 'Título',                             hint: 'TITULO' },
        { key: 'orgao',           label: 'Colegiado / Órgão',                 hint: 'COLEGIADO' },
        { key: 'data_pub',        label: 'Data da Sessão',                    hint: 'DATASESSAO' },
        { key: 'relator',         label: 'Relator',                           hint: 'RELATOR' },
        { key: 'situacao',        label: 'Situação',                          hint: 'SITUACAO' },
        { key: 'tipo_processo',   label: 'Tipo de Processo',                  hint: 'TIPOPROCESSO' },
        { key: 'interessados',    label: 'Interessados',                      hint: 'INTERESSADOS' },
        { key: 'entidade',        label: 'Entidade',                          hint: 'ENTIDADE' },
        { key: 'unidade_tecnica', label: 'Unidade Técnica',                   hint: 'UNIDADETECNICA' },
        { key: 'ementa',          label: 'Ementa ★ FTS',                      hint: 'ASSUNTO → busca FTS' },
        { key: 'excerto',         label: 'Excerto / Sumário',                 hint: 'SUMARIO' },
        { key: 'conteudo',        label: 'Conteúdo Principal ★ RAG',          hint: 'ACORDAO → texto para IA' },
        { key: 'decisao',         label: 'Decisão',                           hint: 'DECISAO' },
        { key: 'quorum',          label: 'Quórum',                            hint: 'QUORUM' },
        { key: 'num_ata',         label: 'Número da Ata',                     hint: 'NUMATA' },
        { key: 'relatorio',       label: 'Relatório ★ RAG',                   hint: 'RELATORIO' },
        { key: 'voto',            label: 'Voto ★ RAG',                        hint: 'VOTO' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
    jurisprudencia_selecionada: [
        { key: '__compose_num',   label: 'Num. Acórdão ← parte do Número' },
        { key: '__compose_ano',   label: 'Ano Acórdão ← parte do Número' },
        { key: 'orgao',           label: 'Colegiado / Órgão' },
        { key: 'data_pub',        label: 'Data da Sessão',   hint: 'DATASESSAOFORMATADA' },
        { key: 'relator',         label: 'Autor da Tese',    hint: 'AUTORTESE' },
        { key: 'area',            label: 'Área',             hint: 'AREA' },
        { key: 'tema',            label: 'Tema',             hint: 'TEMA' },
        { key: 'tipo_processo',   label: 'Tipo de Processo' },
        { key: 'ementa',          label: 'Enunciado ★ FTS',  hint: 'ENUNCIADO' },
        { key: 'conteudo',        label: 'Excerto ★ RAG',    hint: 'EXCERTO → texto para IA' },
        { key: 'indexacao',       label: 'Indexação',        hint: 'INDEXACAO' },
        { key: 'referencia_legal',label: 'Referência Legal', hint: 'REFERENCIALEGAL' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
    consulta: [
        { key: 'numero',          label: 'Número Formatado', hint: 'NUMACORDAOFORMATADO' },
        { key: '__compose_num',   label: 'Num. Acórdão ← parte do Número' },
        { key: '__compose_ano',   label: 'Ano Acórdão ← parte do Número' },
        { key: 'orgao',           label: 'Colegiado / Órgão' },
        { key: 'data_pub',        label: 'Data da Sessão' },
        { key: 'relator',         label: 'Autor da Tese' },
        { key: 'area',            label: 'Área' },
        { key: 'tema',            label: 'Tema' },
        { key: 'tipo_processo',   label: 'Tipo de Processo' },
        { key: 'ementa',          label: 'Enunciado ★ FTS' },
        { key: 'conteudo',        label: 'Excerto ★ RAG' },
        { key: 'indexacao',       label: 'Indexação' },
        { key: 'referencia_legal',label: 'Referência Legal' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
    sumula: [
        { key: 'numero',          label: 'Número da Súmula', hint: 'NUMERO' },
        { key: 'orgao',           label: 'Colegiado' },
        { key: 'data_pub',        label: 'Data da Sessão' },
        { key: 'relator',         label: 'Autor da Tese',    hint: 'AUTORTESE' },
        { key: 'area',            label: 'Área' },
        { key: 'tema',            label: 'Tema' },
        { key: 'tipo_processo',   label: 'Tipo de Processo' },
        { key: 'situacao',        label: 'Vigente',           hint: 'VIGENTE → situacao' },
        { key: 'ementa',          label: 'Enunciado ★ FTS',  hint: 'ENUNCIADO = texto da súmula' },
        { key: 'conteudo',        label: 'Excerto ★ RAG',    hint: 'EXCERTO → texto para IA' },
        { key: 'indexacao',       label: 'Indexação' },
        { key: 'referencia_legal',label: 'Referência Legal' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
    publicacao_boletim_jurisprudencia: [
        { key: 'numero',          label: 'Chave (KEY)',       hint: 'KEY' },
        { key: 'titulo',          label: 'Título' },
        { key: 'ementa',          label: 'Enunciado ★ FTS' },
        { key: 'referencia_legal',label: 'Referência',        hint: 'REFERENCIA' },
        { key: 'conteudo',        label: 'Texto Acórdão ★ RAG', hint: 'TEXTOACORDAO' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
    publicacao_boletim_pessoal: [
        { key: 'numero',          label: 'Número',            hint: 'NUMERO' },
        { key: 'titulo',          label: 'Título' },
        { key: 'ementa',          label: 'Enunciado ★ FTS' },
        { key: 'referencia_legal',label: 'Referência' },
        { key: 'conteudo',        label: 'Texto Acórdão ★ RAG' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
    publicacao_informativo_licitacoes: [
        { key: 'numero',          label: 'Número',            hint: 'NUMERO' },
        { key: 'titulo',          label: 'Título' },
        { key: 'orgao',           label: 'Colegiado' },
        { key: 'ementa',          label: 'Enunciado ★ FTS' },
        { key: 'conteudo',        label: 'Texto Acórdão ★ RAG', hint: 'TEXTOACORDAO' },
        { key: 'excerto',         label: 'Texto Informativo', hint: 'TEXTOINFO' },
        { key: '__skip',          label: '— Ignorar —' },
    ],
}

// Campos nativos válidos — tudo que não estiver aqui vai para metadata{}
const NATIVE_DB_FIELDS = new Set<string>([
    'numero', 'titulo', 'relator', 'orgao', 'data_pub', 'ementa', 'excerto', 'conteudo', 'url',
    'area', 'tema', 'tipo_processo', 'situacao', 'indexacao', 'referencia_legal',
    'num_ata', 'interessados', 'entidade', 'unidade_tecnica', 'decisao', 'quorum', 'relatorio', 'voto',
])

interface RowData { [col: string]: string }

interface ImportProfile {
    id: string
    name: string
    columns: string[]
    mapping: Record<string, DbFieldKey>
    created_at: string
}

interface ImportRecord {
    id: string
    nome_arquivo: string
    tamanho_bytes: number | null
    inicio_em: string
    fim_em: string | null
    total_linhas: number | null
    linha_atual: number | null
    status: 'processando' | 'concluido' | 'erro'
    observacoes: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Auto-detecta o campo de destino com base no nome da coluna e na categoria.
 * Usa regras específicas por categoria baseadas nos schemas reais dos CSVs do TCU.
 */
function guessMappingForCategory(header: string, cat: string): DbFieldKey {
    const h = header.trim().toUpperCase()

    // ── Regras compartilhadas ──────────────────────────────────────────────────
    if (h === 'KEY')                      return cat === 'publicacao_boletim_jurisprudencia' ? 'numero' : '__skip'
    if (h === 'COLEGIADO')                return 'orgao'
    if (h === 'TIPOPROCESSO')             return 'tipo_processo'
    if (h === 'AREA')                     return 'area'
    if (h === 'TEMA')                     return 'tema'
    if (h === 'INDEXACAO')                return 'indexacao'

    // ── Acórdãos ──────────────────────────────────────────────────────────────
    if (cat === 'acordao') {
        if (h === 'NUMACORDAO')           return '__compose_num'
        if (h === 'ANOACORDAO')           return '__compose_ano'
        if (h === 'TITULO')               return 'titulo'
        if (h === 'NUMATA')               return 'num_ata'
        if (h === 'DATASESSAO')           return 'data_pub'
        if (h === 'RELATOR')              return 'relator'
        if (h === 'SITUACAO')             return 'situacao'
        if (h === 'INTERESSADOS')         return 'interessados'
        if (h === 'ENTIDADE')             return 'entidade'
        if (h === 'UNIDADETECNICA')       return 'unidade_tecnica'
        if (h === 'ASSUNTO')              return 'ementa'
        if (h === 'SUMARIO')              return 'excerto'
        if (h === 'ACORDAO')              return 'conteudo'
        if (h === 'DECISAO')              return 'decisao'
        if (h === 'QUORUM')               return 'quorum'
        if (h === 'RELATORIO')            return 'relatorio'
        if (h === 'VOTO')                 return 'voto'
        return '__skip'
    }

    // ── Jurisprudência Selecionada ─────────────────────────────────────────────
    if (cat === 'jurisprudencia_selecionada') {
        if (h === 'NUMACORDAO')           return '__compose_num'
        if (h === 'ANOACORDAO')           return '__compose_ano'
        if (h === 'DATASESSAOFORMATADA')  return 'data_pub'
        if (h === 'AUTORTESE')            return 'relator'
        if (h === 'ENUNCIADO')            return 'ementa'
        if (h === 'EXCERTO')              return 'conteudo'
        if (h === 'REFERENCIALEGAL')      return 'referencia_legal'
        return '__skip'
    }

    // ── Respostas a Consultas ─────────────────────────────────────────────────
    if (cat === 'consulta') {
        if (h === 'NUMACORDAOFORMATADO')  return 'numero'
        if (h === 'NUMACORDAO')           return '__compose_num'
        if (h === 'ANOACORDAO')           return '__compose_ano'
        if (h === 'DATASESSAOFORMATADA')  return 'data_pub'
        if (h === 'AUTORTESE')            return 'relator'
        if (h === 'ENUNCIADO')            return 'ementa'
        if (h === 'EXCERTO')              return 'conteudo'
        if (h === 'REFERENCIALEGAL')      return 'referencia_legal'
        return '__skip'
    }

    // ── Súmulas ───────────────────────────────────────────────────────────────
    if (cat === 'sumula') {
        if (h === 'NUMERO')               return 'numero'
        if (h === 'DATASESSAOFORMATADA')  return 'data_pub'
        if (h === 'AUTORTESE')            return 'relator'
        if (h === 'VIGENTE')              return 'situacao'
        if (h === 'ENUNCIADO')            return 'ementa'
        if (h === 'EXCERTO')              return 'conteudo'
        if (h === 'REFERENCIALEGAL')      return 'referencia_legal'
        return '__skip'
    }

    // ── Boletim de Jurisprudência ─────────────────────────────────────────────
    if (cat === 'publicacao_boletim_jurisprudencia') {
        if (h === 'TITULO')               return 'titulo'
        if (h === 'ENUNCIADO')            return 'ementa'
        if (h === 'REFERENCIA')           return 'referencia_legal'
        if (h === 'TEXTOACORDAO')         return 'conteudo'
        return '__skip'
    }

    // ── Boletim de Pessoal ────────────────────────────────────────────────────
    if (cat === 'publicacao_boletim_pessoal') {
        if (h === 'NUMERO')               return 'numero'
        if (h === 'TITULO')               return 'titulo'
        if (h === 'ENUNCIADO')            return 'ementa'
        if (h === 'REFERENCIA')           return 'referencia_legal'
        if (h === 'TEXTOACORDAO')         return 'conteudo'
        return '__skip'
    }

    // ── Informativo de Licitações ─────────────────────────────────────────────
    if (cat === 'publicacao_informativo_licitacoes') {
        if (h === 'NUMERO')               return 'numero'
        if (h === 'TITULO')               return 'titulo'
        if (h === 'ENUNCIADO')            return 'ementa'
        if (h === 'TEXTOACORDAO')         return 'conteudo'
        if (h === 'TEXTOINFO')            return 'excerto'
        return '__skip'
    }

    return '__skip'
}

function parseDate(raw: string): string | null {
    if (!raw) return null
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    const match = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
    if (match) {
        const [, dd, mm, yy] = match
        const year = yy.length === 2 ? `20${yy}` : yy
        return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
    return null
}

/** Conta o total real de linhas de dados de um CSV via streaming (sem carregar na memória) */
async function countFileLines(file: File, enc: string, skip: number): Promise<number> {
    return new Promise((resolve) => {
        let lineCount = 0
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: enc,
            beforeFirstChunk: (chunk) => {
                if (skip === 0) return chunk
                const lines = chunk.split(/\r?\n/)
                return lines.slice(skip).join('\n')
            },
            step: () => { lineCount++ },
            complete: () => resolve(lineCount),
            error: () => resolve(0),
        })
    })
}

function profileScore(cols: string[], profile: ImportProfile): number {
    const profileCols = new Set(profile.columns.map(c => c.toLowerCase()))
    const matches = cols.filter(c => profileCols.has(c.toLowerCase())).length
    return matches / Math.max(cols.length, profile.columns.length)
}

function formatVal(val: string | null | undefined): string {
    if (!val) return '—'
    return new Date(val).toLocaleString('pt-BR')
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'confirm' | 'map' | 'save-profile' | 'importing' | 'done'

export default function ImportacaoPage() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const currentFileRef = useRef<File | null>(null)

    // Tabs
    const [activeTab, setActiveTab] = useState<'nova' | 'historico'>('nova')
    const [historico, setHistorico] = useState<ImportRecord[]>([])
    const [loadingHistorico, setLoadingHistorico] = useState(false)

    // File state
    const [dragging, setDragging] = useState(false)
    const [fileName, setFileName] = useState('')
    const [headers, setHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<RowData[]>([])
    const [mapping, setMapping] = useState<Record<string, DbFieldKey>>({})
    const [step, setStep] = useState<Step>('upload')
    const [importError, setImportError] = useState('')
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })
    const [categoria, setCategoria] = useState<CategoriaTCU>('acordao')

    // Profile state
    const [profiles, setProfiles] = useState<ImportProfile[]>([])
    const [suggestedProfile, setSuggestedProfile] = useState<ImportProfile | null>(null)
    const [suggestedScore, setSuggestedScore] = useState(0)
    const [saveProfileName, setSaveProfileName] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileSaved, setProfileSaved] = useState(false)
    const [showProfiles, setShowProfiles] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [sheetNames, setSheetNames] = useState<string[]>([])
    const [selectedSheet, setSelectedSheet] = useState<string>('')
    const [encoding, setEncoding] = useState<'ISO-8859-1' | 'UTF-8'>('ISO-8859-1')
    const [skipRows, setSkipRows] = useState(0)
    const [estimatedTotal, setEstimatedTotal] = useState(0)
    const [countingLines, setCountingLines] = useState(false)

    // ── Load data ──────────────────────────────────────────────────────────────

    useEffect(() => {
        loadProfiles()
    }, [])

    useEffect(() => {
        if (activeTab === 'historico') loadHistorico()
    }, [activeTab])

    const loadProfiles = async () => {
        const { data } = await supabase
            .from('import_profiles')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setProfiles(data as ImportProfile[])
    }

    const loadHistorico = async () => {
        setLoadingHistorico(true)
        const { data } = await supabase.from('importacoes').select('*').order('inicio_em', { ascending: false })
        if (data) setHistorico(data as ImportRecord[])
        setLoadingHistorico(false)
    }

    const afterParse = useCallback((cols: string[], data: RowData[]) => {
        const initial = Object.fromEntries(cols.map(c => [c, guessMappingForCategory(c, categoria)])) as Record<string, DbFieldKey>
        setHeaders(cols)
        setRows(data)
        setMapping(initial)

        let best: ImportProfile | null = null
        let bestScore = 0
        for (const p of profiles) {
            const s = profileScore(cols, p)
            if (s > bestScore) { bestScore = s; best = p }
        }

        if (best && bestScore >= 0.70) {
            const merged: Record<string, DbFieldKey> = { ...initial }
            for (const col of cols) {
                const found = Object.entries(best.mapping).find(
                    ([k]) => k.toLowerCase() === col.toLowerCase()
                )
                if (found) merged[col] = found[1] as DbFieldKey
            }
            setMapping(merged)
            setSuggestedProfile(best)
            setSuggestedScore(Math.round(bestScore * 100))
            setStep('confirm')
        } else {
            const values = Object.values(initial)
            const hasCritical = values.includes('numero') || values.includes('ementa') || values.includes('conteudo')
            const allUnknown = values.every(v => v === '__skip')
            setSuggestedProfile(null)
            setSuggestedScore(0)
            setStep((allUnknown || !hasCritical) ? 'map' : 'confirm')
        }
    }, [profiles, categoria])

    const handleSheetChange = async (sheet: string) => {
        if (!fileInputRef.current?.files?.[0]) return
        const file = fileInputRef.current.files[0]
        const reader = new FileReader()
        reader.onload = (e) => {
            const data = new Uint8Array(e.target!.result as ArrayBuffer)
            const wb = XLSX.read(data, { type: 'array', cellDates: true })
            const ws = wb.Sheets[sheet]
            const json: RowData[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '', blankrows: false, range: 500 })
            if (json.length > 0) {
                setSelectedSheet(sheet)
                afterParse(Object.keys(json[0]), json)
            } else {
                setImportError(`A aba "${sheet}" parece estar vazia.`)
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const processFile = useCallback((file: File, options?: { enc?: 'ISO-8859-1'|'UTF-8', skip?: number }) => {
        currentFileRef.current = file
        const currentEnc = options?.enc || encoding
        const currentSkip = options?.skip !== undefined ? options?.skip : skipRows
        
        setFileName(file.name)
        setSaveProfileName(file.name.replace(/\.[^/.]+$/, ''))
        setProfileSaved(false)
        setImportError('')
        setSheetNames([])
        
        const ext = file.name.split('.').pop()?.toLowerCase()
        const isLarge = file.size > 5 * 1024 * 1024 // > 5MB

        if (ext === 'csv' || ext === 'txt') {
            // Primeiro, vamos tentar ler as primeiras linhas para detectar metadados
            Papa.parse(file, {
                preview: 5,
                encoding: currentEnc,
                complete: (results) => {
                    const rawLines = results.data as string[][]
                    let detectedSkip = 0
                    
                    // Se a primeira linha contém "Atualização" ou algo do tipo, vamos procurar o cabeçalho real
                    for(let i=0; i < rawLines.length; i++) {
                        const lineStr = (rawLines[i] || []).join(',').toLowerCase()
                        if (lineStr.includes('atualização') || lineStr.includes('versão') || lineStr.trim() === '') {
                            detectedSkip = i + 1
                        } else if (/(numero|acordao|nracordao|ementa|relator)/i.test(lineStr)) {
                            detectedSkip = i
                            break
                        }
                    }
                    
                    if (currentSkip !== detectedSkip && options?.skip === undefined) {
                        setSkipRows(detectedSkip)
                    }

                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        preview: 200,
                        encoding: currentEnc,
                        beforeFirstChunk: (chunk) => {
                            if (detectedSkip === 0) return chunk
                            const lines = chunk.split(/\r?\n/)
                            return lines.slice(detectedSkip).join('\n')
                        },
                        complete: async ({ data, meta }) => {
                            const rows = data as RowData[]
                            if (rows.length === 0) {
                                setImportError('Arquivo CSV vazio ou com formato inválido.')
                                return
                            }
                            afterParse(meta.fields || [], rows)

                            // Contagem real de linhas em background (streaming)
                            setCountingLines(true)
                            const total = await countFileLines(file, currentEnc, detectedSkip)
                            setEstimatedTotal(total)
                            setCountingLines(false)
                        },
                        error: () => setImportError('Erro ao ler o arquivo CSV.'),
                    })
                }
            })
        } else if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target!.result as ArrayBuffer)
                    const wb = XLSX.read(data, { type: 'array', cellDates: true })
                    setSheetNames(wb.SheetNames)
                    const firstSheet = wb.SheetNames[0]
                    setSelectedSheet(firstSheet)
                    const ws = wb.Sheets[firstSheet]
                    const json: RowData[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '', blankrows: false, range: isLarge ? 500 : undefined })
                    if (json.length === 0) {
                        setImportError(`A aba "${firstSheet}" parece estar vazia.`)
                        return
                    }
                    afterParse(Object.keys(json[0]), json)
                } catch (err) {
                    setImportError('Erro ao processar arquivo Excel.')
                }
            }
            reader.readAsArrayBuffer(file)
        } else {
            setImportError('Formato não suportado. Use .xlsx, .xls ou .csv')
        }
    }, [afterParse, encoding, skipRows])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false)
        if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
    }, [processFile])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processFile(e.target.files[0])
    }

    const applyProfile = (p: ImportProfile) => {
        const merged: Record<string, DbFieldKey> = {}
        for (const col of headers) {
            const found = Object.entries(p.mapping).find(([k]) => k.toLowerCase() === col.toLowerCase())
            merged[col] = found ? (found[1] as DbFieldKey) : guessMappingForCategory(col, categoria)
        }
        setMapping(merged)
        setSuggestedProfile(p)
        setStep('confirm')
    }

    const handleImport = async () => {
        const file = currentFileRef.current
        if (!file) return

        setStep('importing')
        setImportError('')
        const BATCH_SIZE = 200
        let batch: any[] = []
        let processedCount = 0
        let errorsCount = 0
        const ext = file.name.split('.').pop()?.toLowerCase()
        const isLarge = file.size > 2 * 1024 * 1024

        const { data: session, error: sessErr } = await supabase.from('importacoes').insert({
            nome_arquivo: fileName,
            total_linhas: 0, // Inicia vazio, atualiza no fim
            status: 'processando'
        }).select('id').single()

        if (sessErr || !session) {
            setImportError('Erro ao iniciar importação: ' + sessErr?.message)
            setStep('upload')
            return
        }

        const importId = session.id

        const insertBatch = async () => {
            if (batch.length === 0) return
            // Usa upsert com ignoreDuplicates — ignora silenciosamente linhas com 'numero' repetido
            // Requer o índice único idx_jurisprudencia_numero_unique (já existe no banco)
            const { error } = await supabase.from('jurisprudencia').upsert(batch, {
                onConflict: 'numero',
                ignoreDuplicates: true
            })
            if (error) {
                console.error('Erro no lote:', error)
                // Mostra o erro do PRIMEIRO lote para diagnóstico
                if (errorsCount === 0) {
                    alert('DIAGNÓSTICO - Erro no 1º lote:\nCode: ' + error.code + '\nMsg: ' + error.message + '\nDetails: ' + error.details)
                }
                errorsCount += batch.length
            }
            processedCount += batch.length
            setProgress(p => ({ 
                ...p, 
                done: processedCount, 
                total: estimatedTotal || (isLarge ? Math.max(processedCount + 1000, p.total) : rows.length), 
                errors: errorsCount 
            }))
            batch = []
            if (processedCount % 2000 === 0) {
                await supabase.from('importacoes').update({ linha_atual: processedCount }).eq('id', importId)
            }
        }

        const processRow = (row: RowData) => {
            if (!row) return
            const rec: Record<string, any> = { tipo: categoria, importacao_id: importId }
            const extraMeta: Record<string, string> = {}
            let composeNum = ''
            let composeAno = ''
            let hasData = false

            // ── Mapeamento via configuração do usuário ────────────────────────
            for (const [col, field] of Object.entries(mapping)) {
                const val = (row[col] ?? '').toString().trim()
                if (!val) continue

                if (field === '__skip') continue

                if (field === '__compose_num') {
                    composeNum = val
                    continue
                }
                if (field === '__compose_ano') {
                    composeAno = val
                    continue
                }

                if (NATIVE_DB_FIELDS.has(field)) {
                    rec[field] = field === 'data_pub' ? parseDate(val)
                               : field === 'numero'   ? val.substring(0, 200)
                               : val
                    hasData = true
                } else {
                    // Campo não nativo → acumula no JSONB
                    extraMeta[col] = val
                }
            }

            // ── Composição de numero por categoria ───────────────────────────
            if (!rec['numero']) {
                if (composeNum && composeAno) {
                    // Acórdãos, Juris. Selecionada, Consultas
                    rec['numero'] = `${composeNum}/${composeAno}`.substring(0, 200)
                    hasData = true
                } else if (
                    // Fallback: KEY universal (todos os CSVs do TCU têm KEY)
                    (row['KEY'] ?? '').trim()
                ) {
                    rec['numero'] = (row['KEY'] ?? '').trim().substring(0, 200)
                    hasData = true
                }
            }

            // ── Metadados extras ─────────────────────────────────────────────
            if (Object.keys(extraMeta).length > 0) {
                rec['metadata'] = extraMeta
            }

            if (hasData) batch.push(rec)
        }

        if (ext === 'csv' || ext === 'txt') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: encoding,
                beforeFirstChunk: (chunk) => {
                    if (skipRows === 0) return chunk
                    const lines = chunk.split(/\r?\n/)
                    return lines.slice(skipRows).join('\n')
                },
                step: async (results, parser) => {
                    processRow(results.data as RowData)
                    if (batch.length >= BATCH_SIZE) {
                        parser.pause()
                        await insertBatch()
                        parser.resume()
                    }
                },
                complete: async () => {
                    await insertBatch()
                    await supabase.from('importacoes').update({
                        status: processedCount === 0 && errorsCount > 0 ? 'erro' : 'concluido',
                        total_linhas: processedCount,
                        linha_atual: processedCount,
                        fim_em: new Date().toISOString()
                    }).eq('id', importId)
                    setStep('done')
                },
                error: (err) => {
                    setImportError('Erro no fluxo: ' + err.message)
                    setStep('upload')
                }
            })
        } else {
            // Excel: Para arquivos grandes, o ideal é re-ler agora sem o range de amostragem
            const reader = new FileReader()
            reader.onload = async (e) => {
                try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer)
                const wb = XLSX.read(data, { type: 'array', cellDates: true })
                const ws = wb.Sheets[selectedSheet || wb.SheetNames[0]]
                const fullData: RowData[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '', blankrows: false })
                
                for (const row of fullData) {
                    processRow(row)
                    if (batch.length >= BATCH_SIZE) await insertBatch()
                }
                await insertBatch()
                await supabase.from('importacoes').update({ status: 'concluido', total_linhas: processedCount, linha_atual: processedCount, fim_em: new Date().toISOString() }).eq('id', importId)
                setStep('done')
                } catch (err) {
                    setImportError('Erro ao processar Excel completo.')
                    setStep('upload')
                }
            }
            reader.readAsArrayBuffer(file)
        }
    }


    const handleDeleteImport = async (id: string) => {
        if (!window.confirm('ATENÇÃO: Os acórdãos deste arquivo serão APAGADOS DEFINITIVAMENTE. Deseja prosseguir?')) return
        setDeletingId(id)
        try {
            // Deleta em lotes de 500 — cada chamada leva ~3s e é segura dentro do timeout
            let deletedCount = 1
            while (deletedCount > 0) {
                const { data, error } = await supabase.rpc('delete_import_chunk', {
                    p_import_id: id,
                    p_limit: 500
                })
                if (error) throw error
                deletedCount = data || 0
            }

            // Remove o registro mestre do histórico
            const { error: finalError } = await supabase.from('importacoes').delete().eq('id', id)
            if (finalError) throw finalError

            await loadHistorico()
        } catch (err: any) {
            console.error('Erro ao excluir importação:', err)
            alert('Erro ao excluir:\n\n' + JSON.stringify(err, null, 2))
        } finally {
            setDeletingId(null)
        }
    }

    // ── Save profile & Reset ───────────────────────────────────────────────────

    const handleSaveProfile = async () => {
        if (!saveProfileName.trim()) return
        setSavingProfile(true)
        const { error } = await supabase.from('import_profiles').insert({
            name: saveProfileName.trim(),
            columns: headers,
            mapping: mapping,
        })
        setSavingProfile(false)
        if (!error) {
            setProfileSaved(true)
            await loadProfiles()
        }
    }

    const handleDeleteProfile = async (id: string) => {
        setDeletingId(id)
        await supabase.from('import_profiles').delete().eq('id', id)
        setDeletingId(null)
        await loadProfiles()
    }

    const handleReset = () => {
        setStep('upload'); setFileName(''); setHeaders([]); setRows([])
        setMapping({}); setProgress({ done: 0, total: 0, errors: 0 })
        setImportError(''); setSuggestedProfile(null); setSaveProfileName('')
        setProfileSaved(false); setCategoria('acordao'); setEstimatedTotal(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const stepLabels = ['1. Arquivo', '2. Colunas', '3. Importando', '4. Concluído']

    return (
        <div className="p-6 max-w-4xl mx-auto">

            {/* Header & Tabs */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Database className="w-3.5 h-3.5" />
                        <span>Gerenciamento de Dados</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Importar Jurisprudência</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* TABS */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('nova')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'nova' ? 'bg-white text-[#1F4E79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Nova Importação
                        </button>
                        <button onClick={() => setActiveTab('historico')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'historico' ? 'bg-white text-[#1F4E79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Histórico
                        </button>
                    </div>

                    {/* Botão de Teste (Admin Temporário) */}
                    <button
                        onClick={async () => {
                            const { error } = await supabase.from('notificacoes').insert([
                                { 
                                    titulo: 'Teste de Alerta', 
                                    mensagem: '- NOVO ARQUIVO: Atualização do Banco TCU\nO sistema de alertas em tempo real está funcionando perfeitamente!',
                                    lida: false
                                }
                            ])
                            if(error) alert('Erro ao mandar alerta: ' + error.message)
                        }}
                        title="Disparar uma notificação falsa para testar o sininho"
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-2"
                    >
                        <Bell className="w-4 h-4" />
                        Testar Alerta
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* HISTÓRICO TAB */}
            {/* ========================================================================= */}
            {activeTab === 'historico' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-700">Arquivos Importados no Banco</h2>
                        <button onClick={loadHistorico}
                            disabled={loadingHistorico}
                            className="text-sm text-[#2E75B6] hover:underline flex items-center gap-1">
                            {loadingHistorico ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />} 
                            Atualizar
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-5 py-3.5">Nome do Arquivo</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5">Início / Fim</th>
                                        <th className="px-5 py-3.5 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historico.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                                                Nenhuma importação registrada ainda.
                                            </td>
                                        </tr>
                                    ) : historico.map((h) => (
                                        <tr key={h.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3.5">
                                                <div className="font-medium text-slate-700">{h.nome_arquivo}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {h.status === 'concluido'
                                                        ? `${(h.total_linhas || 0).toLocaleString('pt-BR')} linhas importadas`
                                                        : `${(h.linha_atual || 0).toLocaleString('pt-BR')} / ${(h.total_linhas || 0).toLocaleString('pt-BR')} linhas`
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                    ${h.status === 'concluido' ? 'bg-green-100 text-green-700' :
                                                      h.status === 'erro' ? 'bg-red-100 text-red-700' :
                                                      'bg-amber-100 text-amber-700'}`}>
                                                    {h.status === 'concluido' ? 'Concluído' : h.status === 'erro' ? 'Erro' : 'Processando'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="text-slate-600">{formatVal(h.inicio_em)}</div>
                                                <div className="text-xs text-slate-400">{formatVal(h.fim_em)}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    onClick={() => handleDeleteImport(h.id)}
                                                    disabled={deletingId === h.id}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block disabled:opacity-50 disabled:cursor-wait"
                                                    title="Apagar dados importados"
                                                >
                                                    {deletingId === h.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Trash2 className="w-4 h-4" />
                                                    }
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* NOVA IMPORTAÇÃO TAB */}
            {/* ========================================================================= */}
            {activeTab === 'nova' && (
                <>
                    {/* Header Progress and Clear */}
                    {step !== 'upload' && (
                        <div className="flex justify-end mb-4">
                            <button onClick={handleReset}
                                className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm transition-all">
                                <Trash2 className="w-4 h-4" /> Limpar Formulário
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-8">
                        {(['upload', 'map', 'importing', 'done'] as const).map((s, idx) => {
                            const realActive = (step === 'upload' && idx === 0)
                                || ((step === 'confirm' || step === 'map' || step === 'save-profile') && idx === 1)
                                || (step === 'importing' && idx === 2)
                                || (step === 'done' && idx === 3)
                            const realDone = (step !== 'upload' && idx === 0)
                                || (step === 'importing' && idx <= 1)
                                || (step === 'done' && idx <= 2)
                            return (
                                <React.Fragment key={s}>
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${realDone ? 'bg-green-100 text-green-700' :
                                            realActive ? 'bg-[#2E75B6] text-white shadow-sm' :
                                                'bg-slate-100 text-slate-400'}`}>
                                        {realDone && <Check className="w-3 h-3" />}
                                        {stepLabels[idx]}
                                    </div>
                                    {idx < 3 && <div className="h-px flex-1 bg-slate-200" />}
                                </React.Fragment>
                            )
                        })}
                    </div>

                    {/* ── STEP 1: Upload ── */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-4 h-4 text-[#2E75B6]" />
                                    <h2 className="font-semibold text-slate-700 text-sm">Categoria do arquivo</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {CATEGORIAS_TCU.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setCategoria(cat.value)}
                                            className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all border ${
                                                categoria === cat.value
                                                    ? 'bg-[#2E75B6] text-white border-[#2E75B6] shadow-sm'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#2E75B6] hover:text-[#2E75B6]'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sheet Selector (only if multiple sheets) */}
                            {sheetNames.length > 1 && fileName && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                        Múltiplas abas detectadas no arquivo
                                    </div>
                                    <p className="text-xs text-amber-700">Selecione qual aba contém os dados para importação:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {sheetNames.map(name => (
                                            <button
                                                key={name}
                                                onClick={() => handleSheetChange(name)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                                    selectedSheet === name
                                                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                                        : 'bg-white text-amber-700 border-amber-200 hover:border-amber-600'
                                                }`}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                <Info className="w-4 h-4 text-[#2E75B6] flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-[#1F4E79] space-y-1">
                                    <p><strong>Formatos aceitos:</strong> .xlsx, .xls (Excel) e .csv</p>
                                    <p><strong>Perfis salvos:</strong> se você já importou este tipo de planilha, o mapeamento será automático.</p>
                                </div>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${dragging ? 'border-[#2E75B6] bg-blue-50 scale-[1.01]' : 'border-slate-200 bg-white hover:border-[#2E75B6] hover:bg-blue-50/30'
                                    }`}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragging ? 'bg-[#2E75B6]' : 'bg-slate-100'}`}>
                                    <Upload className={`w-8 h-8 ${dragging ? 'text-white' : 'text-slate-400'}`} />
                                </div>
                                <p className="font-semibold text-slate-700 mb-1">{dragging ? 'Solte o arquivo aqui' : 'Arraste e solte seu arquivo'}</p>
                                <p className="text-sm text-slate-400 mb-4">ou clique para selecionar</p>
                                <div className="flex items-center gap-2">
                                    {['.xlsx', '.xls', '.csv'].map(ext => (
                                        <span key={ext} className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs rounded-full font-mono">{ext}</span>
                                    ))}
                                </div>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFileChange} />
                            </div>

                            {importError && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {importError}
                                </div>
                            )}

                            {profiles.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => setShowProfiles(p => !p)}
                                        className="w-full flex items-center justify-between px-5 py-3.5 text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 font-semibold text-slate-700">
                                            <BookMarked className="w-4 h-4 text-[#2E75B6]" />
                                            Perfis de importação salvos ({profiles.length})
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfiles ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showProfiles && (
                                        <div className="border-t border-slate-100 divide-y divide-slate-50">
                                            {profiles.map(p => (
                                                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                                                            {p.columns.filter(c => p.mapping[c] !== '__skip').join(' · ')}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteProfile(p.id)}
                                                        disabled={deletingId === p.id}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        {deletingId === p.id
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2a: Confirm ── */}
                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-800 text-sm truncate">{fileName}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {countingLines ? (
                                            <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin inline" /> Contando registros…</span>
                                        ) : (
                                            <>{(estimatedTotal || rows.length).toLocaleString('pt-BR')} registros · {headers.length} colunas</>
                                        )}
                                    </p>
                                </div>
                                {suggestedProfile && (
                                    <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0">
                                        <Sparkles className="w-3.5 h-3.5" /> Perfil: {suggestedProfile.name} ({suggestedScore}%)
                                    </div>
                                )}
                                {!suggestedProfile && (
                                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0">
                                        <Check className="w-3.5 h-3.5" /> Auto-detectado
                                    </div>
                                )}
                            </div>

                            {profiles.filter(p => p.id !== suggestedProfile?.id).length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-slate-100">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usar outro perfil</p>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {profiles.filter(p => p.id !== suggestedProfile?.id).map(p => {
                                            const score = Math.round(profileScore(headers, p) * 100)
                                            return (
                                                <button key={p.id} onClick={() => applyProfile(p)}
                                                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                                                    <BookMarked className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700">{p.name}</p>
                                                        <p className="text-xs text-slate-400">{score}% compatível</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                    <h2 className="font-semibold text-slate-700 text-sm">Mapeamento de colunas</h2>
                                    <button onClick={() => setStep('map')}
                                        className="flex items-center gap-1 text-xs text-[#2E75B6] hover:underline">
                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                    </button>
                                </div>
                                <div className="px-5 py-3 border-b border-slate-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            Pré-visualização (Primeiros Registros)
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-500">Codificação:</span>
                                                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                                    {(['ISO-8859-1', 'UTF-8'] as const).map(enc => (
                                                        <button
                                                            key={enc}
                                                            onClick={() => {
                                                                setEncoding(enc)
                                                                if (currentFileRef.current) processFile(currentFileRef.current, { enc: enc })
                                                            }}
                                                            className={`px-2 py-0.5 rounded-md transition-all ${encoding === enc ? 'bg-white text-[#1F4E79] shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                                                        >
                                                            {enc === 'ISO-8859-1' ? 'ANSI' : 'UTF-8'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-500 ml-2">Pular Cabeçalho:</span>
                                                <input 
                                                    type="number"
                                                    value={skipRows}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0
                                                        setSkipRows(val)
                                                        if (currentFileRef.current) processFile(currentFileRef.current, { skip: val })
                                                    }}
                                                    className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center focus:ring-1 focus:ring-blue-100 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[10px] text-left border-collapse">
                                                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                                    <tr>
                                                        {headers.slice(0, 8).map(h => (
                                                            <th key={h} className="px-3 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={h}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                        {headers.length > 8 && <th className="px-3 py-1.5">...</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {rows.slice(0, 3).map((row, i) => (
                                                        <tr key={i}>
                                                            {headers.slice(0, 8).map(h => (
                                                                <td key={h} className="px-3 py-1.5 text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                                                                    {row[h]}
                                                                </td>
                                                            ))}
                                                            {headers.length > 8 && <td className="px-3 py-1.5">...</td>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-5 py-3 flex flex-wrap gap-2">
                                    {headers.filter(h => mapping[h] !== '__skip').map(h => {
                                        const fieldDef = (CATEGORY_DB_FIELDS[categoria] || []).find(f => f.key === mapping[h])
                                        return (
                                        <div key={h} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                                            <span className="font-mono text-slate-600">{h}</span>
                                            <span className="text-slate-300">→</span>
                                            <span className="font-medium text-[#1F4E79]">
                                                {fieldDef?.label || mapping[h]}
                                            </span>
                                        </div>
                                    )})}
                                    {headers.filter(h => mapping[h] === '__skip').length > 0 && (
                                        <div className="text-xs text-slate-300 border border-slate-100 bg-slate-50 rounded-lg px-3 py-1.5">
                                            ignoradas: {headers.filter(h => mapping[h] === '__skip').join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <button id="btn-importar" onClick={handleImport}
                                    disabled={countingLines}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow hover:shadow-md hover:from-[#1a4368] hover:to-[#2563a0] transition-all disabled:opacity-60">
                                    {countingLines ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    {countingLines ? 'Contando registros…' : `Importar ${(estimatedTotal || rows.length).toLocaleString('pt-BR')} registros`}
                                </button>
                                {estimatedTotal > rows.length && (
                                    <div className="w-full mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>Este arquivo contém <strong>{estimatedTotal.toLocaleString('pt-BR')}</strong> registros. A pré-visualização acima mostra apenas os primeiros {rows.length} para verificação.</span>
                                    </div>
                                )}
                                <button onClick={() => setStep('save-profile')}
                                    className="flex items-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                                    <BookMarked className="w-4 h-4" /> Salvar como perfil
                                </button>
                                <button onClick={handleReset} className="px-4 py-3 text-slate-400 text-sm hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2b: Save profile ── */}
                    {step === 'save-profile' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                        <BookMarked className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-800">Salvar perfil de importação</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Da próxima vez que importar uma planilha igual, o mapeamento será automático.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Nome do perfil</label>
                                    <input
                                        type="text"
                                        value={saveProfileName}
                                        onChange={e => setSaveProfileName(e.target.value)}
                                        placeholder="Ex: Informativo Plenário..."
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                                    />
                                </div>

                                {profileSaved && (
                                    <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                                        <Check className="w-4 h-4" /> Perfil salvo com sucesso!
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={handleSaveProfile} disabled={savingProfile || !saveProfileName.trim() || profileSaved}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow">
                                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar perfil
                                    </button>
                                    <button onClick={() => setStep('confirm')} className="px-4 py-2.5 text-slate-500 text-sm hover:bg-slate-100 rounded-xl">
                                        {profileSaved ? 'Prosseguir' : 'Cancelar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2c: Manual column map ── */}
                    {step === 'map' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm truncate">{fileName}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {currentFileRef.current && currentFileRef.current.size > 5 * 1024 * 1024
                                            ? `Arquivo grande (${(currentFileRef.current.size / 1024 / 1024).toFixed(1)} MB) - Amostra de ${rows.length} registros para mapeamento`
                                            : `${rows.length.toLocaleString('pt-BR')} linhas`
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                    <h2 className="font-semibold text-slate-700 text-sm">Mapeamento de Colunas</h2>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {headers.map((col) => (
                                        <div key={col} className="flex items-center gap-4 px-5 py-3">
                                            <div className="w-52 flex-shrink-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{col}</p>
                                                <p className="text-xs text-slate-300 truncate mt-0.5">
                                                    {(rows[0]?.[col] ?? '').toString().slice(0, 40) || '—'}
                                                </p>
                                            </div>
                                            <div className="text-slate-300 text-sm flex-shrink-0">→</div>
                                            <div className="flex-1 relative">
                                                <select
                                                    value={mapping[col] || '__skip'}
                                                    onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value as DbFieldKey }))}
                                                    className="w-full appearance-none px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                                                >
                                                    {(CATEGORY_DB_FIELDS[categoria] || []).map(f => (
                                                        <option key={f.key} value={f.key}>{f.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <button onClick={handleImport}
                                    disabled={countingLines}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow hover:shadow-md hover:from-[#1a4368] hover:to-[#2563a0] transition-all disabled:opacity-60">
                                    {countingLines ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    {currentFileRef.current && currentFileRef.current.size > 5 * 1024 * 1024 
                                        ? `Importar arquivo completo (${(estimatedTotal || rows.length).toLocaleString('pt-BR')} registros)` 
                                        : `Importar ${(estimatedTotal || rows.length).toLocaleString('pt-BR')} registros`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Importing ── */}
                    {step === 'importing' && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                                <Loader2 className="w-8 h-8 text-[#2E75B6] animate-spin" />
                            </div>
                            <h2 className="text-lg font-bold text-[#1F4E79] mb-1">Importando para o banco…</h2>
                            <p className="text-sm text-slate-400 mb-6">Não feche esta aba ou a importação pode ser interrompida.</p>
                            <div className="w-full max-w-sm">
                                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                                    <span>{progress.done.toLocaleString('pt-BR')} de {progress.total.toLocaleString('pt-BR')}</span>
                                    <span>{Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div className="h-2.5 rounded-full bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] transition-all duration-300"
                                        style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Done ── */}
                    {step === 'done' && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center text-center">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${progress.errors === progress.total ? 'bg-red-50' : 'bg-green-50'}`}>
                                {progress.errors === progress.total ? <X className="w-8 h-8 text-red-500" /> : <Check className="w-8 h-8 text-green-600" />}
                            </div>
                            <h2 className="text-lg font-bold text-[#1F4E79] mb-1">
                                {progress.errors === progress.total ? 'Falha na importação' : 'Importação concluída!'}
                            </h2>
                            <div className="flex gap-6 mt-4 mb-8">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-green-700">{(progress.total - progress.errors).toLocaleString('pt-BR')}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">salvos no banco</p>
                                </div>
                                {progress.errors > 0 && (
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-red-500">{progress.errors.toLocaleString('pt-BR')}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">erros</p>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { handleReset(); setActiveTab('historico'); }}
                                className="px-5 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl hover:from-[#1a4368] hover:to-[#2563a0] transition-all shadow">
                                Ir para Histórico de Importações
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
