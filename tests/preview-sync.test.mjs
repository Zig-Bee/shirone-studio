import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { createSyncQueue } from '../scripts/preview-sync.mjs';

test('saves during a sync are serialized and receive a trailing update', async () => {
  let calls = 0, release;
  const queue = createSyncQueue(async () => { calls++; if (calls === 1) await new Promise(r => release = r); }, 1);
  try {
    queue.request();
    while (!release) await wait(5);
    queue.request(); queue.request();
    await wait(10);
    assert.equal(calls, 1);
    release();
    while (calls < 2 || queue.state.phase !== 'ready') await wait(5);
    assert.equal(calls, 2);
    assert.ok(queue.state.lastSuccess);
  } finally { queue.close(); }
});

test('failed updates remain visible and recover on the next save', async () => {
  let fail = true;
  const queue = createSyncQueue(async () => { if (fail) throw Error('invalid configuration'); }, 1);
  try {
    queue.request();
    while (queue.state.phase !== 'error') await wait(5);
    assert.equal(queue.state.lastSuccess, null);
    assert.match(queue.state.error, /invalid configuration/);
    fail = false; queue.request();
    while (queue.state.phase !== 'ready') await wait(5);
    assert.equal(queue.state.error, null);
  } finally { queue.close(); }
});
