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

test("settings select values match Shirone configuration unions", () => {
  const settings = parse(config).collections.find(c => c.name === "settings");
  const file = name => settings.files.find(item => item.name === name);
  const field = (name, key) => file(name).fields.find(item => item.name === key);
  const values = item => item.options.map(option => typeof option === "string" ? option : option.value);

  assert.deepEqual(values(field("music", "provider")), ["local", "custom", "meting", "mixed"]);
  assert.deepEqual(values(field("music", "defaultMode")), ["sequence", "repeat-one", "shuffle"]);
  assert.deepEqual(values(field("site", "lang")), ["zh_CN", "zh_TW", "en", "ja"]);
  assert.deepEqual(values(field("site", "wallpaperMode").fields[0]), ["banner", "none"]);

  assert.equal(field("sidebar", "blogWorkspace").default, false);
  const sidebar = field("sidebar", "components");
  assert.deepEqual(values(sidebar.fields.find(item => item.name === "type")), [
    "profile", "music", "announcement", "categories", "tags", "stats", "calendar", "toc",
  ]);
  assert.deepEqual(values(sidebar.fields.find(item => item.name === "slot")), ["top", "sticky"]);
  assert.deepEqual(values(sidebar.fields.find(item => item.name === "column")), ["primary", "secondary"]);
  assert.deepEqual(values(sidebar.fields.find(item => item.name === "pages")), [
    "home", "blog", "archive", "friends", "moments", "anime", "compass", "skills", "projects",
    "devices", "timeline", "albums", "about", "categories", "tags", "rss", "atom", "post",
  ]);
});

test('Skill CRUD uses stable UUID paths and separate media, with draft by default', () => {
  const cms = parse(config);
  const skills = cms.collections.find(c => c.name === 'skills');
  const field = name => skills.fields.find(f => f.name === name);
  assert.equal(skills.folder, 'content/skills');
  assert.equal(skills.create, true);
  assert.equal(skills.delete, true);
  assert.equal(skills.slug, '{{fields.id}}');
  assert.equal(skills.path, '{{slug}}/index');
  assert.equal(field('id').widget, 'uuid');
  assert.equal(field('id').readonly, true);
  assert.equal(field('draft').default, true);
  assert.equal(skills.media_folder, '/public/resources/skills{{dirname}}');
  assert.equal(skills.public_folder, '/resources/skills{{dirname}}');
  assert.equal(field('category').collection, 'settings');
  assert.equal(field('category').file, 'skills');
  const settings = cms.collections.find(c => c.name === 'settings').files.find(f => f.name === 'skills');
  assert.equal(settings.format, 'yaml');
  assert.equal(settings.fields.find(f => f.name === 'resourceSource').default, 'collection');
  assert.equal(settings.fields.some(f => f.name === 'resources'), false);
});
