import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parse } from 'yaml';

export function resolveMedia(root, reference, owner) {
  if (!reference || /^(https?:|data:)/i.test(reference)) return null;
  const value = reference.split(/[?#]/, 1)[0];
  const target = value.startsWith('/') ? resolve(root, 'public', `.${value}`)
    : value.startsWith('assets/') ? resolve(root, value)
    : resolve(dirname(owner), value);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith('../')) throw new Error('媒体路径不能指向内容仓外部');
  return target;
}

/** 对 CMS 已开放的字段检查类型、选项与资源引用；未开放字段保留给主题自身校验。 */
export function validateSettings(root, cms) {
  const errors = [];
  const media = [];
  const files = cms.collections.flatMap(c => c.files ?? []).filter(f => f.format === 'yaml');
  function visit(value, field, owner, key, partial = true) {
    const fail = reason => errors.push(`${key}: ${reason}`);
    if (value === undefined || value === null) {
      if (!partial && field.required !== false && field.default === undefined) fail('缺少必填字段');
      return;
    }
    if (field.widget === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) return fail('应为配置对象');
      for (const child of field.fields) visit(value[child.name], child, owner, `${key}.${child.name}`, partial);
    } else if (field.widget === 'list') {
      if (!Array.isArray(value)) return fail('应为列表');
      value.forEach((item, i) => visit(item, field.field ?? {widget:'object',fields:field.fields}, owner, `${key}[${i}]`, false));
    } else if (field.widget === 'select') {
      const values = field.options.map(o => typeof o === 'object' ? o.value : o);
      for (const item of field.multiple ? (Array.isArray(value) ? value : [value]) : [value]) {
        if (!values.includes(item)) fail(`不支持的选项 ${item}`);
      }
    } else if (field.widget === 'boolean') {
      if (typeof value !== 'boolean') fail('应为开关');
    } else if (field.widget === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) fail('数值超出范围');
    } else if (typeof value !== 'string') {
      fail('应为文字或文件路径');
    } else {
      if (field.pattern && !new RegExp(field.pattern[0]).test(value)) fail(field.pattern[1]);
      if (['image','file'].includes(field.widget) && value) {
        try {
          const target = resolveMedia(root, value, owner);
          if (target) {
            media.push({file:relative(root,target),usedBy:key});
            if (!existsSync(target) || !statSync(target).isFile()) fail(`找不到资源 ${value}`);
          }
        } catch (error) { fail(error.message); }
      }
    }
  }
  for (const file of files) {
    const owner = resolve(root,file.file);
    if (!existsSync(owner)) continue;
    try {
      const data = parse(readFileSync(owner,'utf8'));
      visit(data,{widget:'object',fields:file.fields},owner,file.file);
      if (file.name === 'site') {
        if (data.established) {
          const date = new Date(`${data.established}T00:00:00Z`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data.established) || !Number.isFinite(+date) || date.toISOString().slice(0,10)!==data.established) errors.push('config/site.yaml.established: 建站日期无效');
        }
        if (data.timeZone) {
          try { new Intl.DateTimeFormat('en',{timeZone:data.timeZone}); }
          catch { errors.push('config/site.yaml.timeZone: 时区无效'); }
        }
      }
      if (file.name === 'music') {
        const ids = (data.tracks ?? []).map(t=>t.id);
        if (ids.length !== new Set(ids).size) errors.push('config/music.yaml.tracks: 歌曲编号重复');
        if (data.enable && data.provider === 'custom' && !ids.length) errors.push('config/music.yaml: 开启手动歌单前请添加歌曲');
        if (data.enable && data.provider === 'meting' && !data.meting?.id?.trim()) errors.push('config/music.yaml: 请填写外部歌单 ID');
      }
      if (file.name === 'nav-bar') {
        const inspect = links => (links??[]).forEach(l=>{
          if (!l.preset && (!l.name?.trim() || (!l.url && !l.children?.length))) errors.push('config/nav-bar.yaml: 自定义导航需要名称和地址或子菜单');
          inspect(l.children);
        });
        inspect(data.links);
      }
    } catch (error) { errors.push(`${file.file}: ${error.message}`); }
  }
  return {errors,media};
}
