import { watch } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
const exec = promisify(execFile);

// One writer, with a trailing run when a save occurs during synchronization.
export function createSyncQueue(run, delay = 300) {
  const state = { phase: 'pending', lastSuccess: null, error: null };
  let timer, running = false, pending = false, closed = false;
  async function flush() {
    if (closed || running) return;
    running = true;
    pending = false;
    state.phase = 'syncing';
    try {
      await run();
      state.lastSuccess = new Date().toISOString();
      state.error = null;
      state.phase = 'ready';
    } catch (error) {
      state.phase = 'error';
      state.error = error.message;
    } finally {
      running = false;
      if (pending && !closed) timer = setTimeout(flush, delay);
    }
  }
  return {
    state,
    request() {
      if (closed) return;
      pending = true;
      state.phase = running ? 'syncing' : 'pending';
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    close() { closed = true; clearTimeout(timer); },
  };
}

export function startPreviewSync(config) {
  const controller = new AbortController();
  const queue = createSyncQueue(async () => {
    for (const script of ['scripts/content/sync.mjs', 'scripts/icons/generate-local-icons.mjs', 'scripts/images/generate-moment-thumbnails.mjs']) {
      await exec(process.execPath, [resolve(config.shironeRoot, script)], {
        cwd: config.shironeRoot,
        env: { ...process.env, CONTENT_DIR: config.contentRoot },
        signal: controller.signal, timeout: 120000, maxBuffer: 4 * 1024 * 1024,
      });
    }
  });
  let watcher;
  try {
    watcher = watch(config.contentRoot, { recursive: true }, (_event, filename) => {
      if (filename && /(^|[/\\])(\.git|node_modules)([/\\]|$)/.test(String(filename))) return;
      queue.request();
    });
    watcher.on('error', error => { queue.close(); queue.state.phase = 'error'; queue.state.error = error.message; });
    queue.request();
  } catch (error) { queue.state.phase = 'error'; queue.state.error = error.message; }
  return { state: queue.state, close() { watcher?.close(); queue.close(); controller.abort(); } };
}
