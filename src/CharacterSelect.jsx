import { useState } from "react";
import { PREMADE_CHARACTERS, RACES, CLASSES, CLASS_SKILLS, BACKGROUNDS, ALIGNMENTS, buildCharacterFromCustom, calcMod } from "./characters.js";

const S = {
  bg:"#050810", panel:"#0a0e1a", border:"#1a2540",
  accent:"#4a9aba", accentDim:"#1e4a60", gold:"#d4aa50",
  red:"#c03030", green:"#208050", text:"#c8d8f0",
  muted:"#4a5870", rune:"#080c18", highlight:"#0f1830",
  ffblue:"#001830", ffgold:"#c8a030", ffdark:"#020408",
};

const diffColor = { Beginner:S.green, Medium:S.gold, Hard:S.red, Custom:S.accent };

export default function CharacterSelect({ onSelect, hasSave }) {
  const [screen, setScreen]     = useState("main"); // main | premade | create
  const [selected, setSelected] = useState(null);
  const [step, setStep]         = useState(1); // creation steps 1-5
  const [form, setForm]         = useState({
    name:"", title:"", race:"Human", class:"Fighter", background:"Soldier",
    alignment:"Lawful Good", backstory:"",
    stats:{ STR:15, DEX:13, CON:14, INT:10, WIS:12, CHA:8 },
    selectedSkills:[],
  });

  const pointsSpent = Object.values(form.stats).reduce((a,v) => {
    const n = parseInt(v)||8;
    if (n <= 13) return a + (n - 8);
    if (n === 14) return a + 7;
    if (n === 15) return a + 9;
    return a;
  }, 0);
  const pointsLeft = 27 - pointsSpent;

  function updateStat(stat, val) {
    const n = Math.max(8, Math.min(15, parseInt(val)||8));
    setForm(f => ({ ...f, stats:{ ...f.stats, [stat]:n } }));
  }

  function toggleSkill(skill) {
    const cls     = CLASSES[form.class];
    const maxSkills = cls?.numSkills || 2;
    const bgSkills  = BACKGROUNDS[form.background]?.skills || [];
    if (bgSkills.includes(skill)) return; // bg skill, can't toggle
    setForm(f => {
      const cur = f.selectedSkills;
      if (cur.includes(skill)) return { ...f, selectedSkills: cur.filter(s => s !== skill) };
      if (cur.length >= maxSkills) return f;
      return { ...f, selectedSkills:[...cur, skill] };
    });
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body,#root{height:100%;width:100%;}
    body{background:${S.ffdark};color:${S.text};font-family:'Crimson Pro',Georgia,serif;overflow-x:hidden;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:${S.accentDim};}
    .cs-wrap{min-height:100vh;min-height:100dvh;background:linear-gradient(180deg,#020610 0%,#050810 50%,#020408 100%);display:flex;flex-direction:column;align-items:center;padding:0 0 40px;}
    .cs-header{width:100%;padding:24px 20px 16px;text-align:center;border-bottom:1px solid ${S.border};background:linear-gradient(180deg,#080d20,transparent);}
    .cs-logo{font-family:'Cinzel',serif;font-size:24px;color:${S.ffgold};letter-spacing:.12em;text-shadow:0 0 30px rgba(212,170,80,.4);}
    .cs-sub{font-size:12px;color:${S.muted};margin-top:4px;letter-spacing:.08em;}
    .cs-body{width:100%;max-width:600px;padding:20px 16px;}
    .main-btn{display:flex;align-items:center;gap:14px;width:100%;background:linear-gradient(135deg,${S.panel},${S.rune});border:1px solid ${S.border};border-radius:4px;padding:16px 18px;margin-bottom:10px;cursor:pointer;transition:all .15s;text-align:left;}
    .main-btn:hover{border-color:${S.ffgold};background:linear-gradient(135deg,#0f1830,#080c18);}
    .main-btn-icon{font-size:28px;flex-shrink:0;}
    .main-btn-title{font-family:'Cinzel',serif;font-size:14px;color:${S.ffgold};letter-spacing:.06em;}
    .main-btn-desc{font-size:12px;color:${S.muted};margin-top:3px;}
    .continue-btn{border-color:${S.green}!important;}
    .continue-btn .main-btn-title{color:${S.green}!important;}
    .section-title{font-family:'Cinzel',serif;font-size:11px;color:${S.accentDim};text-transform:uppercase;letter-spacing:.15em;margin:16px 0 10px;padding-bottom:6px;border-bottom:1px solid ${S.border};}
    .char-card{background:linear-gradient(135deg,${S.panel},${S.rune});border:1px solid ${S.border};border-radius:4px;padding:14px;margin-bottom:8px;cursor:pointer;transition:all .15s;position:relative;}
    .char-card:hover,.char-card.active{border-color:${S.ffgold};}
    .char-card-top{display:flex;align-items:center;gap:12px;}
    .char-portrait{font-size:28px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:${S.rune};border:1px solid ${S.border};border-radius:3px;flex-shrink:0;}
    .char-info{flex:1;}
    .char-name{font-family:'Cinzel',serif;font-size:14px;color:${S.accent};}
    .char-title{font-size:11px;color:${S.muted};font-style:italic;margin-top:1px;}
    .char-tags{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;}
    .tag{font-size:9px;padding:2px 7px;border-radius:2px;border:1px solid;font-family:'Cinzel',serif;letter-spacing:.06em;}
    .char-desc{font-size:12px;color:${S.muted};margin-top:8px;line-height:1.5;}
    .char-detail{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px;}
    .detail-box{background:${S.rune};border:1px solid ${S.border};border-radius:2px;padding:6px;text-align:center;}
    .detail-label{font-size:7px;color:${S.muted};text-transform:uppercase;letter-spacing:.1em;}
    .detail-val{font-family:'Cinzel',serif;font-size:13px;color:${S.accent};}
    .select-btn{width:100%;background:linear-gradient(135deg,${S.accentDim},#1a3a50);border:1px solid ${S.accent};color:#fff;font-family:'Cinzel',serif;font-size:12px;padding:10px;border-radius:3px;cursor:pointer;margin-top:10px;letter-spacing:.08em;transition:all .15s;}
    .select-btn:hover{background:linear-gradient(135deg,${S.accent},#2a5a70);}
    .back-btn{background:none;border:1px solid ${S.border};color:${S.muted};font-family:'Cinzel',serif;font-size:10px;padding:6px 14px;border-radius:3px;cursor:pointer;margin-bottom:16px;letter-spacing:.06em;}
    .back-btn:hover{border-color:${S.accent};color:${S.accent};}
    .step-bar{display:flex;gap:4px;margin-bottom:20px;}
    .step-dot{flex:1;height:3px;border-radius:2px;background:${S.border};transition:background .3s;}
    .step-dot.done{background:${S.ffgold};}
    .step-dot.active{background:${S.accent};}
    .form-label{font-size:10px;color:${S.accentDim};text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;font-family:'Cinzel',serif;display:block;}
    .form-input{width:100%;background:${S.ffblue};border:1px solid ${S.border};color:${S.text};padding:9px 12px;border-radius:3px;font-family:'Crimson Pro',serif;font-size:14px;outline:none;margin-bottom:12px;transition:border-color .15s;}
    .form-input:focus{border-color:${S.ffgold};}
    .form-select{width:100%;background:${S.ffblue};border:1px solid ${S.border};color:${S.text};padding:9px 12px;border-radius:3px;font-family:'Crimson Pro',serif;font-size:14px;outline:none;margin-bottom:12px;appearance:none;}
    .form-select:focus{border-color:${S.ffgold};}
    .form-textarea{width:100%;background:${S.ffblue};border:1px solid ${S.border};color:${S.text};padding:9px 12px;border-radius:3px;font-family:'Crimson Pro',serif;font-size:13px;outline:none;margin-bottom:12px;min-height:80px;resize:vertical;line-height:1.5;}
    .stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;}
    .stat-input-box{background:${S.rune};border:1px solid ${S.border};border-radius:3px;padding:8px;text-align:center;}
    .stat-input-label{font-size:8px;color:${S.muted};text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
    .stat-input-mod{font-size:9px;color:${S.accent};margin-top:2px;}
    .stat-controls{display:flex;align-items:center;gap:4px;justify-content:center;}
    .stat-btn{background:${S.border};border:none;color:${S.text};width:20px;height:20px;border-radius:2px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;}
    .stat-val{font-family:'Cinzel',serif;font-size:15px;color:${S.ffgold};min-width:24px;text-align:center;}
    .points-left{font-family:'Cinzel',serif;font-size:12px;color:${pointsLeft < 0 ? S.red : S.green};text-align:center;margin-bottom:12px;}
    .skill-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:12px;}
    .skill-chip{padding:6px 10px;border-radius:3px;border:1px solid ${S.border};font-size:11px;cursor:pointer;transition:all .15s;background:${S.rune};color:${S.muted};}
    .skill-chip.selected{border-color:${S.ffgold};color:${S.ffgold};background:#1a1508;}
    .skill-chip.bg-skill{border-color:${S.green};color:${S.green};cursor:default;background:#081508;}
    .skill-chip.unavail{opacity:.3;cursor:not-allowed;}
    .next-btn{width:100%;background:linear-gradient(135deg,${S.accentDim},#1a3a50);border:1px solid ${S.accent};color:#fff;font-family:'Cinzel',serif;font-size:12px;padding:11px;border-radius:3px;cursor:pointer;letter-spacing:.08em;margin-top:4px;transition:all .15s;}
    .next-btn:hover:not(:disabled){background:linear-gradient(135deg,${S.accent},#2a5a70);}
    .next-btn:disabled{opacity:.35;cursor:not-allowed;}
    .feature-list{list-style:none;}
    .feature-item{font-size:11px;color:${S.muted};padding:4px 0;border-bottom:1px solid ${S.rune};display:flex;gap:6px;}
    .feature-item::before{content:'▷';color:${S.ffgold};font-size:8px;margin-top:2px;flex-shrink:0;}
    .preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;}
    .preview-box{background:${S.rune};border:1px solid ${S.border};border-radius:3px;padding:8px;text-align:center;}
    .info-box{background:${S.rune};border:1px solid ${S.border};border-radius:3px;padding:10px 12px;margin-bottom:10px;font-size:11px;color:${S.muted};line-height:1.6;}
    .info-box strong{color:${S.accent};}
  `;

  if (screen === "main") return (
    <>
      <style>{css}</style>
      <div className="cs-wrap">
        <div className="cs-header">
          <div className="cs-logo">⚔ SOLO D&D</div>
          <div className="cs-sub">Choose Your Adventure</div>
        </div>
        <div className="cs-body">
          {hasSave && (
            <button className="main-btn continue-btn" onClick={() => onSelect(null, true)}>
              <span className="main-btn-icon">💾</span>
              <div>
                <div className="main-btn-title">Continue Adventure</div>
                <div className="main-btn-desc">Resume your last saved game</div>
              </div>
            </button>
          )}
          <button className="main-btn" onClick={() => setScreen("premade")}>
            <span className="main-btn-icon">⚔️</span>
            <div>
              <div className="main-btn-title">Choose a Character</div>
              <div className="main-btn-desc">6 pre-made characters ready to play</div>
            </div>
          </button>
          <button className="main-btn" onClick={() => setScreen("create")}>
            <span className="main-btn-icon">📜</span>
            <div>
              <div className="main-btn-title">Create a Character</div>
              <div className="main-btn-desc">Full D&D 5e character builder</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );

  if (screen === "premade") return (
    <>
      <style>{css}</style>
      <div className="cs-wrap">
        <div className="cs-header">
          <div className="cs-logo">⚔ Choose Your Character</div>
          <div className="cs-sub">Select a pre-made adventurer</div>
        </div>
        <div className="cs-body">
          <button className="back-btn" onClick={() => { setScreen("main"); setSelected(null); }}>← Back</button>
          {PREMADE_CHARACTERS.map(char => (
            <div key={char.id} className={`char-card${selected?.id===char.id?" active":""}`} onClick={() => setSelected(char)}>
              <div className="char-card-top">
                <div className="char-portrait">{char.portrait}</div>
                <div className="char-info">
                  <div className="char-name">{char.name}</div>
                  <div className="char-title">{char.title}</div>
                  <div className="char-tags">
                    <span className="tag" style={{borderColor:S.accent,color:S.accent}}>{char.race}</span>
                    <span className="tag" style={{borderColor:S.gold,color:S.gold}}>{char.class}</span>
                    <span className="tag" style={{borderColor:diffColor[char.difficulty]||S.muted,color:diffColor[char.difficulty]||S.muted}}>{char.difficulty}</span>
                  </div>
                </div>
              </div>
              <div className="char-desc">{char.description}</div>
              {selected?.id === char.id && (
                <>
                  <div className="char-detail">
                    <div className="detail-box"><div className="detail-label">HP</div><div className="detail-val">{char.hp.max}</div></div>
                    <div className="detail-box"><div className="detail-label">AC</div><div className="detail-val">{char.ac}</div></div>
                    <div className="detail-box"><div className="detail-label">Speed</div><div className="detail-val">{char.speed}ft</div></div>
                    {Object.entries(char.stats).map(([k,v]) => (
                      <div key={k} className="detail-box">
                        <div className="detail-label">{k}</div>
                        <div className="detail-val">{v >= 10 ? `+${calcMod(v)}` : calcMod(v)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8}}>
                    <div className="section-title">Features</div>
                    <ul className="feature-list">
                      {char.features.slice(0,4).map((f,i) => <li key={i} className="feature-item">{f}</li>)}
                    </ul>
                  </div>
                  <div style={{marginTop:8}}>
                    <div className="section-title">Backstory</div>
                    <div style={{fontSize:12,color:S.muted,lineHeight:1.6,fontStyle:"italic"}}>{char.backstory}</div>
                  </div>
                  <button className="select-btn" onClick={() => onSelect(char, false)}>
                    ▶ BEGIN ADVENTURE AS {char.name.toUpperCase()}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // Character Creator
  const cls = CLASSES[form.class] || {};
  const race = RACES[form.race] || {};
  const bg = BACKGROUNDS[form.background] || {};
  const availSkills = CLASS_SKILLS[form.class] || [];
  const bgSkills = bg.skills || [];
  const maxClassSkills = cls.numSkills || 2;

  const steps = [
    "Identity",
    "Race & Class",
    "Stats",
    "Skills",
    "Finish",
  ];

  function renderStep() {
    if (step === 1) return (
      <>
        <div className="info-box">Give your character a name and define who they are.</div>
        <label className="form-label">Character Name *</label>
        <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Enter name…"/>
        <label className="form-label">Title / Epithet</label>
        <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. The Iron Wolf (optional)"/>
        <label className="form-label">Alignment</label>
        <select className="form-select" value={form.alignment} onChange={e=>setForm(f=>({...f,alignment:e.target.value}))}>
          {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
        </select>
        <label className="form-label">Background</label>
        <select className="form-select" value={form.background} onChange={e=>setForm(f=>({...f,background:e.target.value,selectedSkills:[]}))}>
          {Object.keys(BACKGROUNDS).map(b => <option key={b}>{b}</option>)}
        </select>
        {bg.feature && <div className="info-box"><strong>Background Feature:</strong> {bg.feature}<br/><strong>Background Skills:</strong> {bgSkills.join(", ")}</div>}
        <button className="next-btn" onClick={()=>setStep(2)} disabled={!form.name.trim()}>Next — Race & Class →</button>
      </>
    );

    if (step === 2) return (
      <>
        <label className="form-label">Race</label>
        <select className="form-select" value={form.race} onChange={e=>setForm(f=>({...f,race:e.target.value}))}>
          {Object.keys(RACES).map(r => <option key={r}>{r}</option>)}
        </select>
        {race.traits && <div className="info-box"><strong>Racial Traits:</strong><br/>{race.traits.join(" • ")}</div>}
        <label className="form-label">Class</label>
        <select className="form-select" value={form.class} onChange={e=>setForm(f=>({...f,class:e.target.value,selectedSkills:[]}))}>
          {Object.keys(CLASSES).map(c => <option key={c}>{c}</option>)}
        </select>
        {cls.features && <div className="info-box">
          <strong>Hit Die:</strong> d{cls.hitDie} &nbsp;|&nbsp; <strong>Armor:</strong> {cls.armor}<br/>
          <strong>Features:</strong> {cls.features.join(" • ")}
        </div>}
        <button className="next-btn" onClick={()=>setStep(3)}>Next — Ability Scores →</button>
      </>
    );

    if (step === 3) {
      const raceStats = race.stats || {};
      return (
        <>
          <div className="info-box">
            Distribute <strong style={{color:pointsLeft<0?S.red:S.green}}>{pointsLeft} points</strong> remaining using point-buy (scores 8–15, base cost 1:1, 14 costs 7, 15 costs 9).
            Race bonuses apply automatically.
          </div>
          <div className="stat-row">
            {["STR","DEX","CON","INT","WIS","CHA"].map(stat => {
              const base = form.stats[stat] || 8;
              const total = base + (raceStats[stat]||0);
              const mod   = calcMod(total);
              return (
                <div key={stat} className="stat-input-box">
                  <div className="stat-input-label">{stat}</div>
                  <div className="stat-controls">
                    <button className="stat-btn" onClick={()=>updateStat(stat, base-1)}>−</button>
                    <div className="stat-val">{total}</div>
                    <button className="stat-btn" onClick={()=>updateStat(stat, base+1)}>+</button>
                  </div>
                  <div className="stat-input-mod">{mod>=0?`+${mod}`:mod}</div>
                </div>
              );
            })}
          </div>
          <button className="next-btn" onClick={()=>setStep(4)} disabled={pointsLeft < 0}>Next — Skills →</button>
        </>
      );
    }

    if (step === 4) return (
      <>
        <div className="info-box">
          Choose <strong>{maxClassSkills}</strong> class skills. Background skills (<span style={{color:S.green}}>{bgSkills.join(", ")}</span>) are already selected.
          {form.selectedSkills.length}/{maxClassSkills} class skills chosen.
        </div>
        <div className="skill-grid">
          {availSkills.map(skill => {
            const isBg  = bgSkills.includes(skill);
            const isSel = form.selectedSkills.includes(skill);
            const full  = form.selectedSkills.length >= maxClassSkills && !isSel;
            return (
              <div key={skill}
                className={`skill-chip${isBg?" bg-skill":isSel?" selected":full?" unavail":""}`}
                onClick={()=>!isBg && toggleSkill(skill)}
              >{skill}</div>
            );
          })}
        </div>
        <button className="next-btn" onClick={()=>setStep(5)} disabled={form.selectedSkills.length < maxClassSkills}>Next — Finish →</button>
      </>
    );

    if (step === 5) {
      const preview = buildCharacterFromCustom(form);
      return (
        <>
          <div className="info-box">Review your character before beginning the adventure.</div>
          <div style={{textAlign:"center",marginBottom:12}}>
            <div style={{fontSize:24,marginBottom:4}}>⚔️</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:16,color:S.ffgold}}>{form.name}</div>
            {form.title && <div style={{fontSize:11,color:S.muted,fontStyle:"italic"}}>{form.title}</div>}
            <div style={{fontSize:12,color:S.accent,marginTop:4}}>{form.race} {form.class} · {form.background} · {form.alignment}</div>
          </div>
          <div className="preview-grid">
            <div className="preview-box"><div className="detail-label">HP</div><div className="detail-val">{preview.hp.max}</div></div>
            <div className="preview-box"><div className="detail-label">AC</div><div className="detail-val">{preview.ac}</div></div>
            <div className="preview-box"><div className="detail-label">Speed</div><div className="detail-val">{preview.speed}ft</div></div>
            {["STR","DEX","CON","INT","WIS","CHA"].map(s=>(
              <div key={s} className="preview-box">
                <div className="detail-label">{s} ({preview.stats[s]})</div>
                <div className="detail-val">{preview.mods[s]>=0?`+${preview.mods[s]}`:preview.mods[s]}</div>
              </div>
            ))}
          </div>
          <label className="form-label">Character Backstory (optional)</label>
          <textarea className="form-textarea" value={form.backstory} onChange={e=>setForm(f=>({...f,backstory:e.target.value}))} placeholder="Who are you? What drives you? What do you fear?"/>
          <button className="next-btn" onClick={()=>onSelect(preview, false)}>
            ▶ BEGIN ADVENTURE AS {form.name.toUpperCase()}
          </button>
        </>
      );
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="cs-wrap">
        <div className="cs-header">
          <div className="cs-logo">⚔ Create Your Character</div>
          <div className="cs-sub">Step {step} of 5 — {steps[step-1]}</div>
        </div>
        <div className="cs-body">
          <div className="step-bar">
            {steps.map((_,i)=>(
              <div key={i} className={`step-dot${i+1<step?" done":i+1===step?" active":""}`}/>
            ))}
          </div>
          <button className="back-btn" onClick={()=> step > 1 ? setStep(s=>s-1) : setScreen("main")}>← {step > 1 ? "Back" : "Main Menu"}</button>
          {renderStep()}
        </div>
      </div>
    </>
  );
}
