import { useState, useRef, useEffect, useMemo } from "react";
import CharacterSelect from "./CharacterSelect.jsx";

// Character loaded dynamically from CharacterSelect

const roll     = s => Math.floor(Math.random() * s) + 1;
const d20check = mod => { const d = roll(20); return { d20: d, total: d + mod, nat: d }; };
const fmt      = n => n >= 0 ? `+${n}` : `${n}`;

// Always use fixed session key — no random IDs
function getSessionId() {
  return "solo_dnd_kaelen_v1";
}

// ── Text-to-Speech ───────────────────────────────────────────────────────────
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled]   = useState(true);
  const enabledRef = useRef(true);
  const pendingRef = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  function getMaleVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    return (
      voices.find(v => v.name === "Google UK English Male") ||
      voices.find(v => /male/i.test(v.name)) ||
      voices.find(v => v.name === "Daniel") ||
      voices.find(v => v.name === "David") ||
      voices.find(v => v.name === "Google UK English") ||
      voices.find(v => v.lang === "en-GB") ||
      voices.find(v => v.lang === "en-US" && !/female|zira|cortana|samantha|karen|moira|tessa/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0]
    );
  }

  function doSpeak(text) {
    if (!window.speechSynthesis || !text) return;
    const clean = text
      .replace(/[*#▶›]/g, "")
      .replace(/---/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    // Delay lets Android cancel() complete before next speak()
    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(clean);
      const voice = getMaleVoice();
      if (voice) utter.voice = voice;
      utter.rate   = 0.82;
      utter.pitch  = 0.6;
      utter.volume = 1;
      utter.onstart = () => setSpeaking(true);
      utter.onend   = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    }, 150);
  }

  function speak(text) {
    pendingRef.current = text;
    if (enabledRef.current) doSpeak(text);
  }

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    enabledRef.current = next;
    if (!next) stop();
    else if (pendingRef.current) doSpeak(pendingRef.current);
  }

  function playPending() {
    if (pendingRef.current) doSpeak(pendingRef.current);
  }

  return { speak, stop, speaking, enabled, toggleEnabled, playPending };
}

async function saveGame(sessionId, state) {
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, state }),
    });
    if (!res.ok) console.warn("Save error:", await res.json());
  } catch (err) { console.warn("Save failed:", err); }
}

