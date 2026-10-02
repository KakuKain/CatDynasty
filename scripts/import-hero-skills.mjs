import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(resolve(root,'data',name+'.json'),'utf8'));
const write=(name,value)=>writeFileSync(resolve(root,'data',name+'.json'),JSON.stringify(value,null,2)+'\n');
const source=read('sources/hero-skills-2026-10-02');
const heroes=read('heroes'),skills=read('skills'),buildings=read('buildings'),effects=read('skill-effects');
const common={source:'',sourceType:'observation',verified:false,gameVersion:'tw',checkedAt:source.checkedAt};
const newHeroes={'霍去病':'hero_huo_tw','帥波':'hero_shuai_tw'};
const newBuildings={'司苑局':'building_garden_tw','染香局':'building_incense_tw','太醫院':'building_hospital_tw','蜜餞房':'building_candied_tw'};
const fileName=n=>typeof n==='string'?n:`LINE_ALBUM_2026102_261002_${n}.jpg`;
// Tags describe effects actually applied by the skill, not conditions mentioning another effect.
const tags={
  '黃阿瑪':['heal crit_up','shield crit_damage_up','damage_reduction damage_up'],
  '霍去病':['damage attack_up crit_up damage_up','damage attack_up','attack_up'],
  '帥波':['damage attack_up crit_up counterattack','damage crit_up','crit_damage_up'],
  '秦始皇':['damage attack_up energy','damage attack_down attack_up','invincible heal damage'],
  '武則天':['damage heal energy energy_down dispel','damage damage_reduction damage_up','control_resistance_up crit_resistance_up'],
  '婦好':['damage taunt guard damage_reduction','damage attack_down','damage counterattack'],
  '諸葛亮':['damage burn damage_up','damage damage_up','energy'],
  '上官婉兒':['heal dispel energy','damage crit_up','heal'],
  '徐霞客':['damage speed_up','damage heal energy','damage_up damage_reduction'],
  '蒲松齡':['shield taunt','damage defense_up','heal'],
  '狄仁傑':['damage energy_down','damage energy_down','attack_up'],
  '黃月英':['damage burn shield','damage burn','burn'],
  '戚繼光':['damage defense_down energy','damage defense_down','invincible'],
  '楊玉環':['damage flourish attack_up speed_up','damage heal','dispel crit_up'],
  '汗寶':['damage speed_up bleed','damage speed_up','attack_up'],
  '屈原':['damage stun energy_down','damage damage_up','energy'],
  '王昭君':['heal speed_up damage_reduction immunity','damage burn stun','damage_reduction immunity'],
  '李淳風':['damage speed_down speed_up','damage speed_down','dispel heal'],
  '李清照':['heal defense_up','damage defense_down','heal'],
  '玄奘':['attack_up speed_up crit_up crit_damage_up damage_reduction','damage jujie','revive heal energy'],
  '沈萬三':['damage_reduction defense_up heal','damage damage_reduction heal','damage_reduction'],
  '荊軻':['true_damage stealth heal','damage heal','stealth attack_up'],
  '霍嬗':['heal dispel','damage heal','shield'],
  '阿依古麗':['attack_up crit_up heal','damage crit_resistance_down','crit_damage_up'],
  '李白':['damage defense_down crit_up damage_taken_up','damage energy','damage_up']
};
const addedEffects={counterattack:['反擊','輸出'],invincible:['無敵','防禦'],energy_down:['減怒','控制'],control_resistance_up:['免控率提升','防禦'],crit_resistance_up:['暴擊抵抗提升','防禦'],crit_resistance_down:['暴擊抵抗降低','控制'],taunt:['嘲諷','控制'],shield:['護盾','防禦'],defense_up:['防禦提升','增益'],defense_down:['防禦降低','控制'],bleed:['流血','輸出'],jujie:['具戒','控制'],damage_taken_up:['所受傷害增加','控制']};
for(const [id,[name,category]] of Object.entries(addedEffects))if(!effects.some(e=>e.id===id))effects.push({...common,id,name,category,description:null,sourceDescription:source.source});
for(const record of source.heroes){
  let hero=heroes.find(h=>h.gameVersion==='tw'&&h.name===record.name);
  if(!hero){
    if(!newHeroes[record.name])throw Error(`Missing hero mapping: ${record.name}`);
    hero={...common,id:newHeroes[record.name],name:record.name,aliases:[],type:null,role:[],sixArts:[],image:null,skills:[],buildingBonuses:[],teamTags:[],sixArtsRecommendations:[],researchTalents:[]};heroes.push(hero);
  }
  Object.assign(hero,{rarity:record.quality+'級',rarityType:record.rare?'稀有':null,profession:record.profession,faction:record.faction,attribute:record.attribute,role:[record.profession],checkedAt:source.checkedAt,description:'台版喵將圖鑑；技能與天賦依玩家提供的滿級預覽截圖整理。'});
  hero.skillEvidence={files:record.files.map(fileName),checkedAt:source.checkedAt,display:'技能滿級預覽'};
  hero.verifiedFields=[...new Set([...(hero.verifiedFields||[]),'name','rarity','rarityType','profession','faction','attribute','skills'])];
  hero.notes='技能與天賦數值來自滿級預覽，其他等級數值待補；六藝推薦保留既有已核對資料。';
  hero.confirmations=(hero.confirmations||[]).filter(c=>c.checkedAt!==source.checkedAt||!c.fields.includes('skills'));
  hero.confirmations.push({fields:['skills','profession','faction','attribute','rarity','rarityType'],method:'screenshot',checkedAt:source.checkedAt,description:`台版技能截圖 ${record.files.join('、')}；技能數值為滿級預覽。`});
  const imported=[];
  for(const input of record.skills){
    let skill=skills.find(s=>s.gameVersion==='tw'&&hero.skills.includes(s.id)&&(s.slot===input.slot||s.name===input.name));
    if(!skill){skill={...common,id:`${hero.id.replace(/^hero_/,'skill_')}_${input.slot}`};skills.push(skill);}
    // Retain any official URL as supplementary evidence, not as verification of new max-level values.
    if(skill.source&&skill.sourceType==='official')skill.sources=[...(skill.sources||[]),{url:skill.source,label:'既有台版官方技能介紹',scope:'技能名稱與機制；本次數值以滿級截圖為準。'}];
    Object.assign(skill,common,{name:input.name,type:skillSlotType(input.slot),slot:input.slot,unlockStars:input.slot==='star2'?2:input.slot==='star5'?5:null,levelContext:'max-level-preview',description:input.description.replace('【漁肆局】','【魚肆局】'),target:null,cooldown:null,effects:[],sourceDescription:`玩家提供台版技能截圖：${fileName(input.file)}`,screenshotFile:fileName(input.file),notes:'滿級預覽；其他技能等級、冷卻與未顯示的數值待補。'});
    if(record.name==='上官婉兒'&&input.slot==='star5')skill.description=skill.description.replaceAll('淑黨','淑黛');
    const index=['ultimate','star2','star5'].indexOf(input.slot);
    const effectTags=index>=0?tags[record.name][index]:input.slot==='entry'?(record.name==='秦始皇'?'attack_down':'energy'):'';
    skill.effects=effectTags.split(' ').filter(Boolean).map(type=>({type,value:null}));
    skill.confirmations=[{fields:['name','description','slot','levelContext'],method:'screenshot',checkedAt:source.checkedAt,description:'依圖片中的滿級預覽文字收錄。'}];
    if(input.nameConfirmedByPlayer)skill.confirmations.push({fields:['name'],method:'player',checkedAt:source.checkedAt,description:'玩家核對技能名稱。'});
    if(input.slot==='talent'){
      let building=buildings.find(b=>b.gameVersion==='tw'&&b.name===input.building);
      if(!building){if(!newBuildings[input.building])throw Error(`Missing building mapping: ${input.building}`);building={...common,id:newBuildings[input.building],name:input.building,type:null,description:'台版喵將天賦截圖確認的建築；解鎖與升級資料待補。',unlock:{cityLevel:null,condition:null},levels:[],production:[],acceleratingHeroes:[],sourceDescription:skill.sourceDescription};buildings.push(building);}
      skill.talent={buildingId:building.id,efficiency:input.efficiency,timeReduction:input.timeReduction??null};
      const description=`${input.name}（滿級）：${skill.description}`;
      if(input.name==='研究天賦')hero.researchTalents=[{buildingId:building.id,description}];
      else{
        hero.buildingBonuses=[{buildingId:building.id,effectType:'efficiency',value:input.efficiency,timeReduction:input.timeReduction??null,description}];
        if(!building.acceleratingHeroes.includes(hero.id))building.acceleratingHeroes.push(hero.id);
      }
    }
    imported.push(skill.id);
  }
  hero.skills=imported;
}
function skillSlotType(slot){return {entry:'入場技能',ultimate:'必殺技',star2:'被動技能',star5:'被動技能',talent:'經營天賦'}[slot];}
write('heroes',heroes);write('skills',skills);write('buildings',buildings);write('skill-effects',effects);
console.log(`Imported ${source.heroes.length} Taiwan heroes and ${source.heroes.reduce((n,h)=>n+h.skills.length,0)} max-level skills/talents.`);
