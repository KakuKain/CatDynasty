import test from 'node:test';
import assert from 'node:assert/strict';
import {readDatabase} from '../scripts/validate-data.mjs';

const db=readDatabase();

test('10/23 updates preserve preview-only and pending details',()=>{
  const event=db.stages.find(record=>record.id==='guide_cloudwood_tw');
  const update=db.stages.find(record=>record.id==='guide_update_20261023_tw');
  const ios=db.stages.find(record=>record.id==='guide_ios_1020_tw');
  assert.equal(event.type,'同盟 PVP');
  assert.equal(event.verified,false);
  assert.match(event.description,/尚待確認/);
  assert.deepEqual([event.releaseStatus,event.announcementDate,event.implementationDate],['announced',null,null]);
  assert.ok(update.sections.find(section=>section.heading.includes('後續活動預告')));
  assert.ok(update.sections.some(section=>section.items.some(item=>item.includes('15:35'))));
  assert.deepEqual([update.releaseStatus,update.announcementDate,update.implementationDate],['implemented',null,'2026-10-23']);
  assert.deepEqual(update.announcedItems.map(item=>item.category),['喵將造型','古寶','御靈']);
  assert.ok(update.announcedItems.every(item=>item.releaseStatus==='announced'&&item.implementationDate===null));
  assert.match(ios.name,/iOS 1\.0\.20/);
  assert.deepEqual([ios.releaseStatus,ios.announcementDate,ios.implementationDate],['released',null,null]);
  assert.ok(ios.sections.some(section=>section.items.some(item=>item.includes('確切發布日期未確認'))));
});

test('six-arts preview uses the shared announcement timeline without inferred dates',()=>{
  const record=db.stages.find(item=>item.id==='guide_sixarts_disassembly_preview_tw');
  assert.deepEqual([record.releaseStatus,record.announcementDate,record.implementationDate],['announced',null,null]);
  assert.equal(record.region,'台灣');
});

test('new community codes remain unverified with no invented expiry or rewards',()=>{
  for(const code of ['親王平安','喵喵獻禮']){
    const record=db['redeem-codes'].find(item=>item.code===code);
    assert.ok(record);
    assert.equal(record.status,'unverified');
    assert.equal(record.verified,false);
    assert.equal(record.endDate,null);
    assert.deepEqual(record.rewards,[]);
    assert.equal(record.sourceListedAt,'2026-10-26');
  }
});
