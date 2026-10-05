import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDatabase,validateDatabase} from '../scripts/validate-data.mjs';
import {heroQualities,catalogueRecords,compareHeroQuality,findById,filterHeroes,filterRecords,heroFiltersFromParams,compareSelection,detailTargetFromHash,searchDatabase,heroesForBuilding,recipesForIngredient,effectsForTeam,codeStatus,canCopyCode,upgradeRequirements,escapeHTML,safeURL} from '../src/core.js';

const real=readDatabase();const demo=readDatabase('data/mock');

test('catalogue prefers Taiwan entries before filtering and preserves version-specific detail references',()=>{
  for(const [key,count] of [['heroes',46],['buildings',22]]){
    const entries=catalogueRecords(real,key);assert.equal(entries.length,count);assert.equal(new Set(entries.map(r=>r.name)).size,count);
    const reversed=catalogueRecords({...real,[key]:[...real[key]].reverse()},key);
    for(const entry of real[key].filter(r=>r.gameVersion==='tw'))assert.equal(reversed.find(r=>r.name===entry.name).id,entry.id);
  }
  assert.deepEqual(searchDatabase(real,'婦好').filter(r=>r.key==='heroes').map(r=>r.record.id),['hero_fuhao_tw']);
  assert.equal(filterHeroes(real,{rarity:'聖級'}).some(r=>r.name==='婦好'),false);
  assert.equal(findById(real,'heroes','hero_fuhao').rarity,'聖級');
  assert.equal(findById(real,'heroes','hero_fuhao_tw').rarity,'天級');
  assert.equal(filterRecords(real,'buildings',new URLSearchParams('query=銀作局')).length,1);
  assert.deepEqual(filterHeroes(real,{version:'cn',query:'王昭君'}).map(r=>r.id),['hero_wangzhaojun']);
  assert.equal(catalogueRecords(demo,'heroes').length,demo.heroes.length);
});
test('quality order is stable within a tier and incomplete quality follows known tiers',()=>{
  assert.deepEqual(heroQualities,['聖','天','地','玄']);
  const input=[{id:'unknown',rarity:null},{id:'earth',rarity:'地級'},{id:'sky-first',rarity:'天級'},{id:'holy',rarity:'聖級'},{id:'dark',rarity:'玄級'},{id:'sky-second',rarity:'天級'}];
  assert.deepEqual([...input].sort(compareHeroQuality).map(r=>r.id),['holy','sky-first','sky-second','earth','dark','unknown']);
  assert.deepEqual(input.map(r=>r.id),['unknown','earth','sky-first','holy','dark','sky-second']);
});
test('hero quality permits only four real tiers and rare is restricted to heaven',()=>{
  const invalidTier=structuredClone(real);invalidTier.heroes[0].rarity='不存在的品質';assert.ok(validateDatabase(invalidTier).some(e=>e.includes('heroes:')&&e.includes('allowed values')));
  const invalidRare=structuredClone(real);invalidRare.heroes[0].rarity='聖級';invalidRare.heroes[0].rarityType='稀有';assert.ok(validateDatabase(invalidRare).some(e=>e.includes('heroes:')&&e.includes('constant')));
  assert.ok(real.heroes.filter(h=>h.rarityType==='稀有').every(h=>h.rarity==='天級'));
});
test('identical recommended teams merge their names and sources while old URLs still resolve',()=>{
  assert.equal(real.teams.filter(t=>t.gameVersion==='cn').length,6);const team=findById(real,'teams','team_wangzhaojun');assert.equal(team.id,'team_yang');assert.ok(team.aliases.includes('昭君輔助隊'));assert.ok(team.sources.some(s=>s.url.includes('836201191720357282')));
  assert.deepEqual(detailTargetFromHash(real,'#/teams/team_wangzhaojun'),{key:'teams',id:'team_wangzhaojun'});
  assert.deepEqual(searchDatabase(real,'昭君輔助隊').filter(r=>r.key==='teams').map(r=>r.record.id),['team_yang']);
  const duplicated=structuredClone(real);duplicated.teams.push({...structuredClone(team),id:'team_copy',name:'另一個名稱',legacyIds:[],heroIds:[...team.heroIds].reverse()});assert.ok(validateDatabase(duplicated).some(e=>e.includes('duplicate team composition')));
  const sameName=structuredClone(real);sameName.heroes.push({...structuredClone(real.heroes[0]),id:'hero_copy'});assert.ok(validateDatabase(sameName).some(e=>e.includes('duplicate name')));
  const collision=structuredClone(real);collision.teams[0].legacyIds=['team_jingke'];assert.ok(validateDatabase(collision).some(e=>e.includes('duplicate legacy id')));
});

