export default async function handler(req, res) {
  const results = {};

  // Test 1: Check env vars exist
  results.hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  results.hasKvUrl        = !!process.env.KV_REST_API_URL;
  results.hasKvToken      = !!process.env.KV_REST_API_TOKEN;

  // Test 2: Test Anthropic API directly
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }],
      }),
    });
    const data = await r.json();
    results.anthropicStatus = r.status;
    results.anthropicOk     = r.ok;
    results.anthropicReply  = data.content?.[0]?.text || data.error?.message || JSON.stringify(data).slice(0,100);
  } catch (err) {
    results.anthropicError = err.message;
  }

  // Test 3: Test Upstash
  try {
    const r = await fetch(`${process.env.KV_REST_API_URL}/ping`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    const data = await r.json();
    results.upstashStatus = r.status;
    results.upstashOk     = r.ok;
    results.upstashReply  = JSON.stringify(data);
  } catch (err) {
    results.upstashError = err.message;
  }

  return res.status(200).json(results);
}
