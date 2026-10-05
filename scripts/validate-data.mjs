import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import Ajv from 'ajv';
import {collectionKeys,normalize} from '../src/core.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=path=>JSON.parse(readFileSync(path,'utf8'));
export function readDatabase(folder='data') {
  return Object.fromEntries(collectionKeys.map(key=>[key,load(resolve(root,folder,`${key}.json`))]));
}
export function validateDatabase(db,{demo=false}={}) {
  const errors=[];const schema=load(resolve(root,'data/schema.json'));
  const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(schema);
  const ids={};
  const namedCollections=new Set(['heroes','buildings','recipes','ingredients','artifacts','artifact-sets','furniture','furniture-sets','teams','stages','skill-effects']);
  for(const key of collectionKeys){
    const records=db[key];
    if(!Array.isArray(records)){errors.push(`${key}: expected an array`);continue;}
    ids[key]=new Set();const names=new Set();
    const validate=ajv.compile({type:'array',items:{$ref:`${schema.$id}#/$defs/${key}`}});
    if(!validate(records))errors.push(`${key}: ${ajv.errorsText(validate.errors)}`);
    for(const r of records){
      if(ids[key].has(r.id))errors.push(`${key}: duplicate id ${r.id}`);
      ids[key].add(r.id);
      if(namedCollections.has(key)&&r.name){const identity=`${r.gameVersion}:${normalize(r.name)}`;if(names.has(identity))errors.push(`${key}: duplicate name in ${r.gameVersion} ${r.name}`);names.add(identity);}
      if(!demo&&r.gameVersion==='mock')errors.push(`${key}/${r.id}: demo record in real data`);
      if(r.verified&&r.gameVersion!=='mock'&&(!r.source||r.sourceType==='unknown'))errors.push(`${key}/${r.id}: verified without a source`);
      if(r.source&&!/^https?:\/\//.test(r.source))errors.push(`${key}/${r.id}: invalid source URL`);
      for(const source of r.sources||[])if(!/^https?:\/\//.test(source.url))errors.push(`${key}/${r.id}: invalid supplementary source URL`);
      for(const confirmation of r.confirmations||[])if(!/^\d{4}-\d{2}-\d{2}$/.test(confirmation.checkedAt))errors.push(`${key}/${r.id}: invalid confirmation date`);
      if(r.image&&(!/^[a-z0-9/_\-.]+$/i.test(r.image)||r.image.includes('..')||!existsSync(resolve(root,'public',r.image))))errors.push(`${key}/${r.id}: invalid or missing local image`);
      for(const field of ['checkedAt','startDate','endDate','lastTestedAt'])if(r[field]&&!/^\d{4}-\d{2}-\d{2}$/.test(r[field]))errors.push(`${key}/${r.id}: invalid date ${field}`);
    }
  }
  for(const key of collectionKeys){const legacyIds=new Set();for(const record of db[key]||[])for(const id of record.legacyIds||[]){if(ids[key]?.has(id)||legacyIds.has(id))errors.push(`${key}: duplicate legacy id ${id}`);legacyIds.add(id);}}
  const teamCompositions=new Set();
  for(const team of db.teams||[]){if(!team.heroIds.length)continue;const composition=`${team.gameVersion}:${[...team.heroIds].sort().join('|')}`;if(teamCompositions.has(composition))errors.push(`${team.id}: duplicate team composition`);teamCompositions.add(composition);}
  const ref=(key,id,context)=>{if(id&&!ids[key]?.has(id))errors.push(`${context}: missing ${key}/${id}`);};
  for(const h of db.heroes)for(const talent of h.researchTalents)ref('buildings',talent.buildingId,h.id);
  for(const h of db.heroes){h.skills.forEach(id=>ref('skills',id,h.id));h.buildingBonuses.forEach(b=>{ref('buildings',b.buildingId,h.id);const building=db.buildings.find(x=>x.id===b.buildingId);if(building&&!building.acceleratingHeroes.includes(h.id))errors.push(`${h.id}: reverse building relation missing`);});}
  for(const s of db.skills){s.effects.forEach(v=>ref('skill-effects',v.type,s.id));if(s.talent)ref('buildings',s.talent.buildingId,s.id);}
  for(const hero of db.heroes){const slots=new Set();for(const id of hero.skills){const skill=db.skills.find(s=>s.id===id);if(skill?.slot){if(slots.has(skill.slot))errors.push(`${hero.id}: duplicate skill slot ${skill.slot}`);slots.add(skill.slot);}if(skill&&skill.gameVersion!==hero.gameVersion)errors.push(`${hero.id}: skill version mismatch ${id}`);}}
  for(const b of db.buildings){b.production.forEach(id=>ref('ingredients',id,b.id));b.levels.forEach(id=>ref('building-levels',id,b.id));b.acceleratingHeroes.forEach(id=>{ref('heroes',id,b.id);const hero=db.heroes.find(h=>h.id===id);if(hero&&!hero.buildingBonuses.some(v=>v.buildingId===b.id))errors.push(`${b.id}: reverse hero relation missing`);});}
  for(const l of db['building-levels'])ref('buildings',l.buildingId,l.id);
  for(const r of db.recipes){ref('buildings',r.buildingId,r.id);r.ingredients.forEach(i=>ref('ingredients',i.ingredientId,r.id));}
  for(const i of db.ingredients)i.obtainedFrom.forEach(id=>ref('buildings',id,i.id));
  for(const t of db.teams){t.heroIds.forEach(id=>ref('heroes',id,t.id));if(new Set(t.heroIds).size!==t.heroIds.length||t.heroIds.length>5)errors.push(`${t.id}: invalid team members`);}
  for(const team of db.teams){
    if(team.recommendationStatus!=='theory')continue;
    if(team.heroIds.length!==5)errors.push(`${team.id}: candidate team must have five members`);
    const heroFor=id=>db.heroes.find(h=>h.id===id);
    for(const id of team.heroIds)if(heroFor(id)?.gameVersion!==team.gameVersion)errors.push(`${team.id}: team hero version mismatch ${id}`);
    for(const id of team.coreHeroIds||[])if(!team.heroIds.includes(id))errors.push(`${team.id}: core hero is not a member ${id}`);
    const evidenceHeroes=new Set();
    const checkEvidence=(item,skillIds)=>{
      if(!team.heroIds.includes(item.heroId))errors.push(`${team.id}: evidence hero is not a member ${item.heroId}`);
      const hero=heroFor(item.heroId);
      for(const id of skillIds){
        ref('skills',id,team.id);
        const skill=db.skills.find(s=>s.id===id);
        if(!hero?.skills.includes(id))errors.push(`${team.id}: evidence skill does not belong to hero ${id}`);
        if(skill&&skill.gameVersion!==team.gameVersion)errors.push(`${team.id}: evidence skill version mismatch ${id}`);
      }
    };
    for(const item of team.rationale||[]){checkEvidence(item,item.skillIds);if(evidenceHeroes.has(item.heroId))errors.push(`${team.id}: duplicate hero rationale`);evidenceHeroes.add(item.heroId);}
    if(team.heroIds.some(id=>!evidenceHeroes.has(id)))errors.push(`${team.id}: member rationale missing`);
    for(const item of team.keyUnlocks||[]){checkEvidence(item,[item.skillId]);const skill=db.skills.find(s=>s.id===item.skillId);if(skill&&!['star2','star5'].includes(skill.slot))errors.push(`${team.id}: key unlock must be a star skill`);}
    for(const item of team.substitutions||[]){
      ref('heroes',item.replacementHeroId,team.id);
      if(!team.heroIds.includes(item.heroId)||team.heroIds.includes(item.replacementHeroId))errors.push(`${team.id}: invalid substitution members`);
      if(heroFor(item.replacementHeroId)?.gameVersion!==team.gameVersion)errors.push(`${team.id}: substitution version mismatch`);
    }
  }
  for(const b of db.buildings)for(const reward of b.rewardConditions||[])ref('heroes',reward.heroId,b.id);
  for(const s of db.stages){s.heroIds.forEach(id=>ref('heroes',id,s.id));s.teamIds.forEach(id=>ref('teams',id,s.id));(s.buildingIds||[]).forEach(id=>ref('buildings',id,s.id));(s.artifactIds||[]).forEach(id=>ref('artifacts',id,s.id));}
  for(const a of db.artifacts){a.heroIds.forEach(id=>ref('heroes',id,a.id));a.teamIds.forEach(id=>ref('teams',id,a.id));a.levels.forEach(id=>ref('artifact-levels',id,a.id));for(const effect of a.effects)ref('buildings',effect.buildingId,a.id);}
  for(const artifact of db.artifacts)for(const setId of artifact.setIds){ref('artifact-sets',setId,artifact.id);const set=db['artifact-sets'].find(s=>s.id===setId);if(set&&!set.artifactIds.includes(artifact.id))errors.push(`${artifact.id}: reverse artifact set relation missing`);}
  for(const set of db['artifact-sets']){for(const artifactId of set.artifactIds){ref('artifacts',artifactId,set.id);const artifact=db.artifacts.find(a=>a.id===artifactId);if(artifact&&!artifact.setIds.includes(set.id))errors.push(`${set.id}: reverse artifact relation missing`);}for(const bonus of set.bonuses)for(const effect of bonus.effects)ref('buildings',effect.buildingId,set.id);}

  for(const artifact of db.artifacts){const p=artifact.screenshotProgress;if(!p)continue;if(!artifact.passiveEffect||!Number.isInteger(artifact.effectiveLimit))errors.push(`${artifact.id}: screenshot passive details missing`);if(p.effectiveCount>artifact.effectiveLimit)errors.push(`${artifact.id}: screenshot effective count exceeds limit`);if(p.placedCount>p.placementLimit)errors.push(`${artifact.id}: screenshot placement count exceeds limit`);}
  for(const l of db['artifact-levels'])ref('artifacts',l.artifactId,l.id);
  for(const f of db.furniture){ref('furniture-sets',f.setId,f.id);f.buildingIds.forEach(id=>ref('buildings',id,f.id));if(f.setId&&!db['furniture-sets'].find(s=>s.id===f.setId)?.furnitureIds.includes(f.id))errors.push(`${f.id}: reverse furniture set relation missing`);}
  for(const s of db['furniture-sets'])s.furnitureIds.forEach(id=>ref('furniture',id,s.id));
  return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let count=0;const errors=[];
  for(const folder of ['data','data/mock']){const db=readDatabase(folder);count+=collectionKeys.reduce((sum,key)=>sum+db[key].length,0);errors.push(...validateDatabase(db,{demo:folder.endsWith('mock')}).map(error=>`${folder}: ${error}`));}
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Validated ${count} records across ${collectionKeys.length} real and ${collectionKeys.length} demo collections; schemas and references passed.`);
}
