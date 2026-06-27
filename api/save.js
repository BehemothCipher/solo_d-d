export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, state } = req.body;
  if (!sessionId || !state) return res.status(400).json({ error: "Missing sessionId or state" });

  try {
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/session:${sessionId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(state)),
    });
    const data = await response.json();
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: "Save failed", detail: err.message });
  }
}
