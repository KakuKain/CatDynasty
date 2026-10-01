import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDatabase,validateDatabase} from '../scripts/validate-data.mjs';
import {filterHeroes,heroFiltersFromParams,compareSelection,detailTargetFromHash,searchDatabase,heroesForBuilding,recipesForIngredient,effectsForTeam,codeStatus,canCopyCode,upgradeRequirements,escapeHTML,safeURL} from '../src/core.js';

const real=readDatabase();const demo=readDatabase('data/mock');
test('screenshot artifact sets retain three distinct tiers and reciprocal members',()=>{
  assert.equal(real['artifact-sets'].length,28);assert.equal(real.artifacts.length,92);
  for(const set of real['artifact-sets']){assert.deepEqual(set.bonuses.map(b=>b.stars),[null,9,18]);assert.ok(set.screenshotFiles.length);assert.ok(set.artifactIds.every(id=>real.artifacts.find(a=>a.id===id)?.setIds.includes(set.id)));}
  const water=real['artifact-sets'].find(s=>s.name==='水韻古珍');assert.deepEqual(water.bonuses.map(b=>b.effects[0].value),[2.2,6.6,13.2]);assert.ok(water.bonuses.every(b=>b.effects[0].unit==='percent'));
  const trees=real['artifact-sets'].find(s=>s.name==='碧樹逢生');assert.deepEqual(trees.bonuses.map(b=>b.effects[0].value),[15,45,90]);assert.ok(trees.bonuses.every(b=>b.effects[0].unit==='flat'));
  assert.equal(real.artifacts.find(a=>a.name==='魚燈').setIds[0],'artifact_set_lights_tw');assert.equal(real.artifacts.find(a=>a.name==='阿瑪出巡記').rarity,'御品');
  assert.ok(real.artifacts.filter(a=>a.sourceType==='observation').every(a=>a.effects.length===0));
  assert.ok(searchDatabase(real,'減傷').some(r=>r.key==='artifacts'&&r.record.name==='獸形匜'));
  const setId=water.id;assert.deepEqual(detailTargetFromHash(real,`#/artifact-sets/${setId}`),{key:'artifact-sets',id:setId});
});
test('artifact set validation rejects broken reverse relations and preserves confirmed fishery target',()=>{
  const broken=structuredClone(real);broken.artifacts.find(a=>a.name==='魚燈').setIds=[];assert.ok(validateDatabase(broken).some(e=>e.includes('reverse artifact relation missing')));
  const missing=structuredClone(real);missing['artifact-sets'][0].artifactIds.push('missing');assert.ok(validateDatabase(missing).some(e=>e.includes('missing artifacts')));
  const bodhi=real['artifact-sets'].find(s=>s.name==='一葉菩提');assert.ok(bodhi.bonuses.every(b=>b.target==='魚肆局'&&b.effects[0].buildingId==='building_fishery_tw'));assert.equal(real.buildings.find(b=>b.id==='building_fishery_tw').name,'魚肆局');
});
test('player recipe list preserves all 36 formulas, corrected name and unknown quantities',()=>{
  assert.equal(real.recipes.length,36);
  assert.deepEqual(real.recipes.map(r=>r.catalogueNumber),Array.from({length:36},(_,i)=>i+1));
  assert.ok(real.recipes.every(r=>r.gameVersion==='tw'&&r.sourceType==='player'&&!r.verified&&r.ingredients.every(i=>i.amount===null)&&r.cuisine===null&&r.recipeLevel===null&&r.buildingId===null&&r.outputAmount===null&&r.craftTime===null));
  for(const recipe of real.recipes)assert.deepEqual(recipe.ingredients.map(i=>i.providedName),recipe.originalFormula.split('+'));
  const tartare=real.recipes.find(r=>r.catalogueNumber===24);assert.equal(tartare.name,'涼拌生牛肉');assert.equal(tartare.originalFormula,'鮪魚（金槍魚）+鮭魚+南瓜');
  const eggRecipes=recipesForIngredient(real,'ingredient_egg_tw');assert.deepEqual(eggRecipes.map(r=>r.catalogueNumber),[26,33,36]);
  assert.ok(searchDatabase(real,'金槍魚').some(r=>r.key==='recipes'&&r.record.catalogueNumber===5));
  assert.ok(searchDatabase(real,'胡蘿蔔').some(r=>r.key==='recipes'&&r.record.catalogueNumber===27));
  const broken=structuredClone(real);broken.recipes[0].ingredients[0].ingredientId='missing';assert.ok(validateDatabase(broken).some(e=>e.includes('missing ingredients')));
});
test('drawer links resolve valid records across table categories without accepting unknown routes',()=>{
  for(const key of ['heroes','buildings','recipes','artifacts','skills']){const id=real[key][0].id;assert.deepEqual(detailTargetFromHash(real,`#/${key}/${encodeURIComponent(id)}`),{key,id});}
  const furnitureId=demo.furniture[0].id;assert.deepEqual(detailTargetFromHash(demo,`#/furniture/${furnitureId}`),{key:'furniture',id:furnitureId});
  assert.deepEqual(detailTargetFromHash(real,`#/guides/${real.stages[0].id}`),{key:'stages',id:real.stages[0].id});
  assert.equal(detailTargetFromHash(real,'#/heroes?profession=輔助'),null);
  assert.equal(detailTargetFromHash(real,'#/recipes/missing'),null);
  assert.equal(detailTargetFromHash(real,'#/heroes/%E0%A4%A'),null);
  assert.equal(detailTargetFromHash(real,'https://example.com/#/heroes/hero_huangama'),null);
  assert.equal(detailTargetFromHash(real,'#/team-builder'),null);
});
test('real and demo data validate, with provenance and referential integrity',()=>{
  assert.deepEqual(validateDatabase(real),[]);assert.deepEqual(validateDatabase(demo,{demo:true}),[]);
});
test('invalid relation and mixed demo data are rejected',()=>{
  const broken=structuredClone(real);broken.heroes[0].skills.push('missing');assert.ok(validateDatabase(broken).some(x=>x.includes('missing skills')));
  broken.heroes[0].gameVersion='mock';assert.ok(validateDatabase(broken).some(x=>x.includes('demo record in real')));
});
test('search crosses hero, skill effect and building relations',()=>{
  assert.ok(searchDatabase(real,'太醫院').some(x=>x.key==='heroes'&&x.record.name==='王昭君'));
  assert.ok(searchDatabase(real,'復活').some(x=>x.key==='heroes'&&x.record.name==='玄奘'));
  assert.ok(searchDatabase(demo,'農田').some(x=>x.key==='recipes'&&x.record.id==='demo_recipe'));
  assert.equal(searchDatabase(real,'').length,0);
});
test('hero filters combine without inventing attributes',()=>{
  const result=filterHeroes(real,{effect:'revive',role:'輔助',version:'cn'});assert.deepEqual(result.map(h=>h.name),['玄奘']);
  assert.equal(filterHeroes(real,{version:'tw',rarity:'聖級'}).length,0);
});
test('building and recipe reverse lookups preserve declared relationships',()=>{
  assert.ok(heroesForBuilding(real,'building_silver').some(x=>x.name==='楊玉環'));
  assert.deepEqual(recipesForIngredient(demo,'demo_rice').map(x=>x.id),['demo_recipe']);
});
test('team effects are deduplicated and incomplete heroes remain unknown',()=>{
  const effects=effectsForTeam(real,['hero_yang','hero_wangzhaojun','hero_zhuge']);assert.equal(effects.filter(x=>x==='heal').length,1);assert.ok(effects.includes('dispel'));
  assert.deepEqual(effectsForTeam(real,['hero_zhuge']),[]);
});
test('expired and untested codes are never counted as active',()=>{
  assert.equal(codeStatus({status:'active',verified:true,lastTestedAt:'2026-09-01',endDate:'2026-09-30'},'2026-10-01'),'expired');
  assert.equal(codeStatus({status:'active',verified:false,lastTestedAt:null},'2026-10-01'),'unverified');
  assert.equal(codeStatus({status:'active',verified:true,lastTestedAt:'2026-10-01',startDate:'2026-10-02'},'2026-10-01'),'upcoming');
});

