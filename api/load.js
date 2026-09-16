export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  const url   = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/session:${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(500).json({ error: "Load failed", detail: await r.text() });
    const data = await r.json();
    if (!data.result) return res.status(404).json({ error: "No save found" });
    return res.status(200).json({ state: JSON.parse(data.result) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
