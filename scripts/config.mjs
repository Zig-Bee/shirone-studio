import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadStudioConfig() {
  const base = readJson(resolve(projectRoot, "studio.config.json"));
  const localPath = resolve(projectRoot, "studio.local.json");
  const local = existsSync(localPath) ? readJson(localPath) : {};
  const config = { ...base, ...local };
  return {
    ...config,
    shironeRoot: resolve(projectRoot, config.shironeRoot),
    contentRoot: resolve(projectRoot, config.contentRoot),
  };
}
