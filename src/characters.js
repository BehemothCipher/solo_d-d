// ── D&D 5e Data ───────────────────────────────────────────────────────────────
export const RACES = {
  "Human":     { stats:{ STR:1,DEX:1,CON:1,INT:1,WIS:1,CHA:1 }, speed:30, traits:["Extra Language","Versatile — gain one extra skill proficiency"] },
  "Elf":       { stats:{ DEX:2,INT:1 }, speed:30, traits:["Darkvision 60ft","Fey Ancestry (can't be put to sleep by magic)","Keen Senses (Perception proficiency)"] },
  "Dwarf":     { stats:{ CON:2,WIS:1 }, speed:25, traits:["Darkvision 60ft","Dwarven Resilience (advantage vs poison)","Stonecunning","Tool Proficiency"] },
  "Halfling":  { stats:{ DEX:2,CHA:1 }, speed:25, traits:["Lucky (reroll 1s on d20)","Brave (advantage vs frightened)","Halfling Nimbleness"] },
  "Gnome":     { stats:{ INT:2,DEX:1 }, speed:25, traits:["Darkvision 60ft","Gnome Cunning (advantage on INT/WIS/CHA saves vs magic)"] },
  "Half-Elf":  { stats:{ CHA:2,DEX:1,WIS:1 }, speed:30, traits:["Darkvision 60ft","Fey Ancestry","Two extra skill proficiencies"] },
  "Half-Orc":  { stats:{ STR:2,CON:1 }, speed:30, traits:["Darkvision 60ft","Menacing (Intimidation proficiency)","Relentless Endurance","Savage Attacks"] },
  "Tiefling":  { stats:{ INT:1,CHA:2 }, speed:30, traits:["Darkvision 60ft","Hellish Resistance (fire)","Infernal Legacy (Thaumaturgy cantrip)"] },
  "Dragonborn":{ stats:{ STR:2,CHA:1 }, speed:30, traits:["Draconic Ancestry","Breath Weapon (2d6)","Damage Resistance"] },
  "Firbolg":   { stats:{ WIS:2,STR:1 }, speed:30, traits:["Firbolg Magic (Detect Magic/Disguise Self 1/rest)","Hidden Step (invisible 1 turn/rest)","Powerful Build","Speech of Beast & Leaf"] },
};

export const CLASSES = {
  "Barbarian":{ hitDie:12, primaryStat:"STR", savingThrows:["STR","CON"], numSkills:2, armor:"Light/Medium/Shields", features:["Rage (2/rest — +2 dmg, resistance B/P/S)","Unarmored Defense (AC=10+DEX+CON)"] },
  "Bard":     { hitDie:8,  primaryStat:"CHA", savingThrows:["DEX","CHA"], numSkills:3, armor:"Light", features:["Bardic Inspiration (1d6, CHA mod/rest)","Spellcasting (CHA)","Jack of All Trades"] },
  "Cleric":   { hitDie:8,  primaryStat:"WIS", savingThrows:["WIS","CHA"], numSkills:2, armor:"Light/Medium/Shields", features:["Spellcasting (WIS)","Channel Divinity (1/rest)","Turn Undead"] },
  "Druid":    { hitDie:8,  primaryStat:"WIS", savingThrows:["INT","WIS"], numSkills:2, armor:"Light/Medium (non-metal)", features:["Spellcasting (WIS)","Wild Shape (2/rest)"] },
  "Fighter":  { hitDie:10, primaryStat:"STR", savingThrows:["STR","CON"], numSkills:2, armor:"All + Shields", features:["Fighting Style","Second Wind (1d10+level, 1/rest)","Action Surge (1/rest)"] },
  "Monk":     { hitDie:8,  primaryStat:"DEX", savingThrows:["STR","DEX"], numSkills:2, armor:"None", features:["Unarmored Defense (AC=10+DEX+WIS)","Martial Arts (1d4 unarmed)","Ki Points (2/rest)"] },
  "Paladin":  { hitDie:10, primaryStat:"CHA", savingThrows:["WIS","CHA"], numSkills:2, armor:"All + Shields", features:["Divine Sense","Lay on Hands (5 HP/rest)","Divine Smite","Spellcasting (CHA, Lv2)"] },
  "Ranger":   { hitDie:10, primaryStat:"DEX", savingThrows:["STR","DEX"], numSkills:3, armor:"Light/Medium/Shields", features:["Favored Enemy","Natural Explorer","Spellcasting (WIS, Lv2)"] },
  "Rogue":    { hitDie:8,  primaryStat:"DEX", savingThrows:["DEX","INT"], numSkills:4, armor:"Light", features:["Expertise (2 skills)","Sneak Attack (1d6)","Thieves' Cant","Cunning Action"] },
  "Sorcerer": { hitDie:6,  primaryStat:"CHA", savingThrows:["CON","CHA"], numSkills:2, armor:"None", features:["Spellcasting (CHA)","Sorcerous Origin","Font of Magic","Metamagic (Lv3)"] },
  "Warlock":  { hitDie:8,  primaryStat:"CHA", savingThrows:["WIS","CHA"], numSkills:2, armor:"Light", features:["Otherworldly Patron","Pact Magic (recover on short rest)","Eldritch Blast cantrip"] },
  "Wizard":   { hitDie:6,  primaryStat:"INT", savingThrows:["INT","WIS"], numSkills:2, armor:"None", features:["Spellcasting (INT)","Arcane Recovery","Spellbook","Arcane Tradition (Lv2)"] },
};

