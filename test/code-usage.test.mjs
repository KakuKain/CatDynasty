import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCodeUsageStore} from '../src/code-usage.js';
import {codeStatus} from '../src/core.js';
import {readDatabase} from '../scripts/validate-data.mjs';

function cookieJar(initial = '') {
  const values = new Map(initial.split(';').filter(Boolean).map(pair => {
    const at = pair.indexOf('=');
    return [pair.slice(0, at).trim(), pair.slice(at + 1)];
  }));
  const writes = [];
  return {
    writes,
    get cookie() { return [...values].map(([name, value]) => `${name}=${value}`).join('; '); },
    set cookie(value) {
      writes.push(value);
      const pair = value.split(';')[0];
      const at = pair.indexOf('=');
      const name = pair.slice(0, at);
      if (value.includes('Max-Age=0;')) values.delete(name);
      else values.set(name, pair.slice(at + 1));
    }
  };
}

test('manual used state survives a new store and can be individually unchecked', () => {
  const document = cookieJar('other=keep');
  const store = createCodeUsageStore({document, path:'/CatDynasty/', secure:true});
  assert.equal(store.set('real', 'code_tw_13', true), true);
  assert.equal(store.set('real', 'code_tw_14', true), true);
  const reloaded = createCodeUsageStore({document, path:'/CatDynasty/', secure:true});
  assert.deepEqual([...reloaded.read('real')], ['code_tw_13', 'code_tw_14']);
  assert.equal(reloaded.set('real', 'code_tw_13', false), true);
  assert.deepEqual([...store.read('real')], ['code_tw_14']);
  assert.match(document.writes[0], /Path=\/CatDynasty\/; Max-Age=31536000; SameSite=Lax; Secure$/);
  assert.doesNotMatch(document.writes[0], /Domain=/);
  assert.equal(reloaded.set('real', 'code_tw_14', false), true);
  assert.equal(document.cookie, 'other=keep');
});

test('real and demo cookies are independent and malformed cookies are recoverable', () => {
  const document = cookieJar('catdynasty_used_codes_v1_real=%broken');
  const store = createCodeUsageStore({document});
  assert.equal(store.read('real').size, 0);
  assert.equal(store.set('demo', 'code_tw_13', true), true);
  assert.equal(store.read('real').has('code_tw_13'), false);
  assert.equal(store.set('real', 'code_tw_14', true), true);
  assert.deepEqual([...store.read('real')], ['code_tw_14']);
  assert.deepEqual([...store.read('demo')], ['code_tw_13']);
  assert.doesNotMatch(document.writes[0], /; Secure/);
});

test('blocked cookie writes report failure and leave existing usage intact', () => {
  const document = {get cookie() { return ''; }, set cookie(value) {}};
  const store = createCodeUsageStore({document});
  assert.equal(store.set('real', 'code_tw_13', true), false);
  assert.equal(store.read('real').size, 0);
  const inaccessible = createCodeUsageStore({document:{get cookie() { throw Error('blocked'); }}});
  assert.equal(inaccessible.read('real').size, 0);
  assert.equal(inaccessible.set('real', 'code_tw_13', true), false);
});

test('new Lota codes retain unverified status and the October 8 expiry boundary', () => {
  const codes = readDatabase()['redeem-codes'];
  const added = codes.filter(c => ['喵喵爭鼎', '我要爭第一', '再跑一個訂單就好'].includes(c.code));
  assert.equal(added.length, 3);
  assert.ok(added.every(c => !c.verified && c.lastTestedAt === null && c.checkedAt === '2026-10-06'));
  const due = added.find(c => c.code === '再跑一個訂單就好');
  assert.equal(due.endDate, '2026-10-08');
  assert.equal(codeStatus(due, '2026-10-08'), 'unverified');
  assert.equal(codeStatus(due, '2026-10-09'), 'expired');
  const before = JSON.stringify(due);
  const store = createCodeUsageStore({document:cookieJar()});
  assert.equal(store.set('real', due.id, true), true);
  assert.equal(JSON.stringify(due), before);
});
