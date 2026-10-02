import heart from '@phosphor-icons/core/assets/fill/heart-fill.svg?raw';
import shield from '@phosphor-icons/core/assets/fill/shield-fill.svg?raw';
import sword from '@phosphor-icons/core/assets/fill/sword-fill.svg?raw';
import gauge from '@phosphor-icons/core/assets/fill/gauge-fill.svg?raw';
import bank from '@phosphor-icons/core/assets/fill/bank-fill.svg?raw';
import crown from '@phosphor-icons/core/assets/fill/crown-fill.svg?raw';
import person from '@phosphor-icons/core/assets/fill/person-fill.svg?raw';
import flag from '@phosphor-icons/core/assets/fill/flag-fill.svg?raw';
import sparkle from '@phosphor-icons/core/assets/fill/sparkle-fill.svg?raw';
import scroll from '@phosphor-icons/core/assets/fill/scroll-fill.svg?raw';
import bulb from '@phosphor-icons/core/assets/fill/lightbulb-fill.svg?raw';

// Standard icon assets; paths are supplied by Phosphor rather than drawn here.
const symbols={heart,shield,sword,gauge,bank,crown,person,flag,sparkle,scroll,bulb};
export function profileIcon(name){return (symbols[name]||sparkle).replace('<svg ','<svg class="profile-symbol" aria-hidden="true" focusable="false" ');}

// Decorative category/stat artwork, separate from original in-game skill icons.
const illustratedIcons=new Set(['profession','attribute','faction','six-arts','health','attack','defense','speed','power','management']);
export function illustratedProfileIcon(name){
  if(!illustratedIcons.has(name))return profileIcon('sparkle');
  return `<img class="profile-illustrated-icon" src="${import.meta.env.BASE_URL}images/ui/profile/${name}.webp" width="32" height="32" alt="" aria-hidden="true" decoding="async"/>`;
}