test('catalogue multi-select combines choices while preserving ingredient search',()=>{
  const params=new URLSearchParams([['cuisine','川'],['cuisine','粵'],['query','牛肉']]);
  assert.deepEqual(filterRecords(real,'recipes',params).map(r=>r.name),['麻辣牛肉絲','乾炒牛河']);
  params.delete('query');assert.equal(filterRecords(real,'recipes',params).length,24);
  params.delete('cuisine');assert.equal(filterRecords(real,'recipes',params).length,60);
  assert.equal(filterRecords(real,'recipes',new URLSearchParams('cuisine=川&cuisine=粵&type=不存在')).length,0);
});
test('artifact multi-select intersects set membership with passive and inherited effects',()=>{
  const sets=real['artifact-sets'].slice(0,2),effect=sets[0].effectTags[0];
  const params=new URLSearchParams(sets.map(s=>['set',s.id]));params.append('effect',effect);
  const expected=['artifact_lotus_1_tw','artifact_lotus_2_tw','artifact_lotus_3_tw','artifact_lotus_4_tw','artifact_curios_2_tw','artifact_curios_3_tw'];
  assert.deepEqual(filterRecords(real,'artifacts',params).map(r=>r.id),expected);
  params.append('effect','不會出現的效果');assert.deepEqual(filterRecords(real,'artifacts',params).map(r=>r.id),expected);
});
test('screenshot artifact sets retain three distinct tiers and reciprocal members',()=>{
  assert.equal(real['artifact-sets'].length,28);assert.equal(real.artifacts.length,94);
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
  const withFormula=real.recipes.filter(r=>r.originalFormula!==null);assert.equal(withFormula.length,36);
  assert.deepEqual(withFormula.map(r=>r.catalogueNumber),Array.from({length:36},(_,i)=>i+1));
  assert.ok(real.recipes.every(r=>r.gameVersion==='tw'&&r.sourceType==='player'&&!r.verified&&r.ingredients.every(i=>i.amount===null)&&r.buildingId===null&&r.outputAmount===null&&r.craftTime===null));
  for(const recipe of withFormula)assert.deepEqual(recipe.ingredients.map(i=>i.providedName),recipe.originalFormula.split('+'));
  const tartare=real.recipes.find(r=>r.catalogueNumber===24);assert.equal(tartare.name,'涼拌生牛肉');assert.equal(tartare.originalFormula,'鮪魚（金槍魚）+鮭魚+南瓜');
  const eggRecipes=recipesForIngredient(real,'ingredient_egg_tw');assert.deepEqual(eggRecipes.map(r=>r.catalogueNumber),[26,33,36]);
  assert.ok(searchDatabase(real,'金槍魚').some(r=>r.key==='recipes'&&r.record.catalogueNumber===5));
  assert.ok(searchDatabase(real,'胡蘿蔔').some(r=>r.key==='recipes'&&r.record.catalogueNumber===27));
  const broken=structuredClone(real);broken.recipes[0].ingredients[0].ingredientId='missing';assert.ok(validateDatabase(broken).some(e=>e.includes('missing ingredients')));
});
test('recipe cuisines retain supplied levels, aliases and unknown new formulas',()=>{
  assert.equal(real.recipes.length,60);assert.equal(new Set(real.recipes.map(r=>r.name)).size,60);
  for(const cuisine of ['川','粵','湘','浙','特'])assert.equal(real.recipes.filter(r=>r.cuisine===cuisine).length,12);
  assert.equal(real.recipes.filter(r=>r.recipeLevel!==null).length,39);assert.equal(real.recipes.filter(r=>r.recipeLevel===null).length,21);
  const newRecipes=real.recipes.filter(r=>r.catalogueNumber===null);assert.equal(newRecipes.length,24);assert.ok(newRecipes.every(r=>r.ingredients.length===0&&r.originalFormula===null));
  assert.equal(real.recipes.find(r=>r.name==='乾炒牛河').id,'recipe_12_tw');assert.ok(!real.recipes.some(r=>r.name==='乾炒牛和'));
  const tofu=real.recipes.find(r=>r.name==='麻婆豆腐');assert.equal(tofu.id,'recipe_06_tw');assert.equal(tofu.originalFormula,'豆腐+乾辣椒');assert.ok(tofu.aliases.includes('麻辣豆腐'));
  assert.ok(searchDatabase(real,'水晶漢堡').some(r=>r.key==='recipes'&&r.record.name==='水晶餃'));
  assert.equal(real.recipes.find(r=>r.name==='白斬雞').recipeLevel,12);assert.equal(real.recipes.find(r=>r.name==='涼拌生牛肉').recipeLevel,8);assert.equal(real.recipes.find(r=>r.name==='牛肉火山').recipeLevel,20);
  assert.ok(real.recipes.every(r=>r.confirmations.some(c=>c.method==='player'&&c.fields.includes('cuisine'))));
});
test('drawer links resolve valid records across table categories without accepting unknown routes',()=>{
  assert.deepEqual(detailTargetFromHash(real,'#/artifact-sets'),{key:'artifact-sets',kind:'list',params:''});
  assert.deepEqual(detailTargetFromHash(real,'#/artifact-sets?effect=%E6%B8%9B%E5%82%B7'),{key:'artifact-sets',kind:'list',params:'effect=%E6%B8%9B%E5%82%B7'});
  assert.deepEqual(detailTargetFromHash(demo,'#/artifact-sets'),{key:'artifact-sets',kind:'list',params:''});
  for(const key of ['heroes','buildings','recipes','artifacts']){const id=real[key][0].id;assert.deepEqual(detailTargetFromHash(real,`#/${key}/${encodeURIComponent(id)}`),{key,id});}
  for(const skill of real.skills)assert.equal(detailTargetFromHash(real,`#/skills/${encodeURIComponent(skill.id)}`),null);
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
  assert.ok(searchDatabase(real,'太醫院').some(x=>x.key==='buildings'&&x.record.name==='太醫院'));
  assert.ok(!searchDatabase(real,'太醫院').some(x=>x.key==='heroes'&&x.record.id==='hero_wangzhaojun'));
  assert.ok(searchDatabase(real,'復活').some(x=>x.key==='heroes'&&x.record.name==='玄奘'));
  assert.ok(searchDatabase(demo,'農田').some(x=>x.key==='recipes'&&x.record.id==='demo_recipe'));
  assert.equal(searchDatabase(real,'').length,0);
});
test('hero filters combine without inventing attributes',()=>{
  const result=filterHeroes(real,{effect:'revive',role:'輔助',version:'cn'});assert.deepEqual(result.map(h=>h.name),['玄奘']);
  assert.deepEqual(filterHeroes(real,{version:'tw',rarity:'聖級'}).map(h=>h.name),['秦始皇','武則天']);
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
  const tw=filterHeroes(real,{version:'tw'});assert.equal(tw.length,46);assert.ok(tw.every(h=>h.skills.every(id=>real.skills.find(s=>s.id===id)?.gameVersion==='tw')));assert.ok(tw.filter(h=>!h.screenshotEvidence&&!h.skillEvidence&&h.id!=='hero_qingwan_tw').every(h=>h.attribute===null));
  const qingwan=tw.find(h=>h.id==='hero_qingwan_tw');assert.equal(qingwan.faction,'墨客');assert.equal(qingwan.attribute,'暴擊');assert.equal(qingwan.rarity,'地級');assert.equal(qingwan.skills.length,3);
  const yueying=tw.find(h=>h.id==='hero_huangyueying_tw');assert.equal(yueying.rarityType,'稀有');assert.equal(yueying.profession,'輔助');assert.equal(yueying.skills.length,4);
  const yang=tw.find(h=>h.name==='楊玉環');assert.equal(yang.rarity,'天級');assert.equal(yang.buildingBonuses.length,0);
  const huang=tw.find(h=>h.name==='黃阿瑪');assert.ok(huang.confirmations.some(c=>c.fields.includes('acquisition')));
  const taiji=real.buildings.find(b=>b.id==='building_taiji_tw');assert.equal(taiji.rewardConditions[0].level,5);assert.equal(taiji.rewardConditions[0].heroId,huang.id);
  const fish=real.artifacts.find(a=>a.name==='魚燈');assert.equal(fish.rarity,'御品');assert.ok(fish.confirmations.some(c=>c.fields.includes('rarity')));
  const broken=structuredClone(real);broken.stages[0].buildingIds.push('missing');assert.ok(validateDatabase(broken).some(e=>e.includes('missing buildings')));
});