export const CLASS_SKILLS = {
  "Barbarian":["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"],
  "Bard":["Acrobatics","Animal Handling","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"],
  "Cleric":["History","Insight","Medicine","Persuasion","Religion"],
  "Druid":["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"],
  "Fighter":["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"],
  "Monk":["Acrobatics","Athletics","History","Insight","Religion","Stealth"],
  "Paladin":["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"],
  "Ranger":["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"],
  "Rogue":["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"],
  "Sorcerer":["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"],
  "Warlock":["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"],
  "Wizard":["Arcana","History","Insight","Investigation","Medicine","Religion"],
};

export const BACKGROUNDS = {
  "Acolyte":    { skills:["Insight","Religion"],         feature:"Shelter of the Faithful" },
  "Criminal":   { skills:["Deception","Stealth"],        feature:"Criminal Contact" },
  "Folk Hero":  { skills:["Animal Handling","Survival"], feature:"Rustic Hospitality" },
  "Hermit":     { skills:["Medicine","Religion"],        feature:"Discovery — unique secret" },
  "Noble":      { skills:["History","Persuasion"],       feature:"Position of Privilege" },
  "Outlander":  { skills:["Athletics","Survival"],       feature:"Wanderer — perfect terrain memory" },
  "Sage":       { skills:["Arcana","History"],           feature:"Researcher — find any info" },
  "Soldier":    { skills:["Athletics","Intimidation"],   feature:"Military Rank" },
  "Charlatan":  { skills:["Deception","Sleight of Hand"],feature:"False Identity" },
  "Entertainer":{ skills:["Acrobatics","Performance"],   feature:"By Popular Demand" },
  "Guild Artisan":{ skills:["Insight","Persuasion"],     feature:"Guild Membership" },
  "Sailor":     { skills:["Athletics","Perception"],     feature:"Ship's Passage" },
};

export const ALIGNMENTS = [
  "Lawful Good","Neutral Good","Chaotic Good",
  "Lawful Neutral","True Neutral","Chaotic Neutral",
  "Lawful Evil","Neutral Evil","Chaotic Evil",
];

