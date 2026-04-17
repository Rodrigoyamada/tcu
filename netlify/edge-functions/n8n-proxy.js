export default async (request) => {
  // Read raw payload from the browser request
  const body = await request.text();

  // Fire-and-forget: dispara para o n8n sem esperar resposta
  // O n8n pode demorar 2-4 minutos; o app já usa polling no Supabase
  fetch("https://n8n.srv1291896.hstgr.cloud/webhook/rag-tcu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body,
  }).catch(() => {}); // ignora erros de rede silenciosamente

  // Retorna 202 imediatamente — o app fará polling no Supabase
  return new Response(JSON.stringify({ status: "processing" }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/n8n/webhook/rag-tcu",
};
