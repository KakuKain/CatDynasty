export const collectionKeys = ['heroes','skills','skill-effects','buildings','building-levels','recipes','ingredients','artifacts','artifact-levels','artifact-sets','furniture','furniture-sets','redeem-codes','stages','teams'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const safeURL = value => {
  try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
};
export const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
export const findById = (db,key,id) => (db[key] || []).find(item => item.id === id || item.legacyIds?.includes(id));
// Keep version-specific records intact; catalogue entries prefer the Taiwan record.
export function catalogueRecords(db,key) {
  const records=db[key]||[];
  if(!['heroes','buildings'].includes(key))return records;
  const preferred=new Map(),priority={tw:0,cn:1,unknown:2,mock:3};
  for(const record of records){
    const name=normalize(record.name),current=preferred.get(name);
    if(!current||(priority[record.gameVersion]??4)<(priority[current.gameVersion]??4))preferred.set(name,record);
  }
  return records.filter(record=>preferred.get(normalize(record.name))===record);
}
export const heroQualities=['聖','天','地','玄'];
export function compareHeroQuality(a,b) {
  const rank=record=>{if(!record.rarity)return heroQualities.length+1;const index=heroQualities.indexOf(record.rarity.replace(/級$/,''));return index<0?heroQualities.length:index;};
  return rank(a)-rank(b);
}
export function detailTargetFromHash(db,hash) {
  if(typeof hash!=='string'||!hash.startsWith('#/'))return null;
  const aliases={guides:'stages',codes:'redeem-codes'};
  const allowed=['heroes','skill-effects','buildings','recipes','ingredients','artifacts','artifact-sets','furniture','furniture-sets','teams','stages','redeem-codes'];
  try {
    const url=new URL(hash.slice(1),'https://wiki.local');
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts.length===1&&parts[0]==='artifact-sets')return {key:'artifact-sets',kind:'list',params:url.searchParams.toString()};
    if(parts.length!==2)return null;
    const key=aliases[parts[0]]||parts[0],id=decodeURIComponent(parts[1]);
    if(!allowed.includes(key)||!findById(db,key,id))return null;
    return {key,id};
  } catch {return null;}
}
export const heroesForBuilding = (db,id) => (db.heroes || []).filter(hero => hero.buildingBonuses.some(b => b.buildingId === id));
export const recipesForIngredient = (db,id) => (db.recipes || []).filter(recipe => recipe.ingredients.some(i => i.ingredientId === id));
export const effectIdsForHero = (db,hero) => [...new Set(hero.skills.flatMap(id => findById(db,'skills',id)?.effects.map(e=>e.type) || []))];
export const effectsForTeam = (db,heroIds) => [...new Set(heroIds.flatMap(id => {const hero=findById(db,'heroes',id);return hero ? effectIdsForHero(db,hero):[];}))];
export function searchDatabase(db, query) {
  const q=normalize(query); if(!q)return [];
  const searchable=['heroes','skills','skill-effects','buildings','recipes','ingredients','artifacts','artifact-sets','furniture','furniture-sets','redeem-codes','stages','teams'];
  return searchable.flatMap(key=>catalogueRecords(db,key).map(record=>{
    const related=[];
    if(key==='heroes'){
      related.push(...record.skills.map(id=>findById(db,'skills',id)),...record.buildingBonuses.map(b=>findById(db,'buildings',b.buildingId)),...effectIdsForHero(db,record).map(id=>findById(db,'skill-effects',id)));
    }
    if(key==='buildings')related.push(...heroesForBuilding(db,record.id),...record.production.map(id=>findById(db,'ingredients',id)));
    if(key==='recipes')related.push(findById(db,'buildings',record.buildingId),...record.ingredients.map(i=>findById(db,'ingredients',i.ingredientId)),...record.ingredients.flatMap(i=>findById(db,'ingredients',i.ingredientId)?.obtainedFrom.map(id=>findById(db,'buildings',id))||[]));
    if(key==='ingredients')related.push(...recipesForIngredient(db,record.id),...record.obtainedFrom.map(id=>findById(db,'buildings',id)));
    if(key==='artifacts')related.push(...(record.heroIds||[]).map(id=>findById(db,'heroes',id)),...(record.teamIds||[]).map(id=>findById(db,'teams',id)),...(record.setIds||[]).map(id=>findById(db,'artifact-sets',id)),...(record.effectTags||[]));
    if(key==='artifact-sets')related.push(...record.artifactIds.map(id=>findById(db,'artifacts',id)));
    if(key==='furniture')related.push(findById(db,'furniture-sets',record.setId),...(record.buildingIds||[]).map(id=>findById(db,'buildings',id)));
    if(key==='teams')related.push(...record.heroIds.map(id=>findById(db,'heroes',id)));
    if(key==='stages')related.push(...(record.heroIds||[]).map(id=>findById(db,'heroes',id)));
    const own=normalize(JSON.stringify(record));const rel=normalize(JSON.stringify(related));
    if(!own.includes(q)&&!rel.includes(q))return null;
    const name=normalize(record.name||record.code);const score=name===q?3:name.includes(q)?2:own.includes(q)?1:0;
    return {key,record,related:!own.includes(q),score};
  }).filter(Boolean)).sort((a,b)=>b.score-a.score);
}
export const heroProfessions=['輸出','肉盾','輔助'];
export function filterRecords(db,key,params) {
  const query=params.get('query')||'';
  const hits=query?new Set(searchDatabase(db,query).filter(r=>r.key===key).map(r=>r.record.id)):null;
  const choices=name=>params.getAll(name).filter(Boolean);
  const types=choices('type'),cuisines=choices('cuisine'),effects=choices('effect'),sets=choices('set'),statuses=choices('status');
  return catalogueRecords(db,key).filter(record=>(!hits||hits.has(record.id))
    &&(!types.length||types.includes(record.type))
    &&(!cuisines.length||cuisines.includes(record.cuisine))
    &&(!effects.length||effects.some(effect=>record.effectTags?.includes(effect)||(record.setIds||[]).some(id=>findById(db,'artifact-sets',id)?.effectTags?.includes(effect))))
    &&(!sets.length||sets.some(id=>(record.setIds||[]).includes(id)))
    &&(!statuses.length||statuses.includes(codeStatus(record))));
}
export const heroFactions=['武將','文臣','俠士','墨客','帝王'];
export function heroFiltersFromParams(params) {
  return {...Object.fromEntries(params),rarities:params.getAll('rarity'),attributes:params.getAll('attribute'),professions:params.getAll('profession'),factions:params.getAll('faction')};
}
export function filterHeroes(db,{query='',rarity='',role='',effect='',version='',attribute='',rarities=[],attributes=[],professions=[],factions=[]}={}) {
  const queryDB=version?{...db,heroes:(db.heroes||[]).filter(h=>h.gameVersion===version)}:db;
  const queryIds=query?new Set(searchDatabase(queryDB,query).filter(r=>r.key==='heroes').map(r=>r.record.id)):null;
  const rarityChoices=rarities.length?rarities:rarity?[rarity]:[],attributeChoices=attributes.length?attributes:attribute?[attribute]:[];
  return (version?(db.heroes||[]):catalogueRecords(db,'heroes')).filter(hero=>(!queryIds||queryIds.has(hero.id))&&(!rarityChoices.length||rarityChoices.some(r=>r==='unknown'?!hero.rarity:hero.rarity===r))&&(!role||hero.role.includes(role))&&(!effect||effectIdsForHero(db,hero).includes(effect))&&(!version||hero.gameVersion===version)&&(!attributeChoices.length||attributeChoices.some(a=>a==='unknown'?!hero.attribute:hero.attribute===a))&&(!professions.length||professions.some(p=>p==='unknown'?!hero.profession:hero.profession===p))&&(!factions.length||factions.some(f=>f==='unknown'?!hero.faction:hero.faction===f)));
}
export function compareSelection(db,values,limit=3) {
  const ids=[...new Set(values)].filter(id=>findById(db,'heroes',id));
  if(ids.length>limit)throw new Error(`最多選擇${limit}位喵將。`);
  return ids;
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
