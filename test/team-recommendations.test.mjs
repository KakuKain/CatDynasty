import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDatabase,validateDatabase} from '../scripts/validate-data.mjs';
import {filterRecords,escapeHTML} from '../src/core.js';
import {teamStatusLabel,teamRecommendationDetails,teamEffectIds} from '../src/team-recommendations.js';

const db=readDatabase();
const candidates=db.teams.filter(t=>t.recommendationStatus==='theory');

test('review withdraws the unsolicited tower lineup without treating feedback as a team result',()=>{
  assert.ok(!db.teams.some(t=>t.id==='team_tw_tower_qin_zero'));
  const emperor=candidates.find(t=>t.id==='team_tw_arena_emperor');
  assert.ok(emperor.review.coreStrength.includes('推塔'));assert.ok(emperor.review.coreStrength.includes('不能直接證明'));
  for(const team of candidates){assert.equal(team.review.checkedAt,'2026-10-05');for(const field of ['conclusion','coreStrength','starImpact','nextEvidence'])assert.ok(team.review[field]);}
  const html=teamRecommendationDetails(emperor,{heroLink:id=>id,skillPreview:id=>id});
  for(const heading of ['檢視結論','單角價值','星級影響','需要的實戰依據'])assert.ok(html.includes(heading));
  assert.equal(filterRecords(db,'teams',new URLSearchParams('purpose=推塔')).length,0);
  const missing=structuredClone(db);delete missing.teams[0].review;assert.ok(validateDatabase(missing).some(e=>e.includes('review')));
});

test('candidate effect summary only includes skills cited in its rationale',()=>{
  const burn=candidates.find(t=>t.id==='team_tw_campaign_burn');
  const shieldBreak=db.skills.find(s=>s.id==='skill_huangama_star2');
  const cited=burn.rationale.flatMap(r=>r.skillIds).map(id=>db.skills.find(s=>s.id===id));
  const expected=[...new Set(cited.flatMap(s=>s.effects.map(e=>e.type)))];
  assert.deepEqual(teamEffectIds(db,burn),expected);
  assert.ok(shieldBreak.effects.some(e=>!expected.includes(e.type)));
});

test('Taiwan candidates cover all three purposes with traceable member skills',()=>{
  assert.equal(candidates.length,6);
  for(const purpose of ['推圖','Boss','競技'])assert.equal(candidates.filter(t=>t.purposes.includes(purpose)).length,2);
  for(const team of candidates){
    assert.equal(team.verified,false);assert.equal(team.gameVersion,'tw');assert.equal(team.heroIds.length,5);
    assert.ok(teamStatusLabel(team).includes('待實測'));
    assert.equal(team.rationale.length,5);
    for(const reason of team.rationale){
      const hero=db.heroes.find(h=>h.id===reason.heroId);
      for(const id of reason.skillIds){assert.ok(hero.skills.includes(id));const skill=db.skills.find(s=>s.id===id);assert.equal(skill.gameVersion,'tw');assert.ok(skill.sourceDescription);}
    }
  }
  assert.deepEqual(validateDatabase(db),[]);
});

test('purpose buttons combine with OR and keyword search intersects member names',()=>{
  assert.equal(filterRecords(db,'teams',new URLSearchParams('purpose=推圖&purpose=Boss')).length,4);
  assert.deepEqual(filterRecords(db,'teams',new URLSearchParams('purpose=Boss&query=帥波')).map(t=>t.id),['team_tw_boss_sustain']);
  assert.equal(filterRecords(db,'teams',new URLSearchParams('purpose=競技&query=帥波')).length,0);
  assert.equal(filterRecords(db,'teams',new URLSearchParams('purpose=unknown')).length,6);
  assert.equal(filterRecords(db,'teams',new URLSearchParams()).length,12);
});

test('candidate validation rejects mismatched evidence, star unlocks and duplicate substitutions',()=>{
  const wrong=structuredClone(db);wrong.teams[0].rationale[0].skillIds=[wrong.teams[0].rationale[1].skillIds[0]];
  assert.ok(validateDatabase(wrong).some(e=>e.includes('evidence skill does not belong')));
  const crossVersion=structuredClone(db);crossVersion.teams[0].heroIds[0]='hero_shen';
  assert.ok(validateDatabase(crossVersion).some(e=>e.includes('team hero version mismatch')));
  const wrongSlot=structuredClone(db);const starTeam=wrongSlot.teams.find(t=>t.keyUnlocks?.length);starTeam.keyUnlocks[0].skillId=starTeam.rationale.find(r=>r.heroId===starTeam.keyUnlocks[0].heroId).skillIds[0];
  assert.ok(validateDatabase(wrongSlot).some(e=>e.includes('key unlock must be a star skill')));
  const duplicate=structuredClone(db);duplicate.teams[0].substitutions[0].replacementHeroId=duplicate.teams[0].heroIds[1];
  assert.ok(validateDatabase(duplicate).some(e=>e.includes('invalid substitution members')));
  const verified=structuredClone(db);verified.teams[0].verified=true;
  assert.ok(validateDatabase(verified).some(e=>e.includes('teams:')&&e.includes('constant')));
});

test('recommendation drawer renders useful evidence and preserves skill previews without detail navigation',()=>{
  const record=structuredClone(candidates.find(t=>t.id==='team_tw_campaign_crit'));record.limitations.push('<script>alert(1)</script>');
  const previews=[];
  const html=teamRecommendationDetails(record,{
    heroLink:id=>`<a href="#/heroes/${escapeHTML(id)}">${escapeHTML(db.heroes.find(h=>h.id===id).name)}</a>`,
    skillPreview:id=>{previews.push(id);return `<span tabindex="0" data-skill-preview="${escapeHTML(id)}">${escapeHTML(db.skills.find(s=>s.id===id).name)}</span>`;}
  });
  for(const heading of ['適用情境','搭配依據','關鍵解鎖','替代喵將','操作與觀察','限制與待測'])assert.ok(html.includes(heading));
  assert.ok(previews.includes('skill_huangama_star2'));assert.ok(html.includes('data-skill-preview'));
  assert.ok(!html.includes('#/skills/'));assert.ok(!html.includes('完整技能詳情'));
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(teamRecommendationDetails(db.teams.find(t=>t.gameVersion==='cn'),{}),'');
});
