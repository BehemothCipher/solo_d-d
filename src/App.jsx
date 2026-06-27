import { useState, useRef, useEffect, useCallback } from "react";

// ── Character Data ─────────────────────────────────────────────────────────────
const KAELEN = {
  name: "Kaelen", title: "The Slate Ghost",
  race: "Firbolg", class: "Rogue", level: 1,
  background: "Hermit", alignment: "Neutral Evil",
  hp: { max: 9, current: 9 }, ac: 13, initiative: 2, speed: 30, profBonus: 2,
  stats: { STR: 15, DEX: 15, CON: 13, INT: 10, WIS: 16, CHA: 8 },
  mods:  { STR: 2,  DEX: 2,  CON: 1,  INT: 0,  WIS: 3,  CHA: -1 },
  skills: {
    Acrobatics:4,"Animal Handling":5,Arcana:0,Athletics:2,
    Deception:-1,History:0,Insight:3,Intimidation:-1,
    Investigation:0,Medicine:3,Nature:0,Perception:5,
    Performance:-1,Persuasion:-1,Religion:0,
    "Sleight of Hand":2,Stealth:6,Survival:5,
  },
  attacks: [
    { name:"Shortsword",   atkBonus:4, dmgDice:6, dmgMod:2, type:"P/S",      notes:"Finesse, Light. Sneak Attack 1d6." },
    { name:"Dagger (off)", atkBonus:4, dmgDice:4, dmgMod:0, type:"Piercing", notes:"Bonus Action. Thrown 20/60ft."     },
    { name:"Shortbow",     atkBonus:4, dmgDice:6, dmgMod:2, type:"Piercing", notes:"Range 80/320ft. 20 arrows."        },
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

// ── Extract text from any API response shape ───────────────────────────────────
function extractText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  return data.narrative || data.content || data.response ||
         data.message   || data.text    || data.reply    || "";
}
function extractChoices(data) {
  if (!data) return [];
  return data.choices || data.options || data.actions || [];
}
function extractImagePrompt(data) {
  if (!data) return "";
  return data.imagePrompt || data.image_prompt || data.scene || "";
}

// ── Markdown-lite renderer ─────────────────────────────────────────────────────
function RenderCard({ text }) {
  if (!text) return <p style={{ color: S.muted, fontStyle: "italic" }}>No content yet…</p>;
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("# "))
          return <h2 key={i} style={{ color:S.gold, fontFamily:'"Cinzel",serif', textAlign:"center", margin:"16px 0 8px", fontSize:18, letterSpacing:1 }}>{line.slice(2)}</h2>;
        if (line.trim() === "---")
          return <hr key={i} style={{ border:"none", borderTop:`1px solid ${S.border}`, margin:"12px 0" }} />;
        if (!line.trim()) return <br key={i} />;
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
          <p key={i} style={{ margin:"0 0 10px", lineHeight:1.75 }}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2,-2)}</strong>;
              if (part.startsWith("*")  && part.endsWith("*"))  return <em key={j} style={{ color:S.accent }}>{part.slice(1,-1)}</em>;
              return part;
            })}
          </p>
        );
      })}
    </>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  // "start" | "loading" | "playing" | "error"
  const [screen,    setScreen]   = useState("start");
  const [cards,     setCards]    = useState([]);
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

  // Check for existing save on mount
  useEffect(() => {
    fetch("/api/load?key=solo_dnd_kaelen_v1")
      .then(r => r.json())
      .then(data => { if (data?.state?.cards?.length) setHasSave(true); })
      .catch(() => {});
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!voiceOn || !hasInteracted.current) return;
    if (!window.speechSynthesis) return;
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
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      hasInteracted.current = true;
      dx > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  // ── Fetch image ───────────────────────────────────────────────────────────────
  const fetchImage = async (prompt) => {
    try {
      const res  = await fetch("/api/image?prompt=" + encodeURIComponent(prompt));
      const blob = await res.blob();
      setImageUrl(URL.createObjectURL(blob));
    } catch (e) { console.error("Image:", e); }
  };

  // ── Send choice ───────────────────────────────────────────────────────────────
  const sendChoice = async (choice) => {
    hasInteracted.current = true;
    setLoading(true);
    window.speechSynthesis?.cancel();
    const newHistory = [...history, { role:"user", content:choice }];
    try {
      const res  = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ messages:newHistory, hp, character:KAELEN }),
      });
      const data = await res.json();
      const aiText    = extractText(data);
      const newChoices= extractChoices(data);
      const imgPrompt = extractImagePrompt(data);
      const updatedH  = [...newHistory, { role:"assistant", content:aiText }];
      setHistory(updatedH);
      setCards(prev => { const next=[...prev, aiText]; setCardIdx(next.length-1); return next; });
      setChoices(newChoices);
      speak(aiText);
      if (imgPrompt) fetchImage(imgPrompt);
    } catch (err) {
      console.error("Chat:", err);
      setErrMsg("Failed to reach the Dungeon Master. Check your connection.");
    } finally { setLoading(false); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const saveGame = async () => {
    hasInteracted.current = true;
    try {
      await fetch("/api/save", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ key:"solo_dnd_kaelen_v1", state:{ cards, cardIdx, choices, history, hp, imageUrl } }),
      });
      setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000);
    } catch { setSaveMsg("Error"); setTimeout(() => setSaveMsg(""), 2000); }
  };

  // ── Continue saved game ───────────────────────────────────────────────────────
  const continueGame = async () => {
    hasInteracted.current = true;
    setScreen("loading");
    try {
      const res  = await fetch("/api/load?key=solo_dnd_kaelen_v1");
      const data = await res.json();
      if (data?.state?.cards?.length) {
        const st = data.state;
        setCards(st.cards   || []);
        setCardIdx(st.cardIdx ?? 0);
        setChoices(st.choices || []);
        setHistory(st.history || []);
        setHp(st.hp ?? KAELEN.hp.current);
        if (st.imageUrl) setImageUrl(st.imageUrl);
        setScreen("playing");
      } else {
        setErrMsg("No saved game found.");
        setScreen("start");
      }
    } catch { setErrMsg("Could not load save."); setScreen("start"); }
  };

  // ── New game ──────────────────────────────────────────────────────────────────
  const newGame = async () => {
    hasInteracted.current = true;
    setScreen("loading");
    setCards([]); setHistory([]); setChoices([]); setHp(KAELEN.hp.current); setImageUrl(null);
    try {
      const res  = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ messages:[], hp:KAELEN.hp.current, character:KAELEN }),
      });
      const data = await res.json();
      const aiText    = extractText(data);
      const newChoices= extractChoices(data);
      const imgPrompt = extractImagePrompt(data);
      setCards([aiText]);
      setCardIdx(0);
      setChoices(newChoices);
      setHistory([{ role:"assistant", content:aiText }]);
      if (imgPrompt) fetchImage(imgPrompt);
      setScreen("playing");
    } catch (err) {
      console.error("Start:", err);
      setErrMsg("Could not start adventure. Check API.");
      setScreen("start");
    }
  };

  const isLastCard = cardIdx === cards.length - 1;

  // ── Fixed full-screen wrapper ─────────────────────────────────────────────────
  // position:fixed + inset:0 is more reliable than 100dvh on mobile
  const wrapper = {
    position:"fixed", top:0, left:0, right:0, bottom:0,
    display:"flex", flexDirection:"column",
    background:S.bg, color:S.text,
    fontFamily:'"Crimson Text", Georgia, serif',
    fontSize:18, overflow:"hidden",
  };

  // ══ START SCREEN ══════════════════════════════════════════════════════════════
  if (screen === "start") {
    return (
      <div style={wrapper}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:28, letterSpacing:4, marginBottom:6 }}>
              ✕ SOLO D&amp;D
            </div>
            <div style={{ color:S.muted, fontSize:15 }}>An AI-Powered Adventure</div>
          </div>

          {/* Character card */}
          <div style={{ border:`1px solid ${S.border}`, borderRadius:8, padding:"16px 24px", marginBottom:36, textAlign:"center", background:S.panel, width:"100%", maxWidth:320 }}>
            <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:16, marginBottom:4 }}>
              {KAELEN.name}
            </div>
            <div style={{ color:S.accent, fontSize:14, marginBottom:2 }}>{KAELEN.title}</div>
            <div style={{ color:S.muted, fontSize:13 }}>
              {KAELEN.race} · {KAELEN.class} {KAELEN.level} · {KAELEN.alignment}
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:12, fontSize:13 }}>
              <span>HP <strong style={{ color:S.green }}>{hp}/{KAELEN.hp.max}</strong></span>
              <span>AC <strong>{KAELEN.ac}</strong></span>
              <span>Init <strong>{fmt(KAELEN.initiative)}</strong></span>
            </div>
          </div>

          {/* Buttons */}
          {hasSave && (
            <button onClick={continueGame} style={{
              width:"100%", maxWidth:280, padding:"14px 0", marginBottom:12,
              background:S.gold, border:"none", color:"#0b0d11",
              fontFamily:'"Cinzel",serif', fontSize:15, fontWeight:"bold",
              letterSpacing:2, cursor:"pointer", borderRadius:4,
            }}>
              CONTINUE ADVENTURE
            </button>
          )}
          <button onClick={newGame} style={{
            width:"100%", maxWidth:280, padding:"14px 0",
            background:"transparent", border:`1px solid ${S.accent}`, color:S.accent,
            fontFamily:'"Cinzel",serif', fontSize:15, letterSpacing:2,
            cursor:"pointer", borderRadius:4,
          }}>
            {hasSave ? "NEW GAME" : "BEGIN ADVENTURE"}
          </button>

          {errMsg && <p style={{ color:S.red, fontSize:13, marginTop:16, textAlign:"center" }}>{errMsg}</p>}
        </div>
        <div style={{ textAlign:"center", padding:12, color:S.muted, fontSize:12 }}>
          behemothlab.dev · CipherBuilds
        </div>
      </div>
    );
  }

  // ══ LOADING SCREEN ════════════════════════════════════════════════════════════
  if (screen === "loading") {
    return (
      <div style={{ ...wrapper, alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:16, letterSpacing:2, marginBottom:8 }}>
          ✕ SOLO D&amp;D
        </div>
        <div style={{ color:S.muted, fontSize:14 }}>The Dungeon Master stirs…</div>
      </div>
    );
  }

  // ══ PLAYING SCREEN ════════════════════════════════════════════════════════════
  return (
    <div style={wrapper}>

      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:S.panel, borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
        <button onClick={() => { window.speechSynthesis?.cancel(); setScreen("start"); }}
          style={{ background:"none", border:"none", color:S.gold, fontFamily:'"Cinzel",serif', fontSize:13, letterSpacing:2, cursor:"pointer", padding:0 }}>
          ✕ SOLO D&amp;D
        </button>
        <div style={{ flex:1 }} />
        <button onClick={saveGame} style={topBtn(false)}>{saveMsg || "SAVE"}</button>
        <button onClick={() => { hasInteracted.current=true; setVoiceOn(v=>!v); window.speechSynthesis?.cancel(); }} style={topBtn(voiceOn)}>
          {voiceOn ? "ON" : "OFF"}
        </button>
        <button onClick={() => { hasInteracted.current=true; setShowSheet(s=>!s); }} style={topBtn(showSheet)}>
          SHEET
        </button>
      </div>

      {/* Card nav */}
      <div style={{ display:"flex", alignItems:"center", padding:"4px 12px", background:S.panel, borderBottom:`1px solid ${S.border}`, flexShrink:0, gap:4 }}>
        <button onClick={() => { hasInteracted.current=true; goPrev(); }} disabled={cardIdx===0} style={navBtn(cardIdx===0)}>‹</button>
        <span style={{ color:S.muted, fontSize:13, minWidth:60, textAlign:"center" }}>
          {cards.length ? `${cardIdx+1} / ${cards.length}` : "— / —"}
        </span>
        <button onClick={() => { hasInteracted.current=true; goNext(); }} disabled={cardIdx>=cards.length-1} style={navBtn(cardIdx>=cards.length-1)}>›</button>
      </div>

      {/* Scene image */}
      {imageUrl && isLastCard && (
        <div style={{ height:180, flexShrink:0, overflow:"hidden" }}>
          <img src={imageUrl} alt="scene" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.85 }} />
        </div>
      )}

      {/* Card content — swipeable */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px", WebkitOverflowScrolling:"touch" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loading && cards.length === 0
          ? <p style={{ textAlign:"center", color:S.muted, marginTop:48 }}>The Dungeon Master stirs…</p>
          : <RenderCard text={cards[cardIdx]} />
        }
        {errMsg && <p style={{ color:S.red, fontSize:13, marginTop:12 }}>{errMsg}</p>}
      </div>

      {/* Loading ticker */}
      {loading && (
        <div style={{ padding:"6px 16px", color:S.muted, fontSize:13, flexShrink:0 }}>
          ▸ The Dungeon Master is writing…
        </div>
      )}

      {/* Choices */}
      {isLastCard && !loading && choices.length > 0 && (
        <div style={{ padding:"8px 12px 16px", flexShrink:0, borderTop:`1px solid ${S.border}` }}>
          {choices.map((c,i) => (
            <button key={i} onClick={() => sendChoice(c)} style={{
              display:"block", width:"100%", marginBottom:8,
              padding:"10px 14px", background:"transparent",
              border:`1px solid ${S.gold}`, color:S.gold,
              fontFamily:'"Crimson Text",serif', fontSize:16,
              textAlign:"left", cursor:"pointer", borderRadius:4,
            }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Character sheet overlay */}
      {showSheet && (
        <div style={{
          position:"absolute", top:0, right:0, bottom:0,
          width:"88%", maxWidth:380,
          background:S.panel, borderLeft:`1px solid ${S.border}`,
          overflowY:"auto", padding:16, zIndex:200,
          WebkitOverflowScrolling:"touch",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontWeight:"bold", fontSize:13, letterSpacing:1 }}>
              CHARACTER SHEET
            </span>
            <button onClick={() => setShowSheet(false)} style={{ background:"none", border:"none", color:S.text, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          <SheetView hp={hp} setHp={setHp} />
        </div>
      )}
    </div>
  );
}

// ── Button styles ──────────────────────────────────────────────────────────────
function topBtn(active) {
  return {
    background:"none", border:`1px solid ${active ? S.accent : S.border}`,
    color:active ? S.accent : S.text,
    padding:"5px 11px", cursor:"pointer",
    fontFamily:'"Cinzel",serif', fontSize:11, letterSpacing:1, borderRadius:3,
  };
}
function navBtn(disabled) {
  return {
    background:"none", border:`1px solid ${disabled ? S.border : S.gold}`,
    color:disabled ? S.muted : S.gold,
    width:32, height:32, cursor:disabled?"default":"pointer",
    borderRadius:3, fontSize:18, flexShrink:0,
  };
}

// ── Character Sheet ────────────────────────────────────────────────────────────
function SheetView({ hp, setHp }) {
  const K = KAELEN;
  const sec = label => (
    <div style={{ color:S.gold, fontFamily:'"Cinzel",serif', fontSize:11, letterSpacing:1, margin:"14px 0 6px", borderBottom:`1px solid ${S.border}`, paddingBottom:4 }}>
      {label}
    </div>
  );
  return (
    <div style={{ fontSize:14 }}>
      <div style={{ textAlign:"center", marginBottom:10 }}>
        <div style={{ fontSize:20, fontWeight:"bold" }}>{K.name}</div>
        <div style={{ color:S.gold, fontSize:13 }}>{K.title}</div>
        <div style={{ color:S.muted, fontSize:12 }}>{K.race} · {K.class} {K.level} · {K.alignment}</div>
      </div>

      {sec("HIT POINTS")}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <button onClick={() => setHp(h=>Math.max(0,h-1))} style={{ background:"none", border:`1px solid ${S.border}`, color:S.red, width:30, height:30, cursor:"pointer", borderRadius:4, fontSize:18 }}>−</button>
        <span style={{ fontSize:26, fontWeight:"bold" }}>{hp}</span>
        <span style={{ color:S.muted }}>/ {K.hp.max}</span>
        <button onClick={() => setHp(h=>Math.min(K.hp.max,h+1))} style={{ background:"none", border:`1px solid ${S.border}`, color:S.green, width:30, height:30, cursor:"pointer", borderRadius:4, fontSize:18 }}>+</button>
      </div>

      {sec("ABILITY SCORES")}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:8 }}>
        {Object.entries(K.stats).map(([stat,val]) => (
          <div key={stat} style={{ textAlign:"center", border:`1px solid ${S.border}`, borderRadius:4, padding:"4px 2px" }}>
            <div style={{ fontSize:10, color:S.muted }}>{stat}</div>
            <div style={{ fontWeight:"bold", fontSize:16 }}>{val}</div>
            <div style={{ fontSize:12, color:S.accent }}>{fmt(K.mods[stat])}</div>
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
