import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readDatabase,validateDatabase} from '../scripts/validate-data.mjs';
import {catalogueRecords} from '../src/core.js';
import {heroTableHeaders,skillForSlot,sheetSkillText} from '../src/hero-catalogue.js';
const db=readDatabase();
const source=JSON.parse(readFileSync(new URL('../data/sources/hero-skills-2026-10-02.json',import.meta.url),'utf8'));

test('hero catalogue combines profession and faction and maps slots independently of screenshot order',()=>{
  assert.deepEqual(heroTableHeaders,['品質','名稱','職業／陣營','屬性','必殺技','2星解鎖技能','5星解鎖技能','天賦','六藝推薦']);
  const hero=db.heroes.find(h=>h.name==='李淳風'&&h.gameVersion==='tw');
  assert.equal(skillForSlot(db,hero,'star2').name,'言兆');
  assert.equal(skillForSlot(db,hero,'star5').name,'周算');
  assert.equal(skillForSlot(db,db.heroes.find(h=>h.id==='hero_huangama'),'ultimate').name,'罐罐發放日');
});
test('all supplied max-level skills retain evidence and Taiwan version without invented cooldowns',()=>{
  assert.equal(source.heroes.length,25);let count=0;
  for(const input of source.heroes){
    const hero=catalogueRecords(db,'heroes').find(h=>h.name===input.name);assert.equal(hero.gameVersion,'tw');
    for(const item of input.skills){const skill=skillForSlot(db,hero,item.slot);assert.equal(skill.name,item.name);assert.equal(skill.gameVersion,'tw');assert.equal(skill.levelContext,'max-level-preview');assert.equal(skill.cooldown,null);assert.equal(skill.screenshotFile,typeof item.file==='string'?item.file:`LINE_ALBUM_2026102_261002_${item.file}.jpg`);assert.ok(sheetSkillText(skill).includes('（滿級）'));count++;}
  }
  assert.equal(count,102);
  for(const hero of db.heroes.filter(h=>h.gameVersion==='tw'&&['地級','玄級'].includes(h.rarity)))assert.equal(hero.skillEvidence,undefined);
  assert.ok(skillForSlot(db,db.heroes.find(h=>h.id==='hero_qin_tw'),'entry'));
  assert.ok(skillForSlot(db,db.heroes.find(h=>h.id==='hero_wuzetian_tw'),'entry'));
});

test('Huangama keeps conditional max-level effects distinct from screenshot progress',()=>{
  const hero=db.heroes.find(h=>h.id==='hero_huangama');
  assert.equal(db.heroes.filter(h=>h.name==='黃阿瑪'&&h.gameVersion==='tw').length,1);
  assert.deepEqual(hero.screenshotProgress,{level:3000,power:45617,attack:55143,defense:43437,maxHp:130006,speed:455,management:14255});
  const ultimate=skillForSlot(db,hero,'ultimate'),shield=skillForSlot(db,hero,'star2'),destiny=skillForSlot(db,hero,'star5'),talent=skillForSlot(db,hero,'talent');
  assert.match(ultimate.description,/38%黃阿瑪攻擊力/);assert.match(ultimate.description,/15%暴擊率/);assert.match(ultimate.description,/提高30%/);assert.match(ultimate.description,/提高到25%/);
  assert.match(shield.description,/82%生命上限/);assert.match(shield.description,/護盾擊破時.*70%暴擊傷害.*4回合/);
  assert.match(destiny.description,/擁有護盾時.*傷害減少20%/);assert.match(destiny.description,/沒有護盾時.*傷害提高20%/);
  assert.equal(shield.unlockStars,2);assert.equal(destiny.unlockStars,5);
  assert.deepEqual(talent.talent,{buildingId:'building_hanlin_tw',efficiency:70,timeReduction:null});
  assert.equal(hero.buildingBonuses.length,0);assert.match(hero.researchTalents[0].description,/效率70%/);
  for(const skill of [ultimate,shield,destiny,talent]){assert.equal(skill.cooldown,null);assert.equal(skill.levelContext,'max-level-preview');assert.ok(readFileSync(new URL('../public/'+skill.image,import.meta.url)).length>0);}
});
test('talents preserve efficiency and only screenshot-provided time reductions',()=>{
  const hero=db.heroes.find(h=>h.id==='hero_qin_tw');const talent=skillForSlot(db,hero,'talent');
  assert.deepEqual(talent.talent,{buildingId:'building_imperial_tw',efficiency:70,timeReduction:280});
  const ayi=db.heroes.find(h=>h.id==='hero_ayi_tw');assert.equal(skillForSlot(db,ayi,'talent').talent.buildingId,'building_fishery_tw');assert.equal(skillForSlot(db,ayi,'talent').talent.timeReduction,null);
  const yang=db.heroes.find(h=>h.id==='hero_yang_tw');assert.equal(yang.researchTalents[0].buildingId,'building_hanlin_tw');assert.equal(yang.buildingBonuses.length,0);
  const broken=structuredClone(db);broken.skills.find(s=>s.id===talent.id).talent.buildingId='missing';assert.ok(validateDatabase(broken).some(e=>e.includes('missing buildings')));
});
test('new Taiwan records supersede CN catalogue entries without changing the CN source',()=>{
  for(const name of ['帥波','霍去病']){assert.equal(catalogueRecords(db,'heroes').find(h=>h.name===name).gameVersion,'tw');assert.ok(db.heroes.some(h=>h.name===name&&h.gameVersion==='cn'));}
  const hero=db.heroes.find(h=>h.id==='hero_huangyueying_tw');assert.equal(hero.attribute,'灼燒');assert.equal(hero.profession,'輔助');assert.ok(skillForSlot(db,hero,'ultimate').description.includes('82%'));assert.ok(db.skills.some(s=>s.id==='skill_yueying_1_tw'));
  const broken=structuredClone(db);broken.heroes.find(h=>h.id==='hero_qin_tw').skills.push(broken.heroes.find(h=>h.id==='hero_qin_tw').skills[0]);assert.ok(validateDatabase(broken).some(e=>e.includes('duplicate skill slot')));
});
