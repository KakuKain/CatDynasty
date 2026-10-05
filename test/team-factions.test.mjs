import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readDatabase} from '../scripts/validate-data.mjs';
import {factionAnalysis,factionSummary,factionMatchup,factionPanel,lineupRules,lineupRulesHTML} from '../src/team-factions.js';
import {teamRecommendationDetails} from '../src/team-recommendations.js';

const db=readDatabase();
const roster=factions=>({heroes:factions.map((faction,i)=>({id:String(i),gameVersion:'tw',faction,profession:'輔助'}))});
const analyse=factions=>{const data=roster(factions);return factionAnalysis(data,data.heroes.map(hero=>hero.id));};

test('screenshot thresholds use faction identity and the highest tier, not profession or cumulative tiers',()=>{
  for(const [count,percent] of [[0,0],[1,0],[2,0],[3,10],[4,15],[5,20]]){
    const result=analyse(Array(count).fill('文臣'));
    assert.equal(result.percent,percent);
  }
  assert.equal(analyse(['文臣','武將','俠士','墨客','在野']).percent,0);
  assert.equal(analyse(['文臣','文臣','帝王']).percent,10);
  assert.equal(analyse(['文臣','文臣','文臣','帝王','俠士']).percent,15);
  assert.equal(analyse(['文臣','文臣','文臣','帝王','帝王']).percent,20);
});

test('emperor is a wildcard, wild heroes are recipients but never count toward a faction',()=>{
  const result=analyse(['俠士','俠士','帝王','在野','在野']);
  assert.equal(result.percent,10);assert.equal(result.memberCount,5);assert.equal(result.unaligned,2);
  assert.equal(result.active[0].count,3);
  const pure=analyse(['帝王','帝王']);assert.equal(pure.percent,0);assert.equal(pure.unresolved,true);
  const multiple=analyse(['文臣','文臣','武將','帝王','帝王']);
  assert.equal(multiple.percent,15);assert.equal(multiple.qualifying.length,2);
  const data=roster(['文臣','文臣','武將','帝王','帝王']);
  const html=factionPanel(data,data.heroes.map(hero=>hero.id));
  assert.ok(html.includes('最高單陣營門檻（未累加）'));assert.ok(html.includes('實際結算待確認'));
});

test('unknown data, duplicate identities and mainland teams cannot invent a confirmed Taiwan bonus',()=>{
  const data=roster(['文臣','文臣','文臣',null]);
  const result=factionAnalysis(data,['0','1','2','3','missing','0']);
  assert.equal(result.percent,10);assert.equal(result.unknown,2);assert.equal(result.memberCount,5);
  assert.ok(factionSummary(data,['0','1','2','3']).includes('已知成員至少'));
  assert.ok(factionSummary(data,['3']).includes('資料不完整'));
  data.heroes[0].gameVersion='cn';
  assert.equal(factionAnalysis(data,['0','1','2']).unsupported,true);
  assert.equal(factionAnalysis(data,['0','1','2']).percent,0);
  assert.ok(factionSummary(data,['0','1','2']).includes('不適用'));
});

test('counter direction follows screenshot arrows and describes damage to the target',()=>{
  for(const [attacker,target] of [['俠士','墨客'],['墨客','文臣'],['文臣','武將'],['武將','俠士']]){
    assert.equal(factionMatchup(attacker,target),10);assert.equal(factionMatchup(target,attacker),-10);
  }
  for(const faction of lineupRules.factions){
    assert.equal(factionMatchup('帝王',faction),10);assert.equal(factionMatchup(faction,'帝王'),-10);
    assert.equal(factionMatchup(faction,faction),0);
  }
  assert.equal(factionMatchup('文臣','俠士'),0);
  assert.equal(factionMatchup('帝王','帝王'),0);
  assert.equal(factionMatchup('帝王','在野'),null);
  assert.equal(factionMatchup(null,'墨客'),null);
  const html=lineupRulesHTML();
  assert.ok(html.includes('對該目標傷害 −10%'));assert.ok(!html.includes('受到傷害 +10%'));
});

test('revised candidates meet their faction tiers and every substitute has a freshly calculated result',()=>{
  const expected={team_tw_campaign_crit:20,team_tw_campaign_burn:15,team_tw_boss_ailment:15,team_tw_boss_sustain:15,team_tw_arena_control:15,team_tw_arena_emperor:20};
  for(const [id,percent] of Object.entries(expected)){
    const team=db.teams.find(team=>team.id===id);const result=factionAnalysis(db,team.heroIds);
    assert.ok(!JSON.stringify(team).includes('\uFFFD'));
    assert.equal(result.percent,percent);assert.equal(result.qualifying.length,1);
    assert.ok(team.placement);assert.ok(team.substitutions.some(item=>item.heroId==='hero_qin_tw'));
    const summaries=team.substitutions.map(item=>factionSummary(db,team.heroIds.map(id=>id===item.heroId?item.replacementHeroId:id)));
    const html=teamRecommendationDetails(team,{heroLink:id=>id,skillPreview:id=>id,substitutionSummary:item=>factionSummary(db,team.heroIds.map(id=>id===item.heroId?item.replacementHeroId:id))});
    assert.ok(html.includes('建議站位'));for(const summary of summaries)assert.ok(html.includes(summary));
  }
  const general=db.teams.find(team=>team.id==='team_tw_campaign_crit');
  assert.equal(factionAnalysis(db,general.heroIds.map(id=>id==='hero_yang_tw'?'hero_shen_tw':id)).percent,15);
  const control=db.teams.find(team=>team.id==='team_tw_arena_control');
  assert.equal(factionAnalysis(db,control.heroIds.map(id=>id==='hero_fuhao_tw'?'hero_wuzetian_tw':id)).percent,20);
});

test('lineup rules retain original screenshot evidence and inferred teams stay unverified',()=>{
  for(const file of lineupRules.evidence)assert.ok(existsSync(new URL('../'+file,import.meta.url)));
  assert.equal(lineupRules.sourceType,'observation');assert.equal(lineupRules.gameVersion,'tw');
  assert.ok(lineupRulesHTML().includes('職業人數不計入陣營門檻'));
  for(const team of db.teams.filter(team=>team.recommendationStatus==='theory'))assert.equal(team.verified,false);
});
