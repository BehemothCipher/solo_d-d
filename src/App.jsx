import { useState, useRef, useEffect } from "react";

const KAELEN = {
  name: "Kaelen", title: "The Slate Ghost",
  race: "Firbolg", class: "Rogue", level: 1, background: "Hermit", alignment: "Neutral Evil",
  hp: { max: 9, current: 9 }, ac: 13, initiative: 2, speed: 30, profBonus: 2,
  stats: { STR: 15, DEX: 15, CON: 13, INT: 10, WIS: 16, CHA: 8 },
  mods:  { STR: 2,  DEX: 2,  CON: 1,  INT: 0,  WIS: 3,  CHA: -1 },
  skills: { Acrobatics:4,"Animal Handling":5,Arcana:0,Athletics:2,Deception:-1,History:0,
    Insight:3,Intimidation:-1,Investigation:0,Medicine:3,Nature:0,Perception:5,
    Performance:-1,Persuasion:-1,Religion:0,"Sleight of Hand":2,Stealth:6,Survival:5 },
  attacks: [
    { name:"Shortsword", atkBonus:4, damageDice:6, damageMod:2, type:"P/S", notes:"Finesse, Light. Sneak Attack (1d6)." },
    { name:"Dagger (Off-hand)", atkBonus:4, damageDice:4, damageMod:0, type:"Piercing", notes:"Bonus Action. Thrown 20/60ft." },
    { name:"Shortbow", atkBonus:4, damageDice:6, damageMod:2, type:"Piercing", notes:"Range 80/320ft. 20 arrows." },
  ],
  features:["Sneak Attack (1d6)","Speech of Beast & Leaf","Hidden Step (invisible 1 turn/rest)","Firbolg Magic (Detect Magic / Disguise Self 1/rest)","Thieves' Cant"],
  inventory:["2× Shortsword","2× Dagger","Shortbow + 20 arrows","Leather Armor","Thieves' Tools","Herbalism Kit"],
};

const roll     = s => Math.floor(Math.random() * s) + 1;
const d20check = mod => { const d = roll(20); return { d20: d, total: d + mod, nat: d }; };
const fmt      = n => n >= 0 ? `+${n}` : `${n}`;

