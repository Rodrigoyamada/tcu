import type { Context } from "@netlify/functions";

const ASAAS_API_KEY = Netlify.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_BASE_URL = Netlify.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.json();
  const { user_id, user_name, user_email, credits, amount, paymentMethod, creditCard, creditCardHolderInfo } = body;

  if (!user_id || !user_name || !user_email || !credits || !amount || !paymentMethod) {
    return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes." }), { status: 400 });
  }

  const headers = {
    "access_token": ASAAS_API_KEY,
    "Content-Type": "application/json",
  };

  // 1. Criar/buscar cliente
  const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: user_name,
      email: user_email,
      cpfCnpj: creditCardHolderInfo?.cpfCnpj ?? "22825974000147",
      externalReference: user_id,
    }),
  });

  const customer = await customerRes.json();

  if (!customer.id) {
    return new Response(JSON.stringify({ error: "Erro ao criar cliente.", detail: customer }), { status: 500 });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  // 2. Gerar cobrança
  const paymentBody: Record<string, unknown> = {
    customer: customer.id,
    billingType: paymentMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX",
    value: amount,
    dueDate: dueDateStr,
    description: `Compra de ${credits} Créditos TechDocsTCU`,
    externalReference: `${user_id}|${credits}`,
  };

  if (paymentMethod === "CREDIT_CARD" && creditCard && creditCardHolderInfo) {
    paymentBody.creditCard = {
      holderName: creditCard.holderName,
      number: creditCard.number.replace(/\s/g, ""),
      expiryMonth: creditCard.expiryMonth,
      expiryYear: creditCard.expiryYear,
      ccv: creditCard.ccv,
    };
    paymentBody.creditCardHolderInfo = {
      name: creditCardHolderInfo.name,
      email: user_email,
      cpfCnpj: creditCardHolderInfo.cpfCnpj.replace(/\D/g, ""),
      postalCode: creditCardHolderInfo.postalCode.replace(/\D/g, ""),
      addressNumber: creditCardHolderInfo.addressNumber,
      phone: creditCardHolderInfo.phone?.replace(/\D/g, "") ?? "",
    };
  }

  const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(paymentBody),
  });

  const payment = await paymentRes.json();

  if (!payment.id) {
    return new Response(JSON.stringify({ error: "Erro ao gerar cobrança.", detail: payment }), { status: 500 });
  }

  // 3. Para PIX: buscar QR Code
  if (paymentMethod === "PIX") {
    const qrRes = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, { headers });
    const qr = await qrRes.json();

    return new Response(JSON.stringify({
      success: true,
      paymentMethod: "PIX",
      encodedImage: qr.encodedImage,
      payload: qr.payload,
      expirationDate: qr.expirationDate,
      paymentId: payment.id,
    }), { status: 200 });
  }

  // 4. Para Cartão: retornar status da transação
  return new Response(JSON.stringify({
    success: true,
    paymentMethod: "CREDIT_CARD",
    status: payment.status,
    paymentId: payment.id,
    value: payment.value,
  }), { status: 200 });
};

export const config = {
  path: "/api/checkout",
};
