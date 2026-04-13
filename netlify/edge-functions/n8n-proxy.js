export default async (request) => {
  // Read raw payload from the browser request
  const body = await request.text();

  // Send request transparently to N8n
  const n8nResponse = await fetch(
    "https://n8n.srv1291896.hstgr.cloud/webhook/rag-tcu",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
    }
  );

  // Return exactly what N8n returns (prevents crushing if n8n throws a raw 500 text error)
  const responseText = await n8nResponse.text();
  
  return new Response(responseText, {
    status: n8nResponse.status,
    headers: {
      "Content-Type": n8nResponse.headers.get("Content-Type") || "text/plain",
    }
  });
};

export const config = {
  path: "/api/n8n/webhook/rag-tcu",
};