test('community codes remain unverified and expiry gates copying at the date boundary',()=>{
  assert.equal(real['redeem-codes'].length,12);
  assert.ok(real['redeem-codes'].every(c=>!c.verified&&!c.lastTestedAt&&codeStatus(c,'2026-10-01')==='unverified'));
  const due=real['redeem-codes'].filter(c=>c.endDate==='2026-10-01');assert.equal(due.length,4);
  assert.ok(due.every(c=>canCopyCode(c,{today:'2026-10-01'})&&!canCopyCode(c,{today:'2026-10-02'})));
  assert.equal(canCopyCode(real['redeem-codes'][0],{demo:true}),false);
  assert.equal(canCopyCode(demo['redeem-codes'][0]),false);
  assert.equal(canCopyCode({...real['redeem-codes'][0],startDate:'2026-10-02'},{today:'2026-10-01'}),false);
});

test('TW records keep CN attributes separate and preserve field-specific player confirmations',()=>{
  const tw=filterHeroes(real,{version:'tw'});assert.equal(tw.length,11);assert.ok(tw.every(h=>h.skills.length===0));assert.ok(tw.filter(h=>h.id!=='hero_huangama').every(h=>h.attribute===null));
  const yang=tw.find(h=>h.name==='楊玉環');assert.equal(yang.rarity,null);assert.equal(yang.buildingBonuses.length,0);
  const huang=tw.find(h=>h.name==='黃阿瑪');assert.ok(huang.confirmations.some(c=>c.fields.includes('acquisition')));
  const taiji=real.buildings.find(b=>b.id==='building_taiji_tw');assert.equal(taiji.rewardConditions[0].level,5);assert.equal(taiji.rewardConditions[0].heroId,huang.id);
  const fish=real.artifacts.find(a=>a.name==='魚燈');assert.equal(fish.rarity,'御品');assert.ok(fish.confirmations.some(c=>c.fields.includes('rarity')));
  const broken=structuredClone(real);broken.stages[0].buildingIds.push('missing');assert.ok(validateDatabase(broken).some(e=>e.includes('missing buildings')));
});

