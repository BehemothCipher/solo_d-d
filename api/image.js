export default async function handler(req, res) {
  const { prompt } = req.query;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&nologo=true&model=flux&seed=${Math.floor(Math.random()*999999)}`;
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: "Upstream failed" });

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
