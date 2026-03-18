import React, { useCallback, useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
    Upload, FileSpreadsheet, Check, X, Loader2,
    AlertCircle, ChevronDown, Info, Database, Trash2,
    BookMarked, Sparkles, ChevronRight, Pencil,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

const DB_FIELDS = [
    { key: 'tipo', label: 'Tipo', required: true, hint: 'acordao | sumula | boletim | informativo' },
    { key: 'numero', label: 'Número', required: false, hint: 'Ex: Acórdão 1234/2023' },
    { key: 'relator', label: 'Relator', required: false, hint: 'Nome do relator' },
    { key: 'orgao', label: 'Órgão', required: false, hint: 'Ex: Plenário, 1ª Câmara' },
    { key: 'data_pub', label: 'Data', required: false, hint: 'Data de publicação' },
    { key: 'ementa', label: 'Ementa', required: false, hint: 'Resumo / sumário (busca)' },
    { key: 'conteudo', label: 'Conteúdo', required: false, hint: 'Texto completo' },
    { key: 'url', label: 'URL', required: false, hint: 'Link original' },
    { key: '__skip', label: '— Ignorar —', required: false, hint: '' },
] as const

type DbFieldKey = typeof DB_FIELDS[number]['key']

interface RowData { [col: string]: string }

interface ImportProfile {
    id: string
    name: string
    columns: string[]
    mapping: Record<string, DbFieldKey>
    created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guessMapping(header: string): DbFieldKey {
    const h = header.toLowerCase().replace(/[^a-záéíóúâêôçã]/gi, '')
    if (/^(tipo|key|classe|categoria|kind)$/.test(h)) return 'tipo'
    if (/numero|num|acordao|acordão|sumula|súmula|informativo|boletim/.test(h)) return 'numero'
    if (/relator|ministro/.test(h)) return 'relator'
    if (/orgao|órgão|colegiado|camara|câmara|plenario|plenário|tribunal/.test(h)) return 'orgao'
    if (/^(data|pub|publicacao|publicação|sessao|sessão|date)$/.test(h)) return 'data_pub'
    if (/ementa|enunciado|resumo|sumario|sumário|assunto|subject/.test(h)) return 'ementa'
    if (/conteudo|conteúdo|textinfo|texto|inteiro|teor|descricao|descrição|content|body/.test(h)) return 'conteudo'
    if (/url|link|href/.test(h)) return 'url'
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

/** Returns compatibility score (0–1) between a column list and a profile */
function profileScore(cols: string[], profile: ImportProfile): number {
    const profileCols = new Set(profile.columns.map(c => c.toLowerCase()))
    const matches = cols.filter(c => profileCols.has(c.toLowerCase())).length
    return matches / Math.max(cols.length, profile.columns.length)
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'confirm' | 'map' | 'save-profile' | 'importing' | 'done'

export default function ImportacaoPage() {
    const fileInputRef = useRef<HTMLInputElement>(null)

    // File state
    const [dragging, setDragging] = useState(false)
    const [fileName, setFileName] = useState('')
    const [headers, setHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<RowData[]>([])
    const [mapping, setMapping] = useState<Record<string, DbFieldKey>>({})
    const [step, setStep] = useState<Step>('upload')
    const [importError, setImportError] = useState('')
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })

    // Profile state
    const [profiles, setProfiles] = useState<ImportProfile[]>([])
    const [suggestedProfile, setSuggestedProfile] = useState<ImportProfile | null>(null)
    const [suggestedScore, setSuggestedScore] = useState(0)
    const [saveProfileName, setSaveProfileName] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileSaved, setProfileSaved] = useState(false)
    const [showProfiles, setShowProfiles] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // ── Load profiles ──────────────────────────────────────────────────────────

    useEffect(() => {
        loadProfiles()
    }, [])

    const loadProfiles = async () => {
        const { data } = await supabase
            .from('import_profiles')
            .select('*')
            .order('created_at', { ascending: false })
        if (data) setProfiles(data as ImportProfile[])
    }

    // ── File parsing ───────────────────────────────────────────────────────────

    const afterParse = useCallback((cols: string[], data: RowData[]) => {
        const initial = Object.fromEntries(cols.map(c => [c, guessMapping(c)])) as Record<string, DbFieldKey>
        setHeaders(cols)
        setRows(data)
        setMapping(initial)

        // Find best matching profile
        let best: ImportProfile | null = null
        let bestScore = 0
        for (const p of profiles) {
            const s = profileScore(cols, p)
            if (s > bestScore) { bestScore = s; best = p }
        }

        if (best && bestScore >= 0.70) {
            // Merge profile mapping onto current columns
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
            // Heuristic auto-detect: check if all mapped (no __skip)
            const hasUnknown = Object.values(initial).some(v => v === '__skip')
            setSuggestedProfile(null)
            setSuggestedScore(0)
            setStep(hasUnknown ? 'map' : 'confirm')
        }
    }, [profiles])

    const processFile = useCallback((file: File) => {
        setFileName(file.name)
        setSaveProfileName(file.name.replace(/\.[^/.]+$/, ''))
        setProfileSaved(false)
        setImportError('')
        const ext = file.name.split('.').pop()?.toLowerCase()

        if (ext === 'csv' || ext === 'txt') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: ({ data, meta }) => afterParse(meta.fields || [], data as RowData[]),
                error: () => setImportError('Erro ao ler o arquivo CSV.'),
            })
        } else if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader()
            reader.onload = (e) => {
                const data = new Uint8Array(e.target!.result as ArrayBuffer)
                const wb = XLSX.read(data, { type: 'array', cellDates: true })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const json: RowData[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })
                afterParse(json.length > 0 ? Object.keys(json[0]) : [], json)
            }
            reader.readAsArrayBuffer(file)
        } else {
            setImportError('Formato não suportado. Use .xlsx, .xls ou .csv')
        }
    }, [afterParse])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false)
        if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0])
    }, [processFile])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processFile(e.target.files[0])
    }

    // Apply a profile mapping to current columns
    const applyProfile = (p: ImportProfile) => {
        const merged: Record<string, DbFieldKey> = {}
        for (const col of headers) {
            const found = Object.entries(p.mapping).find(
                ([k]) => k.toLowerCase() === col.toLowerCase()
            )
            merged[col] = found ? (found[1] as DbFieldKey) : guessMapping(col)
        }
        setMapping(merged)
        setSuggestedProfile(p)
        setStep('confirm')
    }

    // ── Import to Supabase ─────────────────────────────────────────────────────

    const handleImport = async () => {
        setStep('importing')
        setImportError('')
        let errors = 0
        const BATCH = 50

        const mapped = rows.map((row) => {
            const rec: Record<string, unknown> = {}
            for (const [col, field] of Object.entries(mapping)) {
                if (field === '__skip') continue
                const val = (row[col] ?? '').toString().trim()
                if (!val) continue
                rec[field] = field === 'data_pub' ? parseDate(val) : val
            }
            if (!rec.tipo) rec.tipo = 'acordao'
            return rec
        }).filter(r => Object.keys(r).length > 0)

        setProgress({ done: 0, total: mapped.length, errors: 0 })

        for (let i = 0; i < mapped.length; i += BATCH) {
            const batch = mapped.slice(i, i + BATCH)
            const { error } = await supabase.from('jurisprudencia').insert(batch)
            if (error) errors += batch.length
            setProgress({ done: Math.min(i + BATCH, mapped.length), total: mapped.length, errors })
        }

        setStep('done')
    }

    // ── Save profile ───────────────────────────────────────────────────────────

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

    // ── Reset ──────────────────────────────────────────────────────────────────

    const handleReset = () => {
        setStep('upload'); setFileName(''); setHeaders([]); setRows([])
        setMapping({}); setProgress({ done: 0, total: 0, errors: 0 })
        setImportError(''); setSuggestedProfile(null); setSaveProfileName('')
        setProfileSaved(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // ── Render helpers ─────────────────────────────────────────────────────────

    const stepOrder: Step[] = ['upload', 'confirm', 'map', 'importing', 'done']
    const stepLabels = ['1. Arquivo', '2. Colunas', '3. Importando', '4. Concluído']
    const activeIdx = stepOrder.indexOf(step === 'save-profile' ? 'confirm' : step)

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="p-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Database className="w-3.5 h-3.5" />
                    <span>Importar Planilhas</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#1F4E79]">Importar Jurisprudência</h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Importe acórdãos, súmulas, boletins e informativos em CSV ou Excel (.xlsx)
                        </p>
                    </div>
                    {step !== 'upload' && (
                        <button onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm transition-all">
                            <Trash2 className="w-4 h-4" /> Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-8">
                {(['upload', 'map', 'importing', 'done'] as const).map((s, idx) => {
                    const isActive = idx === (activeIdx > 2 ? activeIdx - 1 : activeIdx === 1 ? 1 : activeIdx)
                    const isDone = idx < activeIdx && !(activeIdx === 1 && idx === 1)
                    /* simplify: map step shown as active when on confirm or map */
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

            {/* ── STEP 1: Upload ─────────────────────────────────────────────────────── */}
            {step === 'upload' && (
                <div className="space-y-4">
                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                        <Info className="w-4 h-4 text-[#2E75B6] flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-[#1F4E79] space-y-1">
                            <p><strong>Formatos aceitos:</strong> .xlsx, .xls (Excel) e .csv</p>
                            <p><strong>Perfis salvos:</strong> se você já importou este tipo de planilha antes, o mapeamento será aplicado automaticamente.</p>
                        </div>
                    </div>

                    {/* Drop zone */}
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

                    {/* Saved profiles list */}
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

            {/* ── STEP 2a: Confirm (auto-mapped or profile matched) ──────────────────── */}
            {step === 'confirm' && (
                <div className="space-y-4">
                    {/* File card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 text-sm truncate">{fileName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {rows.length.toLocaleString('pt-BR')} linhas · {headers.length} colunas
                            </p>
                        </div>
                        {suggestedProfile && (
                            <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0">
                                <Sparkles className="w-3.5 h-3.5" />
                                Perfil: {suggestedProfile.name} ({suggestedScore}%)
                            </div>
                        )}
                        {!suggestedProfile && (
                            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0">
                                <Check className="w-3.5 h-3.5" />
                                Auto-detectado
                            </div>
                        )}
                    </div>

                    {/* Other profiles: suggest alternatives */}
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

                    {/* Mapping summary chips */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-700 text-sm">Mapeamento de colunas</h2>
                            <button onClick={() => setStep('map')}
                                className="flex items-center gap-1 text-xs text-[#2E75B6] hover:underline">
                                <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                        </div>
                        <div className="px-5 py-3 flex flex-wrap gap-2">
                            {headers.filter(h => mapping[h] !== '__skip').map(h => (
                                <div key={h} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                                    <span className="font-mono text-slate-600">{h}</span>
                                    <span className="text-slate-300">→</span>
                                    <span className="font-medium text-[#1F4E79]">
                                        {DB_FIELDS.find(f => f.key === mapping[h])?.label}
                                    </span>
                                </div>
                            ))}
                            {headers.filter(h => mapping[h] === '__skip').length > 0 && (
                                <div className="text-xs text-slate-300 border border-slate-100 bg-slate-50 rounded-lg px-3 py-1.5">
                                    ignoradas: {headers.filter(h => mapping[h] === '__skip').join(', ')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button id="btn-importar" onClick={handleImport}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow hover:shadow-md hover:from-[#1a4368] hover:to-[#2563a0] transition-all">
                            <Database className="w-4 h-4" />
                            Importar {rows.length.toLocaleString('pt-BR')} registros
                        </button>
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

            {/* ── STEP 2b: Save profile ──────────────────────────────────────────────── */}
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
                                    Da próxima vez que importar uma planilha com as mesmas colunas, o mapeamento será aplicado automaticamente.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Nome do perfil</label>
                            <input
                                type="text"
                                value={saveProfileName}
                                onChange={e => setSaveProfileName(e.target.value)}
                                placeholder="Ex: Informativo Plenário, Acórdão 1ª Câmara..."
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent bg-slate-50"
                            />
                        </div>

                        {profileSaved && (
                            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                                <Check className="w-4 h-4" /> Perfil salvo com sucesso!
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveProfile}
                                disabled={savingProfile || !saveProfileName.trim() || profileSaved}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-all shadow hover:shadow-md">
                                {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><Check className="w-4 h-4" /> Salvar perfil</>}
                            </button>
                            <button onClick={() => setStep('confirm')}
                                className="px-4 py-2.5 text-slate-500 text-sm hover:bg-slate-100 rounded-xl transition-colors">
                                {profileSaved ? 'Prosseguir' : 'Cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2c: Manual column mapping ────────────────────────────────────── */}
            {step === 'map' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{fileName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {rows.length.toLocaleString('pt-BR')} linhas · ajuste o mapeamento das colunas abaixo
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-700 text-sm">Mapeamento de Colunas</h2>
                            <p className="text-xs text-slate-400">Associe cada coluna a um campo do banco</p>
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
                                            className="w-full appearance-none px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
                                        >
                                            {DB_FIELDS.map(f => (
                                                <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                    <div className="w-44 hidden lg:block">
                                        <p className="text-xs text-slate-300 truncate">
                                            {DB_FIELDS.find(f => f.key === (mapping[col] || '__skip'))?.hint}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-700 text-sm">Prévia — primeiras 3 linhas</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50">
                                        {headers.filter(h => mapping[h] !== '__skip').map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap">
                                                {h}<span className="ml-1 font-normal text-[#2E75B6]">→ {DB_FIELDS.find(f => f.key === mapping[h])?.label}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rows.slice(0, 3).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            {headers.filter(h => mapping[h] !== '__skip').map(h => (
                                                <td key={h} className="px-4 py-2 text-slate-600 max-w-xs truncate">
                                                    {(row[h] ?? '').toString().slice(0, 80)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button id="btn-importar" onClick={handleImport}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow hover:shadow-md hover:from-[#1a4368] hover:to-[#2563a0] transition-all">
                            <Database className="w-4 h-4" />
                            Importar {rows.length.toLocaleString('pt-BR')} registros
                        </button>
                        <button onClick={() => setStep('save-profile')}
                            className="flex items-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all">
                            <BookMarked className="w-4 h-4" /> Salvar como perfil
                        </button>
                        <button onClick={handleReset} className="px-4 py-3 text-slate-400 text-sm hover:bg-slate-100 rounded-xl transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Importing ─────────────────────────────────────────────────── */}
            {step === 'importing' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                        <Loader2 className="w-8 h-8 text-[#2E75B6] animate-spin" />
                    </div>
                    <h2 className="text-lg font-bold text-[#1F4E79] mb-1">Importando…</h2>
                    <p className="text-sm text-slate-400 mb-6">Não feche esta aba durante a importação.</p>
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                            <span>{progress.done.toLocaleString('pt-BR')} de {progress.total.toLocaleString('pt-BR')}</span>
                            <span>{Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] transition-all duration-300"
                                style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
                        </div>
                        {progress.errors > 0 && <p className="text-xs text-amber-600 mt-2">{progress.errors} erros ignorados</p>}
                    </div>
                </div>
            )}

            {/* ── STEP 4: Done ──────────────────────────────────────────────────────── */}
            {step === 'done' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${progress.errors === progress.total ? 'bg-red-50' : 'bg-green-50'}`}>
                        {progress.errors === progress.total
                            ? <X className="w-8 h-8 text-red-500" />
                            : <Check className="w-8 h-8 text-green-600" />}
                    </div>
                    <h2 className="text-lg font-bold text-[#1F4E79] mb-1">
                        {progress.errors === progress.total ? 'Falha na importação' : 'Importação concluída!'}
                    </h2>
                    <div className="flex gap-6 mt-4 mb-8">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-700">{(progress.total - progress.errors).toLocaleString('pt-BR')}</p>
                            <p className="text-xs text-slate-400 mt-0.5">registros importados</p>
                        </div>
                        {progress.errors > 0 && (
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-500">{progress.errors.toLocaleString('pt-BR')}</p>
                                <p className="text-xs text-slate-400 mt-0.5">erros</p>
                            </div>
                        )}
                    </div>
                    <button onClick={handleReset}
                        className="px-5 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl hover:from-[#1a4368] hover:to-[#2563a0] transition-all shadow">
                        Importar outro arquivo
                    </button>
                </div>
            )}
        </div>
    )
}
