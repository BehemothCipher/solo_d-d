export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "No API key configured" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: "Anthropic API error",
        status: response.status,
        detail: data,
      });
    }

    // Verify content exists
    if (!data.content || !data.content[0]) {
      console.error("Empty content from Anthropic:", JSON.stringify(data));
      return res.status(500).json({
        error: "Empty response",
        detail: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    return res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
