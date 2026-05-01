import type { Context } from "@netlify/functions";

const ASAAS_API_KEY = Netlify.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_BASE_URL = Netlify.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId");

  if (!paymentId) {
    return new Response(JSON.stringify({ error: "paymentId obrigatório." }), { status: 400 });
  }

  const res = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
    headers: { "access_token": ASAAS_API_KEY, "Content-Type": "application/json" },
  });

  const payment = await res.json();

  return new Response(JSON.stringify({
    paymentId: payment.id,
    status: payment.status,
    value: payment.value,
    billingType: payment.billingType,
  }), { status: 200 });
};

export const config = {
  path: "/api/checkout-status",
};
