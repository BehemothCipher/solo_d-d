import { useState, useRef, useEffect, useCallback } from "react";

const KAELEN = {
  name:"Kaelen", title:"The Slate Ghost",
  race:"Firbolg", class:"Rogue", level:1,
  background:"Hermit", alignment:"Neutral Evil",
  hp:{ max:9, current:9 }, ac:13, initiative:2, speed:30, profBonus:2,
  stats:{ STR:15, DEX:15, CON:13, INT:10, WIS:16, CHA:8 },
  mods:{ STR:2, DEX:2, CON:1, INT:0, WIS:3, CHA:-1 },
  skills:{
    Acrobatics:4,"Animal Handling":5,Arcana:0,Athletics:2,
    Deception:-1,History:0,Insight:3,Intimidation:-1,
    Investigation:0,Medicine:3,Nature:0,Perception:5,
    Performance:-1,Persuasion:-1,Religion:0,
    "Sleight of Hand":2,Stealth:6,Survival:5,
  },
  attacks:[
    {name:"Shortsword",  atkBonus:4,dmgDice:6,dmgMod:2, type:"P/S",      notes:"Finesse, Light. Sneak Attack 1d6."},
    {name:"Dagger (off)",atkBonus:4,dmgDice:4,dmgMod:0, type:"Piercing", notes:"Bonus Action. Thrown 20/60ft."},
    {name:"Shortbow",    atkBonus:4,dmgDice:6,dmgMod:2, type:"Piercing", notes:"Range 80/320ft. 20 arrows."},
  ],
  features:["Sneak Attack (1d6)","Speech of Beast & Leaf","Hidden Step (invisible 1 turn/rest)","Firbolg Magic (Detect Magic / Disguise Self 1/rest)","Thieves' Cant"],
  inventory:["2× Shortsword","2× Dagger","Shortbow + 20 arrows","Leather Armor","Thieves' Tools","Herbalism Kit"],
};

const S = {
  bg:"#0b0d11", panel:"#111520", border:"#1e2535",
  accent:"#6ea8c4", gold:"#c4a14a", text:"#ccd6e8",
  muted:"#5a6880", red:"#e06c6c", green:"#6ce06c",
};
const fmt = n => n >= 0 ? `+${n}` : `${n}`;

// ── Extract any text from any API response shape ───────────────────────────────
function extractText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  // Claude API direct passthrough: { content: [{ type:"text", text:"..." }] }
  if (Array.isArray(data.content)) {
    const t = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    if (t) return t;
  }
  // Common wrapper fields
  return (
    data.narrative || data.content || data.response ||
    data.message   || data.text    || data.reply    ||
    data.story     || data.output  || data.result   || ""
  );
}
function extractChoices(data) {
  if (!data) return [];
  if (Array.isArray(data.choices))  return data.choices;
  if (Array.isArray(data.options))  return data.options;
  if (Array.isArray(data.actions))  return data.actions;
  if (Array.isArray(data.prompts))  return data.prompts;
  return [];
}
function extractImagePrompt(data) {
  if (!data) return "";
  return data.imagePrompt || data.image_prompt || data.scene || data.image || "";
}

