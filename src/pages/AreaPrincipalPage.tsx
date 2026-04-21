import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, Scale, AlertCircle, FileDown, FileText, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Parecer } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Proxy Vite em dev → N8n produção
const N8N_WEBHOOK = '/api/n8n/webhook/rag-tcu-v2'

const PLACEHOLDER = `Descreva seu problema jurídico com o máximo de detalhes possível...

Exemplos:
• Posso dispensar licitação para contratação de serviços de TI abaixo de R$ 50.000?
• Quais os requisitos do TCU para terceirização de mão de obra?
• Como o TCU trata superfaturamento em obras públicas?`

export default function AreaPrincipalPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [parecer, setParecer] = useState<Parecer | null>(null)
    const [problema, setProblema] = useState('')
    const [loadingParecer, setLoadingParecer] = useState(true)
    const [processingAI, setProcessingAI] = useState(false)
    const [aiError, setAiError] = useState('')
    const [previewMode, setPreviewMode] = useState(false)

    // ── Carrega o parecer ────────────────────────────────────────────────────

    useEffect(() => {
        if (!id || !user) return
        const fetchParecer = async () => {
            setLoadingParecer(true)
            
            let query = supabase
                .from('pareceres')
                .select('*')
                .eq('id', id)

            if (user.role !== 'admin') {
                query = query.eq('user_id', user.email)
            }

            const { data, error } = await query.single()
            if (!error && data) {
                setParecer(data as Parecer)
                setProblema(data.content || '')
                if (data.content) setPreviewMode(true)
            }
            setLoadingParecer(false)
        }
        fetchParecer()
    }, [id, user])

    // ── Envia para N8n (busca + parecer ficam no N8n) ────────────────────────

    const handleProcessAI = useCallback(async () => {
        if (!problema.trim() || !parecer) return
        setProcessingAI(true)
        setAiError('')

        try {
            // Zera o conteúdo no banco para o polling funcionar corretamente se for a segunda vez
            await supabase
                .from('pareceres')
                .update({ content: null })
                .eq('id', parecer.id)

            // Inicia processamento assíncrono no N8n
            const response = await fetch(N8N_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo: parecer.title,
                    descricao: parecer.description,
                    problema: problema,
                    user: user?.email,
                    parecer_id: parecer.id,
                }),
            })

            if (!response.ok && response.status !== 202) {
                if (response.status === 404) throw new Error(`Webhook n8n não encontrado (404).`)
                throw new Error(`Falha de comunicação 🚀: ${response.status}`)
            }

            // Inicia loop de vigília silenciosa aguardando o banco atualizar (Max: 5 minutos)
            let resultText = null;
            for (let i = 0; i < 100; i++) {
                await new Promise((resume) => setTimeout(resume, 3000)) // Espera 3s

                const { data } = await supabase
                    .from('pareceres')
                    .select('content')
                    .eq('id', parecer.id)
                    .single()

                if (data?.content && data.content.trim().length > 0) {
                    resultText = data.content
                    break
                }
            }

            if (!resultText) {
                throw new Error('O agente processou no fundo, mas demorou mais que 5 minutos para terminar. Tente recarregar depois.')
            }

            setProblema(resultText)
            setPreviewMode(true)

        } catch (err: unknown) {
            setAiError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível conectar ao agente de IA.'
            )
        } finally {
            setProcessingAI(false)
        }
    }, [problema, parecer, user])

    // ── Markdown → pdfmake content ─────────────────────────────────────────

    function parseInline(text: string): object {
        // Split text into bold/italic/plain segments
        const segments: object[] = []
        let rem = text
        while (rem.length > 0) {
            const bi = rem.match(/^(.*?)\*\*\*(.+?)\*\*\*/)
            const b = rem.match(/^(.*?)\*\*(.+?)\*\*/)
            const it = rem.match(/^(.*?)\*(.+?)\*/)
            if (bi && (!b || bi[0].length <= b[0].length) && (!it || bi[0].length <= it[0].length)) {
                if (bi[1]) segments.push({ text: bi[1] })
                segments.push({ text: bi[2], bold: true, italics: true })
                rem = rem.slice(bi[0].length)
            } else if (b && (!it || b[0].length <= it[0].length)) {
                if (b[1]) segments.push({ text: b[1] })
                segments.push({ text: b[2], bold: true })
                rem = rem.slice(b[0].length)
            } else if (it) {
                if (it[1]) segments.push({ text: it[1] })
                segments.push({ text: it[2], italics: true })
                rem = rem.slice(it[0].length)
            } else {
                segments.push({ text: rem })
                break
            }
        }
        return segments.length === 1 ? segments[0] : { text: segments }
    }

    function markdownToPdfContent(md: string): object[] {
        const content: object[] = []
        const lines = md.split('\n')
        let i = 0

        while (i < lines.length) {
            const line = lines[i]

            // Headings
            if (line.startsWith('#### ')) {
                content.push({ text: line.slice(5), style: 'h4' })
            } else if (line.startsWith('### ')) {
                content.push({ text: line.slice(4), style: 'h3' })
            } else if (line.startsWith('## ')) {
                content.push({ text: line.slice(3), style: 'h2' })
            } else if (line.startsWith('# ')) {
                content.push({ text: line.slice(2), style: 'h1' })
                // Horizontal rule
            } else if (line.match(/^---+$/)) {
                content.push({
                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
                    margin: [0, 8, 0, 8]
                })
                // Table
            } else if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[-| ]+\|$/)) {
                const tableRows: string[][] = []
                while (i < lines.length && lines[i].startsWith('|')) {
                    if (!lines[i].match(/^\|[-| ]+\|$/)) {
                        tableRows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()))
                    }
                    i++
                }
                if (tableRows.length > 0) {
                    const colCount = tableRows[0].length
                    const body = tableRows.map((row, ri) =>
                        row.map(cell => ({
                            text: cell,
                            bold: ri === 0,
                            fillColor: ri === 0 ? '#DCE6F1' : null,
                            color: ri === 0 ? '#1F4E79' : '#111111',
                            fontSize: 10,
                        }))
                    )
                    content.push({
                        table: {
                            headerRows: 1,
                            widths: Array(colCount).fill('*'),
                            body,
                        },
                        layout: {
                            hLineWidth: () => 0.5,
                            vLineWidth: () => 0.5,
                            hLineColor: () => '#aaaaaa',
                            vLineColor: () => '#aaaaaa',
                        },
                        margin: [0, 6, 0, 10],
                    })
                }
                continue
                // Bullet list — collect all consecutive
            } else if (line.match(/^[*\u2022\-] /)) {
                const items: object[] = []
                while (i < lines.length && lines[i].match(/^[*\u2022\-] /)) {
                    items.push(parseInline(lines[i].replace(/^[*\u2022\-] /, '')))
                    i++
                }
                content.push({ ul: items, margin: [0, 2, 0, 6], fontSize: 11 })
                continue
                // Empty line
            } else if (line.trim() === '') {
                content.push({ text: ' ', fontSize: 5 })
                // Regular paragraph
            } else {
                content.push({ ...parseInline(line), fontSize: 11, margin: [0, 1, 0, 3] } as object)
            }

            i++
        }
        return content
    }

    // ── Exportar PDF (pdfmake — texto real) ───────────────────────────────

    const [exportingPDF, setExportingPDF] = useState(false)

    const handleExportPDF = async () => {
        const title = parecer?.title || 'Parecer TCU'
        setExportingPDF(true)
        try {
            // Dynamic import to avoid SSR issues and keep bundle split
            const pdfMakeModule = await import('pdfmake/build/pdfmake')
            const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
            const pdfMake = pdfMakeModule.default
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(pdfMake as any).vfs = (pdfFontsModule as any).default?.pdfMake?.vfs
                || (pdfFontsModule as any).pdfMake?.vfs
                || (pdfFontsModule as any).default?.vfs

            const bodyContent = markdownToPdfContent(problema)

            const docDefinition = {
                pageSize: 'A4' as const,
                pageMargins: [50, 60, 50, 60] as [number, number, number, number],
                defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
                styles: {
                    h1: { fontSize: 18, bold: true, color: '#1F4E79', margin: [0, 0, 0, 14] },
                    h2: { fontSize: 14, bold: true, color: '#1F4E79', margin: [0, 14, 0, 6] },
                    h3: { fontSize: 12, bold: true, color: '#1F4E79', margin: [0, 10, 0, 4] },
                    h4: { fontSize: 11, bold: true, color: '#2E75B6', margin: [0, 8, 0, 3] },
                },
                header: (_page: number, _pages: number) => ({
                    text: title,
                    fontSize: 9,
                    color: '#aaaaaa',
                    margin: [50, 20, 50, 0],
                    alignment: 'right' as const,
                }),
                footer: (currentPage: number, pageCount: number) => ({
                    text: `${currentPage} / ${pageCount}`,
                    fontSize: 9,
                    color: '#aaaaaa',
                    alignment: 'center' as const,
                    margin: [0, 10, 0, 0],
                }),
                content: [
                    { text: title, style: 'h1' },
                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: '#1F4E79' }], margin: [0, 0, 0, 14] },
                    ...bodyContent,
                ],
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pdfMake.createPdf(docDefinition as any).download(`${title.replace(/\s+/g, '_')}_Parecer.pdf`)
        } catch (err) {
            console.error('Erro ao exportar PDF:', err)
        } finally {
            setExportingPDF(false)
        }
    }

    // ── Markdown → HTML (Word export + preview) ──────────────────────────

    function markdownToHtml(md: string): string {
        let h = md
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^---+$/gm, '<hr>')
        h = h.replace(/(\|.+\|(\n|$))+/g, (block) => {
            const rows = block.trim().split('\n').filter(r => !r.match(/^\|[-| ]+\|$/))
            return '<table>' + rows.map((row, i) => {
                const cells = row.split('|').slice(1, -1)
                const tag = i === 0 ? 'th' : 'td'
                return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>'
            }).join('') + '</table>'
        })
        h = h.replace(/^[*•\-] (.+)$/gm, '<li>$1</li>').replace(/(<li>[\s\S]+?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        h = '<p>' + h.replace(/\n{2,}/g, '</p><p>') + '</p>'
        h = h.replace(/<p>(<h[1-6]>)/g, '$1').replace(/(<\/h[1-6]>)<\/p>/g, '$1')
        h = h.replace(/<p>(<table>)/g, '$1').replace(/(<\/table>)<\/p>/g, '$1')
        h = h.replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1')
        h = h.replace(/<p>(<hr>)<\/p>/g, '$1').replace(/<p><\/p>/g, '')
        return h
    }

    // ── Exportar Word ─────────────────────────────────────────────────────────

    const handleExportWord = () => {
        const title = parecer?.title || 'Parecer TCU'
        const html = markdownToHtml(problema)
        const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title><style>
            body{font-family:Calibri,sans-serif;font-size:12pt;color:#000;line-height:1.5}
            h1,h2,h3{color:#1F4E79}h1{font-size:18pt}h2{font-size:14pt}h3{font-size:12pt}
            table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:5pt}th{background:#dce6f1}
        </style></head><body><h1>${title}</h1>${html}</body></html>`
        const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_')}_Parecer.doc`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Salvar removido — o N8n escreve diretamente no banco durante o processamento

    // ── Loading / Not found ──────────────────────────────────────────────────

    if (loadingParecer) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="w-8 h-8 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Carregando parecer…</span>
                </div>
            </div>
        )
    }

    if (!parecer) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <AlertCircle className="w-10 h-10 text-red-300" />
                <p className="text-sm">Parecer não encontrado ou acesso negado.</p>
            </div>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const isReadOnly = parecer?.user_id !== user?.email

    return (
        <div className="h-full flex flex-col">
            {/* Top bar */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    {isReadOnly && (
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#1F4E79] mb-4 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            Voltar para Detalhes do Usuário
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#1F4E79] to-[#2E75B6]">
                            <Scale className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-[#1F4E79] leading-tight">{parecer.title}</h1>
                            {parecer.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{parecer.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-4">

                    {/* Callout */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-[#2E75B6] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[#1F4E79] leading-relaxed">
                            <strong>Como funciona:</strong> Descreva o problema jurídico. O agente de IA irá buscar os acórdãos e súmulas relevantes do TCU e elaborará o parecer fundamentado automaticamente.
                        </p>
                    </div>

                    {/* Processing spinner — acima da caixa de texto */}
                    {processingAI && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#2E75B6] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-[#1F4E79]">Agente de IA processando…</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Buscando jurisprudência e elaborando o parecer. Isso pode levar um par de minutos.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Conteúdo principal */}

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                        <label className="block text-sm font-semibold text-[#1F4E79] mb-3">
                            {previewMode ? 'Parecer Gerado' : 'Descreva seu problema'}
                        </label>

                        {previewMode ? (
                            <div
                                className="text-sm leading-relaxed"
                                style={{ color: '#374151' }}
                                dangerouslySetInnerHTML={{
                                    __html: `<style>
                                        .parecer-view h1{font-size:1.3em;font-weight:700;color:#1F4E79;margin:1.2em 0 .4em}
                                        .parecer-view h2{font-size:1.1em;font-weight:700;color:#1F4E79;margin:1.1em 0 .3em}
                                        .parecer-view h3{font-size:1em;font-weight:700;color:#2E75B6;margin:1em 0 .3em}
                                        .parecer-view h4{font-size:.95em;font-weight:700;color:#2E75B6;margin:.8em 0 .2em}
                                        .parecer-view p{margin:.5em 0;line-height:1.7}
                                        .parecer-view strong{font-weight:700;color:#111}
                                        .parecer-view em{font-style:italic}
                                        .parecer-view hr{border:none;border-top:1px solid #e2e8f0;margin:1em 0}
                                        .parecer-view ul{padding-left:1.5em;margin:.4em 0}
                                        .parecer-view li{margin:.2em 0}
                                        .parecer-view table{border-collapse:collapse;width:100%;margin:.8em 0;font-size:.92em}
                                        .parecer-view th,.parecer-view td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}
                                        .parecer-view th{background:#e8f0f8;color:#1F4E79;font-weight:600}
                                    </style><div class="parecer-view">${markdownToHtml(problema)}</div>`
                                }}
                            />
                        ) : (
                            <textarea
                                id="textarea-problema"
                                value={problema}
                                onChange={(e) => setProblema(e.target.value)}
                                placeholder={PLACEHOLDER}
                                className="w-full px-0 py-0 text-sm text-slate-700 bg-transparent placeholder-slate-300 resize-none focus:outline-none leading-relaxed min-h-[300px] max-h-[60vh]"
                                disabled={processingAI || isReadOnly}
                            />
                        )}
                    </div>

                    {/* AI Error */}
                    {aiError && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{aiError}</p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Processar com IA — some permanentemente após o processamento */}
                        {!isReadOnly && !previewMode && (
                            <button
                                id="btn-processar-ia"
                                onClick={handleProcessAI}
                                disabled={processingAI || !problema.trim()}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:from-[#1a4368] hover:to-[#2563a0] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {processingAI ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processando com IA…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Processar com IA
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            id="btn-exportar-pdf"
                            onClick={handleExportPDF}
                            disabled={!problema.trim() || exportingPDF}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {exportingPDF
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF…</>
                                : <><FileDown className="w-4 h-4" /> Exportar PDF</>}
                        </button>

                        <button
                            id="btn-exportar-word"
                            onClick={handleExportWord}
                            disabled={!problema.trim()}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FileText className="w-4 h-4" /> Exportar Word
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}
