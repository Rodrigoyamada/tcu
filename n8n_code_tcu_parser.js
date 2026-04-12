// COLE ESTE CÓDIGO DENTRO DE UM NÓ "Code" NO SEU N8N
// Ele processa o conteúdo cru recebido do HTTP Request do TCU

const textoBruto = $input.first().json.data; // Ajuste se o nó HTTP vier em outra propriedade
const linhas = textoBruto.split('\n');

// A primeira linha do CSV traz a frase: "Última atualização: XX/XX/XXXX"
const ultimaAtualizacao = linhas[0].trim();

// Opcional: contar os arquivos "Acórdãos" listados
let totalAcordaos = 0;
for (let i = 2; i < linhas.length; i++) {
  if (linhas[i].startsWith('Acórdãos,')) {
    totalAcordaos++;
  }
}

return {
  json: {
    status: "SUCESSO",
    ultima_atualizacao_tcu: ultimaAtualizacao,
    total_encontrados_acordaos: totalAcordaos,
    mensagem_alerta: `Novos dados abertos no TCU (${totalAcordaos} lote(s) de Acórdãos mapeados). ${ultimaAtualizacao}`
  }
};
