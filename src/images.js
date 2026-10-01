import variants from './generated/image-variants.json';

export function imageAsset(path,kind='detail'){
  return variants[path]?.[kind]||{path,width:null,height:null};
}
