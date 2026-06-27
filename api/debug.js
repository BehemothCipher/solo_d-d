export default async function handler(req, res) {
  const { sessionId } = req.query;

  // Test 1: Check env vars exist
  const hasUrl   = !!process.env.KV_REST_API_URL;
  const hasToken = !!process.env.KV_REST_API_TOKEN;

  if (!hasUrl || !hasToken) {
    return res.status(200).json({
      error: "Missing env vars",
      hasUrl,
      hasToken,
    });
  }

  // Test 2: Try a simple ping write to Upstash
  try {
    const pingRes = await fetch(`${process.env.KV_REST_API_URL}/set/debug:ping`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify("pong"),
    });
    const pingData = await pingRes.json();

    // Test 3: Try to read it back
    const readRes = await fetch(`${process.env.KV_REST_API_URL}/get/debug:ping`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    const readData = await readRes.json();

    // Test 4: If sessionId provided, try to read that session
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
      hasUrl,
      hasToken,
      pingWrite: pingData,
      pingRead: readData,
      sessionData,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
