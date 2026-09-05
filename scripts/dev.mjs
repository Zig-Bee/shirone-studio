import { execFile } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { loadStudioConfig, projectRoot } from "./config.mjs";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { validateSettings } from "./settings-validation.mjs";

import { startPreviewSync } from "./preview-sync.mjs";

let previewSync;
const execFileAsync = promisify(execFile);
const publicRoot = resolve(projectRoot, "public");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".yml": "application/yaml; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

async function previewOnline(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch {
    return false;
  }
}

async function status() {
  const config = loadStudioConfig();
  let localChanges = null;
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {cwd:config.contentRoot});
    localChanges = stdout.trim() ? stdout.trim().split("\n").length : 0;
  } catch { /* An unavailable repository is reported by content.exists. */ }
  return {
    content: {
      exists: existsSync(join(config.contentRoot, ".git")) && existsSync(join(config.contentRoot, "content")),
      label: relative(projectRoot, config.contentRoot),
      localChanges,
    },
    shirone: {
      exists: existsSync(join(config.shironeRoot, "package.json")),
      label: relative(projectRoot, config.shironeRoot),
    },
    preview: { url: config.previewUrl, online: await previewOnline(config.previewUrl), sync: previewSync?.state },
  };
}

async function validate(response) {
  const config = loadStudioConfig();
  try {
    await execFileAsync(process.execPath, [resolve(projectRoot,"scripts/validate-content.mjs")], {cwd:projectRoot,timeout:30000});
    const { stdout, stderr } = await execFileAsync("pnpm", ["content:validate"], {
      cwd: config.shironeRoot,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, CONTENT_DIR: config.contentRoot },
    });
    json(response, 200, { ok: true, output: `${stdout}${stderr}`.trim() || "内容结构与配置检查通过。" });
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`.trim();
    json(response, 200, { ok: false, output: output || error.message });
  }
}

function serveStatic(request, response) {
  const requested = decodeURIComponent(new URL(request.url, `http://${host}:${port}`).pathname);
  const withIndex = requested.endsWith("/") ? `${requested}index.html` : requested;
  const base = requested.startsWith('/docs/') ? resolve(projectRoot,'docs') : publicRoot;
  const localPath = requested.startsWith('/docs/') ? withIndex.slice('/docs'.length) : withIndex;
  const filePath = normalize(resolve(base, `.${localPath}`));
  if (!filePath.startsWith(`${base}/`) && filePath !== base) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mime[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/status") return json(response, 200, await status());
  if (request.method === "GET" && request.url === "/api/settings-media") {
    try {
      const config = parse(readFileSync(resolve(publicRoot,'admin/config.yml'),'utf8'));
      return json(response,200,validateSettings(loadStudioConfig().contentRoot,config));
    } catch (error) {
      return json(response,500,{errors:[`无法读取设置：${error.message}`],media:[]});
    }
  }
  if (request.method === "POST" && request.url === "/api/validate") return validate(response);
  if (request.url?.startsWith("/api/")) return json(response, 404, { error: "Unknown API" });
  serveStatic(request, response);
});

server.on("close", () => previewSync?.close());
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  previewSync?.close();
  server.close(() => process.exit(0));
});

server.listen(port, host, () => {
  previewSync = startPreviewSync(loadStudioConfig());
  console.log(`Shirone Studio: http://${host}:${port}/`);
  console.log(`Sveltia CMS:    http://${host}:${port}/admin/`);
});
