import {skillSlotLabels} from './hero-catalogue.js';

export function initializeSkillTooltip(getSkill){
  const tooltip=document.createElement('div');
  tooltip.id='skill-hover-tooltip';tooltip.className='skill-tooltip';
  tooltip.setAttribute('role','tooltip');tooltip.hidden=true;
  const heading=document.createElement('strong'),context=document.createElement('span'),description=document.createElement('p');
  tooltip.append(heading,context,description);
  const usePopover=typeof tooltip.showPopover==='function';
  if(usePopover)tooltip.setAttribute('popover','manual');
  let anchor=null,closeTimer=null;
  function hide(){
    clearTimeout(closeTimer);
    if(anchor){const ids=(anchor.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==tooltip.id);if(ids.length)anchor.setAttribute('aria-describedby',ids.join(' '));else anchor.removeAttribute('aria-describedby');}
    if(usePopover&&tooltip.matches(':popover-open'))tooltip.hidePopover();
    tooltip.hidden=true;anchor=null;
  }
  function position(){
    if(!anchor?.isConnected)return hide();
    const rect=anchor.getBoundingClientRect(),box=tooltip.getBoundingClientRect();
    const margin=12,gap=8;
    const left=Math.max(margin,Math.min(rect.left,window.innerWidth-box.width-margin));
    const below=rect.bottom+gap;
    const top=below+box.height<=window.innerHeight-margin?below:Math.max(margin,rect.top-box.height-gap);
    tooltip.style.left=`${left}px`;tooltip.style.top=`${top}px`;
  }
  function show(target){
    clearTimeout(closeTimer);if(target===anchor)return;
    const skill=getSkill(target.dataset.skillPreview);if(!skill?.description)return hide();
    hide();anchor=target;
    heading.textContent=skill.name;
    context.textContent=[skillSlotLabels[skill.slot]||skill.type,skill.levelContext==='max-level-preview'?'滿級預覽':null].filter(Boolean).join(' · ');
    description.textContent=skill.description;
    // Keep previews outside the table's overflow container, including inside modal drawers.
    (target.closest('dialog[open]')||document.body).append(tooltip);
    tooltip.hidden=false;
    if(usePopover)tooltip.showPopover();
    anchor.setAttribute('aria-describedby',[anchor.getAttribute('aria-describedby'),tooltip.id].filter(Boolean).join(' '));
    position();
  }
  function scheduleHide(){clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(document.activeElement!==anchor&&!tooltip.matches(':hover'))hide();},120);}
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch')return;
    const target=event.target.closest?.('[data-skill-preview]');
    if(target&&!target.contains(event.relatedTarget))show(target);
    else if(tooltip.contains(event.target))clearTimeout(closeTimer);
  });
  document.addEventListener('pointerout',event=>{
    const target=event.target.closest?.('[data-skill-preview]');
    if((target&&target===anchor&&!target.contains(event.relatedTarget))||(tooltip.contains(event.target)&&!tooltip.contains(event.relatedTarget)))scheduleHide();
  });
  document.addEventListener('focusin',event=>{const target=event.target.closest?.('[data-skill-preview]');if(target)show(target);});
  document.addEventListener('focusout',event=>{if(event.target===anchor)scheduleHide();});
  document.addEventListener('click',event=>{if(!tooltip.contains(event.target))hide();},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},true);
  document.addEventListener('scroll',event=>{if(!tooltip.contains(event.target))hide();},true);
  window.addEventListener('resize',hide);
  return {hide};
}
