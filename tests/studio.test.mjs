import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

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
  assert.match(config, /path: '\{\{slug\}\}\/index'/);
});

test("CMS configuration contains no committed credentials", () => {
  assert.doesNotMatch(config, /(client_secret|access_token|password:)\s*[^#\s]/i);
});

test("local and cloud workflows stay separate", () => {
  assert.match(config, /repo: local\/shirone-content/);
  assert.match(config, /auth_methods: \[token\]/);
  assert.match(config, /site_url: http:\/\/127\.0\.0\.1:4322/);
});
