// Website presentation combines the two fields; source data retains each field.
export const heroTableHeaders=['品質','名稱','職業／陣營','屬性','必殺技','2星解鎖技能','5星解鎖技能','天賦','六藝推薦'];
export const skillSlotLabels={entry:'入場技能',ultimate:'必殺技',star2:'2星解鎖技能',star5:'5星解鎖技能',talent:'天賦'};
export function skillForSlot(db,hero,slot){return hero.skills.map(id=>db.skills.find(s=>s.id===id)).find(s=>s?.slot===slot)||null;}
export function sheetSkillText(skill){return skill?`${skill.name}${skill.levelContext==='max-level-preview'?'（滿級）':''}\n${skill.description}`:'';}
