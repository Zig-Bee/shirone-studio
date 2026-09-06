import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { parse, stringify } from 'yaml';
import { validateSettings, resolveMedia } from '../scripts/settings-validation.mjs';

const cms = parse(readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8'));
function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(),'studio-settings-'));
  mkdirSync(resolve(root,'config'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  return {root,write:(name,value)=>writeFileSync(resolve(root,`config/${name}.yaml`),stringify(value))};
}
test('CMS upload paths resolve to real content assets and report missing files',t=>{
  const {root,write}=fixture(t);
  mkdirSync(resolve(root,'assets/images'),{recursive:true});
  writeFileSync(resolve(root,'assets/images/avatar.jpg'),'test');
  write('profile',{avatar:'assets/images/avatar.jpg',name:'',bio:'',links:[]});
  assert.deepEqual(validateSettings(root,cms).errors,[]);
  assert.equal(validateSettings(root,cms).media[0].file,'assets/images/avatar.jpg');
  write('profile',{avatar:'/assets/images/avatar.jpg',name:'',bio:'',links:[]});
  assert.deepEqual(validateSettings(root,cms).errors,[]);
  assert.equal(validateSettings(root,cms).media[0].file,'assets/images/avatar.jpg');
  write('profile',{avatar:'assets/images/missing.jpg'});
  assert.match(validateSettings(root,cms).errors.join(),/找不到资源/);
  assert.throws(()=>resolveMedia(root,'../../outside.jpg',resolve(root,'config/site.yaml')),/内容仓外部/);
});
test('dates, profile URLs and music configuration reject invalid author input',t=>{
  const {root,write}=fixture(t);
  write('site',{established:'2026-02-30',timeZone:'Mars/City'});
  write('profile',{links:[{name:'GitHub',icon:'fa6-brands:github',url:'javascript:alert(1)'}]});
  write('music',{enable:true,provider:'custom',tracks:[],defaultMode:'random'});
  const errors=validateSettings(root,cms).errors.join('\n');
  assert.match(errors,/日期无效/);assert.match(errors,/时区无效/);
  assert.match(errors,/http/);assert.match(errors,/不支持的选项/);assert.match(errors,/添加歌曲/);
});
test('partial overrides, shared identity and intentionally disabled music are valid',t=>{
  const {root,write}=fixture(t);
  write('site',{title:'团子',established:'2026-09-04',timeZone:'Asia/Shanghai',banner:{homeText:{title:'',subtitle:[]}}});
  write('profile',{name:'',bio:'',links:[{name:'GitHub',icon:'fa6-brands:github',url:'https://github.com/Zig-Bee'}]});
  write('music',{enable:false,provider:'custom',tracks:[]});
  write('nav-bar',{links:[{preset:'Home'},{name:'笔记',url:'/archive/'}]});
  assert.deepEqual(validateSettings(root,cms).errors,[]);
});

test('YAML files are validated without explicit format and optional empty URLs are valid', t => {
  const {root,write} = fixture(t);
  const schema = {collections:[{files:[{file:'config/sample.yaml',fields:[
    {name:'url',widget:'string',required:false,pattern:['^https?://','Invalid URL']},
    {name:'enabled',widget:'boolean'}
  ]}]}]};
  write('sample',{url:'',enabled:true});
  assert.deepEqual(validateSettings(root,schema).errors,[]);
  write('sample',{url:'javascript:alert(1)',enabled:'yes'});
  assert.equal(validateSettings(root,schema).errors.length,2);
});
