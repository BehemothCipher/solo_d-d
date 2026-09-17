export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "No GROQ_API_KEY configured" });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    // Trim to last 8 messages to stay within context limits
    const trimmed = (messages || []).slice(-8);

    const groqMessages = [];
    if (system) groqMessages.push({ role: "system", content: system.slice(0, 4000) });
    groqMessages.push(...trimmed);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: 1000,
        temperature: 0.85,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: "Groq API error",
        detail: data,
      });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: "Empty response from Groq" });
    }

    return res.status(200).json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    console.error("Proxy error:", err.message);
    return res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