test('profession and faction multi-select filters preserve repeated URL values and intersect groups',()=>{
  const params=new URLSearchParams('profession=輔助&profession=輸出&faction=文臣&faction=俠士&version=cn');
  const filters=heroFiltersFromParams(params);assert.deepEqual(filters.professions,['輔助','輸出']);assert.deepEqual(filters.factions,['文臣','俠士']);
  const results=filterHeroes(real,filters);assert.equal(results.length,6);assert.ok(results.every(h=>['輔助','輸出'].includes(h.profession)&&['文臣','俠士'].includes(h.faction)));
  assert.equal(filterHeroes(real,{professions:['輔助'],factions:['武將']}).length,0);
  assert.ok(filterHeroes(real,{factions:['unknown']}).every(h=>h.faction===null));
  assert.equal(filterHeroes(real,{professions:[],factions:[]}).length,real.heroes.length);
});

test('comparison accepts three distinct heroes and rejects a fourth or missing records',()=>{
  const ids=real.heroes.slice(0,4).map(h=>h.id);
  assert.deepEqual(compareSelection(real,ids.slice(0,3)),ids.slice(0,3));
  assert.deepEqual(compareSelection(real,[ids[0],ids[0],'missing',ids[1]]),ids.slice(0,2));
  assert.throws(()=>compareSelection(real,ids),/最多選擇3位/);
});

test('profession is a single value and player-confirmed research is distinct from production bonuses',()=>{
  const huang=real.heroes.find(h=>h.id==='hero_huangama');assert.equal(huang.profession,'輔助');assert.equal(huang.faction,'文臣');assert.equal(huang.attribute,'增益');assert.equal(huang.sixArtsRecommendations[0].name,'鎏金');assert.equal(huang.researchTalents[0].buildingId,'building_hanlin_tw');assert.equal(huang.buildingBonuses.length,0);
  const broken=structuredClone(real);broken.heroes[0].profession=['輔助','輸出'];assert.ok(validateDatabase(broken).some(e=>e.includes('profession')));
  const missing=structuredClone(real);missing.heroes[0].researchTalents[0].buildingId='missing';assert.ok(validateDatabase(missing).some(e=>e.includes('missing buildings')));
});
test('upgrade calculator reports missing levels instead of returning a false zero',()=>{
  const known=upgradeRequirements(demo,'demo_kitchen',0,2);assert.equal(known.complete,true);assert.equal(known.resources[0].amount,20);
  const missing=upgradeRequirements(real,'building_silver',0,3);assert.deepEqual(missing.missing,[1,2,3]);assert.equal(missing.buildTime,null);assert.equal(missing.complete,false);
  assert.throws(()=>upgradeRequirements(real,'building_silver',2,1));
});
test('external content is escaped and unsafe source URLs are rejected',()=>{
  assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');assert.equal(safeURL('javascript:alert(1)'),null);assert.equal(safeURL('https://example.com'),'https://example.com/');
});
