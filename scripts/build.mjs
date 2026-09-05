import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadStudioConfig, projectRoot } from "./config.mjs";

const source = resolve(projectRoot, "public");
const output = resolve(projectRoot, "dist");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });
cpSync(resolve(projectRoot, "docs"), resolve(output, "docs"), { recursive: true });

const repository = process.env.SVELTIA_CONTENT_REPO || loadStudioConfig().contentRepository;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
  throw new Error("SVELTIA_CONTENT_REPO must use OWNER/REPO format");
}

const siteUrl = process.env.SHIRONE_SITE_URL || "http://127.0.0.1:4322";
if (!/^https?:\/\//.test(siteUrl)) throw new Error("SHIRONE_SITE_URL must be an absolute HTTP(S) URL");

const configPath = resolve(output, "admin/config.yml");
const config = readFileSync(configPath, "utf8")
  .replace("repo: Zig-Bee/shirone-content", `repo: ${repository}`)
  .replaceAll("http://127.0.0.1:4322", siteUrl.replace(/\/$/, ""));
writeFileSync(configPath, config);

const indexPath = resolve(output, "index.html");
const index = readFileSync(indexPath, "utf8").replaceAll(
  "http://127.0.0.1:4322/",
  `${siteUrl.replace(/\/$/, "")}/`,
);
writeFileSync(indexPath, index);

if (!existsSync(indexPath)) throw new Error("Build did not produce index.html");
console.log(`Built Shirone Studio for ${repository} in dist/`);
