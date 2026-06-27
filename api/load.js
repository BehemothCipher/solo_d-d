export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  try {
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/session:${sessionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    });
    const data = await response.json();
    if (!data.result) return res.status(404).json({ error: "No saved game found" });
    return res.status(200).json({ state: JSON.parse(data.result) });
  } catch (err) {
    return res.status(500).json({ error: "Load failed", detail: err.message });
  }
}