test('profession and faction multi-select filters preserve repeated URL values and intersect groups',()=>{
  const params=new URLSearchParams('profession=輔助&profession=輸出&faction=文臣&faction=俠士&version=cn');
  const filters=heroFiltersFromParams(params);assert.deepEqual(filters.professions,['輔助','輸出']);assert.deepEqual(filters.factions,['文臣','俠士']);
  const results=filterHeroes(real,filters);assert.equal(results.length,6);assert.ok(results.every(h=>['輔助','輸出'].includes(h.profession)&&['文臣','俠士'].includes(h.faction)));
  assert.deepEqual(filterHeroes(real,{version:'tw',professions:['輔助'],factions:['武將']}).map(h=>h.name),['靈華']);
  assert.ok(filterHeroes(real,{factions:['unknown']}).every(h=>h.faction===null));
  assert.equal(filterHeroes(real,{professions:[],factions:[]}).length,catalogueRecords(real,'heroes').length);
});

test('comparison accepts three distinct heroes and rejects a fourth or missing records',()=>{
  const ids=real.heroes.slice(0,4).map(h=>h.id);
  assert.deepEqual(compareSelection(real,ids.slice(0,3)),ids.slice(0,3));
  assert.deepEqual(compareSelection(real,[ids[0],ids[0],'missing',ids[1]]),ids.slice(0,2));
  assert.throws(()=>compareSelection(real,ids),/最多選擇3位/);
});
test('rarity and attribute multi-select keep OR within groups and AND across groups',()=>{
  const params=new URLSearchParams('rarity=天級&rarity=聖級&attribute=驅散&attribute=護法・護甲・聖甲');
  const filters={...heroFiltersFromParams(params),version:'cn'};assert.deepEqual(filters.rarities,['天級','聖級']);assert.deepEqual(filters.attributes,['驅散','護法・護甲・聖甲']);
  assert.deepEqual(filterHeroes(real,filters).map(h=>h.id),['hero_yang','hero_wangzhaojun','hero_fuhao']);
  assert.deepEqual(filterHeroes(real,{...filters,professions:['坦克']}).map(h=>h.id),['hero_fuhao']);
  assert.equal(filterHeroes(real,{rarities:['unknown'],attributes:['增益']}).length,0);
  const unknown=filterHeroes({...real,heroes:[{...real.heroes[0],rarity:null,attribute:null}]},{rarities:['unknown'],attributes:['unknown']});assert.equal(unknown.length,1);assert.ok(unknown.every(h=>h.rarity===null&&h.attribute===null));
  assert.equal(filterHeroes(real,{rarities:[],attributes:[],professions:[],factions:[]}).length,catalogueRecords(real,'heroes').length);
  assert.deepEqual(filterHeroes(real,{version:'cn',rarity:'聖級',attribute:'護法・護甲・聖甲'}).map(h=>h.id),['hero_fuhao']);
});

