export default async function handler(req, res) {
  const { sessionId } = req.query;

  const hasUrl   = !!process.env.KV_REST_API_URL;
  const hasToken = !!process.env.KV_REST_API_TOKEN;

  if (!hasUrl || !hasToken) {
    return res.status(200).json({ error: "Missing env vars", hasUrl, hasToken });
  }

  try {
    // List all keys in the database so we can see what's actually saved
    const keysRes = await fetch(`${process.env.KV_REST_API_URL}/keys/session:*`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    const keysData = await keysRes.json();

    // If sessionId provided, try to read it
    let sessionData = null;
    if (sessionId) {
      const sessRes = await fetch(`${process.env.KV_REST_API_URL}/get/session:${sessionId}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      });
      const sessJson = await sessRes.json();
      sessionData = {
        found: !!sessJson.result,
        resultLength: sessJson.result ? sessJson.result.length : 0,
      };
    }

    return res.status(200).json({
      ok: true,
      savedSessions: keysData,
      queriedSession: sessionId || "none provided",
      sessionData,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
