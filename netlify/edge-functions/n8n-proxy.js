export default async (request) => {
  const body = await request.json();

  const response = await fetch(
    "https://n8n.srv1291896.hstgr.cloud/webhook/rag-tcu",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  return Response.json(data);
};

export const config = {
  path: "/api/n8n/webhook/rag-tcu",
};
