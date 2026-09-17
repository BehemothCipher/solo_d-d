import React, { useState, useRef, useEffect, useMemo } from "react";
import CharacterSelect from "./CharacterSelect.jsx";

// ── Dice ─────────────────────────────────────────────────────────────────────
const roll = s => Math.floor(Math.random() * s) + 1;
const KAELEN_DEFAULT_ATK = { name:"Shortsword", atkBonus:4, damageDice:6, damageMod:2, type:"P/S" };
const d20check = mod => { const d = roll(20); return { d20:d, total:d+mod, nat:d }; };
const fmt = n => n >= 0 ? `+${n}` : `${n}`;

function getSessionId() { return "solo_dxd_v1"; }

function saveGame(sessionId, state) {
  try {
    localStorage.setItem(`dxd_save_${sessionId}`, JSON.stringify(state));
  } catch(e) { console.warn("Save failed", e); }
}

function loadGame(sessionId) {
  try {
    const raw = localStorage.getItem(`dxd_save_${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function detectRoll(action) {
  const l = action.toLowerCase();
  if (/attack|strike|stab|slash|shoot|fire|hit/.test(l)) return "attack";
  if (/sneak|hide|stealth|silent|shadow/.test(l)) return "stealth";
  if (/percei|look|listen|notice|watch/.test(l)) return "perception";
  if (/investig|examine|inspect|search/.test(l)) return "investigation";
  if (/surviv|track|forage|navigate/.test(l)) return "survival";
  if (/climb|jump|leap|sprint|athletic/.test(l)) return "athletics";
  if (/deceiv|lie|bluff/.test(l)) return "deception";
  if (/intimidat|threaten/.test(l)) return "intimidation";
  return null;
}

function buildRollResult(type, char) {
  const skills = char?.skills || {};
  const mods = char?.mods || {};
  if (type === "attack") {
    const atk = (char?.attacks || [])[0] || KAELEN_DEFAULT_ATK;
    const {d20:d,total,nat} = d20check(atk.atkBonus||4);
    const dmg = roll(atk.damageDice||6) + (atk.damageMod||0);
    const sneak = roll(6);
    return {
      label: `⚔️ Attack — ${atk.name}`,
      lines: [`d20(${d}) ${fmt(atk.atkBonus||4)} = ${total}${nat===20?" 🔥 CRIT!":nat===1?" 💀 MISS":""}`, `Damage: ${dmg} ${atk.type||""}`, `Sneak Attack (if valid): +${sneak}`],
      context: `ATTACK: d20=${d}, total=${total}${nat===20?" CRIT":nat===1?" MISS":""}, dmg=${dmg}, sneak=${sneak}`,
    };
  }
  const map = { stealth:["Stealth",skills.Stealth||0], perception:["Perception",skills.Perception||0], investigation:["Investigation",skills.Investigation||0], survival:["Survival",skills.Survival||0], athletics:["Athletics",skills.Athletics||0], deception:["Deception",skills.Deception||0], intimidation:["Intimidation",skills.Intimidation||0] };
  const [name,mod] = map[type] || ["Check",0];
  const {d20:d,total,nat} = d20check(mod);
  return {
    label: `🎲 ${name} Check`,
    lines: [`d20(${d}) ${fmt(mod)} = ${total}${nat===20?" ⚡ NAT 20!":nat===1?" 💀 NAT 1":""}`],
    context: `${name}: d20=${d}, mod=${fmt(mod)}, total=${total}`,
  };
}

function buildImageUrl(narration) {
  const l = (narration||"").toLowerCase();
  let scene = "grey-green firbolg rogue in ruined mountain monastery at night, crescent moon, torches, misty";
  if (/combat|attack|fight|sword|enemy|monster/.test(l)) scene = "epic battle scene warrior rogue fighting shadowy enemy dark stone ruins moonlight";
  else if (/vault|rune|seal|magic|arcane/.test(l)) scene = "ancient stone vault door glowing magical runes underground chamber torchlight";
  else if (/stealth|shadow|sneak|hide/.test(l)) scene = "cloaked rogue moving silently dark stone corridor long shadows single torch";
  else if (/monastery|chapel|altar|shrine/.test(l)) scene = "ruined gothic monastery interior broken pillars moonlight shattered stained glass";
  else if (/mountain|cliff|peak/.test(l)) scene = "grey-green firbolg warrior misty mountain cliff ruined monastery below crescent moon";
  const prompt = encodeURIComponent(`${scene}, dark fantasy JRPG art, Final Fantasy style, painterly, cinematic, no text`);
  const seed = Math.floor(Math.random() * 999999);
  return `/api/image?prompt=${prompt}&seed=${seed}`;
}

const DM_SYSTEM = `You are a dramatic Dungeon Master for a solo D&D 5e campaign with Final Fantasy-inspired style. Vivid scenes, memorable NPCs, epic adventure.

RULES:
- After EVERY response end with: {"choices":["option 1","option 2","option 3","option 4"]}
- Choices must be SPECIFIC to the current moment.
- Keep narration vivid but tight: 3-5 sentences.
- Use chapter-title headers for new locations like — The Shattered Gate —
- Track enemy HP in combat like: Enemy HP: ████░░ 8/20
- Never break character.`;

function buildDMSystem(char) {
  if (!char) return DM_SYSTEM;
  try {
    const stats = char.stats || {};
    const mods = char.mods || {};
    const attacks = char.attacks || [];
    const statLine = Object.entries(stats).map(([k,v]) => `${k}${(mods[k]||0)>=0?"+"+(mods[k]||0):(mods[k]||0)}`).join(" ");
    const atkLine = attacks.map(a => `${a.name||""} ${(a.atkBonus||0)>=0?"+"+(a.atkBonus||0):(a.atkBonus||0)} (1d${a.damageDice||6}${(a.damageMod||0)>0?"+"+(a.damageMod||0):""} ${a.type||""})`).join(", ");
    return `${DM_SYSTEM}

CHARACTER: ${char.name||"Hero"}${char.title?", "+char.title:""} — ${char.alignment||""} ${char.race||""} ${char.class||""} (Level ${char.level||1})
HP: ${(char.hp||{}).max||10} | AC: ${char.ac||10} | Speed: ${char.speed||30}ft
Stats: ${statLine}
Attacks: ${atkLine}
Features: ${(char.features||[]).filter(Boolean).slice(0,4).join("; ")}
${char.backstory ? "Backstory: "+char.backstory : ""}

Adventure setting: mist-shrouded Craghaven mountains near ruined monastery with ancient vault.`;
  } catch(e) {
    return DM_SYSTEM;
  }
}

async function callDM(messages, system) {
  try {
    // Trim history to last 10 messages to stay within Groq context limits
    const trimmed = messages.slice(-10);
    const r = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, system: system||DM_SYSTEM, messages: trimmed }),
    });
    const d = await r.json();
    if (!r.ok) return `[Error ${r.status}: ${d?.error||JSON.stringify(d).slice(0,80)}] {"choices":["Try again","Retry","Wait","Continue"]}`;
    const text = d?.content?.[0]?.text;
    if (!text) return `[No response] {"choices":["Try again","Retry","Wait","Continue"]}`;
    return text;
  } catch(e) {
    return `[Network error: ${e.message}] {"choices":["Try again","Retry","Wait","Continue"]}`;
  }
}

function parseResponse(raw) {
  const cleaned = (raw||"").replace(/```json\s*/gi,"").replace(/```\s*/g,"");
  const all = [...cleaned.matchAll(/\{"choices"\s*:\s*\[[\s\S]*?\]\s*\}/g)];
  let choices=[], narration=cleaned;
  if (all.length > 0) {
    const m = all[all.length-1];
    try { choices = JSON.parse(m[0]).choices||[]; } catch { choices = []; }
    narration = cleaned.slice(0, m.index).trim();
  }
  narration = narration.replace(/```json\s*$/gi,"").replace(/```\s*$/g,"").replace(/---\s*$/g,"").trim();
  return { narration, choices };
}

// Error boundary
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err:null }; }
  static getDerivedStateFromError(e) { return { err:e }; }
  render() {
    if (this.state.err) {
      return React.createElement("div", { style:{background:"#050810",color:"#c8d8f0",padding:20,minHeight:"100vh",fontFamily:"monospace"} },
        React.createElement("div", { style:{color:"#d4aa50",fontSize:18,marginBottom:12} }, "Solo DxD: Story Chronicles — Error"),
        React.createElement("div", { style:{color:"#c03030",marginBottom:8} }, String(this.state.err?.message||"Unknown")),
        React.createElement("pre", { style:{fontSize:10,color:"#8090a0",whiteSpace:"pre-wrap"} }, String(this.state.err?.stack||"").slice(0,400)),
        React.createElement("button", { onClick:()=>window.location.reload(), style:{marginTop:16,padding:"8px 16px",background:"#1e4a60",border:"1px solid #4a9aba",color:"white",cursor:"pointer"} }, "Reload")
      );
    }
    return this.props.children;
  }
}

// Scene Image
function SceneImage({ narration }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [url, setUrl] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setLoaded(false); setErrored(false); setAttempt(0);
    setUrl(buildImageUrl(narration));
  }, [narration]);
  if (!url || errored) return null;
  return (
    <div style={{width:"100%",position:"relative",background:"#080a0e"}}>
      {!loaded && <div style={{width:"100%",paddingTop:"42%",background:"linear-gradient(90deg,#050810 25%,#0a1020 50%,#050810 75%)",backgroundSize:"200% 100%"}}/>}
      <img key={url} src={url} alt="Scene"
        style={{width:"100%",display:"block",opacity:loaded?1:0,position:loaded?"relative":"absolute",top:0,left:0,transition:"opacity .5s"}}
        onLoad={()=>setLoaded(true)}
        onError={()=>{ if(attempt<2){setAttempt(a=>a+1);setUrl(buildImageUrl(narration)+"&t="+Date.now());}else{setErrored(true);}}}
      />
    </div>
  );
}

// TTS
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const pendingRef = useRef(null);
  useEffect(()=>{ enabledRef.current = enabled; },[enabled]);
  function getVoice() {
    if (!window.speechSynthesis) return null;
    const vs = window.speechSynthesis.getVoices();
    return vs.find(v=>v.name==="Google UK English Male")||vs.find(v=>/male/i.test(v.name))||vs.find(v=>v.name==="Daniel")||vs.find(v=>v.lang==="en-GB"&&!/female|samantha|karen/i.test(v.name))||vs.find(v=>v.lang.startsWith("en"))||vs[0];
  }
  function doSpeak(text) {
    if (!window.speechSynthesis||!text) return;
    const clean = text.replace(/[*#▶›]/g,"").replace(/---/g,"").replace(/\{[^}]*\}/g,"").replace(/\s+/g," ").trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    setTimeout(()=>{
      const u = new SpeechSynthesisUtterance(clean);
      const v = getVoice(); if(v) u.voice=v;
      u.rate=0.82; u.pitch=0.6; u.volume=1;
      u.onstart=()=>setSpeaking(true);
      u.onend=()=>setSpeaking(false);
      u.onerror=()=>setSpeaking(false);
      window.speechSynthesis.speak(u);
    },150);
  }
  function speak(text) { pendingRef.current=text; if(enabledRef.current) doSpeak(text); }
  function stop() { if(window.speechSynthesis) window.speechSynthesis.cancel(); setSpeaking(false); }
  function toggleEnabled() { const n=!enabled; setEnabled(n); enabledRef.current=n; if(!n)stop(); else if(pendingRef.current)doSpeak(pendingRef.current); }
  function playPending() { if(pendingRef.current) doSpeak(pendingRef.current); }
  return { speak, stop, speaking, enabled, toggleEnabled, playPending };
}

function AppInner() {
  const [character, setCharacter] = useState(null);
  const [showSelect, setShowSelect] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [hp, setHp] = useState(9);
  const [messages, setMsgs] = useState([]);
  const [history, setHistory] = useState([]);
  const [choices, setChoices] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inCombat, setCombat] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [sheetOpen, setSheet] = useState(false);
  const [initializing, setInit] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const sessionId = useRef(getSessionId());
  const tts = useTTS();

  const cards = useMemo(() => {
    const result = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];
      if (!msg) { i++; continue; }
      if (msg.type === "scene") {
        const next = messages[i+1];
        if (next && next.type === "dm") { result.push({ scene:msg, dm:next, rolls:[], player:null }); i+=2; continue; }
      }
      if (msg.type === "dm") { result.push({ scene:null, dm:msg, rolls:[], player:null }); i++; continue; }
      if ((msg.type==="player"||msg.type==="roll") && result.length>0) {
        const card = result[result.length-1];
        if (msg.type==="roll") card.rolls.push(msg);
        if (msg.type==="player") card.player=msg;
      }
      i++;
    }
    return result;
  }, [messages]);

  useEffect(() => { if (cards.length>0) setCardIndex(cards.length-1); }, [cards.length]);

  useEffect(() => {
    (async()=>{
      try {
        const saved = loadGame("solo_dxd_v1");
        if (saved && saved.messages && saved.messages.length>0) { setHasSave(true); }
      } catch{}
      setInit(false);
      setShowSelect(true);
    })();
  }, []);

  async function handleCharacterSelect(char, loadSave) {
    setShowSelect(false);
    if (loadSave) {
      try {
        const s = loadGame("solo_dxd_v1");
        if (s && s.messages && s.messages.length>0) {
          setCharacter(s.character || char);
          setMsgs(s.messages);
          setHistory(s.history||[]);
          setHp(s.hp||9);
          setCombat(s.inCombat||false);
          setChoices(s.choices||[]);
          setSaveStatus("Adventure restored!");
          setTimeout(()=>setSaveStatus(""),3000);
          return;
        }
      } catch(e) { console.warn("Load failed",e); }
    }
    setCharacter(char);
    setHp((char?.hp||{}).current||(char?.hp||{}).max||9);
    await startAdventure(char);
  }

  async function handleManualSave() {
    if (!messages.length) return;
    setSaveStatus("Saving...");
    const saveMessages = messages.filter(m=>m.type!=="scene").slice(-30);
    const state = { messages:saveMessages, history:history.slice(-20), hp, inCombat, choices, character };
    saveGame(sessionId.current, state);
    setSaveStatus("✓ Saved!");
    setTimeout(()=>setSaveStatus(""),2500);
  }

  async function startAdventure(char) {
    const KAELEN_DEFAULT = {
      name:"Kaelen", title:"The Slate Ghost", race:"Firbolg", class:"Rogue", level:1,
      alignment:"Neutral Evil", portrait:"🗡️",
      backstory:"Cast out by his clan, Kaelen became a ghost among the mountains.",
      hp:{max:9,current:9}, ac:13, initiative:2, speed:30, profBonus:2,
      stats:{STR:15,DEX:15,CON:13,INT:10,WIS:16,CHA:8},
      mods:{STR:2,DEX:2,CON:1,INT:0,WIS:3,CHA:-1},
      attacks:[{name:"Shortsword",atkBonus:4,damageDice:6,damageMod:2,type:"P/S",notes:"Finesse. Sneak Attack (1d6)."}],
      features:["Sneak Attack (1d6)","Hidden Step","Firbolg Magic","Thieves Cant"],
      skills:{Acrobatics:4,"Animal Handling":5,Arcana:0,Athletics:2,Deception:-1,History:0,Insight:3,Intimidation:-1,Investigation:0,Medicine:3,Nature:0,Perception:5,Performance:-1,Persuasion:-1,Religion:0,"Sleight of Hand":2,Stealth:6,Survival:5},
      inventory:["2x Shortsword","2x Dagger","Shortbow+20 arrows","Leather Armor","Thieves Tools"],
    };
    const activeChar = char || character || KAELEN_DEFAULT;
    setLoading(true);
    setMsgs([]); setHistory([]); setChoices([]); setCombat(false);
    setHp((activeChar.hp||{}).current||(activeChar.hp||{}).max||9);
    const seed = { role:"user", content:`Begin the adventure with Final Fantasy-style drama. The player is ${activeChar.name}${activeChar.title?", "+activeChar.title:""} — a ${activeChar.alignment||""} ${activeChar.race||""} ${activeChar.class||""} (Level ${activeChar.level||1}). ${activeChar.backstory||""} Set an immediate atmospheric opening scene using a chapter title header. End with the JSON choices block.` };
    const raw = await callDM([seed], buildDMSystem(activeChar));
    const {narration,choices:c} = parseResponse(raw);
    setHistory([seed,{role:"assistant",content:raw}]);
    setMsgs([{type:"scene",narration},{type:"dm",text:narration}]);
    setChoices(c);
    setLoading(false);
    tts.speak(narration);
  }

  async function sendAction(action) {
    if (!action.trim()||loading) return;
    setInput(""); setLoading(true); setChoices([]);
    if (sheetOpen) setSheet(false);
    setMsgs(p=>[...p,{type:"player",text:action}]);
    const rollType = detectRoll(action);
    let rollCtx = "";
    if (rollType) {
      const res = buildRollResult(rollType, character);
      setMsgs(p=>[...p,{type:"roll",title:res.label,lines:res.lines}]);
      rollCtx = `\n\nDICE RESULT: ${res.context}`;
    }
    if (/attack|fight|engage|charge|ambush/.test(action.toLowerCase())) setCombat(true);
    const userMsg = {role:"user",content:`Player action: "${action}"${rollCtx}\n\nNarrate with Final Fantasy-style drama. End with the JSON choices block.`};
    const newHistory = [...history,userMsg];
    const raw = await callDM(newHistory, buildDMSystem(character));
    const {narration,choices:c} = parseResponse(raw);
    setHistory([...newHistory,{role:"assistant",content:raw}]);
    setMsgs(p=>[...p,{type:"scene",narration},{type:"dm",text:narration}]);
    setChoices(c);
    setLoading(false);
    tts.speak(narration);
  }

  function handleAttackCard(atk) {
    const res = buildRollResult("attack", character);
    setMsgs(p=>[...p,{type:"roll",title:`⚔️ ${atk.name}`,lines:res.lines}]);
    sendAction(`I attack with my ${atk.name}. [${res.context}]`);
  }

  function rollManual(sides) {
    const r = roll(sides);
    setLastRoll({sides,r});
    setMsgs(p=>[...p,{type:"roll",title:`🎲 d${sides}`,lines:[`Result: ${r}`]}]);
  }

  function confirmNewGame() {
    if (window.confirm("Start a new campaign? Progress will be lost.")) {
      setShowSelect(true);
    }
  }

  const char = character || {};
  const maxHP = (char.hp||{}).max||9;
  const hpPct = Math.max(0,(hp/maxHP)*100);
  const hpColor = hpPct>60?"#208050":hpPct>30?"#c8a030":"#c03030";

  if (initializing) return (
    <div style={{background:"#050810",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontFamily:"serif",fontSize:22,color:"#d4aa50",letterSpacing:".1em"}}>⚔ SOLO DxD</div>
      <div style={{display:"flex",gap:5}}>
        {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#305a70",animation:`pulse 1.2s ${i*.2}s infinite`}}/>)}
      </div>
    </div>
  );

  if (showSelect) return <CharacterSelect hasSave={hasSave} onSelect={handleCharacterSelect}/>;

  const currentCard = cards.length > 0 ? cards[Math.min(cardIndex, cards.length-1)] : null;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",height:"100dvh",background:"#020408",color:"#c8d8f0",fontFamily:"'Crimson Pro',Georgia,serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,400;1,400&family=JetBrains+Mono:wght@400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#305a70;}
        @keyframes pulse{0%,80%,100%{opacity:.2;}40%{opacity:1;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
        .fade-up{animation:fadeUp .3s ease;}
        .choice-btn:hover{background:#0f1830!important;border-color:#c8a030!important;color:#c8a030!important;}
        .atk-card:hover{border-color:#6ea8c4!important;}
        .top-btn:hover{color:#d4aa50!important;}
        .hp-btn:hover{border-color:#6ea8c4!important;color:#6ea8c4!important;}
      `}</style>

      {/* Top bar */}
      <div style={{display:"flex",alignItems:"stretch",borderBottom:"2px solid #c8a030",background:"linear-gradient(180deg,#0a1428,#050810)",flexShrink:0}}>
        <div style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:10,flex:1}}>
          <span style={{fontFamily:"Cinzel,serif",fontSize:15,color:"#d4aa50",letterSpacing:".08em"}}>⚔ SOLO DxD</span>
          <span style={{fontSize:10,color:"#4a5870"}}>{char.name||"Hero"}{char.title?" · "+char.title:""}</span>
          {saveStatus && <span style={{fontSize:9,color:"#208050",fontStyle:"italic"}}>{saveStatus}</span>}
        </div>
        <div style={{display:"flex",borderLeft:"1px solid #1a2540"}}>
          {[
            ["💾 SAVE", handleManualSave, loading||!messages.length],
            [tts.speaking?"⏹ STOP":tts.enabled?"🔊 ON":"🔇 OFF", ()=>tts.speaking?tts.stop():tts.enabled?tts.playPending():tts.toggleEnabled(), false],
            ["📋 SHEET", ()=>setSheet(p=>!p), false],
          ].map(([label,fn,dis])=>(
            <button key={label} onClick={fn} disabled={dis}
              style={{background:"none",border:"none",borderLeft:"1px solid #1a2540",color:dis?"#2a3040":"#4a5870",fontFamily:"Cinzel,serif",fontSize:10,padding:"0 12px",cursor:dis?"not-allowed":"pointer",letterSpacing:".06em",transition:"color .15s"}}
              className="top-btn"
            >{label}</button>
          ))}
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        {sheetOpen && (
          <div style={{width:240,background:"#0a0e1a",borderRight:"1px solid #1a2540",overflowY:"auto",flexShrink:0}}>
            <div style={{padding:"12px 10px",borderBottom:"1px solid #1a2540",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:4}}>{char.portrait||"⚔️"}</div>
              <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"#6ea8c4"}}>{char.name||"Hero"}</div>
              <div style={{fontSize:9,color:"#4a5870",marginTop:1}}>{char.race} {char.class} · Lv{char.level||1}</div>
              <div style={{marginTop:8}}>
                <div style={{fontFamily:"Cinzel,serif",fontSize:18,color:hpColor}}>{hp}/{maxHP}</div>
                <div style={{height:5,background:"#0f1520",borderRadius:3,overflow:"hidden",margin:"4px 0"}}>
                  <div style={{height:"100%",width:`${hpPct}%`,background:hpColor,transition:"width .4s"}}/>
                </div>
                <div style={{display:"flex",gap:3}}>
                  {[["−",()=>setHp(p=>Math.max(0,p-1))],["+",()=>setHp(p=>Math.min(maxHP,p+1))],["MAX",()=>setHp(maxHP)]].map(([l,fn])=>(
                    <button key={l} onClick={fn} className="hp-btn" style={{flex:1,background:"#080c18",border:"1px solid #1a2540",color:"#4a5870",fontSize:9,padding:"3px 0",cursor:"pointer",fontFamily:"Cinzel,serif",transition:"all .15s"}}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Stats */}
            <div style={{padding:"8px 10px",borderBottom:"1px solid #1a2540"}}>
              <div style={{fontSize:7,color:"#305a70",textTransform:"uppercase",letterSpacing:".15em",marginBottom:6,fontFamily:"Cinzel,serif"}}>Ability Scores</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
                {Object.entries(char.stats||{}).map(([k,v])=>(
                  <div key={k} style={{background:"#080c18",border:"1px solid #1a2540",borderRadius:2,textAlign:"center",padding:"4px 2px"}}>
                    <div style={{fontSize:6,color:"#4a5870",textTransform:"uppercase"}}>{k}</div>
                    <div style={{fontFamily:"Cinzel,serif",fontSize:13,color:"#6ea8c4"}}>{fmt(char.mods?.[k]||0)}</div>
                    <div style={{fontSize:7,color:"#4a5870"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Attacks */}
            <div style={{padding:"8px 10px",borderBottom:"1px solid #1a2540"}}>
              <div style={{fontSize:7,color:"#305a70",textTransform:"uppercase",letterSpacing:".15em",marginBottom:5,fontFamily:"Cinzel,serif"}}>Attacks</div>
              {(char.attacks||[]).map(a=>(
                <div key={a.name} onClick={()=>handleAttackCard(a)} className="atk-card"
                  style={{background:"#080c18",border:"1px solid #1a2540",borderRadius:2,padding:"5px 7px",marginBottom:3,cursor:"pointer",transition:"border-color .15s"}}>
                  <div style={{fontFamily:"Cinzel,serif",fontSize:9,color:"#6ea8c4"}}>{a.name}</div>
                  <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:7,color:"#c8a030"}}>{fmt(a.atkBonus||0)} · 1d{a.damageDice||6}{(a.damageMod||0)>0?`+${a.damageMod||0}`:""} {a.type||""}</div>
                </div>
              ))}
            </div>
            {/* Features */}
            <div style={{padding:"8px 10px",borderBottom:"1px solid #1a2540"}}>
              <div style={{fontSize:7,color:"#305a70",textTransform:"uppercase",letterSpacing:".15em",marginBottom:5,fontFamily:"Cinzel,serif"}}>Features</div>
              {(char.features||[]).filter(Boolean).map((f,i)=>(
                <div key={i} style={{fontSize:8,color:"#4a5870",padding:"2px 0",borderBottom:"1px solid #080c18"}}>{f}</div>
              ))}
            </div>
            {/* Inventory */}
            <div style={{padding:"8px 10px",borderBottom:"1px solid #1a2540"}}>
              <div style={{fontSize:7,color:"#305a70",textTransform:"uppercase",letterSpacing:".15em",marginBottom:5,fontFamily:"Cinzel,serif"}}>Inventory</div>
              {(char.inventory||[]).map((item,i)=>(
                <div key={i} style={{fontSize:8,color:"#c8d8f0",padding:"1px 0"}}>· {item}</div>
              ))}
            </div>
            {/* Dice */}
            <div style={{padding:"8px 10px",borderBottom:"1px solid #1a2540"}}>
              <div style={{fontSize:7,color:"#305a70",textTransform:"uppercase",letterSpacing:".15em",marginBottom:5,fontFamily:"Cinzel,serif"}}>Dice</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                {[4,6,8,10,12,20,100].map(s=>(
                  <button key={s} onClick={()=>rollManual(s)} style={{background:"#080c18",border:"1px solid #1a2540",color:"#c8a030",fontFamily:"Cinzel,serif",fontSize:8,padding:"3px 6px",borderRadius:2,cursor:"pointer"}}>d{s}</button>
                ))}
              </div>
              {lastRoll && <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:8,color:"#4a5870",marginTop:3}}>d{lastRoll.sides} → <strong style={{color:"#c8a030"}}>{lastRoll.r}</strong></div>}
            </div>
            <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:4}}>
              <button onClick={confirmNewGame} style={{background:"#080c18",border:"1px solid #3a1515",color:"#806060",fontFamily:"Cinzel,serif",fontSize:9,padding:"6px",borderRadius:2,cursor:"pointer"}}>↺ New Campaign</button>
              <button onClick={()=>{tts.stop();setShowSelect(true);}} style={{background:"#080c18",border:"1px solid #1a2540",color:"#4a5870",fontFamily:"Cinzel,serif",fontSize:9,padding:"6px",borderRadius:2,cursor:"pointer"}}>⚔ Change Character</button>
            </div>
          </div>
        )}

        {/* Main game area */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {inCombat && (
            <div style={{background:"#160a0a",borderBottom:"1px solid #3a1515",padding:"5px 14px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{background:"#c03030",color:"#fff",fontFamily:"Cinzel,serif",fontSize:8,padding:"2px 6px",borderRadius:2}}>⚔ BATTLE</span>
              <span style={{fontSize:10,color:"#c09090",fontStyle:"italic"}}>Use attacks or type your action</span>
              <button onClick={()=>{setCombat(false);setMsgs(p=>[...p,{type:"sys",text:"— Battle ended —"}]);}} style={{marginLeft:"auto",background:"none",border:"1px solid #5a2020",color:"#906060",fontSize:9,padding:"2px 8px",cursor:"pointer",fontFamily:"Cinzel,serif"}}>Flee</button>
            </div>
          )}

          {/* Card navigation */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 14px",borderBottom:"1px solid #1a2540",background:"#020408",flexShrink:0}}>
            <button onClick={()=>setCardIndex(i=>Math.max(0,i-1))} disabled={cardIndex===0}
              style={{background:"none",border:"1px solid #1a2540",color:"#c8a030",fontSize:20,width:36,height:36,borderRadius:3,cursor:"pointer",opacity:cardIndex===0?.2:1}}>‹</button>
            <span style={{fontFamily:"Cinzel,serif",fontSize:11,color:"#4a5870",letterSpacing:".1em"}}>
              {cards.length>0?`${cardIndex+1} / ${cards.length}`:"—"}
            </span>
            <button onClick={()=>setCardIndex(i=>Math.min(cards.length-1,i+1))} disabled={cardIndex>=cards.length-1}
              style={{background:"none",border:"1px solid #1a2540",color:"#c8a030",fontSize:20,width:36,height:36,borderRadius:3,cursor:"pointer",opacity:cardIndex>=cards.length-1?.2:1}}>›</button>
          </div>

          {/* Card display */}
          <div style={{flex:1,overflowY:"auto"}}>
            {loading && !currentCard && (
              <div style={{padding:16,display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#305a70",animation:`pulse 1.2s ${i*.2}s infinite`}}/>)}
              </div>
            )}
            {currentCard && (
              <div className="fade-up">
                {currentCard.scene && currentCard.scene.narration && <SceneImage narration={currentCard.scene.narration}/>}
                {currentCard.player && (
                  <div style={{background:"#080c18",borderRight:"3px solid #c8a030",padding:"7px 12px",fontSize:13,color:"#4a5870",fontStyle:"italic",margin:"0"}}>
                    › {currentCard.player.text}
                  </div>
                )}
                {(currentCard.rolls||[]).map((r,i)=>r&&(
                  <div key={i} style={{background:"#0a1408",borderLeft:"3px solid #30a050",padding:"7px 12px",fontFamily:"JetBrains Mono,monospace",fontSize:11,color:"#78b870"}}>
                    <div style={{color:"#9aca90",fontSize:9,textTransform:"uppercase",letterSpacing:".1em",marginBottom:3,fontFamily:"Cinzel,serif"}}>{r.title||""}</div>
                    {(r.lines||[]).map((l,j)=><div key={j}>{String(l||"")}</div>)}
                  </div>
                ))}
                <div style={{background:"linear-gradient(180deg,rgba(8,14,28,.98),rgba(5,10,22,.98))",borderTop:"1px solid #1a2540",padding:"14px 18px",fontSize:15,lineHeight:1.8,color:"#c8d8f0",whiteSpace:"pre-wrap",position:"relative"}}>
                  {currentCard.dm.text||""}
                  <span style={{position:"absolute",bottom:8,right:12,fontSize:8,color:"#c8a030",animation:"pulse 1.2s infinite"}}>▶</span>
                </div>
                {loading && cardIndex===cards.length-1 && (
                  <div style={{padding:"10px 18px",display:"flex",gap:5,alignItems:"center"}}>
                    {[0,1,2].map(i=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#305a70",animation:`pulse 1.2s ${i*.2}s infinite`}}/>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choices */}
          {choices.length>0 && !loading && (
            <div style={{padding:"8px 14px 0",flexShrink:0,borderTop:"1px solid #1a2540"}}>
              <div style={{fontSize:8,color:"#305a70",textTransform:"uppercase",letterSpacing:".15em",marginBottom:6,fontFamily:"Cinzel,serif"}}>— Choose Action —</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr",gap:1,background:"#1a2540"}}>
                {choices.map((c,i)=>(
                  <button key={i} onClick={()=>sendAction(String(c))} disabled={loading}
                    className="choice-btn"
                    style={{background:"linear-gradient(90deg,#001830,#0a0e1a)",color:"#c8d8f0",fontSize:13,padding:"10px 18px",cursor:"pointer",textAlign:"left",fontFamily:"Crimson Pro,Georgia,serif",lineHeight:1.4,border:"none",transition:"all .1s",display:"flex",alignItems:"center",gap:10,opacity:loading?.4:1}}>
                    <span style={{color:"#c8a030",fontSize:10,opacity:0}}>▷</span>{String(c)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{padding:"10px 14px 12px",borderTop:"1px solid #1a2540",background:"linear-gradient(180deg,#080d1c,#050810)",flexShrink:0}}>
            <div style={{display:"flex",gap:7}}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAction(input);}}}
                placeholder="Or type your own action…" disabled={loading}
                style={{flex:1,background:"#001830",border:"1px solid #1e4a60",color:"#c8d8f0",padding:"9px 12px",borderRadius:5,fontFamily:"Crimson Pro,Georgia,serif",fontSize:15,outline:"none"}}
              />
              <button onClick={()=>sendAction(input)} disabled={loading||!input.trim()}
                style={{background:"linear-gradient(135deg,#1e4a60,#305a70)",border:"1px solid #4a9aba",color:"#fff",padding:"9px 16px",borderRadius:5,fontFamily:"Cinzel,serif",fontSize:11,cursor:"pointer",opacity:loading||!input.trim()?.35:1}}>
                {loading?"...":"ACT"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner/>
    </ErrorBoundary>
  );
}
