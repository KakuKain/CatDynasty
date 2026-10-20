export const imperialWeeklyDays = [
  {id:'mon',weekday:'星期一',theme:'喵將養成'},
  {id:'tue',weekday:'星期二',theme:'內務訂單'},
  {id:'wed',weekday:'星期三',theme:'建築升級'},
  {id:'thu',weekday:'星期四',theme:'喵將覺醒'},
  {id:'fri',weekday:'星期五',theme:'古寶養成'},
  {id:'sat',weekday:'星期六',theme:'商隊配送'},
  {id:'sun',weekday:'星期日',theme:'技術研究'},
];

export const heroGrowthScoring = [
  {action:'喵將祈願',score:'每次 20 分'},
  {action:'喵將升星',score:'藍 10 · 紫 20 · 橙 40 · 紅 60 分'},
  {action:'購買禮包',score:'每獲得 1 元寶 +1 分（額外贈送不計）'},
];

export const internalOrderScoring = [
  {action:'完成訂單',score:'每次 +100 分'},
  {action:'生產加速',score:'每分鐘 +1 分'},
  {action:'種植加速',score:'每分鐘 +1 分'},
  {action:'購買禮包',score:'每獲得 1 元寶 +1 分（額外贈送不計）'},
];

const weekdayIds={Sun:'sun',Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat'};
export function imperialWeeklyDayForDate(date=new Date()){
  const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',weekday:'short'}).format(date);
  return weekdayIds[weekday]||'mon';
}

export const unknownRankingReward = {rank:'－',reward:'－'};
