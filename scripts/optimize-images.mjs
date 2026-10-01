import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, resolve, basename, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=async name=>JSON.parse(await readFile(resolve(root,'data',`${name}.json`),'utf8'));
const artifacts=await load('artifacts'),heroes=await load('heroes');
const inputs=[
  ...artifacts.filter(r=>r.image).map(r=>({path:r.image,variants:{thumbnail:[96,76],detail:[640,82]}})),
  ...heroes.filter(r=>r.image).map(r=>({path:r.image,variants:{detail:[900,85]}})),
  {path:'images/brand-logo.png',variants:{thumbnail:[96,82],icon:[192,82]}},
];
await mkdir(resolve(root,'public/images/optimized'),{recursive:true});
await mkdir(resolve(root,'src/generated'),{recursive:true});
const manifest={},totals={original:0,thumbnail:0,detail:0,icon:0};
// Limit concurrent encoders to keep memory use bounded on local and CI machines.
for(let start=0;start<inputs.length;start+=4){
  await Promise.all(inputs.slice(start,start+4).map(async input=>{
    const bytes=await readFile(resolve(root,'public',input.path));
    const metadata=await sharp(bytes).metadata();
    totals.original+=bytes.length;
    manifest[input.path]={};
    for(const [kind,[width,quality]] of Object.entries(input.variants)){
      const hash=createHash('sha256').update(bytes).update(`webp-v1-${width}-${quality}`).digest('hex').slice(0,12);
      const stem=basename(input.path,extname(input.path));
      const path=`images/optimized/${stem}-${width}-${hash}.webp`;
      const cached=await readFile(resolve(root,'public',path)).catch(error=>{
        if(error.code==='ENOENT')return null;
        throw error;
      });
      const result=cached
        ? {data:cached,info:await sharp(cached).metadata()}
        : await sharp(bytes).autoOrient().resize({width,withoutEnlargement:true})
          .webp({quality,alphaQuality:100,effort:4}).toBuffer({resolveWithObject:true});
      // Resizing/encoding must retain the transparent cutouts.
      if(metadata.hasAlpha&&result.info.channels!==4)throw new Error(`Lost alpha: ${input.path}`);
      if(!cached)await writeFile(resolve(root,'public',path),result.data);
      manifest[input.path][kind]={path,width:result.info.width,height:result.info.height,bytes:result.data.length};
      totals[kind]+=result.data.length;
      if(kind==='icon')await writeFile(resolve(root,'public/images/optimized/favicon.webp'),result.data);
    }
  }));
}
// Sort keys so identical source assets produce an identical manifest.
const ordered=Object.fromEntries(Object.keys(manifest).sort().map(path=>[path,manifest[path]]));
await writeFile(resolve(root,'src/generated/image-variants.json'),JSON.stringify(ordered,null,2)+'\n');
console.log(`Optimized ${inputs.length} images: ${JSON.stringify(totals)} bytes`);