// ── Pre-made Characters ───────────────────────────────────────────────────────
export const PREMADE_CHARACTERS = [
  {
    id:"kaelen", name:"Kaelen", title:"The Slate Ghost",
    race:"Firbolg", class:"Rogue", level:1, background:"Hermit", alignment:"Neutral Evil",
    portrait:"🗡️", difficulty:"Medium",
    description:"A calculating exile who learned to vanish like smoke. Dangerous, patient, utterly self-reliant.",
    hp:{ max:9,current:9 }, ac:13, initiative:2, speed:30, profBonus:2,
    stats:{ STR:15,DEX:15,CON:13,INT:10,WIS:16,CHA:8 },
    mods:{ STR:2,DEX:2,CON:1,INT:0,WIS:3,CHA:-1 },
    skills:{ Acrobatics:4,"Animal Handling":5,Arcana:0,Athletics:2,Deception:-1,History:0,Insight:3,Intimidation:-1,Investigation:0,Medicine:3,Nature:0,Perception:5,Performance:-1,Persuasion:-1,Religion:0,"Sleight of Hand":2,Stealth:6,Survival:5 },
    attacks:[
      { name:"Shortsword",atkBonus:4,damageDice:6,damageMod:2,type:"P/S",notes:"Finesse. Sneak Attack (1d6)." },
      { name:"Dagger",atkBonus:4,damageDice:4,damageMod:0,type:"Piercing",notes:"Bonus Action. Thrown 20/60ft." },
      { name:"Shortbow",atkBonus:4,damageDice:6,damageMod:2,type:"Piercing",notes:"Range 80/320ft." },
    ],
    features:["Sneak Attack (1d6)","Speech of Beast & Leaf","Hidden Step (1/rest)","Firbolg Magic (Detect Magic/Disguise Self 1/rest)","Thieves' Cant","Expertise: Stealth+6 & Perception+5"],
    inventory:["2× Shortsword","2× Dagger","Shortbow+20 arrows","Leather Armor","Thieves' Tools","Herbalism Kit"],
    backstory:"Cast out by his clan, Kaelen vanished into the mountains and became something predators respect — a ghost that moves without sound and strikes without warning.",
  },
  {
    id:"theron", name:"Theron Ashfeld", title:"The Iron Wall",
    race:"Human", class:"Fighter", level:1, background:"Soldier", alignment:"Lawful Good",
    portrait:"🛡️", difficulty:"Beginner",
    description:"A decorated veteran who never leaves a comrade behind. Dependable, courageous, impossible to put down.",
    hp:{ max:12,current:12 }, ac:16, initiative:1, speed:30, profBonus:2,
    stats:{ STR:16,DEX:13,CON:15,INT:10,WIS:12,CHA:10 },
    mods:{ STR:3,DEX:1,CON:2,INT:0,WIS:1,CHA:0 },
    skills:{ Acrobatics:1,"Animal Handling":1,Arcana:0,Athletics:5,Deception:0,History:0,Insight:1,Intimidation:2,Investigation:0,Medicine:1,Nature:0,Perception:3,Performance:0,Persuasion:0,Religion:0,"Sleight of Hand":1,Stealth:1,Survival:3 },
    attacks:[
      { name:"Longsword",atkBonus:5,damageDice:8,damageMod:3,type:"Slashing",notes:"Versatile (1d10 two-handed)." },
      { name:"Shield Bash",atkBonus:5,damageDice:4,damageMod:3,type:"Bludgeoning",notes:"Bonus shove attempt." },
      { name:"Javelin",atkBonus:5,damageDice:6,damageMod:3,type:"Piercing",notes:"Range 30/120ft." },
    ],
    features:["Fighting Style: Defense (+1 AC in armor)","Second Wind (1d10+1 HP, 1/rest)","Action Surge (extra action, 1/rest)","Military Rank"],
    inventory:["Longsword","Shield","Chain Mail","4× Javelin","Explorer's Pack","Medal of Honor"],
    backstory:"A soldier who served five years on the eastern front. Left his regiment to find a fight worth having — one where the enemy is clear and the cause is just.",
  },
  {
    id:"veyra", name:"Veyra Duskwhisper", title:"The Ashen Hand",
    race:"Tiefling", class:"Warlock", level:1, background:"Charlatan", alignment:"Chaotic Neutral",
    portrait:"🔮", difficulty:"Hard",
    description:"A smooth-talking devil-touched schemer. Her patron grants power she's still learning to control.",
    hp:{ max:8,current:8 }, ac:12, initiative:2, speed:30, profBonus:2,
    stats:{ STR:8,DEX:14,CON:13,INT:13,WIS:10,CHA:17 },
    mods:{ STR:-1,DEX:2,CON:1,INT:1,WIS:0,CHA:3 },
    skills:{ Acrobatics:2,"Animal Handling":0,Arcana:3,Athletics:-1,Deception:7,History:1,Insight:0,Intimidation:5,Investigation:1,Medicine:0,Nature:1,Perception:2,Performance:3,Persuasion:5,Religion:1,"Sleight of Hand":4,Stealth:2,Survival:0 },
    attacks:[
      { name:"Eldritch Blast",atkBonus:5,damageDice:10,damageMod:0,type:"Force",notes:"Range 120ft. Signature cantrip." },
      { name:"Dagger",atkBonus:4,damageDice:4,damageMod:2,type:"Piercing",notes:"Finesse. Thrown 20/60ft." },
    ],
    features:["Eldritch Blast cantrip","Pact Magic (1× Lv1 slot, recovers on short rest)","The Fiend: Dark One's Blessing (THP on kill)","Hellish Resistance (fire)","Infernal Legacy","False Identity"],
    inventory:["Dagger","Arcane Focus (obsidian pendant)","Leather Armor","Fine Clothes","Disguise Kit","50gp"],
    backstory:"Made a deal she didn't fully read in a moment of desperation. Now something ancient whispers in her dreams. She's decided the best response is to get rich and worry about the fine print later.",
  },
  {
    id:"bramwick", name:"Bramwick Stonebrew", title:"The Undying",
    race:"Dwarf", class:"Cleric", level:1, background:"Acolyte", alignment:"Neutral Good",
    portrait:"⚕️", difficulty:"Medium",
    description:"A gruff battlefield medic with power to both mend wounds and crack skulls.",
    hp:{ max:10,current:10 }, ac:16, initiative:0, speed:25, profBonus:2,
    stats:{ STR:14,DEX:10,CON:16,INT:11,WIS:17,CHA:10 },
    mods:{ STR:2,DEX:0,CON:3,INT:0,WIS:3,CHA:0 },
    skills:{ Acrobatics:0,"Animal Handling":3,Arcana:0,Athletics:2,Deception:0,History:2,Insight:5,Intimidation:0,Investigation:0,Medicine:5,Nature:0,Perception:3,Performance:0,Persuasion:0,Religion:4,"Sleight of Hand":0,Stealth:-2,Survival:3 },
    attacks:[
      { name:"Warhammer",atkBonus:4,damageDice:8,damageMod:2,type:"Bludgeoning",notes:"Versatile (1d10). Dwarven heirloom." },
      { name:"Sacred Flame",atkBonus:0,damageDice:8,damageMod:0,type:"Radiant",notes:"Cantrip. DEX save DC13 or 1d8 damage." },
      { name:"Toll the Dead",atkBonus:0,damageDice:8,damageMod:0,type:"Necrotic",notes:"Cantrip. 1d12 if target is wounded." },
    ],
    features:["Spellcasting (WIS DC13 +5)","Channel Divinity: Turn Undead (1/rest)","Channel Divinity: Preserve Life","Dwarven Resilience","Darkvision","Shelter of the Faithful"],
    inventory:["Warhammer","Shield","Chain Mail","Holy Symbol","Healer's Kit","Prayer Book","50gp"],
    backstory:"Twenty years as a combat medic taught Bramwick that Moradin values the living more than the dead. He now wanders doing what he does best: keeping people alive long enough to appreciate it.",
  },
  {
    id:"sylara", name:"Sylara Moonsong", title:"The Whispering Arrow",
    race:"Elf", class:"Ranger", level:1, background:"Outlander", alignment:"Chaotic Good",
    portrait:"🏹", difficulty:"Medium",
    description:"A deadly archer who moves through wilderness like a rumor. Speaks to animals more than people.",
    hp:{ max:10,current:10 }, ac:14, initiative:3, speed:30, profBonus:2,
    stats:{ STR:10,DEX:17,CON:13,INT:11,WIS:15,CHA:9 },
    mods:{ STR:0,DEX:3,CON:1,INT:0,WIS:2,CHA:-1 },
    skills:{ Acrobatics:3,"Animal Handling":4,Arcana:0,Athletics:2,Deception:-1,History:0,Insight:2,Intimidation:-1,Investigation:0,Medicine:2,Nature:4,Perception:6,Performance:-1,Persuasion:-1,Religion:0,"Sleight of Hand":3,Stealth:5,Survival:6 },
    attacks:[
      { name:"Longbow",atkBonus:5,damageDice:8,damageMod:3,type:"Piercing",notes:"Range 150/600ft. 40 arrows." },
      { name:"Shortsword",atkBonus:5,damageDice:6,damageMod:3,type:"Piercing",notes:"Finesse. Backup melee." },
      { name:"Shortsword (offhand)",atkBonus:5,damageDice:6,damageMod:0,type:"Piercing",notes:"Two-weapon bonus action." },
    ],
    features:["Favored Enemy: Undead","Natural Explorer: Forest","Fey Ancestry","Darkvision 60ft","Keen Senses","Wanderer (perfect terrain memory)"],
    inventory:["Longbow+40 arrows","2× Shortsword","Leather Armor","Explorer's Pack","Hunting Trap","Animal Trophy"],
    backstory:"Left her forest home when the treeline started dying from the inside out. She's been following the root of the corruption ever since.",
  },
  {
    id:"ozymandus", name:"Ozymandus Fell", title:"The Last Theory",
    race:"Gnome", class:"Wizard", level:1, background:"Sage", alignment:"Lawful Neutral",
    portrait:"📖", difficulty:"Hard",
    description:"A dangerously curious academic who treats every situation as a research opportunity — including ones trying to kill him.",
    hp:{ max:6,current:6 }, ac:11, initiative:1, speed:25, profBonus:2,
    stats:{ STR:7,DEX:12,CON:12,INT:17,WIS:13,CHA:11 },
    mods:{ STR:-2,DEX:1,CON:1,INT:3,WIS:1,CHA:0 },
    skills:{ Acrobatics:1,"Animal Handling":1,Arcana:7,Athletics:-2,Deception:0,History:7,Insight:3,Intimidation:0,Investigation:5,Medicine:3,Nature:3,Perception:1,Performance:0,Persuasion:2,Religion:5,"Sleight of Hand":1,Stealth:1,Survival:1 },
    attacks:[
      { name:"Fire Bolt",atkBonus:5,damageDice:10,damageMod:0,type:"Fire",notes:"Cantrip. Range 120ft." },
      { name:"Ray of Frost",atkBonus:5,damageDice:8,damageMod:0,type:"Cold",notes:"Cantrip. Range 60ft. Target speed -10ft." },
      { name:"Magic Missile",atkBonus:0,damageDice:4,damageMod:1,type:"Force",notes:"Lv1 spell. 3 auto-hit darts, 1d4+1 each." },
    ],
    features:["Spellcasting (INT DC13 +5)","Arcane Recovery (Lv1 slots on short rest)","Spellbook (10 spells)","Gnome Cunning (advantage vs magic)","Researcher"],
    inventory:["Spellbook","Component Pouch","Quarterstaff","Scholar's Pack","Ink & Quill","10gp"],
    backstory:"Was three papers from becoming the youngest Archmage in history when his research into pre-collapse civilization led somewhere the Academy called 'dangerous.' He calls it 'demonstrably correct.'",
  },
];

