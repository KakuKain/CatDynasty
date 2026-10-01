export const collectionKeys = ['heroes','skills','skill-effects','buildings','building-levels','recipes','ingredients','artifacts','artifact-levels','furniture','furniture-sets','redeem-codes','stages','teams'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const safeURL = value => {
  try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
};
export const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
export const findById = (db,key,id) => (db[key] || []).find(item => item.id === id);
export const heroesForBuilding = (db,id) => (db.heroes || []).filter(hero => hero.buildingBonuses.some(b => b.buildingId === id));
export const recipesForIngredient = (db,id) => (db.recipes || []).filter(recipe => recipe.ingredients.some(i => i.ingredientId === id));
export const effectIdsForHero = (db,hero) => [...new Set(hero.skills.flatMap(id => findById(db,'skills',id)?.effects.map(e=>e.type) || []))];
export const effectsForTeam = (db,heroIds) => [...new Set(heroIds.flatMap(id => {const hero=findById(db,'heroes',id);return hero ? effectIdsForHero(db,hero):[];}))];
export function searchDatabase(db, query) {
  const q=normalize(query); if(!q)return [];
  const searchable=['heroes','skills','skill-effects','buildings','recipes','ingredients','artifacts','furniture','furniture-sets','redeem-codes','stages','teams'];
  return searchable.flatMap(key=>(db[key]||[]).map(record=>{
    const related=[];
    if(key==='heroes'){
      related.push(...record.skills.map(id=>findById(db,'skills',id)),...record.buildingBonuses.map(b=>findById(db,'buildings',b.buildingId)),...effectIdsForHero(db,record).map(id=>findById(db,'skill-effects',id)));
    }
    if(key==='buildings')related.push(...heroesForBuilding(db,record.id),...record.production.map(id=>findById(db,'ingredients',id)));
    if(key==='recipes')related.push(findById(db,'buildings',record.buildingId),...record.ingredients.map(i=>findById(db,'ingredients',i.ingredientId)),...record.ingredients.flatMap(i=>findById(db,'ingredients',i.ingredientId)?.obtainedFrom.map(id=>findById(db,'buildings',id))||[]));
    if(key==='ingredients')related.push(...recipesForIngredient(db,record.id),...record.obtainedFrom.map(id=>findById(db,'buildings',id)));
    if(key==='artifacts')related.push(...(record.heroIds||[]).map(id=>findById(db,'heroes',id)),...(record.teamIds||[]).map(id=>findById(db,'teams',id)),...(record.effectTags||[]));
    if(key==='furniture')related.push(findById(db,'furniture-sets',record.setId),...(record.buildingIds||[]).map(id=>findById(db,'buildings',id)));
    if(key==='teams')related.push(...record.heroIds.map(id=>findById(db,'heroes',id)));
    if(key==='stages')related.push(...(record.heroIds||[]).map(id=>findById(db,'heroes',id)));
    const own=normalize(JSON.stringify(record));const rel=normalize(JSON.stringify(related));
    if(!own.includes(q)&&!rel.includes(q))return null;
    const name=normalize(record.name||record.code);const score=name===q?3:name.includes(q)?2:own.includes(q)?1:0;
    return {key,record,related:!own.includes(q),score};
  }).filter(Boolean)).sort((a,b)=>b.score-a.score);
}
export function filterHeroes(db,{query='',rarity='',role='',effect='',version=''}={}) {
  const queryIds=query?new Set(searchDatabase(db,query).filter(r=>r.key==='heroes').map(r=>r.record.id)):null;
  return (db.heroes||[]).filter(hero=>(!queryIds||queryIds.has(hero.id))&&(!rarity||hero.rarity===rarity)&&(!role||hero.role.includes(role))&&(!effect||effectIdsForHero(db,hero).includes(effect))&&(!version||hero.gameVersion===version));
}
export function codeStatus(code,today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'})) {
  if(code.status==='expired'||(code.endDate&&code.endDate<today))return 'expired';
  if(code.startDate&&code.startDate>today)return 'upcoming';
  if(code.status==='active'&&code.verified&&code.lastTestedAt)return 'active';
  return 'unverified';
}
export function canCopyCode(code,{demo=false,today}={}) {
  return Boolean(code)&&!demo&&code.gameVersion!=='mock'&&['active','unverified'].includes(codeStatus(code,today));
}
export function upgradeRequirements(db,buildingId,from,to) {
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<=from||to>1000)throw new Error('請輸入有效的起始與目標等級。');
  const levels=[];const missing=[];
  for(let level=from+1;level<=to;level++){
    const entry=(db['building-levels']||[]).find(x=>x.buildingId===buildingId&&x.level===level);
    if(!entry)missing.push(level);else levels.push(entry);
  }
  const resources=new Map();let buildTime=0;let unknownTime=missing.length>0;
  levels.forEach(entry=>{entry.requirements.resources.forEach(r=>resources.set(r.id,(resources.get(r.id)||0)+r.amount));if(entry.buildTime===null)unknownTime=true;else buildTime+=entry.buildTime;});
  return {levels,missing,resources:[...resources].map(([id,amount])=>({id,amount})),buildTime:unknownTime?null:buildTime,complete:missing.length===0};
}
