import rules from '../data/sources/lineup-rules-2026-10-05.json' with {type:'json'};
import {escapeHTML as e,findById} from './core.js';

export const lineupRules=rules;

// Count identities once. Profession and stars never contribute to faction counts.
export function factionAnalysis(db,heroIds){
  const ids=[...new Set(heroIds)];
  const members=ids.map(id=>findById(db,'heroes',id));
  const unsupported=members.some(hero=>hero&&hero.gameVersion!=='tw');
  const unknown=members.filter(hero=>!hero||![...rules.factions,'帝王','在野'].includes(hero.faction)).length;
  const emperors=members.filter(hero=>hero?.faction==='帝王').length;
  const counts=Object.fromEntries(rules.factions.map(faction=>[faction,members.filter(hero=>hero?.faction===faction).length]));
  const candidates=unsupported?[]:rules.factions.filter(faction=>counts[faction]>0).map(faction=>{
    const count=counts[faction]+emperors;
    const tier=rules.thresholds.filter(tier=>count>=tier.count).at(-1);
    return {faction,nativeCount:counts[faction],emperors,count,percent:tier?.percent||0};
  });
  const percent=Math.max(0,...candidates.map(candidate=>candidate.percent));
  const qualifying=candidates.filter(candidate=>candidate.percent>0);
  const active=candidates.filter(candidate=>candidate.percent>0&&candidate.percent===percent);
  return {counts,emperors,unknown,unsupported,candidates,qualifying,active,percent,memberCount:ids.length,
    unaligned:members.filter(hero=>hero?.faction==='在野').length,
    unresolved:!unsupported&&emperors>0&&!candidates.length};
}

// This is a damage adjustment against one target, not a damage-received formula.
export function factionMatchup(attacker,target){
  if(![...rules.factions,'帝王'].includes(attacker)||![...rules.factions,'帝王'].includes(target))return null;
  if(attacker===target)return 0;
  if(attacker==='帝王')return rules.counterPercent;
  if(target==='帝王')return -rules.counterPercent;
  if(rules.counterCycle[(rules.counterCycle.indexOf(attacker)+1)%rules.counterCycle.length]===target)return rules.counterPercent;
  if(rules.counterCycle[(rules.counterCycle.indexOf(target)+1)%rules.counterCycle.length]===attacker)return -rules.counterPercent;
  return 0;
}

export function factionSummary(db,heroIds){
  const result=factionAnalysis(db,heroIds);
  if(result.unsupported)return '台版加成不適用於此參考資料';
  if(result.unresolved)return '純帝王的加成規則待確認';
  const status=result.unknown?'已知成員至少 ':'';
  if(!result.percent)return result.unknown?'陣營資料不完整，已知成員未達門檻':'未達 3 名同陣營門檻';
  const groups=result.active.map(group=>`${group.faction} ${group.count} 名${group.emperors?`（含 ${group.emperors} 帝王）`:''}`).join('／');
  return `${result.qualifying.length>1?'最高單陣營門檻（未累加）：':''}${status}${groups} · 全體攻擊／生命 +${result.percent}%`;
}

export function lineupRulesHTML(){
  return `<details class="lineup-rules"><summary>陣容搭配說明 · 陣營加成、克制與站位</summary><div class="lineup-rules-body">
    <h3>陣營人數加成</h3><div class="lineup-thresholds">${rules.thresholds.map(tier=>`<div><strong>${tier.count} 名同陣營</strong><span>全體攻擊 +${tier.percent}%</span><span>全體最大生命 +${tier.percent}%</span></div>`).join('')}</div>
    <p>帝王可協助啟動其他陣營的加成；在野不計入任何陣營。加成受益者是所有上陣喵將，包含不同陣營的隊友。職業人數不計入陣營門檻。</p>
    <p class="muted">例如：3 文臣＋1 帝王＋1 俠士，按 4 名文臣門檻給全體 +15%；不是依輔助人數加成。各門檻不逐級相加；多個陣營同時達標或純帝王配置的結算方式待確認，工具不累加不同陣營。</p>
    <h3>陣營克制</h3><p class="lineup-counter">${e(rules.counterCycle.join(' → '))} → ${e(rules.counterCycle[0])}</p><p>箭頭前方克制後方。克制目標時，對該目標傷害 +10%；被該目標克制時，對該目標傷害 −10%。帝王克制其他四個已列陣營；帝王與在野之間的關係待確認。克制按攻擊者與目標分別判斷，不能套為全隊統一增傷。</p>
    <h3>職業與站位</h3><dl class="lineup-roles">${rules.roles.map(role=>`<div><dt>${e(role.name)}</dt><dd>${e(role.description)}</dd></div>`).join('')}</dl>
    <h3>選隊順序</h3><p>先保留目前養成下有影響力的核心，確認坦補與技能解鎖，再湊同陣營門檻並針對敵人換角。為了 +20% 換掉重要核心或失去續航，不一定比 +15% 配置更好。</p>
    <p class="muted">規則依玩家提供的台版遊戲截圖整理（2026-10-05）；隊伍建議是技能分析，尚未實戰驗證。數值預覽受當時養成影響，不直接套用加成重算成實戰傷害。</p>
  </div></details>`;
}

export function factionPanel(db,heroIds){
  const result=factionAnalysis(db,heroIds);
  const rows=rules.factions.filter(faction=>result.counts[faction]).map(faction=>`${faction} ${result.counts[faction]}`);
  if(result.emperors)rows.push(`帝王 ${result.emperors}`);
  if(result.unaligned)rows.push(`在野 ${result.unaligned}（不計數）`);
  if(result.unknown)rows.push(`陣營待確認 ${result.unknown}`);
  return `<section class="panel lineup-analysis"><h2>陣容搭配</h2><p class="lineup-bonus" role="status">${e(factionSummary(db,heroIds))}</p><p>${e(rows.join(' · ')||'加入台版喵將後顯示陣營組成。')}</p>${result.qualifying.length>1?`<p class="muted">同時達標：${e(result.qualifying.map(group=>`${group.faction} +${group.percent}%`).join('、'))}。顯示最高單陣營門檻，不累加加成；實際結算待確認。</p>`:''}${result.unknown?'<p class="muted">計算僅涵蓋已知成員；補齊陣營後可能達到更高門檻。</p>':''}${lineupRulesHTML()}</section>`;
}