export function calcMod(score) { return Math.floor((score - 10) / 2); }

export function buildCharacterFromCustom(form) {
  const race = RACES[form.race] || {};
  const cls  = CLASSES[form.class] || {};
  const bg   = BACKGROUNDS[form.background] || {};

  const basePoints = { STR:8, DEX:8, CON:8, INT:8, WIS:8, CHA:8 };
  const stats = {};
  ["STR","DEX","CON","INT","WIS","CHA"].forEach(s => {
    stats[s] = (parseInt(form.stats?.[s]) || 8) + (race.stats?.[s] || 0);
  });

  const mods = {};
  Object.keys(stats).forEach(k => { mods[k] = calcMod(stats[k]); });

  const hitDie = cls.hitDie || 8;
  const maxHP  = hitDie + mods.CON;

  let ac = 10 + mods.DEX;
  if (["Fighter","Paladin","Cleric"].includes(form.class)) ac = 13 + mods.DEX;
  else if (["Rogue","Ranger","Bard","Druid","Warlock","Monk","Barbarian"].includes(form.class)) ac = 11 + mods.DEX;

  const profSkills = [...(bg.skills||[]), ...(form.selectedSkills||[])];
  const skillStatMap = {
    Acrobatics:"DEX","Animal Handling":"WIS",Arcana:"INT",Athletics:"STR",
    Deception:"CHA",History:"INT",Insight:"WIS",Intimidation:"CHA",
    Investigation:"INT",Medicine:"WIS",Nature:"INT",Perception:"WIS",
    Performance:"CHA",Persuasion:"CHA",Religion:"INT","Sleight of Hand":"DEX",
    Stealth:"DEX",Survival:"WIS",
  };
  const skills = {};
  Object.keys(skillStatMap).forEach(s => {
    skills[s] = (mods[skillStatMap[s]] || 0) + (profSkills.includes(s) ? 2 : 0);
  });

  const attacks = buildStartingAttacks(form.class, mods);

  return {
    id:"custom",
    name: form.name || "Adventurer",
    title: form.title || "",
    race: form.race, class: form.class, level:1,
    background: form.background, alignment: form.alignment,
    portrait:"⚔️", difficulty:"Custom",
    description:`A ${form.race} ${form.class} — ${form.alignment}`,
    hp:{ max:maxHP, current:maxHP }, ac, initiative:mods.DEX,
    speed: race.speed || 30, profBonus:2,
    stats, mods, skills, attacks,
    features:[...(cls.features||[]), ...(race.traits||[]), bg.feature ? `${form.background}: ${bg.feature}` : ""].filter(Boolean),
    inventory: buildStartingInventory(form.class),
    backstory: form.backstory || "",
  };
}

