// Cloudflare Pages Function: POST /api/order -> сообщение в Telegram.
// Токен и ID чата берутся из переменных проекта (Variables and secrets):
//   TELEGRAM_BOT_TOKEN (Secret), TELEGRAM_CHAT_ID (Text)
export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ error: "not configured" }, 500);

  let b;
  try { b = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  if (b.website) return json({ ok: true }); // ловушка для ботов

  const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
  const name = clean(b.name, 80), phone = clean(b.phone, 30), comment = clean(b.comment, 500);
  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  if (!name || !phone || !items.length) return json({ error: "invalid" }, 400);

  let total = 0;
  const lines = items.map((i) => {
    const q = Math.min(99, Math.max(1, parseInt(i.qty) || 1));
    const p = Math.max(0, Number(i.price) || 0);
    total += p * q;
    return `• ${clean(i.name, 100)} × ${q}` + (p ? ` — ${p * q} руб.` : "");
  });

  const text = [
    "🛒 Новый предзаказ BIOFROST", "",
    `Имя: ${name}`, `Телефон: ${phone}`, "",
    "Заказ:", ...lines, "",
    `Итого: ${total} руб.`,
    ...(comment ? ["", `Комментарий: ${comment}`] : []),
  ].join("\n");

  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
  });
  return r.ok ? json({ ok: true }) : json({ error: "telegram" }, 502);
}
