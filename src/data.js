const realFiles = import.meta.glob('../data/*.json', { eager: true, import: 'default' });
const demoFiles = import.meta.glob('../data/mock/*.json', { eager: true, import: 'default' });
const collect = files => Object.fromEntries(Object.entries(files).filter(([path, records]) => Array.isArray(records)).map(([path, records]) => [path.split('/').pop().replace('.json', ''), records]));
export const dataSets = { real: collect(realFiles), demo: collect(demoFiles) };

export const categories = [
  {key:'heroes',name:'喵將',icon:'cat',group:'資料庫'},
  {key:'skills',name:'技能',icon:'sword',group:'資料庫'},
  {key:'buildings',name:'建築',icon:'building',group:'資料庫'},
  {key:'recipes',name:'食譜',icon:'bowl',group:'資料庫'},
  {key:'ingredients',name:'食材',icon:'leaf',group:'資料庫'},
  {key:'artifacts',name:'古寶',icon:'vase',group:'資料庫'},
  {key:'furniture',name:'家具',icon:'chair',group:'資料庫'},
  {key:'guides',name:'關卡與系統',icon:'book',group:'攻略'},
  {key:'teams',name:'隊伍',icon:'people',group:'攻略'},
  {key:'team-builder',name:'隊伍編輯器',icon:'grid',group:'工具'},
  {key:'compare',name:'喵將比較',icon:'compare',group:'工具'},
  {key:'requirements',name:'建築需求',icon:'building',group:'工具'},
  {key:'codes',name:'兌換碼',icon:'gift',group:'其他'},
];