// Fixed session key — always the same for this device
// Uses localStorage as backup but falls back to a stable key
function getSessionId() {
  const FIXED_KEY = "solo_dnd_kaelen_v1";
  try {
    let id = localStorage.getItem("solo_dnd_session");
    if (!id) {
      localStorage.setItem("solo_dnd_session", FIXED_KEY);
      return FIXED_KEY;
    }
    return id;
  } catch {
    return FIXED_KEY;
  }
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
    const atk = KAELEN.attacks[0];
    const { d20: d, total, nat } = d20check(atk.atkBonus);
    const dmg = roll(atk.damageDice) + atk.damageMod;
    const sneak = roll(6);
    return {
      label: "⚔️ Attack Roll — Shortsword",
      lines: [
        `d20(${d}) + ${atk.atkBonus} = ${total}${nat===20?" 🔥 CRIT":nat===1?" 💀 MISS":""}`,
        `Damage: ${dmg} ${atk.type}`, `Sneak Attack (if valid): +${sneak}`,
      ],
      context: `ATTACK: d20=${d}, total=${total}${nat===20?" CRIT":nat===1?" MISS":""}, dmg=${dmg} ${atk.type}, sneak=${sneak}`,
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
  const base = "dark fantasy RPG digital art, cinematic painterly style, dramatic lighting, detailed, no text, no watermark";
  let scene = "";
  if (/combat|attack|fight|strike|sword|blade|blood|wound|enemy|creature|beast|monster/.test(l))
    scene = "intense melee combat scene in dark stone ruins, warrior with shortsword, dynamic action pose, moonlight and torchlight";
  else if (/vault|door|rune|seal|glow|ancient|magic|arcane/.test(l))
    scene = "ancient underground stone vault door covered in glowing green runes, torchlight, mossy walls, mysterious atmosphere";
  else if (/stealth|shadow|sneak|hide|invisible|creep|silent/.test(l))
    scene = "hooded rogue creeping silently through dark stone corridor, long dramatic shadows, single torch on wall, mist on ground";
  else if (/monastery|chapel|altar|shrine|pew|reli/.test(l))
    scene = "crumbling gothic monastery interior at night, broken stone pillars, moonlight through shattered windows, eerie atmosphere";
  else if (/forest|tree|wood|branch|leaf|nature|animal/.test(l))
    scene = "dark misty mountain forest at night, ancient twisted trees, bioluminescent fungi, fog between trunks";
  else if (/mountain|cliff|peak|summit|vista|overlook/.test(l))
    scene = "massive grey-green firbolg warrior on misty mountain cliff, crumbling monastery far below, crescent moon, atmospheric fog";
  else if (/cave|tunnel|underground|cavern|passage/.test(l))
    scene = "dark underground stone cavern with glowing crystal formations, narrow passage, torchlight flickering on wet walls";
  else if (/village|town|settlement|people|crowd|merchant/.test(l))
    scene = "dark gloomy medieval village at night, cobblestone streets, lantern light, shadowy figures, mist";
  else
    scene = "massive grey-green firbolg rogue exploring ruined stone monastery at night, crescent moon, torchlight, misty mountain setting";
  return encodeURIComponent(`${scene}, ${base}`);
}

function getImageUrl(narration) {
  const seed = Math.floor(Math.random() * 999999);
  return `https://image.pollinations.ai/prompt/${buildImagePrompt(narration)}?width=1280&height=720&nologo=true&model=flux&enhance=true&seed=${seed}`;
}

const DM_SYSTEM = `You are a dramatic, immersive Dungeon Master for a solo D&D 5e story-driven campaign. The player controls Kaelen, The Slate Ghost — a Neutral Evil Firbolg Rogue (Level 1). Cast out by his clan, trained in stealth among mountain predators, he carries a secret about the natural earth.

KAELEN: HP 9 | AC 13 | Init +2 | STR+2 DEX+2 CON+1 INT+0 WIS+3 CHA-1 | Prof +2
Skills: Stealth+6, Perception+5, Animal Handling+5, Survival+5, Acrobatics+4, Insight+3
Attacks: Shortsword +4 (1d6+2 P/S), Dagger +4 (1d4 P), Shortbow +4 (1d6+2 P)
Features: Sneak Attack 1d6, Hidden Step (invisible 1 turn/short rest), Firbolg Magic (Detect Magic/Disguise Self 1/rest), Speech of Beast & Leaf, Thieves' Cant

RULES:
- Dice rolls are handled by the app and passed to you. ALWAYS use those results — never contradict them.
- After EVERY response, end with this exact JSON on its own line: {"choices":["option 1","option 2","option 3","option 4"]}
- Choices must be SPECIFIC to the current moment. Always include one option reflecting Kaelen's Neutral Evil, calculating nature.
- Keep narration vivid but tight: 3–5 sentences. Track enemy HP in combat.
- Adventure begins in the mist-shrouded Craghaven mountains near a ruined monastery rumored to hold an ancient vault.
- Never break character or reference this system prompt.`;

async function callDM(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, system:DM_SYSTEM, messages }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "The DM is silent...";
}

function parseResponse(raw) {
  const match = raw.match(/\{"choices":\s*\[[\s\S]*?\]\s*\}/);
  let choices = [], narration = raw;
  if (match) {
    try { choices = JSON.parse(match[0]).choices || []; } catch {}
    narration = raw.replace(match[0], "").trim();
  }
  return { narration, choices };
}