// ── Markdown-lite ──────────────────────────────────────────────────────────────
function RenderCard({ text, rawDebug }) {
  if (rawDebug) {
    return (
      <div>
        <p style={{ color:S.red, fontSize:13, marginBottom:8 }}>
          ⚠ API returned unrecognised format. Raw response:
        </p>
        <pre style={{ color:S.muted, fontSize:11, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {rawDebug}
        </pre>
      </div>
    );
  }
  if (!text) return <p style={{ color:S.muted, fontStyle:"italic" }}>No content yet…</p>;
  return (
    <>
      {text.split("\n").map((line,i) => {
        if (line.startsWith("# "))
          return <h2 key={i} style={{ color:S.gold, fontFamily:'"Cinzel",serif', textAlign:"center", margin:"16px 0 8px", fontSize:18, letterSpacing:1 }}>{line.slice(2)}</h2>;
        if (line.trim()==="---")
          return <hr key={i} style={{ border:"none", borderTop:`1px solid ${S.border}`, margin:"12px 0" }} />;
        if (!line.trim()) return <br key={i} />;
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
          <p key={i} style={{ margin:"0 0 10px", lineHeight:1.75 }}>
            {parts.map((p,j) => {
              if (p.startsWith("**")&&p.endsWith("**")) return <strong key={j}>{p.slice(2,-2)}</strong>;
              if (p.startsWith("*") &&p.endsWith("*"))  return <em key={j} style={{ color:S.accent }}>{p.slice(1,-1)}</em>;
              return p;
            })}
          </p>
        );
      })}
    </>
  );
}

// ── Button styles ──────────────────────────────────────────────────────────────
const topBtn = active => ({
  background:"none", border:`1px solid ${active?S.accent:S.border}`,
  color:active?S.accent:S.text,
  padding:"5px 11px", cursor:"pointer",
  fontFamily:'"Cinzel",serif', fontSize:11, letterSpacing:1, borderRadius:3,
});
const navBtn = disabled => ({
  background:"none", border:`1px solid ${disabled?S.border:S.gold}`,
  color:disabled?S.muted:S.gold,
  width:32, height:32, cursor:disabled?"default":"pointer",
  borderRadius:3, fontSize:18, flexShrink:0,
});

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,    setScreen]   = useState("start");
  const [cards,     setCards]    = useState([]);
  const [rawDebug,  setRawDebug] = useState("");   // shows raw API when text is empty
  const [cardIdx,   setCardIdx]  = useState(0);
  const [choices,   setChoices]  = useState([]);
  const [loading,   setLoading]  = useState(false);
  const [voiceOn,   setVoiceOn]  = useState(true);
  const [showSheet, setShowSheet]= useState(false);
  const [hp,        setHp]       = useState(KAELEN.hp.current);
  const [imageUrl,  setImageUrl] = useState(null);
  const [history,   setHistory]  = useState([]);
  const [saveMsg,   setSaveMsg]  = useState("");
  const [errMsg,    setErrMsg]   = useState("");
  const [hasSave,   setHasSave]  = useState(false);

  const hasInteracted = useRef(false);
  const touchStartX   = useRef(null);
  const touchStartY   = useRef(null);

  // Check for save on mount
  useEffect(() => {
    fetch("/api/load?key=solo_dnd_kaelen_v1")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.state?.cards?.some(c => c && c.trim())) setHasSave(true);
      })
      .catch(() => {});
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!voiceOn || !hasInteracted.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*_`~\[\]()]/g,"").replace(/---/g,"").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 0.88; utt.pitch = 0.85;
    window.speechSynthesis.speak(utt);
  }, [voiceOn]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const goNext = () => setCardIdx(i => Math.min(i+1, cards.length-1));
  const goPrev = () => setCardIdx(i => Math.max(i-1, 0));

  const onTouchStart = e => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = e => {
    if (touchStartX.current===null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx)>50 && Math.abs(dx)>dy) { hasInteracted.current=true; dx>0?goNext():goPrev(); }
    touchStartX.current=null;
  };

  // ── Fetch image ───────────────────────────────────────────────────────────────
  const fetchImage = async prompt => {
    try {
      const res  = await fetch("/api/image?prompt="+encodeURIComponent(prompt));
      const blob = await res.blob();
      setImageUrl(URL.createObjectURL(blob));
    } catch {}
  };

  // ── Core API call ─────────────────────────────────────────────────────────────
  const callChat = async (messages) => {
    const res  = await fetch("/api/chat", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ messages, hp, character:KAELEN }),
    });
    if (!res.ok) {
      // Capture error body so we can see what the API expects
      let body = "";
      try { body = await res.text(); } catch {}
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    const data = await res.json();
    const text = extractText(data);
    // If we still got nothing, store raw JSON for debugging
    if (!text) setRawDebug(JSON.stringify(data, null, 2));
    else        setRawDebug("");
    return { text, choices:extractChoices(data), imagePrompt:extractImagePrompt(data), raw:data };
  };

  // ── Send player choice ────────────────────────────────────────────────────────
  const sendChoice = async choice => {
    hasInteracted.current=true;
    setLoading(true);
    window.speechSynthesis?.cancel();
    const newHistory = [...history, { role:"user", content:choice }];
    try {
      const { text, choices:newChoices, imagePrompt } = await callChat(newHistory);
      const updatedH = [...newHistory, { role:"assistant", content:text }];
      setHistory(updatedH);
      setCards(prev => { const next=[...prev,text]; setCardIdx(next.length-1); return next; });
      setChoices(newChoices);
      speak(text);
      if (imagePrompt) fetchImage(imagePrompt);
    } catch(err) {
      setErrMsg("Could not reach the Dungeon Master: " + err.message);
    } finally { setLoading(false); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const saveGame = async () => {
    hasInteracted.current=true;
    try {
      await fetch("/api/save",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ key:"solo_dnd_kaelen_v1", state:{ cards,cardIdx,choices,history,hp,imageUrl } }),
      });
      setSaveMsg("Saved!"); setHasSave(true); setTimeout(()=>setSaveMsg(""),2000);
    } catch { setSaveMsg("Error"); setTimeout(()=>setSaveMsg(""),2000); }
  };

  // ── Continue ──────────────────────────────────────────────────────────────────
  const continueGame = async () => {
    hasInteracted.current=true; setScreen("loading"); setErrMsg("");
    try {
      const res  = await fetch("/api/load?key=solo_dnd_kaelen_v1");
      const data = await res.json();
      if (data?.state?.cards?.some(c=>c&&c.trim())) {
        const st=data.state;
        setCards(st.cards||[]); setCardIdx(st.cardIdx??0);
        setChoices(st.choices||[]); setHistory(st.history||[]);
        setHp(st.hp??KAELEN.hp.current);
        if (st.imageUrl) setImageUrl(st.imageUrl);
        setScreen("playing");
      } else {
        setErrMsg("Saved game has no content — try New Game."); setScreen("start");
      }
    } catch { setErrMsg("Could not load save."); setScreen("start"); }
  };

  // ── New game ──────────────────────────────────────────────────────────────────
  const newGame = async () => {
    hasInteracted.current=true; setScreen("loading"); setErrMsg("");
    setCards([]); setHistory([]); setChoices([]); setHp(KAELEN.hp.current); setImageUrl(null);
    try {
      // Some APIs reject empty messages — send a seed to start the adventure
      const seedMsg = [{ role:"user", content:"Begin the adventure. I am Kaelen, the Slate Ghost, a Neutral Evil Firbolg Rogue." }];
      const { text, choices:newChoices, imagePrompt } = await callChat(seedMsg);
      setCards([text]); setCardIdx(0);
      setChoices(newChoices);
      setHistory([{ role:"assistant", content:text }]);
      if (imagePrompt) fetchImage(imagePrompt);
      setScreen("playing");
    } catch(err) {
      setErrMsg("Could not start: " + err.message); setScreen("start");
    }
  };

  // ── Shared wrapper style ──────────────────────────────────────────────────────
  const wrapper = {
    position:"fixed", top:0, left:0, right:0, bottom:0,
    display:"flex", flexDirection:"column",
    background:S.bg, color:S.text,
    fontFamily:'"Crimson Text", Georgia, serif',
    fontSize:18, overflow:"hidden",
  };

  // ══ START SCREEN ══════════════════════════════════════════════════════════════
  if (screen==="start") return (
    <div style={wrapper}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28 }}>

        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:26, letterSpacing:4, marginBottom:6 }}>✕ SOLO D&amp;D</div>
          <div style={{ color:S.muted, fontSize:14 }}>An AI-Powered Adventure</div>
        </div>

        {/* Character card */}
        <div style={{ border:`1px solid ${S.border}`, borderRadius:8, padding:"16px 24px", marginBottom:32, textAlign:"center", background:S.panel, width:"100%", maxWidth:320 }}>
          <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:17, marginBottom:3 }}>{KAELEN.name}</div>
          <div style={{ color:S.accent, fontSize:14, marginBottom:3 }}>{KAELEN.title}</div>
          <div style={{ color:S.muted, fontSize:13, marginBottom:10 }}>{KAELEN.race} · {KAELEN.class} {KAELEN.level} · {KAELEN.alignment}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:20, fontSize:13 }}>
            <span>HP <strong style={{ color:S.green }}>{hp}/{KAELEN.hp.max}</strong></span>
            <span>AC <strong>{KAELEN.ac}</strong></span>
            <span>Init <strong>{fmt(KAELEN.initiative)}</strong></span>
          </div>
        </div>

        {/* Buttons */}
        {hasSave && (
          <button onClick={continueGame} style={{
            width:"100%", maxWidth:300, padding:"15px 0", marginBottom:12,
            background:S.gold, border:"none", color:"#0b0d11",
            fontFamily:'"Cinzel",serif', fontSize:14, fontWeight:"bold",
            letterSpacing:2, cursor:"pointer", borderRadius:4,
          }}>CONTINUE ADVENTURE</button>
        )}

        <button onClick={newGame} style={{
          width:"100%", maxWidth:300, padding:"15px 0",
          background:"transparent", border:`1px solid ${S.accent}`, color:S.accent,
          fontFamily:'"Cinzel",serif', fontSize:14, letterSpacing:2,
          cursor:"pointer", borderRadius:4,
        }}>{hasSave ? "NEW GAME" : "BEGIN ADVENTURE"}</button>

        <button onClick={()=>setShowSheet(s=>!s)} style={{
          marginTop:14, background:"none", border:`1px solid ${S.border}`,
          color:S.muted, padding:"8px 20px", cursor:"pointer",
          fontFamily:'"Cinzel",serif', fontSize:12, letterSpacing:1, borderRadius:4,
        }}>VIEW CHARACTER SHEET</button>

        {errMsg && <p style={{ color:S.red, fontSize:13, marginTop:16, textAlign:"center" }}>{errMsg}</p>}
      </div>

      <div style={{ textAlign:"center", padding:12, color:S.muted, fontSize:12 }}>
        behemothlab.dev · CipherBuilds
      </div>

      {/* Character sheet overlay on start screen too */}
      {showSheet && (
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"88%", maxWidth:380, background:S.panel, borderLeft:`1px solid ${S.border}`, overflowY:"auto", padding:16, zIndex:200, WebkitOverflowScrolling:"touch" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontWeight:"bold", fontSize:13, letterSpacing:1 }}>CHARACTER SHEET</span>
            <button onClick={()=>setShowSheet(false)} style={{ background:"none", border:"none", color:S.text, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          <SheetView hp={hp} setHp={setHp} />
        </div>
      )}
    </div>
  );

  // ══ LOADING ═══════════════════════════════════════════════════════════════════
  if (screen==="loading") return (
    <div style={{ ...wrapper, alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:16, letterSpacing:2, marginBottom:8 }}>✕ SOLO D&amp;D</div>
      <div style={{ color:S.muted, fontSize:14 }}>The Dungeon Master stirs…</div>
    </div>
  );

  // ══ PLAYING ═══════════════════════════════════════════════════════════════════
  const isLastCard = cardIdx===cards.length-1;
  return (
    <div style={wrapper}>

      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:S.panel, borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
        <button onClick={()=>{ window.speechSynthesis?.cancel(); setScreen("start"); }}
          style={{ background:"none", border:"none", color:S.gold, fontFamily:'"Cinzel",serif', fontSize:13, letterSpacing:2, cursor:"pointer", padding:0 }}>
          ✕ SOLO D&amp;D
        </button>
        <div style={{ flex:1 }} />
        <button onClick={saveGame} style={topBtn(false)}>{saveMsg||"SAVE"}</button>
        <button onClick={()=>{ hasInteracted.current=true; setVoiceOn(v=>!v); window.speechSynthesis?.cancel(); }} style={topBtn(voiceOn)}>
          {voiceOn?"ON":"OFF"}
        </button>
        <button onClick={()=>{ hasInteracted.current=true; setShowSheet(s=>!s); }} style={topBtn(showSheet)}>SHEET</button>
      </div>

      {/* Card nav */}
      <div style={{ display:"flex", alignItems:"center", padding:"4px 12px", background:S.panel, borderBottom:`1px solid ${S.border}`, flexShrink:0, gap:4 }}>
        <button onClick={()=>{ hasInteracted.current=true; goPrev(); }} disabled={cardIdx===0} style={navBtn(cardIdx===0)}>‹</button>
        <span style={{ color:S.muted, fontSize:13, minWidth:60, textAlign:"center" }}>
          {cards.length ? `${cardIdx+1} / ${cards.length}` : "— / —"}
        </span>
        <button onClick={()=>{ hasInteracted.current=true; goNext(); }} disabled={cardIdx>=cards.length-1} style={navBtn(cardIdx>=cards.length-1)}>›</button>
      </div>

      {/* Scene image */}
      {imageUrl && isLastCard && (
        <div style={{ height:180, flexShrink:0, overflow:"hidden" }}>
          <img src={imageUrl} alt="scene" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.85 }} />
        </div>
      )}

      {/* Card content */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px", WebkitOverflowScrolling:"touch" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {loading && cards.length===0
          ? <p style={{ textAlign:"center", color:S.muted, marginTop:48 }}>The Dungeon Master stirs…</p>
          : <RenderCard text={cards[cardIdx]} rawDebug={isLastCard && !cards[cardIdx] ? rawDebug : ""} />
        }
        {errMsg && <p style={{ color:S.red, fontSize:13, marginTop:12 }}>{errMsg}</p>}
      </div>

      {loading && <div style={{ padding:"6px 16px", color:S.muted, fontSize:13, flexShrink:0 }}>▸ The Dungeon Master is writing…</div>}

      {/* Choices */}
      {isLastCard && !loading && choices.length>0 && (
        <div style={{ padding:"8px 12px 16px", flexShrink:0, borderTop:`1px solid ${S.border}` }}>
          {choices.map((c,i) => (
            <button key={i} onClick={()=>sendChoice(c)} style={{
              display:"block", width:"100%", marginBottom:8,
              padding:"10px 14px", background:"transparent",
              border:`1px solid ${S.gold}`, color:S.gold,
              fontFamily:'"Crimson Text",serif', fontSize:16,
              textAlign:"left", cursor:"pointer", borderRadius:4,
            }}>{c}</button>
          ))}
        </div>
      )}

      {/* Sheet overlay */}
      {showSheet && (
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"88%", maxWidth:380, background:S.panel, borderLeft:`1px solid ${S.border}`, overflowY:"auto", padding:16, zIndex:200, WebkitOverflowScrolling:"touch" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontWeight:"bold", fontSize:13, letterSpacing:1 }}>CHARACTER SHEET</span>
            <button onClick={()=>setShowSheet(false)} style={{ background:"none", border:"none", color:S.text, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          <SheetView hp={hp} setHp={setHp} />
        </div>
      )}
    </div>
  );
}

// ── Character Sheet ────────────────────────────────────────────────────────────
function SheetView({ hp, setHp }) {
  const K=KAELEN;
  const sec = label => <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:11, letterSpacing:1, margin:"14px 0 6px", borderBottom:`1px solid ${S.border}`, paddingBottom:4 }}>{label}</div>;
  return (
    <div style={{ fontSize:14 }}>
      <div style={{ textAlign:"center", marginBottom:10 }}>
        <div style={{ fontSize:20, fontWeight:"bold" }}>{K.name}</div>
        <div style={{ color:S.gold, fontSize:13 }}>{K.title}</div>
        <div style={{ color:S.muted, fontSize:12 }}>{K.race} · {K.class} {K.level} · {K.alignment}</div>
      </div>
      {sec("HIT POINTS")}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <button onClick={()=>setHp(h=>Math.max(0,h-1))} style={{ background:"none", border:`1px solid ${S.border}`, color:S.red, width:30, height:30, cursor:"pointer", borderRadius:4, fontSize:18 }}>−</button>
        <span style={{ fontSize:26, fontWeight:"bold" }}>{hp}</span>
        <span style={{ color:S.muted }}>/ {K.hp.max}</span>
        <button onClick={()=>setHp(h=>Math.min(K.hp.max,h+1))} style={{ background:"none", border:`1px solid ${S.border}`, color:S.green, width:30, height:30, cursor:"pointer", borderRadius:4, fontSize:18 }}>+</button>
      </div>
      {sec("ABILITY SCORES")}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:8 }}>
        {Object.entries(K.stats).map(([s,v]) => (
          <div key={s} style={{ textAlign:"center", border:`1px solid ${S.border}`, borderRadius:4, padding:"4px 2px" }}>
            <div style={{ fontSize:10, color:S.muted }}>{s}</div>
            <div style={{ fontWeight:"bold", fontSize:16 }}>{v}</div>
            <div style={{ fontSize:12, color:S.accent }}>{fmt(K.mods[s])}</div>
          </div>
        ))}
      </div>
      {sec("COMBAT")}
      <div style={{ display:"flex", gap:16, marginBottom:8, fontSize:13 }}>
        <span>AC <strong>{K.ac}</strong></span>
        <span>Init <strong>{fmt(K.initiative)}</strong></span>
        <span>Speed <strong>{K.speed}ft</strong></span>
        <span>Prof <strong>{fmt(K.profBonus)}</strong></span>
      </div>
      {sec("ATTACKS")}
      {K.attacks.map((a,i) => (
        <div key={i} style={{ marginBottom:8, fontSize:13 }}>
          <strong>{a.name}</strong>
          <span style={{ color:S.muted }}> {fmt(a.atkBonus)} to hit · </span>
          <span>1d{a.dmgDice}{fmt(a.dmgMod)} {a.type}</span>
          <div style={{ color:S.muted, fontSize:11 }}>{a.notes}</div>
        </div>
      ))}
      {sec("SKILLS")}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 10px" }}>
        {Object.entries(K.skills).map(([sk,val]) => (
          <div key={sk} style={{ fontSize:12, display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:S.muted }}>{sk}</span>
            <span style={{ color:val>=4?S.gold:S.text }}>{fmt(val)}</span>
          </div>
        ))}
      </div>
      {sec("FEATURES & TRAITS")}
      {K.features.map((f,i) => <div key={i} style={{ fontSize:12, marginBottom:4 }}>· {f}</div>)}
      {sec("INVENTORY")}
      {K.inventory.map((item,i) => <div key={i} style={{ fontSize:12, marginBottom:4 }}>· {item}</div>)}
    </div>
  );
}