test('profession is a single value and player-confirmed research is distinct from production bonuses',()=>{
  const huang=real.heroes.find(h=>h.id==='hero_huangama');assert.equal(huang.profession,'輔助');assert.equal(huang.faction,'文臣');assert.equal(huang.attribute,'暴擊');assert.equal(huang.sixArtsRecommendations[0].name,'鎏金');assert.equal(huang.researchTalents[0].buildingId,'building_hanlin_tw');assert.equal(huang.buildingBonuses.length,0);
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

test('artifact screenshot details separate fixed limits from account progress',()=>{
 const details=real.artifacts.filter(a=>a.screenshotProgress);assert.equal(details.length,94);assert.ok(details.every(a=>a.size&&a.passiveEffect&&a.effectiveLimit>0&&a.image));
 const bronze=details.find(a=>a.name==='青銅神樹');assert.equal(bronze.effectiveLimit,3);assert.equal(bronze.screenshotProgress.effectiveCount,0);assert.equal(bronze.rarity,'御品');
 const vase=details.find(a=>a.name==='魚形壺');assert.equal(vase.effectiveLimit,10);assert.ok(searchDatabase(real,'府邸物資').some(r=>r.record.id===vase.id));
 const broken=structuredClone(real);broken.artifacts.find(a=>a.name==='青銅神樹').screenshotProgress.effectiveCount=4;assert.ok(validateDatabase(broken).some(e=>e.includes('effective count exceeds limit')));
 const size=structuredClone(real);size.artifacts.find(a=>a.name==='魚燈').size='巨大';assert.ok(validateDatabase(size).some(e=>e.includes('size')));
 assert.ok(real.artifacts.filter(a=>!a.screenshotProgress).every(a=>!a.passiveEffect&&!a.effectiveLimit));
});

test('new artifact catalogue previews retain their full-star context and screenshot values',()=>{
 const previews=real.artifacts.filter(a=>a.screenshotProgress?.context==='max-star-preview');assert.equal(previews.length,52);
 const box=previews.find(a=>a.name==='紙箱派對');assert.equal(box.effectiveLimit,25);assert.equal(box.size,'中');assert.equal(box.screenshotProgress.effectiveCount,0);assert.deepEqual(box.setIds,[]);
 const bells=previews.find(a=>a.name==='編鐘樂隊');assert.equal(bells.effectiveLimit,7);assert.ok(bells.passiveEffect.includes('10.7%'));assert.equal(bells.setIds[0],'artifact_set_ceremony_tw');
 const grass=previews.find(a=>a.name==='草坪');assert.equal(grass.rarity,'良品');assert.ok(grass.passiveEffect.includes('0.85%'));
 const fish=real.artifacts.find(a=>a.name==='魚燈');assert.notEqual(fish.screenshotProgress.context,'max-star-preview');assert.equal(fish.effectiveLimit,5);
 const invalid=structuredClone(real);invalid.artifacts.find(a=>a.id===box.id).screenshotProgress.context='guessed';assert.ok(validateDatabase(invalid).some(e=>e.includes('context')));
});

test('Taiwan hero screenshots keep account values separate and support emperor and shield roles',()=>{
 const imported=real.heroes.filter(h=>h.screenshotEvidence);assert.equal(imported.length,43);
 assert.ok(imported.every(h=>h.gameVersion==='tw'&&h.imageType==='cutout'&&h.sourceType==='observation'));
 assert.equal(real.heroes.find(h=>h.name==='蒼髥大臣').profession,'輔助');
 assert.deepEqual(filterHeroes(real,{version:'tw',factions:['帝王']}).map(h=>h.name),['秦始皇','武則天']);
 assert.ok(filterHeroes(real,{version:'tw',professions:['肉盾']}).some(h=>h.name==='婦好'&&h.rarity==='天級'));
 const wu=real.heroes.find(h=>h.id==='hero_wuzetian_tw');assert.equal(wu.screenshotProgress.level,3000);assert.equal(wu.screenshotProgress.attack,48317);assert.equal(wu.attribute,'回怒');
 const bad=structuredClone(real);bad.heroes.find(h=>h.id===wu.id).screenshotProgress.level=-1;assert.ok(validateDatabase(bad).some(e=>e.includes('screenshotProgress')));
});