async function loadGame(sessionId) {
  try {
    const res = await fetch(`/api/load?sessionId=${sessionId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.state || null;
  } catch { return null; }
}

function detectRoll(action) {
  const l = action.toLowerCase();
  if (/attack|strike|stab|slash|shoot|fire|hit|thrust/.test(l)) return "attack";
  if (/sneak|hide|stealth|silent|shadow|creep/.test(l))         return "stealth";
  if (/percei|look|listen|notice|scan|watch|observe/.test(l))   return "perception";
  if (/investig|examine|inspect|study|search/.test(l))          return "investigation";
  if (/surviv|track|forage|navigate|trail/.test(l))             return "survival";
  if (/climb|jump|leap|sprint|athletic|vault/.test(l))          return "athletics";
  if (/deceiv|lie|bluff|mislead|trick/.test(l))                 return "deception";
  if (/intimidat|threaten|menace/.test(l))                      return "intimidation";
  if (/persuade|convince|charm/.test(l))                        return "persuasion";
  if (/insight|read|sense motive/.test(l))                      return "insight";
  if (/acrobat|tumble|balance|dodge/.test(l))                   return "acrobatics";
  return null;
}

function buildRollResult(type) {
  if (type === "attack") {
    const atk = character?.attacks || [][0];
    const { d20: d, total, nat } = d20check(atk.atkBonus);
    const dmg = roll(atk.damageDice) + atk.damageMod;
    const sneak = roll(6);
    return {
      label: "⚔️ Attack — Shortsword",
      lines: [
        `d20(${d}) + ${atk.atkBonus} = ${total}${nat===20?" 🔥 CRIT!":nat===1?" 💀 MISS":""}`,
        `Damage: ${dmg} ${atk.type}`,
        `Sneak Attack (if valid): +${sneak}`,
      ],
      context: `ATTACK: d20=${d}, total=${total}${nat===20?" CRIT":nat===1?" MISS":""}, dmg=${dmg}, sneak=${sneak}`,
    };
  }
  const skillMap = {
    stealth:["Stealth",6], perception:["Perception",5], investigation:["Investigation",0],
    survival:["Survival",5], athletics:["Athletics",2], deception:["Deception",-1],
    intimidation:["Intimidation",-1], persuasion:["Persuasion",-1],
    insight:["Insight",3], acrobatics:["Acrobatics",4],
  };
  const [name, mod] = skillMap[type] || ["Check", 0];
  const { d20: d, total, nat } = d20check(mod);
  return {
    label: `🎲 ${name} Check`,
    lines: [`d20(${d}) ${fmt(mod)} = ${total}${nat===20?" ⚡ NAT 20!":nat===1?" 💀 NAT 1":""}`],
    context: `${name}: d20=${d}, mod=${fmt(mod)}, total=${total}${nat===20?" (NAT 20)":nat===1?" (NAT 1)":""}`,
  };
}

function buildImagePrompt(narration) {
  const l = narration.toLowerCase();
  const base = "dark fantasy JRPG art, Final Fantasy style, painterly, cinematic, dramatic lighting, highly detailed, no text, no watermark, widescreen";
  let scene = "";
  if (/combat|attack|fight|strike|sword|blade|blood|wound|enemy|creature|beast|monster/.test(l))
    scene = "epic battle scene, warrior rogue with shortsword fighting shadowy enemy in ruins, dynamic action pose, dramatic lighting";
  else if (/vault|door|rune|seal|glow|ancient|magic|arcane/.test(l))
    scene = "ancient sealed stone vault door with glowing magical runes, underground chamber, torchlight, mysterious";
  else if (/stealth|shadow|sneak|hide|invisible|creep|silent/.test(l))
    scene = "cloaked rogue moving silently through dark stone corridor, long shadows, single torch, mist on ground";
  else if (/monastery|chapel|altar|shrine/.test(l))
    scene = "ruined gothic monastery interior, broken pillars, moonlight through shattered stained glass, eerie";
  else if (/forest|tree|wood|nature|animal/.test(l))
    scene = "ancient dark misty mountain forest, twisted trees, bioluminescent plants, fog";
  else if (/mountain|cliff|peak|summit/.test(l))
    scene = "grey-green firbolg rogue on misty mountain cliff at night, ruined monastery below, crescent moon";
  else if (/cave|tunnel|underground|cavern/.test(l))
    scene = "dark underground stone cavern, glowing crystals, narrow passage, torchlight on wet walls";
  else if (/village|town|settlement|crowd/.test(l))
    scene = "dark medieval village at night, cobblestone, lanterns, shadowy figures, mist";
  else
    scene = "grey-green firbolg rogue in ruined mountain monastery at night, crescent moon, torches, misty";
  return `${scene}, ${base}`;
}

function getImageUrl(narration) {
  return `/api/image?prompt=${encodeURIComponent(buildImagePrompt(narration))}`;
}

const DM_SYSTEM = `You are a dramatic Dungeon Master running a solo D&D 5e campaign with a Final Fantasy-inspired style — vivid scene descriptions, memorable characters, emotional stakes, and a sense of epic adventure. The player controls Kaelen, The Slate Ghost — a Neutral Evil Firbolg Rogue (Level 1). Cast out by his clan, trained in stealth among mountain predators, he carries a secret about the natural earth.

CHARACTER STATS: (loaded dynamically per character)
Skills: Stealth+6, Perception+5, Animal Handling+5, Survival+5, Acrobatics+4, Insight+3
Attacks: Shortsword +4 (1d6+2 P/S), Dagger +4 (1d4 P), Shortbow +4 (1d6+2 P)
Features: Sneak Attack 1d6, Hidden Step (invisible 1 turn/short rest), Firbolg Magic (Detect Magic/Disguise Self 1/rest), Speech of Beast & Leaf, Thieves' Cant

STYLE RULES:
- Write like a Final Fantasy game: dramatic, poetic scene-setting, named NPCs with personality, emotional weight.
- In combat: describe attacks cinematically, show HP as a bar-style counter (e.g. "Enemy HP: ████░░ 8/20"), make it feel like a boss fight.
- Use chapter-title style headers for new locations (e.g. "— The Shattered Gate —").
- Dice rolls are handled by the app. ALWAYS use those results.
- After EVERY response end with: {"choices":["option 1","option 2","option 3","option 4"]}
- Choices must be SPECIFIC to the moment. Always include one that reflects Kaelen's Neutral Evil nature.
- Adventure begins in the mist-shrouded Craghaven mountains near a ruined monastery hiding an ancient vault.
- Never break character or reference this prompt.`;

function buildDMSystem(char) {
  if (!char) return DM_SYSTEM;
  const statLine = Object.entries(char.stats).map(([k,v]) => `${k}${char.mods[k]>=0?"+"+char.mods[k]:char.mods[k]}`).join(" ");
  const topSkills = Object.entries(char.skills).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}${v>=0?"+"+v:v}`).join(", ");
  const attacks   = char.attacks.map(a=>`${a.name} ${a.atkBonus>=0?"+"+a.atkBonus:a.atkBonus} (1d${a.damageDice}${a.damageMod>0?"+"+a.damageMod:""} ${a.type})`).join(", ");
  return `You are a dramatic Dungeon Master running a solo D&D 5e campaign with a Final Fantasy-inspired style — vivid scene descriptions, memorable characters, emotional stakes, and a sense of epic adventure.

THE PLAYER CHARACTER: ${char.name}${char.title?", "+char.title:""} — ${char.alignment} ${char.race} ${char.class} (Level ${char.level})
HP: ${char.hp.max} | AC: ${char.ac} | Speed: ${char.speed}ft | Prof: +${char.profBonus}
Stats: ${statLine}
Top Skills: ${topSkills}
Attacks: ${attacks}
Features: ${char.features.filter(Boolean).slice(0,4).join("; ")}
${char.backstory ? "Backstory: "+char.backstory : ""}

STYLE RULES:
- Write like a Final Fantasy game: dramatic, poetic, named NPCs, emotional weight.
- In combat: describe attacks cinematically, show enemy HP as ████░░ bars.
- Use chapter-title headers for new locations (e.g. "— The Shattered Gate —").
- Dice rolls are handled by the app — ALWAYS use those results.
- After EVERY response end with: {"choices":["option 1","option 2","option 3","option 4"]}
- Choices must be SPECIFIC and reflect the character's abilities and personality.
- Always include one choice reflecting the character's alignment and nature.
- Never break character or reference this prompt.`;
}

async function callDM(messages, system) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1200, system: system || DM_SYSTEM, messages }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "The DM is silent...";
}

