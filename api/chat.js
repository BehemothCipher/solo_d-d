export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "No GROQ_API_KEY configured" });
  }

  try {
    // Map Anthropic-style request to Groq
    const { messages, system, max_tokens } = req.body;

    // Groq uses OpenAI-compatible format
    const groqMessages = [];
    if (system) {
      groqMessages.push({ role: "system", content: system });
    }
    groqMessages.push(...messages);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: groqMessages,
        max_tokens: max_tokens || 1000,
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

    // Convert Groq response to Anthropic-compatible format
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      console.error("Empty Groq response:", JSON.stringify(data));
      return res.status(500).json({ error: "Empty response from Groq" });
    }

    // Return in Anthropic format so App.jsx doesn't need changes
    return res.status(200).json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    console.error("Proxy error:", err.message);
    return res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
