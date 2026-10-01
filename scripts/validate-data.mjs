import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import Ajv from 'ajv';
import {collectionKeys} from '../src/core.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=path=>JSON.parse(readFileSync(path,'utf8'));
export function readDatabase(folder='data') {
  return Object.fromEntries(collectionKeys.map(key=>[key,load(resolve(root,folder,`${key}.json`))]));
}
export function validateDatabase(db,{demo=false}={}) {
  const errors=[];const schema=load(resolve(root,'data/schema.json'));
  const ajv=new Ajv({allErrors:true,strict:false});ajv.addSchema(schema);
  const ids={};
  for(const key of collectionKeys){
    const records=db[key];
    if(!Array.isArray(records)){errors.push(`${key}: expected an array`);continue;}
    ids[key]=new Set();
    const validate=ajv.compile({type:'array',items:{$ref:`${schema.$id}#/$defs/${key}`}});
    if(!validate(records))errors.push(`${key}: ${ajv.errorsText(validate.errors)}`);
    for(const r of records){
      if(ids[key].has(r.id))errors.push(`${key}: duplicate id ${r.id}`);
      ids[key].add(r.id);
      if(!demo&&r.gameVersion==='mock')errors.push(`${key}/${r.id}: demo record in real data`);
      if(r.verified&&r.gameVersion!=='mock'&&(!r.source||r.sourceType==='unknown'))errors.push(`${key}/${r.id}: verified without a source`);
      if(r.source&&!/^https?:\/\//.test(r.source))errors.push(`${key}/${r.id}: invalid source URL`);
      for(const source of r.sources||[])if(!/^https?:\/\//.test(source.url))errors.push(`${key}/${r.id}: invalid supplementary source URL`);
      for(const confirmation of r.confirmations||[])if(!/^\d{4}-\d{2}-\d{2}$/.test(confirmation.checkedAt))errors.push(`${key}/${r.id}: invalid confirmation date`);
      if(r.image&&(!/^[a-z0-9/_\-.]+$/i.test(r.image)||r.image.includes('..')||!existsSync(resolve(root,'public',r.image))))errors.push(`${key}/${r.id}: invalid or missing local image`);
      for(const field of ['checkedAt','startDate','endDate','lastTestedAt'])if(r[field]&&!/^\d{4}-\d{2}-\d{2}$/.test(r[field]))errors.push(`${key}/${r.id}: invalid date ${field}`);
    }
  }
  const ref=(key,id,context)=>{if(id&&!ids[key]?.has(id))errors.push(`${context}: missing ${key}/${id}`);};
  for(const h of db.heroes)for(const talent of h.researchTalents)ref('buildings',talent.buildingId,h.id);
  for(const h of db.heroes){h.skills.forEach(id=>ref('skills',id,h.id));h.buildingBonuses.forEach(b=>{ref('buildings',b.buildingId,h.id);const building=db.buildings.find(x=>x.id===b.buildingId);if(building&&!building.acceleratingHeroes.includes(h.id))errors.push(`${h.id}: reverse building relation missing`);});}
  for(const s of db.skills)s.effects.forEach(v=>ref('skill-effects',v.type,s.id));
  for(const b of db.buildings){b.production.forEach(id=>ref('ingredients',id,b.id));b.levels.forEach(id=>ref('building-levels',id,b.id));b.acceleratingHeroes.forEach(id=>{ref('heroes',id,b.id);const hero=db.heroes.find(h=>h.id===id);if(hero&&!hero.buildingBonuses.some(v=>v.buildingId===b.id))errors.push(`${b.id}: reverse hero relation missing`);});}
  for(const l of db['building-levels'])ref('buildings',l.buildingId,l.id);
  for(const r of db.recipes){ref('buildings',r.buildingId,r.id);r.ingredients.forEach(i=>ref('ingredients',i.ingredientId,r.id));}
  for(const i of db.ingredients)i.obtainedFrom.forEach(id=>ref('buildings',id,i.id));
  for(const t of db.teams){t.heroIds.forEach(id=>ref('heroes',id,t.id));if(new Set(t.heroIds).size!==t.heroIds.length||t.heroIds.length>5)errors.push(`${t.id}: invalid team members`);}
  for(const b of db.buildings)for(const reward of b.rewardConditions||[])ref('heroes',reward.heroId,b.id);
  for(const s of db.stages){s.heroIds.forEach(id=>ref('heroes',id,s.id));s.teamIds.forEach(id=>ref('teams',id,s.id));(s.buildingIds||[]).forEach(id=>ref('buildings',id,s.id));(s.artifactIds||[]).forEach(id=>ref('artifacts',id,s.id));}
  for(const a of db.artifacts){a.heroIds.forEach(id=>ref('heroes',id,a.id));a.teamIds.forEach(id=>ref('teams',id,a.id));a.levels.forEach(id=>ref('artifact-levels',id,a.id));for(const effect of a.effects)ref('buildings',effect.buildingId,a.id);}
  for(const l of db['artifact-levels'])ref('artifacts',l.artifactId,l.id);
  for(const f of db.furniture){ref('furniture-sets',f.setId,f.id);f.buildingIds.forEach(id=>ref('buildings',id,f.id));if(f.setId&&!db['furniture-sets'].find(s=>s.id===f.setId)?.furnitureIds.includes(f.id))errors.push(`${f.id}: reverse furniture set relation missing`);}
  for(const s of db['furniture-sets'])s.furnitureIds.forEach(id=>ref('furniture',id,s.id));
  return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let count=0;const errors=[];
  for(const folder of ['data','data/mock']){const db=readDatabase(folder);count+=collectionKeys.reduce((sum,key)=>sum+db[key].length,0);errors.push(...validateDatabase(db,{demo:folder.endsWith('mock')}).map(error=>`${folder}: ${error}`));}
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Validated ${count} records across 14 real and 14 demo collections; schemas and references passed.`);
}
