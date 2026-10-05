import {escapeHTML as e,effectsForTeam,findById} from './core.js';

export const teamPurposeOptions=['推塔','推圖','Boss','競技',['unknown','未分類']];
export const teamStatusLabel=record=>record.recommendationStatus==='theory'?'技能推導 · 待實測':record.gameVersion==='cn'?'官方參考 · 適用性待核對':'參考搭配';
export function teamEffectIds(db,record){
  if(!record.corePlan)return effectsForTeam(db,record.heroIds);
  const skillIds=[...new Set((record.rationale||[]).flatMap(item=>item.heroId===record.corePlan.heroId?record.corePlan.skillIds:item.skillIds))];
  return [...new Set(skillIds.flatMap(id=>findById(db,'skills',id)?.effects.map(effect=>effect.type)||[]))];
}

// Skill references use the existing hover preview; they never open a skill drawer.
export function teamRecommendationDetails(record,{heroLink,skillPreview}) {
  if(record.recommendationStatus!=='theory')return '';
  const skillList=ids=>ids.map(skillPreview).join('、');
  const list=values=>`<ul>${values.map(value=>`<li>${e(value)}</li>`).join('')}</ul>`;
  return `<section class="panel team-recommendation-notice"><strong>${e(teamStatusLabel(record))}</strong><p>${e(record.notes)}</p></section>
    <section class="panel team-guide"><h2>適用情境</h2><p>${e(record.suitableFor)}</p><p>核心喵將：${record.coreHeroIds.map(heroLink).join('、')}</p></section>
    ${record.corePlan?`<section class="panel team-guide"><h2>核心星級 · ${e(record.corePlan.stars)} 星</h2><p>${heroLink(record.corePlan.heroId)} · ${skillList(record.corePlan.skillIds)}</p><p>${e(record.corePlan.description)}</p></section>`:''}
    ${record.playerObservations?.length?`<section class="panel team-guide"><h2>玩家實戰觀察</h2>${record.playerObservations.map(item=>`<p><strong>${heroLink(item.heroId)} · ${e(item.stars)} 星 · ${e(item.purpose)}</strong></p><p>${e(item.description)}</p>`).join('')}</section>`:''}
    <section class="panel team-guide"><h2>搭配依據</h2><p class="muted">滑鼠移到技能名稱或以鍵盤聚焦，可查看原始技能說明。</p><div class="team-rationale">${record.rationale.map(item=>`<article><h3>${heroLink(item.heroId)}</h3><div class="team-rationale-body"><div class="team-evidence-skills">${skillList(item.skillIds)}</div><p>${e(item.description)}</p></div></article>`).join('')}</div></section>
    <section class="panel team-guide"><h2>關鍵解鎖</h2>${record.keyUnlocks.length?`<p class="muted">以下星級用於啟動對應聯動，不是所有成員上場的前提；未解鎖時不計入對應效果。</p>${record.keyUnlocks.map(item=>`<div class="team-unlock"><strong>${heroLink(item.heroId)} · ${skillPreview(item.skillId)}</strong><p>${e(item.description)}</p></div>`).join('')}`:'<p>這組基礎配置未計入任何 2 星或 5 星被動；先評估核心喵將現有技能的影響，再考慮升星加成。</p>'}</section>
    <section class="panel team-guide"><h2>替代喵將</h2>${record.substitutions.map(item=>`<div class="team-unlock"><h3>${heroLink(item.heroId)} → ${heroLink(item.replacementHeroId)}</h3><p>${e(item.reason)}</p><p class="muted">差異：${e(item.tradeoff)}</p></div>`).join('')}</section>
    <section class="panel team-guide"><h2>操作與觀察</h2>${list(record.rotationNotes)}</section>
    <section class="panel team-guide"><h2>限制與待測</h2>${list(record.limitations)}</section>`;
}
