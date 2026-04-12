// ═══════════════════════════════════════════════════════════════
// NÓ: Comparar Tamanhos e Gerar Notificações
// Cole este código no nó "Code" do workflow Monitor TCU no n8n
//
// Entradas esperadas no $json:
//   arquivos_atuais  → { "Acórdãos 2021": "502.10 MB", ... }
//   memoria_anterior → { "Acórdãos 2021": "500.79 MB", ... }
//                      (lido do campo memoria_arquivos da tabela monitores_tcu)
// ═══════════════════════════════════════════════════════════════

// Converte "500.79 MB" → número de bytes para comparação numérica
function parseSize(str) {
  if (!str) return 0;
  const s = str.trim().replace(',', '.');
  const m = s.match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === 'KB') return v * 1024;
  if (u === 'MB') return v * 1024 * 1024;
  if (u === 'GB') return v * 1024 * 1024 * 1024;
  return v;
}

const atual    = $json.arquivos_atuais  || {};
const anterior = $json.memoria_anterior || {};

const novos       = [];
const atualizados = [];

for (const [nome, tamanhoAtual] of Object.entries(atual)) {
  const bytesAtual    = parseSize(tamanhoAtual);
  const tamanhoAntigo = anterior[nome];

  if (!tamanhoAntigo) {
    // Arquivo completamente novo — não existia no histórico anterior
    novos.push(`- NOVO ARQUIVO: ${nome} (${tamanhoAtual})`);
  } else {
    const bytesAntigo = parseSize(tamanhoAntigo);
    if (bytesAtual > bytesAntigo) {
      // Arquivo existente com tamanho AUMENTADO → há novos acórdãos
      atualizados.push(`- ATUALIZADO: ${nome} — ${tamanhoAntigo} → ${tamanhoAtual}`);
    }
    // Se igual ou MENOR: arquivo não mudou ou foi compactado → ignora silenciosamente
  }
}

const temMudanca = novos.length > 0 || atualizados.length > 0;

return [{
  json: {
    tem_mudanca:     temMudanca,
    novos:           novos,
    atualizados:     atualizados,
    arquivos_atuais: atual,        // passa adiante para salvar no banco
    total_mudancas:  novos.length + atualizados.length,
    mensagem:        [
      temMudanca
        ? `📢 ${novos.length + atualizados.length} arquivo(s) com novos dados no TCU:`
        : null,
      ...novos,
      ...atualizados
    ].filter(Boolean).join('\n')
  }
}];