function buildStartingAttacks(className, mods) {
  const p = 2;
  const d = (n,dm,t,no) => [{ name:n, atkBonus:(mods.STR||0)+p, damageDice:dm, damageMod:mods.STR||0, type:t, notes:no }];
  const r = (n,dm,t,no) => [{ name:n, atkBonus:(mods.DEX||0)+p, damageDice:dm, damageMod:mods.DEX||0, type:t, notes:no }];
  const sp= (n,dm,stat,t,no) => [{ name:n, atkBonus:(mods[stat]||0)+p, damageDice:dm, damageMod:0, type:t, notes:no }];
  switch(className) {
    case "Fighter":  return d("Longsword",8,"Slashing","Versatile (1d10).");
    case "Barbarian":return d("Greataxe",12,"Slashing","Two-handed. Rage for +2 dmg.");
    case "Paladin":  return d("Longsword",8,"Slashing","Divine Smite on hit.");
    case "Rogue":    return r("Shortsword",6,"Piercing","Finesse. Sneak Attack (1d6).");
    case "Ranger":   return r("Longbow",8,"Piercing","Range 150/600ft.");
    case "Monk":     return r("Unarmed Strike",4,"Bludgeoning","Martial Arts. Bonus attack.");
    case "Bard":     return r("Rapier",8,"Piercing","Finesse. Bardic Inspiration.");
    case "Wizard":   return sp("Fire Bolt",10,"INT","Fire","Cantrip. 120ft range.");
    case "Sorcerer": return sp("Fire Bolt",10,"CHA","Fire","Cantrip. 120ft range.");
    case "Warlock":  return sp("Eldritch Blast",10,"CHA","Force","Cantrip. 120ft range.");
    case "Cleric":   return [...d("Warhammer",8,"Bludgeoning","Versatile (1d10)."), ...sp("Sacred Flame",8,"WIS","Radiant","Cantrip. DEX save.")];
    case "Druid":    return sp("Shillelagh",8,"WIS","Bludgeoning","Cantrip. Use WIS for attacks.");
    default:         return r("Dagger",4,"Piercing","Thrown 20/60ft.");
  }
}

