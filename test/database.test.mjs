import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDatabase,validateDatabase} from '../scripts/validate-data.mjs';
import {filterHeroes,searchDatabase,heroesForBuilding,recipesForIngredient,effectsForTeam,codeStatus,upgradeRequirements,escapeHTML,safeURL} from '../src/core.js';

const real=readDatabase();const demo=readDatabase('data/mock');
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
test('upgrade calculator reports missing levels instead of returning a false zero',()=>{
  const known=upgradeRequirements(demo,'demo_kitchen',0,2);assert.equal(known.complete,true);assert.equal(known.resources[0].amount,20);
  const missing=upgradeRequirements(real,'building_silver',0,3);assert.deepEqual(missing.missing,[1,2,3]);assert.equal(missing.buildTime,null);assert.equal(missing.complete,false);
  assert.throws(()=>upgradeRequirements(real,'building_silver',2,1));
});
test('external content is escaped and unsafe source URLs are rejected',()=>{
  assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');assert.equal(safeURL('javascript:alert(1)'),null);assert.equal(safeURL('https://example.com'),'https://example.com/');
});