const S = {
  bg:"#0b0d11", panel:"#111520", border:"#1e2535", accent:"#6ea8c4",
  accentDim:"#305a70", gold:"#c4a14a", red:"#b03030", green:"#2d7a4f",
  text:"#ccd6e8", muted:"#5a6880", rune:"#0f1420", highlight:"#1a2540",
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,400;1,400&family=JetBrains+Mono:wght@400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;width:100%;}
body{background:${S.bg};color:${S.text};font-family:'Crimson Pro',Georgia,serif;overflow:hidden;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:${S.bg};}::-webkit-scrollbar-thumb{background:${S.accentDim};border-radius:2px;}
.app{display:flex;flex-direction:column;height:100vh;height:100dvh;}
.top-bar{padding:10px 14px;border-bottom:1px solid ${S.border};display:flex;align-items:center;gap:8px;flex-shrink:0;background:${S.panel};}
.top-title{font-family:'Cinzel',serif;font-size:14px;color:${S.gold};letter-spacing:.04em;}
.save-badge{font-size:9px;color:${S.green};font-style:italic;margin-left:4px;}
.save-btn{background:${S.rune};border:1px solid ${S.accentDim};color:${S.accent};font-family:'Cinzel',serif;font-size:10px;padding:4px 10px;border-radius:3px;cursor:pointer;margin-left:8px;transition:all .15s;}
.save-btn:hover:not(:disabled){background:${S.highlight};border-color:${S.accent};}
.save-btn:disabled{opacity:.3;cursor:not-allowed;}
.content{display:flex;flex:1;overflow:hidden;}
.sidebar{width:220px;min-width:220px;background:${S.panel};border-right:1px solid ${S.border};overflow-y:auto;display:flex;flex-direction:column;}
.char-head{padding:12px;border-bottom:1px solid ${S.border};}
.char-name{font-family:'Cinzel',serif;font-size:13px;color:${S.accent};}
.char-sub{font-size:9px;color:${S.muted};margin-top:2px;letter-spacing:.06em;text-transform:uppercase;}
.sec{padding:9px 12px;border-bottom:1px solid ${S.border};}
.sec-title{font-size:7px;color:${S.accentDim};text-transform:uppercase;letter-spacing:.15em;margin-bottom:6px;font-family:'Cinzel',serif;}
.hp-num{font-family:'Cinzel',serif;font-size:18px;text-align:center;margin-bottom:3px;}
.hp-label{font-size:8px;color:${S.muted};display:flex;justify-content:space-between;margin-bottom:4px;}
.hp-track{height:6px;background:#0f1520;border-radius:3px;overflow:hidden;}
.hp-fill{height:100%;border-radius:3px;transition:width .4s ease;}
.hp-btns{display:flex;gap:4px;margin-top:6px;}
.hp-btn{flex:1;background:${S.rune};border:1px solid ${S.border};color:${S.muted};font-size:9px;padding:4px 0;border-radius:3px;cursor:pointer;font-family:'Cinzel',serif;transition:all .15s;}
.hp-btn:hover{border-color:${S.accent};color:${S.accent};}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
.stat-box{background:${S.rune};border:1px solid ${S.border};border-radius:3px;text-align:center;padding:5px 2px;}
.stat-label{font-size:6px;color:${S.muted};text-transform:uppercase;}
.stat-mod{font-family:'Cinzel',serif;font-size:14px;color:${S.accent};line-height:1.1;}
.stat-score{font-size:8px;color:${S.muted};}
.mini-stats{display:flex;justify-content:space-around;margin-top:7px;}
.mini-stat{text-align:center;}
.skill-row{display:flex;justify-content:space-between;font-size:10px;padding:1px 0;}
.skill-val{font-family:'JetBrains Mono',monospace;font-size:9px;color:${S.gold};}
.atk-card{background:${S.rune};border:1px solid ${S.border};border-radius:3px;padding:6px 8px;margin-bottom:4px;cursor:pointer;transition:border-color .15s;}
.atk-card:hover{border-color:${S.accent};}
.atk-name{font-family:'Cinzel',serif;font-size:10px;color:${S.accent};}
.atk-stats{font-family:'JetBrains Mono',monospace;font-size:8px;color:${S.gold};margin-top:1px;}
.atk-note{font-size:8px;color:${S.muted};margin-top:2px;font-style:italic;}
.feat-item{font-size:9px;color:${S.muted};padding:2px 0;border-bottom:1px solid ${S.rune};}
.feat-item:last-child{border-bottom:none;}
.inv-item{font-size:9px;color:${S.text};padding:1px 0;}
.dice-row{display:flex;flex-wrap:wrap;gap:4px;}
.die-btn{background:${S.rune};border:1px solid ${S.border};color:${S.gold};font-family:'Cinzel',serif;font-size:9px;padding:4px 7px;border-radius:3px;cursor:pointer;}
.die-btn:hover{border-color:${S.gold};}
.last-roll{font-family:'JetBrains Mono',monospace;font-size:9px;color:${S.muted};margin-top:4px;}
.new-game-btn{margin:10px 12px;background:${S.rune};border:1px solid #3a2020;color:#906060;font-family:'Cinzel',serif;font-size:10px;padding:7px;border-radius:4px;cursor:pointer;text-align:center;transition:all .15s;}
.new-game-btn:hover{border-color:${S.red};color:${S.red};}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}
.combat-banner{background:#160a0a;border-bottom:1px solid #3a1515;padding:6px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;}
.combat-badge{background:${S.red};color:#fff;font-family:'Cinzel',serif;font-size:8px;padding:2px 6px;border-radius:2px;letter-spacing:.1em;}
.combat-info{font-size:10px;color:#c09090;}
.end-btn{margin-left:auto;background:none;border:1px solid #5a2020;color:#906060;font-size:9px;padding:2px 8px;border-radius:3px;cursor:pointer;font-family:'Cinzel',serif;}
.end-btn:hover{border-color:${S.red};color:${S.red};}
.log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}

/* Fixed scene image - always takes up space, skeleton shown while loading */
.scene-wrap{width:100%;border-radius:6px;overflow:hidden;border:1px solid ${S.border};background:#080a0e;position:relative;}
.scene-wrap::after{content:'';position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,${S.bg});pointer-events:none;}
.scene-img-container{width:100%;aspect-ratio:16/9;position:relative;}
.scene-skeleton{position:absolute;inset:0;background:linear-gradient(90deg,#0d1018 25%,#141820 50%,#0d1018 75%);background-size:200% 100%;animation:shimmer 1.8s infinite;}
.scene-img{object-fit:cover;transition:opacity .6s ease;display:block;}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

.msg-dm{background:${S.panel};border:1px solid ${S.border};border-left:3px solid ${S.accentDim};border-radius:0 5px 5px 0;padding:11px 13px;font-size:15px;line-height:1.75;color:${S.text};white-space:pre-wrap;}
.msg-player{background:${S.rune};border:1px solid ${S.border};border-right:3px solid ${S.gold};border-radius:5px 0 0 5px;padding:8px 12px;font-size:13px;color:${S.muted};align-self:flex-end;max-width:80%;font-style:italic;}
.msg-roll{background:#0a1408;border:1px solid #1e3a18;border-radius:5px;padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#78b870;}
.roll-title{color:#9aca90;font-size:9px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;}
.msg-sys{text-align:center;font-size:9px;color:${S.accentDim};font-style:italic;padding:2px;}
.choices-wrap{padding:10px 14px 0;flex-shrink:0;}
.choices-label{font-size:8px;color:${S.accentDim};text-transform:uppercase;letter-spacing:.15em;margin-bottom:7px;font-family:'Cinzel',serif;}
.choices-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.choice-btn{background:${S.highlight};border:1px solid ${S.border};color:${S.text};font-size:13px;padding:9px 11px;border-radius:5px;cursor:pointer;text-align:left;font-family:'Crimson Pro',serif;line-height:1.4;transition:all .15s;}
.choice-btn:hover:not(:disabled){border-color:${S.accent};color:${S.accent};}
.choice-btn:active:not(:disabled){background:#243050;}
.choice-btn:disabled{opacity:.4;cursor:not-allowed;}
.input-area{padding:10px 14px 12px;border-top:1px solid ${S.border};background:${S.panel};flex-shrink:0;}
.input-row{display:flex;gap:7px;}
.txt-input{flex:1;background:${S.rune};border:1px solid ${S.border};color:${S.text};padding:9px 12px;border-radius:5px;font-family:'Crimson Pro',serif;font-size:15px;outline:none;transition:border-color .15s;}
.txt-input:focus{border-color:${S.accentDim};}
.txt-input::placeholder{color:${S.muted};font-style:italic;}
.send-btn{background:${S.accentDim};border:none;color:#fff;padding:9px 16px;border-radius:5px;font-family:'Cinzel',serif;font-size:11px;cursor:pointer;transition:background .15s;white-space:nowrap;}
.send-btn:hover:not(:disabled){background:${S.accent};}
.send-btn:disabled{opacity:.35;cursor:not-allowed;}
.sheet-toggle{background:${S.rune};border:1px solid ${S.border};color:${S.muted};font-family:'Cinzel',serif;font-size:10px;padding:4px 10px;border-radius:3px;cursor:pointer;margin-left:8px;}
.sheet-toggle:hover{border-color:${S.accent};color:${S.accent};}
.typing{display:flex;gap:4px;align-items:center;padding:4px 0;}
.dot{width:5px;height:5px;background:${S.accentDim};border-radius:50%;animation:pulse 1.2s infinite;}
.dot:nth-child(2){animation-delay:.2s;}.dot:nth-child(3){animation-delay:.4s;}
@keyframes pulse{0%,80%,100%{opacity:.2;}40%{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
.msg-dm,.msg-player,.msg-roll,.choices-wrap,.scene-wrap{animation:fadeUp .3s ease;}
@media(max-width:600px){
  .sidebar{position:fixed;top:0;left:0;height:100%;z-index:100;width:260px;transform:translateX(-100%);transition:transform .25s ease;}
  .sidebar.open{transform:translateX(0);}
  .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99;}
  .sidebar-overlay.open{display:block;}
  .choices-grid{grid-template-columns:1fr;}
  .msg-dm{font-size:14px;}
  .choice-btn{font-size:13px;padding:10px 12px;}
}
@media(min-width:601px){
  .sheet-toggle{display:none;}
  .sidebar-overlay{display:none!important;}
}
`;

function hpColor(cur, max) {
  const p = cur / max;
  return p > .6 ? S.green : p > .3 ? S.gold : S.red;
}

// Fixed SceneImage — container always takes up space, skeleton fades out when image loads
function SceneImage({ narration }) {
  const [loaded, setLoaded]   = useState(false);
  const [errored, setErrored] = useState(false);
  const [url, setUrl]         = useState("");
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setRetries(0);
    const seed = Math.floor(Math.random() * 999999);
    setUrl(`https://image.pollinations.ai/prompt/${buildImagePrompt(narration)}?width=1024&height=576&nologo=true&model=flux&seed=${seed}`);
  }, [narration]);

  function handleError() {
    if (retries < 2) {
      // Retry with a new seed
      setRetries(r => r + 1);
      setLoaded(false);
      const seed = Math.floor(Math.random() * 999999);
      setUrl(`https://image.pollinations.ai/prompt/${buildImagePrompt(narration)}?width=1024&height=576&nologo=true&model=flux&seed=${seed}`);
    } else {
      setErrored(true);
    }
  }

  if (!url) return null;

  return (
    <div className="scene-wrap">
      <div className="scene-img-container">
        {/* Skeleton shown while loading */}
        {!loaded && !errored && (
          <div className="scene-skeleton" />
        )}
        {/* Image fades in on load */}
        {!errored && (
          <img
            key={url}
            src={url}
            className="scene-img"
            style={{ opacity: loaded ? 1 : 0, position: loaded ? "relative" : "absolute", top:0, left:0, width:"100%", height:"100%" }}
            onLoad={() => setLoaded(true)}
            onError={handleError}
            alt="Scene"
          />
        )}
        {errored && (
          <div style={{ width:"100%", aspectRatio:"16/9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:S.muted, fontStyle:"italic", background:"#0a0c10" }}>
            Scene unavailable
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [hp, setHp]                 = useState(KAELEN.hp.current);
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

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading, choices]);

  // Boot — try to load save, else start fresh
  useEffect(() => {
    (async () => {
      const saved = await loadGame(sessionId.current);
      if (saved && saved.messages?.length > 0) {
        setMsgs(saved.messages);
        setHistory(saved.history || []);
        setHp(saved.hp ?? KAELEN.hp.current);
        setCombat(saved.inCombat ?? false);
        setChoices(saved.choices || []);
        setSaveStatus("Adventure restored!");
        setTimeout(() => setSaveStatus(""), 3000);
        setInit(false);
      } else {
        setInit(false);
        await startAdventure();
      }
    })();
  }, []);

  // Manual save function
  async function handleManualSave() {
    if (messages.length === 0) return;
    setSaveStatus("Saving...");
    const state = { messages, history, hp, inCombat, choices };
    await saveGame(sessionId.current, state);
    setSaveStatus("✓ Saved!");
    setTimeout(() => setSaveStatus(""), 2500);
  }

  async function startAdventure() {
    setLoading(true);
    setMsgs([]); setHistory([]); setChoices([]); setCombat(false); setHp(KAELEN.hp.current);
    const seed = { role:"user", content:"Begin the adventure. Set the scene in the Craghaven mountains near the ruined monastery. Open with an immediate atmospheric moment that puts Kaelen in a situation requiring a decision. End with the JSON choices block." };
    const raw = await callDM([seed]);
    const { narration, choices: c } = parseResponse(raw);
    setHistory([seed, { role:"assistant", content:raw }]);
    setMsgs([{ type:"scene", narration }, { type:"dm", text:narration }]);
    setChoices(c);
    setLoading(false);
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
    const userMsg = { role:"user", content:`Player action: "${action}"${rollCtx}\n\nNarrate what happens. End with the JSON choices block for this exact situation.` };
    const newHistory = [...history, userMsg];
    const raw = await callDM(newHistory);
    const { narration, choices: c } = parseResponse(raw);
    setHistory([...newHistory, { role:"assistant", content:raw }]);
    setMsgs(p => [...p, { type:"scene", narration }, { type:"dm", text:narration }]);
    setChoices(c);
    setLoading(false);
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

  const hpPct = Math.max(0, (hp / KAELEN.hp.max) * 100);
  const hpClr = hpColor(hp, KAELEN.hp.max);

  if (initializing) return (
    <div className="app" style={{alignItems:"center",justifyContent:"center",gap:16,display:"flex",flexDirection:"column"}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:S.gold}}>⚔ Solo D&D</div>
      <div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div>
      <div style={{fontSize:12,color:S.muted,fontStyle:"italic"}}>Restoring your adventure…</div>
    </div>
  );

  const Sidebar = (
    <div className={`sidebar${sheetOpen?" open":""}`}>
      <div className="char-head">
        <div className="char-name">{KAELEN.name}</div>
        <div className="char-sub">{KAELEN.title}</div>
        <div className="char-sub" style={{color:S.muted,marginTop:2}}>{KAELEN.race} {KAELEN.class} · Lv{KAELEN.level}</div>
      </div>
      <div className="sec">
        <div className="hp-num" style={{color:hpClr}}>{hp} / {KAELEN.hp.max}</div>
        <div className="hp-label"><span>Hit Points</span><span style={{color:hpClr}}>{Math.round(hpPct)}%</span></div>
        <div className="hp-track"><div className="hp-fill" style={{width:`${hpPct}%`,background:hpClr}}/></div>
        <div className="hp-btns">
          {[["−1",()=>setHp(p=>Math.max(0,p-1))],["+1",()=>setHp(p=>Math.min(KAELEN.hp.max,p+1))],["Full",()=>setHp(KAELEN.hp.max)]].map(([l,fn])=>(
            <button key={l} className="hp-btn" onClick={fn}>{l}</button>
          ))}
        </div>
      </div>
      <div className="sec">
        <div className="sec-title">Ability Scores</div>
        <div className="stat-grid">
          {Object.entries(KAELEN.stats).map(([k,v])=>(
            <div className="stat-box" key={k}>
              <div className="stat-label">{k}</div>
              <div className="stat-mod">{fmt(KAELEN.mods[k])}</div>
              <div className="stat-score">{v}</div>
            </div>
          ))}
        </div>
        <div className="mini-stats">
          {[["AC",KAELEN.ac],["Init",fmt(KAELEN.initiative)],["Spd",KAELEN.speed],["Prof",fmt(KAELEN.profBonus)]].map(([l,v])=>(
            <div className="mini-stat" key={l}>
              <div className="stat-label">{l}</div>
              <div className="stat-mod" style={{fontSize:12}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="sec">
        <div className="sec-title">Key Skills</div>
        {["Stealth","Perception","Animal Handling","Survival","Acrobatics","Insight","Athletics"].map(s=>(
          <div className="skill-row" key={s}><span>{s}</span><span className="skill-val">{fmt(KAELEN.skills[s])}</span></div>
        ))}
      </div>
      <div className="sec">
        <div className="sec-title">Attacks — tap to roll</div>
        {KAELEN.attacks.map(a=>(
          <div className="atk-card" key={a.name} onClick={()=>handleAttackCard(a)}>
            <div className="atk-name">{a.name}</div>
            <div className="atk-stats">{fmt(a.atkBonus)} · 1d{a.damageDice}{a.damageMod>0?`+${a.damageMod}`:""} {a.type}</div>
            <div className="atk-note">{a.notes}</div>
          </div>
        ))}
      </div>
      <div className="sec">
        <div className="sec-title">Features</div>
        {KAELEN.features.map((f,i)=><div className="feat-item" key={i}>{f}</div>)}
      </div>
      <div className="sec">
        <div className="sec-title">Inventory</div>
        {KAELEN.inventory.map((item,i)=><div className="inv-item" key={i}>· {item}</div>)}
      </div>
      <div className="sec">
        <div className="sec-title">Manual Dice</div>
        <div className="dice-row">
          {[4,6,8,10,12,20,100].map(s=>(
            <button className="die-btn" key={s} onClick={()=>rollManual(s)}>d{s}</button>
          ))}
        </div>
        {lastRoll && <div className="last-roll">d{lastRoll.sides} → <strong style={{color:S.gold}}>{lastRoll.r}</strong></div>}
      </div>
      <button className="new-game-btn" onClick={confirmNewGame}>⚔ New Campaign</button>
    </div>
  );

  return (
    <div className="app">
      <div className="top-bar">
        <span className="top-title">⚔ Solo D&amp;D</span>
        <span style={{fontSize:10,color:S.muted}}>Kaelen · The Slate Ghost</span>
        {saveStatus
          ? <span className="save-badge">{saveStatus}</span>
          : <button className="save-btn" onClick={handleManualSave} disabled={loading || messages.length === 0}>💾 Save</button>
        }
        <button className="sheet-toggle" onClick={()=>setSheet(p=>!p)}>📋 Sheet</button>
      </div>
      <div className="content">
        {Sidebar}
        <div className={`sidebar-overlay${sheetOpen?" open":""}`} onClick={()=>setSheet(false)}/>
        <div className="main">
          {inCombat && (
            <div className="combat-banner">
              <span className="combat-badge">⚔ COMBAT</span>
              <span className="combat-info">Use attack cards or type your action</span>
              <button className="end-btn" onClick={()=>{setCombat(false);setMsgs(p=>[...p,{type:"sys",text:"Combat ended."}]);}}>End</button>
            </div>
          )}
          <div className="log" ref={logRef}>
            {messages.map((msg,i)=>{
              if (msg.type==="scene")  return <SceneImage key={`scene-${i}`} narration={msg.narration}/>;
              if (msg.type==="dm")     return <div key={i} className="msg-dm">{msg.text}</div>;
              if (msg.type==="player") return <div key={i} className="msg-player">"{msg.text}"</div>;
              if (msg.type==="roll")   return (
                <div key={i} className="msg-roll">
                  <div className="roll-title">{msg.title}</div>
                  {msg.lines.map((l,j)=><div key={j}>{l}</div>)}
                </div>
              );
              if (msg.type==="sys") return <div key={i} className="msg-sys">{msg.text}</div>;
              return null;
            })}
            {loading && <div className="msg-dm"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>}
          </div>
          {choices.length>0 && !loading && (
            <div className="choices-wrap">
              <div className="choices-label">Choose your action</div>
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
                {loading?"…":"Act"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