function buildStartingInventory(className) {
  const c = ["Explorer's Pack","50gp"];
  switch(className) {
    case "Fighter":   return ["Longsword","Shield","Chain Mail","4× Javelin",...c];
    case "Rogue":     return ["Shortsword","2× Dagger","Shortbow+20 arrows","Leather Armor","Thieves' Tools",...c];
    case "Wizard":    return ["Spellbook","Quarterstaff","Component Pouch","Scholar's Pack","10gp"];
    case "Cleric":    return ["Warhammer","Shield","Chain Mail","Holy Symbol","Healer's Kit",...c];
    case "Ranger":    return ["Longbow+40 arrows","2× Shortsword","Leather Armor","Hunting Trap",...c];
    case "Warlock":   return ["Dagger","Arcane Focus","Leather Armor","Fine Clothes","50gp"];
    case "Barbarian": return ["Greataxe","2× Handaxe",...c];
    case "Paladin":   return ["Longsword","Shield","Chain Mail","Holy Symbol","Healer's Kit",...c];
    case "Bard":      return ["Rapier","Dagger","Leather Armor","Lute","Entertainer's Pack","50gp"];
    case "Druid":     return ["Quarterstaff","Wooden Shield","Leather Armor","Druidic Focus",...c];
    case "Monk":      return ["Shortsword","10× Dart",...c];
    case "Sorcerer":  return ["Dagger","Component Pouch","Arcane Focus","Scholar's Pack","50gp"];
    default:          return ["Dagger",...c];
  }
}
