import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { loadStudioConfig, projectRoot } from "./config.mjs";
import { parse } from "yaml";
import { validateSettings } from "./settings-validation.mjs";

const contentRoot = resolve(projectRoot, loadStudioConfig().contentRoot);
const errors = [];
const counts = { posts: 0, moments: 0, media: 0, skills: 0 };

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function frontmatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) errors.push(`${file}: 缺少有效的 YAML frontmatter`);
  return match?.[1] ?? "";
}

function requireKey(block, key, file) {
  if (!new RegExp(`^${key}:\\s*\\S+`, "m").test(block)) {
    errors.push(`${file}: 缺少必填字段 ${key}`);
  }
}

function cleanReference(value) {
  return value.trim().replace(/^['"]|['"]$/g, "").split(/[?#]/, 1)[0];
}

function validateMedia(reference, file) {
  const value = cleanReference(reference);
  if (!value || /^(?:https?:|data:|#|\{\{)/i.test(value)) return;

  const target = value.startsWith("/")
    ? resolve(contentRoot, "public", value.slice(1))
    : resolve(dirname(file), value);
  counts.media += 1;
  if (!existsSync(target) || !statSync(target).isFile()) {
    errors.push(`${file}: 找不到媒体文件 ${value}`);
  }
}

function validateEntry(file, kind) {
  const source = readFileSync(file, "utf8");
  const block = frontmatter(source, file);
  requireKey(block, "published", file);
  if (kind === "posts") requireKey(block, "title", file);

  const zonedFields = kind === "posts" ? ["publishedAt", "updatedAt"] : ["published"];
  for (const key of zonedFields) {
    const match = block.match(new RegExp(`^${key}:\\s*([^#\\r\\n]+)`, "m"));
    const value = match?.[1].trim().replace(/^['"]|['"]$/g, "");
    if (value?.includes("T") && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
      errors.push(`${file}: ${key} 必须包含时区；中国标准时间请使用 +08:00`);
    }
  }

  // 示例文章会在代码块中展示不存在的占位图片；它们不是页面实际引用。
  const renderedSource = source
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, "")
    .replace(/`[^`\n]+`/g, "");

  for (const match of block.matchAll(/^\s*(?:image|src):\s*(.+?)\s*$/gm)) {
    validateMedia(match[1], file);
  }
  for (const match of renderedSource.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
    validateMedia(match[1], file);
  }
  for (const match of renderedSource.matchAll(/<(?:img|source)[^>]+\bsrc=["']([^"']+)["']/gi)) {
    validateMedia(match[1], file);
  }
}

for (const kind of ["posts", "moments"]) {
  const directory = resolve(contentRoot, "content", kind);
  const files = walk(directory).filter((file) => [".md", ".mdx"].includes(extname(file)));
  counts[kind] = files.length;
  for (const file of files) validateEntry(file, kind);
}

const config = readFileSync(resolve(projectRoot, "public/admin/config.yml"), "utf8");
const settings = validateSettings(contentRoot, parse(config));
errors.push(...settings.errors);
counts.media += settings.media.length;
if (!/^media_folder:\s*\/public\/images\/uploads$/m.test(config)) {
  errors.push("CMS 配置缺少全局 media_folder");
}
if (!/^public_folder:\s*\/images\/uploads$/m.test(config)) {
  errors.push("CMS 配置缺少全局 public_folder");
}

try {
  const { validateSkillContent } = await import(resolve(loadStudioConfig().shironeRoot, 'scripts/content/validate-skills.mjs'));
  counts.skills = validateSkillContent(contentRoot).count;
} catch (error) { errors.push(`Skill: ${error.message}`); }

if (errors.length) {
  console.error(`内容检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`内容检查通过：${counts.skills} 个 Skill、${counts.posts} 篇文章、${counts.moments} 条说说、${counts.media} 个本地媒体引用。`);