function parseResponse(raw) {
  let choices = [], narration = raw;

  // Find the LAST occurrence of a JSON choices block anywhere in the text
  // Also handle ```json code blocks the DM sometimes wraps it in
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "");

  // Try to find {"choices":[...]} — greedy from last occurrence
  const allMatches = [...cleaned.matchAll(/\{"choices"\s*:\s*\[([\s\S]*?)\]\s*\}/g)];
  
  if (allMatches.length > 0) {
    const match = allMatches[allMatches.length - 1]; // use last match
    try {
      const parsed = JSON.parse(match[0]);
      choices = parsed.choices || [];
    } catch {
      // Manual extraction fallback
      try {
        choices = match[1]
          .split(/",\s*"/)
          .map(s => s.replace(/^[\s"]+|[\s"]+$/g, "").trim())
          .filter(s => s.length > 3);
      } catch {}
    }
    // Narration = everything before the match, in the cleaned string
    narration = cleaned.slice(0, match.index).trim();
  } else {
    narration = cleaned.trim();
  }

  // Strip trailing markdown artifacts
  narration = narration
    .replace(/```json\s*$/gi, "")
    .replace(/```\s*$/g, "")
    .replace(/---\s*$/g, "")
    .replace(/\{\s*$/g, "")
    .trim();

  return { narration, choices };
}

// ── FF-style theme ────────────────────────────────────────────────────────────
const S = {
  bg:"#050810", panel:"#0a0e1a", border:"#1a2540", accent:"#4a9aba",
  accentDim:"#1e4a60", gold:"#d4aa50", red:"#c03030", green:"#208050",
  text:"#c8d8f0", muted:"#4a5870", rune:"#080c18", highlight:"#0f1830",
  ffblue:"#001830", ffgold:"#c8a030", ffdark:"#020408",
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;width:100%;}
body{background:${S.ffdark};color:${S.text};font-family:'Crimson Pro',Georgia,serif;overflow:hidden;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:${S.ffdark};}::-webkit-scrollbar-thumb{background:${S.accentDim};border-radius:2px;}

.app{display:flex;flex-direction:column;height:100vh;height:100dvh;}

