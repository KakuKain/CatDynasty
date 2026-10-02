import {escapeHTML,heroQualities} from './core.js';

const qualityStyles={聖:'holy',天:'heaven',地:'earth',玄:'mystic'};

export function heroQualityBadge(hero) {
  const quality=hero.rarity?.replace(/級$/,'');
  if(!heroQualities.includes(quality))return `<span class="hero-quality-unknown">${hero.gameVersion==='mock'?'示範':'待補'}</span>`;
  const rare=quality==='天'&&hero.rarityType==='稀有';
  return `<span class="hero-quality-badge${rare?' is-rare':''}" role="img" aria-label="${escapeHTML(quality)}品質${rare?'・稀有':''}"><span class="hero-quality-seal quality-${qualityStyles[quality]}" aria-hidden="true"><span class="hero-quality-glyph">${escapeHTML(quality)}</span></span>${rare?'<span class="hero-quality-rare" aria-hidden="true">稀有</span>':''}</span>`;
}
