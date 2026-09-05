import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { parse } from "yaml";

const root = resolve(import.meta.dirname, "..");
const config = readFileSync(resolve(root, "public/admin/config.yml"), "utf8");
const admin = readFileSync(resolve(root, "public/admin/index.html"), "utf8");

test("CMS version is pinned", () => {
  assert.match(admin, /@sveltia\/cms@0\.205\.3\/dist\/sveltia-cms\.js/);
  assert.doesNotMatch(admin, /@sveltia\/cms\/dist/);
});

test("Shirone collections use content repository paths", () => {
  assert.match(config, /folder: content\/posts/);
  assert.match(config, /folder: content\/moments/);
  assert.match(config, /file: content\/spec\/about\.md/);
  assert.equal(parse(config).collections.find(c => c.name === "posts").path, "{{slug}}/index");
});

test("CMS stores exact publication times in China Standard Time", () => {
  const parsed = parse(config);
  const posts = parsed.collections.find(c => c.name === "posts");
  const moments = parsed.collections.find(c => c.name === "moments");
  for (const field of posts.fields.filter(field => ["publishedAt", "updatedAt"].includes(field.name))) {
    assert.equal(field.input_timezone, "Asia/Shanghai");
    assert.equal(field.output_utc, false);
  }
  const momentPublished = moments.fields.find(field => field.name === "published");
  assert.equal(momentPublished.input_timezone, "Asia/Shanghai");
  assert.equal(momentPublished.output_utc, false);
});

test("media storage has a global fallback and collection-specific paths", () => {
  assert.match(config, /^media_folder: \/public\/images\/uploads$/m);
  assert.match(config, /^public_folder: \/images\/uploads$/m);
  const posts = parse(config).collections.find(c => c.name === "posts");
  assert.equal(posts.media_folder, "");
  assert.equal(posts.public_folder, "");
  assert.match(config, /name: moments[\s\S]*?media_folder: \/public\/images\/moments[\s\S]*?public_folder: \/images\/moments/);
});

test("CMS configuration contains no committed credentials", () => {
  assert.doesNotMatch(config, /(client_secret|access_token|password:)\s*[^#\s]/i);
});

test("local and cloud workflows stay separate", () => {
  assert.match(config, /repo: Zig-Bee\/shirone-content/);
  assert.deepEqual(parse(config).backend.auth_methods, ["token"]);
  assert.match(config, /site_url: http:\/\/127\.0\.0\.1:4322/);
});
