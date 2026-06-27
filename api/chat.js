// api/chat.js — Vercel serverless function
// Proxies requests to Anthropic API as DM for Solo D&D

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the Dungeon Master for a dark, atmospheric solo D&D 5e campaign.

The player is Kaelen, "The Slate Ghost" — a Neutral Evil Firbolg Rogue (Level 1).
Background: Hermit. AC 13, HP 9, Initiative +2, Speed 30ft.
Stats: STR 15, DEX 15, CON 13, INT 10, WIS 16, CHA 8.
Key abilities: Sneak Attack (1d6), Hidden Step (invisible 1 turn/rest), Firbolg Magic (Detect Magic/Disguise Self 1/rest), Speech of Beast & Leaf.
Equipment: Shortsword (x2), Dagger (x2), Shortbow + 20 arrows, Leather Armor, Thieves' Tools, Herbalism Kit.

TONE: Dark fantasy. Atmospheric, immersive prose. Morally complex. Kaelen is pragmatic and ruthless — reflect that.

RESPONSE FORMAT: Always respond with ONLY valid JSON in this exact structure:
{
  "narrative": "The story text here. Rich, vivid, 2-4 paragraphs. Use markdown: # for chapter titles, *italic* for emphasis, **bold** for key items, --- for scene breaks.",
  "choices": ["Choice 1 text", "Choice 2 text", "Choice 3 text"],
  "imagePrompt": "A concise scene description for image generation, dark fantasy art style, no text"
}

Rules:
- narrative must be compelling prose, never a list
- Always provide exactly 3 choices that feel meaningfully different
- imagePrompt should describe the current scene visually
- Track what Kaelen does and maintain story continuity
- Apply D&D rules for skill checks, combat, and consequences
- Never break character or mention being an AI`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { messages = [], hp, character } = req.body || {};

  // Build message history — filter to valid role/content pairs
  const cleanMessages = (messages || [])
    .filter(m => m && m.role && m.content)
    .map(m => ({ role: m.role, content: String(m.content) }));

  // If starting fresh with no history, seed with opening
  if (cleanMessages.length === 0) {
    cleanMessages.push({
      role: "user",
      content: `Begin a new solo D&D adventure for Kaelen. Set the opening scene with atmosphere and mystery. Current HP: ${hp || 9}/9.`,
    });
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",   // ← hardcoded — this was the missing field
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: cleanMessages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic error:", errBody);
      return res.status(anthropicRes.status).json({ error: errBody });
    }

    const data = await anthropicRes.json();
    const rawText = data?.content?.[0]?.text || "";

    // Parse the JSON the model returned
    let parsed;
    try {
      // Strip any markdown code fences if model wrapped it
      const clean = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      // If model didn't return valid JSON, wrap raw text as narrative
      parsed = {
        narrative: rawText,
        choices: ["Continue forward", "Look around carefully", "Rest and observe"],
        imagePrompt: "Dark fantasy scene, atmospheric lighting, mysterious dungeon",
      };
    }

    return res.status(200).json({
      narrative:   parsed.narrative   || rawText,
      choices:     parsed.choices     || [],
      imagePrompt: parsed.imagePrompt || "",
    });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
