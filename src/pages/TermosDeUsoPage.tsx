import { Link } from 'react-router-dom'
import { FileText, ArrowLeft, ChevronRight, AlertTriangle } from 'lucide-react'

const sections = [
    { id: 'aceitacao', title: '1. Aceitação dos Termos' },
    { id: 'servico', title: '2. O que é o TechDocsTCU' },
    { id: 'isencao', title: '3. Isenção de Responsabilidade' },
    { id: 'cadastro', title: '4. Cadastro e Conta' },
    { id: 'creditos', title: '5. Sistema de Créditos' },
    { id: 'pagamentos', title: '6. Política de Pagamentos' },
    { id: 'uso-aceitavel', title: '7. Uso Aceitável' },
    { id: 'propriedade', title: '8. Propriedade Intelectual' },
    { id: 'suspensao', title: '9. Suspensão e Encerramento' },
    { id: 'responsabilidade', title: '10. Limitação de Responsabilidade' },
    { id: 'lei', title: '11. Lei Aplicável e Foro' },
    { id: 'contato', title: '12. Contato' },
]

export default function TermosDeUsoPage() {
    return (
        <div className="min-h-screen bg-[#F0F4F8]">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#1F4E79] to-[#2E75B6] text-white py-4 px-6 shadow-md sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft size={16} /> Voltar ao Login
                    </Link>
                    <div className="h-5 w-px bg-blue-400/40" />
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-300" />
                        <span className="font-semibold text-sm">Termos de Uso</span>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Índice lateral */}
                <aside className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-20">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Índice</p>
                        <nav className="space-y-1">
                            {sections.map(s => (
                                <a
                                    key={s.id}
                                    href={`#${s.id}`}
                                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-[#1F4E79] hover:bg-blue-50 rounded-lg px-2 py-1.5 transition-colors group"
                                >
                                    <ChevronRight size={12} className="text-slate-300 group-hover:text-[#1F4E79]" />
                                    {s.title}
                                </a>
                            ))}
                        </nav>
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400">Última atualização:</p>
                            <p className="text-xs font-semibold text-slate-600">Maio de 2026</p>
                        </div>
                    </div>
                </aside>

                {/* Conteúdo principal */}
                <main className="lg:col-span-3 space-y-8">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-[#1F4E79] rounded-xl p-2.5">
                                <FileText className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#1F4E79]">Termos de Uso</h1>
                                <p className="text-slate-500 text-sm">TechDocsTCU — Condições gerais de utilização da plataforma</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 mb-8">
                            Ao criar uma conta ou utilizar o TechDocsTCU, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso.
                        </div>

                        <div className="prose prose-slate max-w-none space-y-10 text-sm leading-relaxed">

                            <section id="aceitacao">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">1. Aceitação dos Termos</h2>
                                <p className="text-slate-600">
                                    Estes Termos de Uso regem o acesso e a utilização do TechDocsTCU. Ao acessar a plataforma, o usuário aceita automaticamente estes termos em sua integralidade. Caso não concorde com qualquer disposição, deverá abster-se de utilizar o serviço.
                                </p>
                            </section>

                            <section id="servico">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">2. O que é o TechDocsTCU</h2>
                                <p className="text-slate-600">
                                    O TechDocsTCU é uma plataforma digital de apoio à análise jurídica que utiliza inteligência artificial para auxiliar profissionais na pesquisa de jurisprudência do Tribunal de Contas da União (TCU) e na redação de pareceres técnicos. A plataforma é uma <strong>ferramenta de auxílio</strong>, não um serviço de advocacia ou consultoria jurídica.
                                </p>
                            </section>

                            <section id="isencao">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">3. Isenção de Responsabilidade — IA como Ferramenta de Apoio</h2>
                                <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex gap-3 mb-4">
                                    <AlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-amber-800 font-semibold text-sm">
                                        A inteligência artificial do TechDocsTCU <strong>auxilia</strong>, mas <strong>não substitui</strong> a análise jurídica humana qualificada.
                                    </p>
                                </div>
                                <div className="text-slate-600 space-y-3">
                                    <p>O conteúdo gerado pela plataforma possui caráter informativo e de apoio à elaboração de documentos. O TechDocsTCU <strong>não garante</strong> a precisão, completude ou atualidade das informações geradas pela IA.</p>
                                    <p>O usuário é o <strong>único e exclusivo responsável</strong> pelo conteúdo final dos pareceres e documentos produzidos com o auxílio da plataforma, devendo sempre submetê-los à revisão técnica e jurídica por profissional habilitado antes de qualquer uso oficial ou formal.</p>
                                    <p>O TechDocsTCU não se responsabiliza por decisões tomadas com base no conteúdo gerado pela plataforma, nem por eventuais erros, omissões ou desatualizações das informações fornecidas.</p>
                                </div>
                            </section>

                            <section id="cadastro">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">4. Cadastro e Conta</h2>
                                <div className="text-slate-600 space-y-2">
                                    <p>Para utilizar a plataforma, é necessário criar uma conta com informações verdadeiras e atualizadas. O usuário é responsável por:</p>
                                    <ul className="space-y-1 list-none ml-2">
                                        {[
                                            'Manter a confidencialidade de suas credenciais de acesso',
                                            'Todas as atividades realizadas sob sua conta',
                                            'Notificar imediatamente o TechDocsTCU em caso de uso não autorizado da conta',
                                        ].map(item => (
                                            <li key={item} className="flex items-start gap-2">
                                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#2E75B6] flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-2">É vedado o compartilhamento de credenciais entre diferentes usuários ou organizações.</p>
                                </div>
                            </section>

                            <section id="creditos">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">5. Sistema de Créditos</h2>
                                <div className="text-slate-600 space-y-2">
                                    <p>O TechDocsTCU opera por meio de um sistema de créditos pré-pagos. Cada operação de geração de conteúdo com IA consome uma quantidade de créditos proporcional ao volume de texto processado.</p>
                                    <p>Os créditos adquiridos têm validade indeterminada enquanto a conta permanecer ativa, não são transferíveis entre contas e <strong>não são reembolsáveis após utilizados</strong>.</p>
                                    <p>Créditos bônus ou promocionais podem ter condições específicas informadas no momento da concessão.</p>
                                </div>
                            </section>

                            <section id="pagamentos">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">6. Política de Pagamentos</h2>
                                <div className="text-slate-600 space-y-2">
                                    <p>Os pagamentos são processados pela plataforma <strong>Asaas</strong>, de forma segura e criptografada. O TechDocsTCU não armazena dados de cartão de crédito.</p>
                                    <p><strong>Reembolsos:</strong> créditos não utilizados podem ser reembolsados em até 7 dias corridos após a compra, mediante solicitação formal ao suporte. Créditos parcialmente utilizados não são elegíveis a reembolso parcial.</p>
                                    <p>Os preços estão sujeitos a alteração mediante comunicação prévia de 30 dias aos usuários ativos.</p>
                                </div>
                            </section>

                            <section id="uso-aceitavel">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">7. Uso Aceitável</h2>
                                <p className="text-slate-600 mb-3">É expressamente proibido utilizar o TechDocsTCU para:</p>
                                <ul className="text-slate-600 space-y-1.5 list-none">
                                    {[
                                        'Qualquer atividade ilegal ou que viole direitos de terceiros',
                                        'Engenharia reversa, cópia ou reprodução não autorizada do sistema',
                                        'Tentativas de acesso não autorizado aos sistemas da plataforma',
                                        'Uso automatizado sem autorização prévia (bots, scrapers)',
                                        'Geração de conteúdo difamatório, discriminatório ou prejudicial',
                                        'Compartilhamento das credenciais de acesso com terceiros',
                                        'Revenda do acesso à plataforma sem autorização escrita',
                                    ].map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section id="propriedade">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">8. Propriedade Intelectual</h2>
                                <div className="text-slate-600 space-y-2">
                                    <p><strong>Da Plataforma:</strong> o código-fonte, design, marca e demais elementos do TechDocsTCU são de propriedade exclusiva de seus criadores e estão protegidos pela legislação de direitos autorais e propriedade intelectual brasileira.</p>
                                    <p><strong>Do Conteúdo Gerado:</strong> os pareceres e documentos elaborados pelo usuário com o auxílio da plataforma pertencem ao próprio usuário. O TechDocsTCU não reivindica propriedade sobre o conteúdo produzido, mas pode utilizar dados anonimizados para aprimoramento dos modelos de IA.</p>
                                </div>
                            </section>

                            <section id="suspensao">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">9. Suspensão e Encerramento</h2>
                                <p className="text-slate-600">
                                    O TechDocsTCU reserva-se o direito de suspender ou encerrar contas que violem estes Termos de Uso, sem aviso prévio em casos graves. O usuário pode encerrar sua conta a qualquer momento mediante solicitação ao suporte. Em caso de encerramento, os dados serão tratados conforme nossa Política de Privacidade.
                                </p>
                            </section>

                            <section id="responsabilidade">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">10. Limitação de Responsabilidade</h2>
                                <p className="text-slate-600">
                                    Na extensão máxima permitida pela lei brasileira, o TechDocsTCU não será responsável por danos indiretos, incidentais, especiais ou consequenciais resultantes do uso ou impossibilidade de uso da plataforma. A responsabilidade total do TechDocsTCU, em qualquer hipótese, estará limitada ao valor pago pelo usuário nos últimos 3 meses de serviço.
                                </p>
                            </section>

                            <section id="lei">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">11. Lei Aplicável e Foro</h2>
                                <p className="text-slate-600">
                                    Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de <strong>Brasília/DF</strong> para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                                </p>
                            </section>

                            <section id="contato">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">12. Contato</h2>
                                <p className="text-slate-600 mb-3">Para dúvidas sobre estes Termos de Uso ou para solicitar suporte:</p>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
                                    <p className="font-semibold text-[#1F4E79]">TechDocsTCU — Suporte</p>
                                    <p className="text-sm text-slate-600 mt-1">E-mail: <a href="mailto:suporte@techdocstcu.com.br" className="text-blue-600 hover:underline">suporte@techdocstcu.com.br</a></p>
                                </div>
                            </section>

                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 pb-4">
                        <Link to="/politica-de-privacidade" className="text-blue-500 hover:underline">Ver Política de Privacidade</Link>
                        {' · '}
                        <Link to="/" className="hover:text-slate-600">Voltar ao Login</Link>
                    </div>
                </main>
            </div>
        </div>
    )
}
