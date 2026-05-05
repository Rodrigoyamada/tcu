import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, ChevronRight } from 'lucide-react'

const sections = [
    { id: 'quem-somos', title: '1. Quem Somos' },
    { id: 'dados-coletados', title: '2. Dados que Coletamos' },
    { id: 'finalidade', title: '3. Para que Usamos' },
    { id: 'base-legal', title: '4. Base Legal (LGPD)' },
    { id: 'compartilhamento', title: '5. Compartilhamento de Dados' },
    { id: 'retencao', title: '6. Retenção de Dados' },
    { id: 'direitos', title: '7. Seus Direitos' },
    { id: 'seguranca', title: '8. Segurança' },
    { id: 'cookies', title: '9. Cookies' },
    { id: 'contato', title: '10. Contato' },
    { id: 'alteracoes', title: '11. Alterações nesta Política' },
]

export default function PoliticaPrivacidadePage() {
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
                        <Shield size={18} className="text-blue-300" />
                        <span className="font-semibold text-sm">Política de Privacidade</span>
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
                                <Shield className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#1F4E79]">Política de Privacidade</h1>
                                <p className="text-slate-500 text-sm">TechDocsTCU — em conformidade com a LGPD (Lei nº 13.709/2018)</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 mb-8">
                            Ao utilizar o TechDocsTCU, você confirma que leu e compreendeu esta Política de Privacidade e concorda com o tratamento de seus dados conforme aqui descrito.
                        </div>

                        <div className="prose prose-slate max-w-none space-y-10 text-sm leading-relaxed">

                            <section id="quem-somos">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">1. Quem Somos</h2>
                                <p className="text-slate-600">
                                    O <strong>TechDocsTCU</strong> é uma plataforma de inteligência jurídica que utiliza inteligência artificial para auxiliar profissionais na análise de jurisprudência do Tribunal de Contas da União (TCU) e na elaboração de pareceres técnicos. Operamos como <strong>Controlador de Dados</strong>, conforme definido pela Lei Geral de Proteção de Dados (LGPD).
                                </p>
                            </section>

                            <section id="dados-coletados">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">2. Dados que Coletamos</h2>
                                <div className="text-slate-600 space-y-3">
                                    <p><strong>Dados de Cadastro:</strong> nome completo, endereço de e-mail e número de telefone, fornecidos no momento do registro.</p>
                                    <p><strong>Dados de Pagamento:</strong> as transações são processadas exclusivamente pela plataforma Asaas. O TechDocsTCU <strong>não armazena</strong> dados de cartão de crédito. Mantemos apenas o registro do pagamento (valor, data, ID da transação) para fins de auditoria.</p>
                                    <p><strong>Dados de Uso:</strong> informações sobre os pareceres criados (título, conteúdo, data), consumo de créditos e histórico de atividades dentro da plataforma.</p>
                                    <p><strong>Dados Técnicos:</strong> endereço IP, tipo de navegador e dados de sessão para garantir a segurança e o funcionamento correto da plataforma.</p>
                                </div>
                            </section>

                            <section id="finalidade">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">3. Para que Usamos</h2>
                                <ul className="text-slate-600 space-y-2 list-none">
                                    {[
                                        'Autenticação e gerenciamento de conta de usuário',
                                        'Processamento de pagamentos e controle de créditos',
                                        'Geração de pareceres técnicos com apoio de inteligência artificial',
                                        'Comunicação sobre atualizações, novidades e suporte',
                                        'Melhoria contínua dos nossos serviços e modelos de IA',
                                        'Cumprimento de obrigações legais e regulatórias',
                                    ].map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#2E75B6] flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section id="base-legal">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">4. Base Legal (LGPD)</h2>
                                <div className="text-slate-600 space-y-2">
                                    <p><strong>Execução de Contrato (Art. 7º, V):</strong> tratamento necessário para prestar os serviços contratados pelo usuário.</p>
                                    <p><strong>Consentimento (Art. 7º, I):</strong> para comunicações de marketing e uso de dados de forma secundária.</p>
                                    <p><strong>Legítimo Interesse (Art. 7º, IX):</strong> para melhorias de segurança, prevenção a fraudes e aprimoramento dos modelos de IA.</p>
                                    <p><strong>Cumprimento de Obrigação Legal (Art. 7º, II):</strong> para atender requisitos fiscais e regulatórios aplicáveis.</p>
                                </div>
                            </section>

                            <section id="compartilhamento">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">5. Compartilhamento de Dados</h2>
                                <p className="text-slate-600 mb-3">Não vendemos seus dados. Compartilhamos apenas com os seguintes parceiros de infraestrutura, estritamente necessários para a operação do serviço:</p>
                                <div className="space-y-2 text-slate-600">
                                    {[
                                        { nome: 'Supabase', uso: 'Banco de dados e autenticação segura' },
                                        { nome: 'Asaas', uso: 'Processamento de pagamentos' },
                                        { nome: 'Netlify', uso: 'Hospedagem da aplicação' },
                                        { nome: 'N8n', uso: 'Automação de processos internos' },
                                        { nome: 'OpenAI / Google (Gemini)', uso: 'Geração de conteúdo com IA' },
                                    ].map(p => (
                                        <div key={p.nome} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                                            <span className="font-semibold text-[#1F4E79] w-32 flex-shrink-0">{p.nome}</span>
                                            <span className="text-xs text-slate-500">{p.uso}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section id="retencao">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">6. Retenção de Dados</h2>
                                <p className="text-slate-600">
                                    Mantemos seus dados pessoais pelo tempo necessário para a prestação dos serviços. Após o encerramento da conta, os dados são retidos por até <strong>5 anos</strong> para fins de auditoria fiscal, conforme exigido pela legislação brasileira, e então excluídos de forma segura.
                                </p>
                            </section>

                            <section id="direitos">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">7. Seus Direitos (LGPD)</h2>
                                <p className="text-slate-600 mb-3">Conforme o Art. 18 da LGPD, você tem o direito de:</p>
                                <ul className="text-slate-600 space-y-1.5 list-none">
                                    {[
                                        'Confirmar a existência de tratamento dos seus dados',
                                        'Acessar os dados que mantemos sobre você',
                                        'Corrigir dados incompletos, inexatos ou desatualizados',
                                        'Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários',
                                        'Solicitar a portabilidade dos seus dados',
                                        'Revogar seu consentimento a qualquer momento',
                                        'Solicitar a exclusão total da sua conta e dados',
                                    ].map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-slate-500 mt-3 text-xs">Para exercer seus direitos, entre em contato pelo e-mail indicado na seção 10.</p>
                            </section>

                            <section id="seguranca">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">8. Segurança</h2>
                                <p className="text-slate-600">
                                    Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo: criptografia em trânsito (HTTPS/TLS), autenticação segura via Supabase Auth, controle de acesso baseado em perfis (RLS), e monitoramento contínuo de atividades suspeitas. Nenhum sistema é 100% invulnerável, e em caso de incidente de segurança, notificaremos os usuários afetados conforme exigido pela LGPD.
                                </p>
                            </section>

                            <section id="cookies">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">9. Cookies</h2>
                                <p className="text-slate-600">
                                    Utilizamos apenas <strong>cookies essenciais</strong> de sessão, necessários para manter o usuário autenticado durante o uso da plataforma. Não utilizamos cookies de rastreamento publicitário ou de terceiros.
                                </p>
                            </section>

                            <section id="contato">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">10. Contato (DPO)</h2>
                                <p className="text-slate-600">
                                    Para dúvidas, solicitações relacionadas aos seus dados ou reclamações sobre esta política, entre em contato com nosso Encarregado de Proteção de Dados (DPO):
                                </p>
                                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
                                    <p className="font-semibold text-[#1F4E79]">TechDocsTCU — Encarregado de Dados</p>
                                    <p className="text-sm text-slate-600 mt-1">E-mail: <a href="mailto:privacidade@techdocstcu.com.br" className="text-blue-600 hover:underline">privacidade@techdocstcu.com.br</a></p>
                                </div>
                            </section>

                            <section id="alteracoes">
                                <h2 className="text-base font-bold text-[#1F4E79] border-b border-slate-100 pb-2 mb-3">11. Alterações nesta Política</h2>
                                <p className="text-slate-600">
                                    Podemos atualizar esta Política periodicamente. Notificaremos sobre alterações relevantes por e-mail ou por aviso dentro da plataforma. O uso continuado do TechDocsTCU após a notificação implica na aceitação da nova política.
                                </p>
                            </section>

                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 pb-4">
                        <Link to="/termos-de-uso" className="text-blue-500 hover:underline">Ver Termos de Uso</Link>
                        {' · '}
                        <Link to="/" className="hover:text-slate-600">Voltar ao Login</Link>
                    </div>
                </main>
            </div>
        </div>
    )
}