/* FF-style top bar */
.top-bar{padding:0;border-bottom:2px solid ${S.ffgold};display:flex;align-items:stretch;flex-shrink:0;background:linear-gradient(180deg,#0a1428 0%,#050810 100%);}
.top-bar-inner{display:flex;align-items:center;gap:10px;padding:8px 14px;flex:1;}
.top-title{font-family:'Cinzel',serif;font-size:15px;color:${S.ffgold};letter-spacing:.08em;text-shadow:0 0 20px rgba(212,170,80,.4);}
.top-subtitle{font-size:10px;color:${S.muted};letter-spacing:.06em;}
.top-actions{display:flex;gap:0;border-left:1px solid ${S.border};}
.top-btn{background:none;border:none;border-left:1px solid ${S.border};color:${S.muted};font-family:'Cinzel',serif;font-size:10px;padding:0 14px;cursor:pointer;transition:all .15s;letter-spacing:.06em;display:flex;align-items:center;gap:5px;}
.top-btn:hover{color:${S.ffgold};background:rgba(212,170,80,.05);}
.top-btn.save-active{color:${S.green};}
.save-badge{font-size:9px;color:${S.green};font-style:italic;}

.content{display:flex;flex:1;overflow:hidden;}

/* FF-style sidebar */
.sidebar{width:200px;min-width:200px;background:linear-gradient(180deg,#080d1c 0%,#050810 100%);border-right:1px solid ${S.border};overflow-y:auto;display:flex;flex-direction:column;}
.char-head{padding:12px 10px;border-bottom:1px solid ${S.border};background:linear-gradient(180deg,#0d1530 0%,transparent 100%);}
.char-portrait{width:48px;height:48px;border-radius:50%;border:2px solid ${S.ffgold};background:linear-gradient(135deg,#1a2540,#0a1020);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 8px;}
.char-name{font-family:'Cinzel',serif;font-size:11px;color:${S.accent};text-align:center;letter-spacing:.06em;}
.char-sub{font-size:8px;color:${S.muted};text-align:center;margin-top:1px;text-transform:uppercase;letter-spacing:.08em;}

/* FF-style HP bar */
.ff-stat-row{display:flex;justify-content:space-between;align-items:center;font-size:9px;padding:2px 0;}
.ff-stat-label{color:${S.ffgold};font-family:'Cinzel',serif;letter-spacing:.06em;}
.ff-stat-val{color:${S.text};font-family:'JetBrains Mono',monospace;}
.ff-bar{height:5px;background:#0a1020;border-radius:2px;overflow:hidden;margin:2px 0 6px;}
.ff-bar-fill{height:100%;border-radius:2px;transition:width .4s ease;}

.sec{padding:8px 10px;border-bottom:1px solid ${S.border};}
.sec-title{font-size:7px;color:${S.accentDim};text-transform:uppercase;letter-spacing:.15em;margin-bottom:5px;font-family:'Cinzel',serif;}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;}
.stat-box{background:${S.rune};border:1px solid ${S.border};border-radius:2px;text-align:center;padding:4px 2px;}
.stat-label{font-size:6px;color:${S.muted};text-transform:uppercase;}
.stat-mod{font-family:'Cinzel',serif;font-size:13px;color:${S.accent};line-height:1.1;}
.stat-score{font-size:7px;color:${S.muted};}
.mini-stats{display:flex;justify-content:space-around;margin-top:6px;}
.mini-stat{text-align:center;}
.skill-row{display:flex;justify-content:space-between;font-size:9px;padding:1px 0;}
.skill-val{font-family:'JetBrains Mono',monospace;font-size:8px;color:${S.ffgold};}

/* FF attack cards */
.atk-card{background:linear-gradient(135deg,${S.rune},#0a0e1a);border:1px solid ${S.border};border-radius:2px;padding:5px 7px;margin-bottom:3px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden;}
.atk-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:${S.ffgold};opacity:0;transition:opacity .15s;}
.atk-card:hover{border-color:${S.ffgold};}.atk-card:hover::before{opacity:1;}
.atk-name{font-family:'Cinzel',serif;font-size:9px;color:${S.accent};}
.atk-stats{font-family:'JetBrains Mono',monospace;font-size:7px;color:${S.ffgold};margin-top:1px;}
.atk-note{font-size:7px;color:${S.muted};margin-top:1px;font-style:italic;}
.feat-item{font-size:8px;color:${S.muted};padding:2px 0;border-bottom:1px solid rgba(255,255,255,.03);}
.feat-item:last-child{border-bottom:none;}
.inv-item{font-size:8px;color:${S.text};padding:1px 0;}
.dice-row{display:flex;flex-wrap:wrap;gap:3px;}
.die-btn{background:${S.rune};border:1px solid ${S.border};color:${S.ffgold};font-family:'Cinzel',serif;font-size:8px;padding:3px 6px;border-radius:2px;cursor:pointer;transition:all .15s;}
.die-btn:hover{border-color:${S.ffgold};background:#0f1020;}
.last-roll{font-family:'JetBrains Mono',monospace;font-size:8px;color:${S.muted};margin-top:3px;}
.new-game-btn{margin:8px 10px;background:${S.rune};border:1px solid #3a1515;color:#806060;font-family:'Cinzel',serif;font-size:9px;padding:6px;border-radius:2px;cursor:pointer;text-align:center;transition:all .15s;}
.new-game-btn:hover{border-color:${S.red};color:${S.red};}

/* Main area */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}
.combat-banner{background:linear-gradient(90deg,#200808,#100408);border-bottom:1px solid #4a1010;padding:5px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;}
.combat-badge{background:${S.red};color:#fff;font-family:'Cinzel',serif;font-size:8px;padding:2px 6px;border-radius:1px;letter-spacing:.12em;}
.combat-info{font-size:10px;color:#c08080;font-style:italic;}
.end-btn{margin-left:auto;background:none;border:1px solid #5a1515;color:#805050;font-size:9px;padding:2px 8px;border-radius:2px;cursor:pointer;font-family:'Cinzel',serif;}
.end-btn:hover{border-color:${S.red};color:${S.red};}

.log{flex:1;overflow-y:auto;padding:0;display:flex;flex-direction:column;}

/* FF-style scene image — full bleed */
.scene-wrap{width:100%;flex-shrink:0;position:relative;background:#050810;}
.scene-img-container{width:100%;padding-top:42%;position:relative;overflow:hidden;}
.scene-skeleton{position:absolute;inset:0;background:linear-gradient(90deg,#050810 25%,#0a1020 50%,#050810 75%);background-size:200% 100%;animation:shimmer 2s infinite;}
.scene-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transition:opacity .8s ease;}
.scene-overlay{position:absolute;inset:0;background:linear-gradient(0deg,${S.ffdark} 0%,transparent 40%,transparent 70%,rgba(5,8,16,.6) 100%);pointer-events:none;}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

/* FF-style dialogue box */
.msg-dm{background:linear-gradient(180deg,rgba(8,14,28,.98) 0%,rgba(5,10,22,.98) 100%);border-top:1px solid ${S.border};border-bottom:1px solid ${S.border};padding:14px 18px 10px;font-size:15px;line-height:1.8;color:${S.text};white-space:pre-wrap;position:relative;}
.msg-dm::before{content:'▶';position:absolute;bottom:8px;right:12px;font-size:8px;color:${S.ffgold};animation:blink 1.2s infinite;}
@keyframes blink{0%,100%{opacity:0;}50%{opacity:1;}}
.msg-player{background:rgba(10,18,40,.6);border-left:2px solid ${S.ffgold};padding:6px 12px;font-size:12px;color:${S.muted};font-style:italic;margin:0 18px;}
.msg-roll{background:linear-gradient(135deg,rgba(5,20,10,.9),rgba(8,25,15,.9));border:1px solid #1a4020;border-left:3px solid #30a050;padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#70c080;margin:0 0;}
.roll-title{color:#90d0a0;font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px;font-family:'Cinzel',serif;}
.msg-sys{text-align:center;font-size:9px;color:${S.accentDim};font-style:italic;padding:4px;background:${S.ffdark};}

/* FF-style choices — like ATB menu */
.choices-wrap{flex-shrink:0;background:linear-gradient(180deg,rgba(5,8,16,.0) 0%,rgba(5,8,16,1) 15%);padding:0 0 0;}
.choices-label{font-size:8px;color:${S.ffgold};text-transform:uppercase;letter-spacing:.2em;padding:8px 14px 6px;font-family:'Cinzel',serif;border-top:1px solid ${S.border};}
.choices-grid{display:grid;grid-template-columns:1fr;gap:1px;background:${S.border};}
.choice-btn{background:linear-gradient(90deg,${S.ffblue},${S.panel});color:${S.text};font-size:13px;padding:10px 18px;cursor:pointer;text-align:left;font-family:'Crimson Pro',serif;line-height:1.4;transition:all .1s;border:none;position:relative;display:flex;align-items:center;gap:10px;}
.choice-btn::before{content:'▷';color:${S.ffgold};font-size:10px;opacity:0;transition:opacity .1s;}
.choice-btn:hover:not(:disabled){background:linear-gradient(90deg,#0a1840,#0f1e38);color:${S.ffgold};}
.choice-btn:hover::before{opacity:1;}
.choice-btn:active:not(:disabled){background:#0a1428;}
.choice-btn:disabled{opacity:.4;cursor:not-allowed;}

/* FF input bar */
.input-area{padding:8px 14px 10px;border-top:2px solid ${S.border};background:linear-gradient(180deg,#080d1c,#050810);flex-shrink:0;}
.input-row{display:flex;gap:7px;}
.txt-input{flex:1;background:${S.ffblue};border:1px solid ${S.accentDim};color:${S.text};padding:8px 12px;border-radius:2px;font-family:'Crimson Pro',serif;font-size:14px;outline:none;transition:border-color .15s;}
.txt-input:focus{border-color:${S.ffgold};}
.txt-input::placeholder{color:${S.muted};font-style:italic;}
.send-btn{background:linear-gradient(135deg,${S.accentDim},#1a3a50);border:1px solid ${S.accent};color:${S.text};padding:8px 16px;border-radius:2px;font-family:'Cinzel',serif;font-size:11px;cursor:pointer;transition:all .15s;letter-spacing:.04em;}
.send-btn:hover:not(:disabled){background:linear-gradient(135deg,${S.accent},#2a5a70);color:#fff;}
.send-btn:disabled{opacity:.3;cursor:not-allowed;}
.sheet-toggle{background:none;border:none;border-left:1px solid ${S.border};color:${S.muted};font-family:'Cinzel',serif;font-size:10px;padding:0 14px;cursor:pointer;transition:all .15s;letter-spacing:.06em;}
.sheet-toggle:hover{color:${S.ffgold};}

.card-nav{display:flex;align-items:center;justify-content:space-between;padding:6px 14px;border-bottom:1px solid #1a2540;background:#020408;flex-shrink:0;}
.card-nav-btn{background:none;border:1px solid #1a2540;color:#c8a030;font-size:22px;width:38px;height:38px;border-radius:3px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;line-height:1;padding:0;}
.card-nav-btn:hover:not(:disabled){border-color:#c8a030;background:rgba(200,160,48,.1);}
.card-nav-btn:disabled{opacity:.2;cursor:default;}
.card-nav-count{font-family:'Cinzel',serif;font-size:11px;color:#4a5870;letter-spacing:.1em;}
.card-area{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
.play-card{display:flex;flex-direction:column;animation:fadeUp .3s ease;}
.typing{display:flex;gap:5px;align-items:center;padding:6px 0;}
.dot{width:4px;height:4px;background:${S.ffgold};border-radius:50%;animation:pulse 1.2s infinite;}
.dot:nth-child(2){animation-delay:.25s;}.dot:nth-child(3){animation-delay:.5s;}
@keyframes pulse{0%,80%,100%{opacity:.15;}40%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
.msg-dm,.msg-player,.msg-roll,.scene-wrap{animation:fadeUp .3s ease;}

/* sidebar responsive */
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99;}
@media(max-width:600px){
  .sidebar{position:fixed;top:0;left:0;height:100%;z-index:100;width:240px;transform:translateX(-100%);transition:transform .25s ease;}
  .sidebar.open{transform:translateX(0);}
  .sidebar-overlay.open{display:block;}
  .msg-dm{font-size:14px;}
  .choice-btn{font-size:13px;}
}
@media(min-width:601px){
  .sheet-toggle{display:none;}
}
`;

function hpColor(cur, max) {
  const p = cur / max;
  return p > .5 ? S.green : p > .25 ? S.ffgold : S.red;
}

// Image component using our proxy
function SceneImage({ narration }) {
  const [loaded, setLoaded]   = useState(false);
  const [errored, setErrored] = useState(false);
  const [url, setUrl]         = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setAttempt(0);
    setUrl(getImageUrl(narration));
  }, [narration]);

  function handleError() {
    if (attempt < 2) {
      setAttempt(a => a + 1);
      setLoaded(false);
      // Add cache-bust to force new request
      setUrl(getImageUrl(narration) + `&t=${Date.now()}`);
    } else {
      setErrored(true);
    }
  }

  if (!url) return null;

  return (
    <div className="scene-wrap">
      <div className="scene-img-container">
        {!errored && (
          <div className="scene-skeleton" style={{opacity: loaded ? 0 : 1, transition:"opacity .8s ease"}}/>
        )}
        {!errored && (
          <img
            key={url}
            src={url}
            className="scene-img"
            style={{opacity: loaded ? 1 : 0}}
            onLoad={() => setLoaded(true)}
            onError={handleError}
            alt="Scene"
          />
        )}
        {!errored && <div className="scene-overlay"/>}
        {errored && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:S.muted,fontStyle:"italic",background:S.ffdark}}>
            —
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [character, setCharacter]   = useState(null);
  const [showSelect, setShowSelect] = useState(false);
  const [hasSave, setHasSave]       = useState(false);
  const [hp, setHp]                 = useState(9);
  const [messages, setMsgs]         = useState([]);
  const [history, setHistory]       = useState([]);
  const [choices, setChoices]       = useState([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [inCombat, setCombat]       = useState(false);
  const [lastRoll, setLastRoll]     = useState(null);
  const [sheetOpen, setSheet]       = useState(false);
  const [initializing, setInit]     = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const sessionId = useRef(getSessionId());
  const logRef    = useRef(null);
  const tts       = useTTS();

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // Track current card index
  const [cardIndex, setCardIndex] = useState(0);

  // Build cards from messages — each DM response + its scene = one card
  const cards = useMemo(() => {
    const result = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];
      if (msg.type === "scene") {
        const next = messages[i + 1];
        if (next && next.type === "dm") {
          result.push({ scene: msg, dm: next, rolls: [], player: null });
          i += 2;
          continue;
        }
      }
      if (msg.type === "dm") {
        result.push({ scene: null, dm: msg, rolls: [], player: null });
        i++;
        continue;
      }
      if (msg.type === "player" || msg.type === "roll") {
        if (result.length > 0) {
          const card = result[result.length - 1];
          if (msg.type === "roll") card.rolls.push(msg);
          if (msg.type === "player") card.player = msg;
        }
        i++;
        continue;
      }
      i++;
    }
    return result;
  }, [messages]);

  // Auto-advance to latest card when new message arrives
  useEffect(() => {
    if (cards.length > 0) setCardIndex(cards.length - 1);
  }, [cards.length]);

  // On mount: check for save, then show character select
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/load?sessionId=solo_dnd_kaelen_v1");
        if (res.ok) {
          const data = await res.json();
          let saved = data.state;
          if (typeof saved === "string") { try { saved = JSON.parse(saved); } catch {} }
          if (saved && saved.messages?.length > 0) {
            setHasSave(true);
          }
        }
      } catch {}
      setInit(false);
      setShowSelect(true);
    })();
  }, []);

  // Called when user picks a character or continues save
  async function handleCharacterSelect(char, loadSave) {
    setShowSelect(false);
    if (loadSave) {
      // Load saved game
      try {
        const res = await fetch("/api/load?sessionId=solo_dnd_kaelen_v1");
        if (res.ok) {
          const data = await res.json();
          let saved = data.state;
          if (typeof saved === "string") { try { saved = JSON.parse(saved); } catch {} }
          if (saved && saved.messages?.length > 0) {
            setCharacter(saved.character || char);
            setMsgs(saved.messages);
            setHistory(saved.history || []);
            setHp(saved.hp ?? 9);
            setCombat(saved.inCombat ?? false);
            setChoices(saved.choices || []);
            setSaveStatus("Adventure restored!");
            setTimeout(() => setSaveStatus(""), 3000);
            return;
          }
        }
      } catch(err) { console.warn("Load error:", err); }
    }
    // Start new adventure with selected character
    setCharacter(char);
    setHp(char.hp.current);
    await startAdventure(char);
  }

  async function handleManualSave() {
    if (messages.length === 0) return;
    setSaveStatus("Saving...");
    try {
      // Only save text messages (not scene images) to keep state small
      const saveMessages = messages.filter(m => m.type !== "scene");
      // Only keep last 30 messages to avoid hitting size limits
      const trimmedMessages = saveMessages.slice(-30);
      // Only keep last 20 history entries
      const trimmedHistory = history.slice(-20);

      const state = {
        messages: trimmedMessages,
        history: trimmedHistory,
        hp,
        inCombat,
        choices,
        character,
      };

      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "solo_dnd_kaelen_v1", state }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSaveStatus("✓ Saved!");
      } else {
        setSaveStatus("✗ Failed");
        console.warn("Save failed:", data);
      }
    } catch(err) {
      setSaveStatus("✗ Error");
      console.warn("Save error:", err);
    }
    setTimeout(() => setSaveStatus(""), 3000);
  }

  async function startAdventure(char) {
    const activeChar = char || character;
    if (!activeChar) return;
    setLoading(true);
    setMsgs([]); setHistory([]); setChoices([]); setCombat(false);
    setHp(activeChar.hp.current);
    const seed = {
      role:"user",
      content:`Begin the adventure with Final Fantasy-style drama. The player is ${activeChar.name}${activeChar.title ? ", " + activeChar.title : ""} — a ${activeChar.alignment} ${activeChar.race} ${activeChar.class} (Level ${activeChar.level}). ${activeChar.backstory ? "Their backstory: " + activeChar.backstory : ""} Set an immediate atmospheric opening scene using a chapter title header, vivid prose, and place the character in a situation requiring a decision. End with the JSON choices block.`
    };
    const raw = await callDM([seed], buildDMSystem(activeChar));
    const { narration, choices: c } = parseResponse(raw);
    setHistory([seed, { role:"assistant", content:raw }]);
    setMsgs([{ type:"scene", narration }, { type:"dm", text:narration }]);
    setChoices(c);
    setLoading(false);
    tts.speak(narration);
  }

  async function sendAction(action) {
    if (!action.trim() || loading) return;
    setInput(""); setLoading(true); setChoices([]);
    if (sheetOpen) setSheet(false);
    setMsgs(p => [...p, { type:"player", text:action }]);
    const rollType = detectRoll(action);
    let rollCtx = "";
    if (rollType) {
      const result = buildRollResult(rollType);
      setMsgs(p => [...p, { type:"roll", title:result.label, lines:result.lines }]);
      rollCtx = `\n\nDICE RESULT: ${result.context}`;
    }
    if (/attack|fight|engage|charge|ambush/.test(action.toLowerCase())) setCombat(true);
    const userMsg = { role:"user", content:`Player action: "${action}"${rollCtx}\n\nNarrate with Final Fantasy-style drama. End with the JSON choices block.` };
    const newHistory = [...history, userMsg];
    const raw = await callDM(newHistory, buildDMSystem(character));
    const { narration, choices: c } = parseResponse(raw);
    setHistory([...newHistory, { role:"assistant", content:raw }]);
    setMsgs(p => [...p, { type:"scene", narration }, { type:"dm", text:narration }]);
    setChoices(c);
    setLoading(false);
    tts.speak(narration);
  }

  function rollManual(sides) {
    const r = Math.floor(Math.random() * sides) + 1;
    setLastRoll({ sides, r });
    setMsgs(p => [...p, { type:"roll", title:`🎲 d${sides}`, lines:[`Result: ${r}`] }]);
  }

  function handleAttackCard(atk) {
    const res = buildRollResult("attack");
    setMsgs(p => [...p, { type:"roll", title:`⚔️ ${atk.name}`, lines:res.lines }]);
    sendAction(`I attack with my ${atk.name}. [${res.context}]`);
  }

  function confirmNewGame() {
    if (window.confirm("Start a new campaign? Your current progress will be lost.")) startAdventure();
  }

  const hpPct = Math.max(0, (hp / character?.hp?.max || 9) * 100);
  const hpClr = hpColor(hp, character?.hp?.max || 9);

  if (initializing) return (
    <div className="app" style={{alignItems:"center",justifyContent:"center",gap:20,display:"flex",flexDirection:"column",background:S.ffdark}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:22,color:S.ffgold,letterSpacing:".1em",textShadow:"0 0 30px rgba(212,170,80,.5)"}}>⚔ SOLO D&D</div>
      <div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div>
      <div style={{fontSize:11,color:S.muted,fontStyle:"italic",letterSpacing:".08em"}}>LOADING...</div>
    </div>
  );

  if (showSelect) return (
    <CharacterSelect hasSave={hasSave} onSelect={handleCharacterSelect}/>
  );

  const Sidebar = (
    <div className={`sidebar${sheetOpen?" open":""}`}>
      <div className="char-head">
        <div className="char-portrait">⚔️</div>
        <div className="char-name">{character?.name || "Adventurer"}</div>
        <div className="char-sub">{character?.title || ""}</div>
        <div className="char-sub" style={{color:S.muted,marginTop:1}}>{character?.race} {character?.class} · Lv{character?.level || 1}</div>
        <div style={{marginTop:8}}>
          <div className="ff-stat-row"><span className="ff-stat-label">HP</span><span className="ff-stat-val">{hp}/{character?.hp?.max || 9}</span></div>
          <div className="ff-bar"><div className="ff-bar-fill" style={{width:`${hpPct}%`,background:hpClr}}/></div>
          <div style={{display:"flex",gap:3}}>
            {[["−",()=>setHp(p=>Math.max(0,p-1))],["+",()=>setHp(p=>Math.min(character?.hp?.max || 9,p+1))],["MAX",()=>setHp(character?.hp?.max || 9)]].map(([l,fn])=>(
              <button key={l} style={{flex:1,background:S.rune,border:`1px solid ${S.border}`,color:S.muted,fontSize:8,padding:"3px 0",borderRadius:2,cursor:"pointer",fontFamily:"'Cinzel',serif"}} onClick={fn}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="sec">
        <div className="sec-title">Stats</div>
        <div className="stat-grid">
          {Object.entries(character?.stats || {}).map(([k,v])=>(
            <div className="stat-box" key={k}>
              <div className="stat-label">{k}</div>
              <div className="stat-mod">{fmt(character?.mods || {}[k])}</div>
              <div className="stat-score">{v}</div>
            </div>
          ))}
        </div>
        <div className="mini-stats">
          {[["AC",character?.ac || 10],["Init",fmt(character?.initiative || 0)],["Spd",character?.speed || 30],["Prof",fmt(character?.profBonus || 2)]].map(([l,v])=>(
            <div className="mini-stat" key={l}>
              <div className="stat-label">{l}</div>
              <div className="stat-mod" style={{fontSize:11}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="sec">
        <div className="sec-title">Skills</div>
        {["Stealth","Perception","Animal Handling","Survival","Acrobatics","Insight"].map(s=>(
          <div className="skill-row" key={s}><span>{s}</span><span className="skill-val">{fmt(character?.skills || {}[s])}</span></div>
        ))}
      </div>
      <div className="sec">
        <div className="sec-title">Attacks</div>
        {character?.attacks || [].map(a=>(
          <div className="atk-card" key={a.name} onClick={()=>handleAttackCard(a)}>
            <div className="atk-name">{a.name}</div>
            <div className="atk-stats">{fmt(a.atkBonus)} · 1d{a.damageDice}{a.damageMod>0?`+${a.damageMod}`:""} {a.type}</div>
            <div className="atk-note">{a.notes}</div>
          </div>
        ))}
      </div>
      <div className="sec">
        <div className="sec-title">Features</div>
        {character?.features || [].map((f,i)=><div className="feat-item" key={i}>{f}</div>)}
      </div>
      <div className="sec">
        <div className="sec-title">Inventory</div>
        {character?.inventory || [].map((item,i)=><div className="inv-item" key={i}>· {item}</div>)}
      </div>
      <div className="sec">
        <div className="sec-title">Dice</div>
        <div className="dice-row">
          {[4,6,8,10,12,20,100].map(s=>(
            <button className="die-btn" key={s} onClick={()=>rollManual(s)}>d{s}</button>
          ))}
        </div>
        {lastRoll && <div className="last-roll">d{lastRoll.sides} → <strong style={{color:S.ffgold}}>{lastRoll.r}</strong></div>}
      </div>
      <button className="new-game-btn" onClick={confirmNewGame}>↺ New Campaign</button>
      <button className="new-game-btn" style={{borderColor:"#1a3a50",color:S.accentDim,marginTop:2}} onClick={()=>{tts.stop();setShowSelect(true);}}>⚔ Change Character</button>
    </div>
  );

  return (
    <div className="app">
      <div className="top-bar">
        <div className="top-bar-inner">
          <span className="top-title">⚔ SOLO D&amp;D</span>
          <span className="top-subtitle">{character?.name}{character?.title ? " · " + character.title : ""}</span>
          {saveStatus && <span className="save-badge">{saveStatus}</span>}
        </div>
        <div className="top-actions">
          <button className={`top-btn${saveStatus==="✓ Saved!"?" save-active":""}`} onClick={handleManualSave} disabled={loading||messages.length===0}>
            💾 SAVE
          </button>
          <button className="top-btn" onClick={()=>{
            if (tts.speaking) { tts.stop(); }
            else if (!tts.enabled) { tts.toggleEnabled(); }
            else { tts.playPending(); }
          }}>
            {tts.speaking ? "⏹ STOP" : tts.enabled ? "🔊 ON" : "🔇 OFF"}
          </button>
          <button className="top-btn sheet-toggle" onClick={()=>setSheet(p=>!p)}>📋 SHEET</button>
        </div>
      </div>
      <div className="content">
        {Sidebar}
        <div className={`sidebar-overlay${sheetOpen?" open":""}`} onClick={()=>setSheet(false)}/>
        <div className="main">
          {inCombat && (
            <div className="combat-banner">
              <span className="combat-badge">⚔ BATTLE</span>
              <span className="combat-info">Use attack cards or type your action</span>
              <button className="end-btn" onClick={()=>{setCombat(false);setMsgs(p=>[...p,{type:"sys",text:"— Battle ended —"}]);}}>Flee</button>
            </div>
          )}
          {/* Card navigation */}
          <div className="card-nav">
            <button className="card-nav-btn" onClick={()=>setCardIndex(i=>Math.max(0,i-1))} disabled={cardIndex===0}>‹</button>
            <span className="card-nav-count">{cards.length > 0 ? `${cardIndex+1} / ${cards.length}` : "—"}</span>
            <button className="card-nav-btn" onClick={()=>setCardIndex(i=>Math.min(cards.length-1,i+1))} disabled={cardIndex>=cards.length-1}>›</button>
          </div>

          {/* Card display */}
          <div className="card-area" ref={logRef}>
            {loading && cards.length === 0 && (
              <div className="play-card">
                <div className="msg-dm"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>
              </div>
            )}
            {cards.length > 0 && (() => {
              const card = cards[cardIndex];
              return (
                <div className="play-card" key={cardIndex}>
                  {card.scene && <SceneImage narration={card.scene.narration}/>}
                  {card.player && <div className="msg-player">› {card.player.text}</div>}
                  {card.rolls.map((r,i)=>(
                    <div key={i} className="msg-roll">
                      <div className="roll-title">{r.title}</div>
                      {r.lines.map((l,j)=><div key={j}>{l}</div>)}
                    </div>
                  ))}
                  <div className="msg-dm">{card.dm.text}</div>
                  {loading && cardIndex === cards.length - 1 && (
                    <div className="msg-dm" style={{borderTop:`1px solid ${S.border}`,paddingTop:10,marginTop:10}}>
                      <div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          {choices.length>0 && !loading && (
            <div className="choices-wrap">
              <div className="choices-label">— Choose Action —</div>
              <div className="choices-grid">
                {choices.map((c,i)=>(
                  <button key={i} className="choice-btn" onClick={()=>sendAction(c)} disabled={loading}>{c}</button>
                ))}
              </div>
            </div>
          )}
          <div className="input-area">
            <div className="input-row">
              <input className="txt-input" value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAction(input);}}}
                placeholder="Or type your own action…" disabled={loading}/>
              <button className="send-btn" onClick={()=>sendAction(input)} disabled={loading||!input.trim()}>
                {loading?"...":"ACT"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
