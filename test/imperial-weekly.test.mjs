import test from 'node:test';
import assert from 'node:assert/strict';
import {imperialWeeklyDayForDate,internalOrderScoring} from '../src/imperial-weekly.js';

test('皇城週記預設日期以台灣時區判斷',()=>{
  assert.equal(imperialWeeklyDayForDate(new Date('2026-10-19T16:30:00.000Z')),'tue');
  assert.equal(imperialWeeklyDayForDate(new Date('2026-10-20T16:30:00.000Z')),'wed');
  assert.equal(imperialWeeklyDayForDate(new Date('2026-10-24T16:30:00.000Z')),'sun');
});

test('星期二內務訂單積分與玩家提供截圖一致',()=>{
  assert.deepEqual(internalOrderScoring,[
    {action:'完成訂單',score:'每次 +100 分'},
    {action:'生產加速',score:'每分鐘 +1 分'},
    {action:'種植加速',score:'每分鐘 +1 分'},
    {action:'購買禮包',score:'每獲得 1 元寶 +1 分（額外贈送不計）'},
  ]);
});
