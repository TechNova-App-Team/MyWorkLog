#!/usr/bin/env node
/**
 * ArchFlow v2 — Vanilla HTML/CSS/JS Workflow Analyzer
 * Usage:  node analyze.js [project-path]
 * Output: archflow.html  (self-contained, no dependencies)
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(process.argv[2] || '.');
const OUT_HTML = path.join(ROOT, 'archflow.html');

// ─── IGNORE ──────────────────────────────────────────────────────────────────
const IGNORE_DIRS  = new Set(['node_modules','.git','.vscode','dist','build',
  '.next','__pycache__','vendor','.idea','coverage','tmp','.cache','.parcel-cache']);
const IGNORE_FILES = new Set(['.DS_Store','thumbs.db','package-lock.json','yarn.lock']);
const CODE_EXTS    = new Set(['.html','.htm','.js','.mjs','.ts','.css','.scss','.json']);

// ─── WALK ────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (IGNORE_FILES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name)) walk(full, out); }
    else if (CODE_EXTS.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

function rel(p)  { return path.relative(ROOT, p).replace(/\\/g, '/'); }
function ext(p)  { return path.extname(p).toLowerCase().slice(1); }
function base(p) { return path.basename(p); }

function tryResolve(from, ref) {
  if (!ref || /^(https?:|\/\/|data:|mailto:|#|javascript:)/.test(ref)) return null;
  const clean = ref.split('?')[0].split('#')[0];
  const abs   = path.resolve(path.dirname(from), clean);
  for (const c of [abs, abs+'.js', abs+'.mjs', abs+'.ts',
      path.join(abs,'index.js'), path.join(abs,'index.mjs')]) {
    try { fs.accessSync(c); return c; } catch {}
  }
  return null;
}

// ─── AUTO-GROUPING ───────────────────────────────────────────────────────────
const GROUP_KEYWORDS = [
  { key:'dashboard',    label:'Dashboard',        color:'#6c63ff', icon:'📊' },
  { key:'berichtsheft', label:'Berichtsheft',     color:'#3b82f6', icon:'📋' },
  { key:'schatten',     label:'Berichtsheft',     color:'#3b82f6', icon:'📋' },
  { key:'fahrtkost',    label:'Fahrtkosten',      color:'#f59e0b', icon:'🚗' },
  { key:'analytic',     label:'Analytics',        color:'#10b981', icon:'📈' },
  { key:'supabase',     label:'Supabase / DB',    color:'#22d3ee', icon:'🗄️'  },
  { key:'setting',      label:'Einstellungen',    color:'#a855f7', icon:'⚙️'  },
  { key:'auth',         label:'Auth / Login',     color:'#ef4444', icon:'🔐' },
  { key:'login',        label:'Auth / Login',     color:'#ef4444', icon:'🔐' },
  { key:'mobile',       label:'Mobile / PWA',     color:'#f97316', icon:'📱' },
  { key:'pwa',          label:'Mobile / PWA',     color:'#f97316', icon:'📱' },
  { key:'touch',        label:'Mobile / PWA',     color:'#f97316', icon:'📱' },
  { key:'pinch',        label:'Mobile / PWA',     color:'#f97316', icon:'📱' },
  { key:'performance',  label:'Performance',      color:'#84cc16', icon:'⚡' },
  { key:'goal',         label:'Ziele',            color:'#eab308', icon:'🎯' },
  { key:'ziel',         label:'Ziele',            color:'#eab308', icon:'🎯' },
  { key:'aufgab',       label:'Aufgaben',         color:'#fb923c', icon:'✅' },
  { key:'school',       label:'Schule / IHK',     color:'#60a5fa', icon:'🏫' },
  { key:'schule',       label:'Schule / IHK',     color:'#60a5fa', icon:'🏫' },
  { key:'ihk',          label:'Schule / IHK',     color:'#60a5fa', icon:'🏫' },
  { key:'aibot',        label:'AI / Bot',         color:'#c084fc', icon:'🤖' },
  { key:'webllm',       label:'AI / Bot',         color:'#c084fc', icon:'🤖' },
  { key:'ai-',          label:'AI / Bot',         color:'#c084fc', icon:'🤖' },
  { key:'vertrag',      label:'Verträge',         color:'#fb7185', icon:'📝' },
  { key:'storage',      label:'Storage / Sync',   color:'#34d399', icon:'💾' },
  { key:'sync',         label:'Storage / Sync',   color:'#34d399', icon:'💾' },
  { key:'calendar',     label:'Kalender',         color:'#38bdf8', icon:'📅' },
  { key:'kalender',     label:'Kalender',         color:'#38bdf8', icon:'📅' },
  { key:'version',      label:'Version / Update', color:'#94a3b8', icon:'🔄' },
  { key:'update',       label:'Version / Update', color:'#94a3b8', icon:'🔄' },
  { key:'nfc',          label:'NFC / Hardware',   color:'#f472b6', icon:'📡' },
  { key:'notification', label:'Notifications',    color:'#fbbf24', icon:'🔔' },
  { key:'skill',        label:'Skills / Gamif.',  color:'#e879f9', icon:'🏆' },
  { key:'impressum',    label:'Legal',            color:'#6b7280', icon:'⚖️'  },
  { key:'dsgvo',        label:'Legal',            color:'#6b7280', icon:'⚖️'  },
  { key:'rechte',       label:'Legal',            color:'#6b7280', icon:'⚖️'  },
];

function detectGroup(filePath) {
  const name     = base(filePath).toLowerCase();
  const combined = rel(filePath).toLowerCase().replace(/\\/g,'/');
  for (const g of GROUP_KEYWORDS) {
    if (combined.includes(g.key) || name.includes(g.key)) return g;
  }
  const parts = combined.split('/');
  if (parts.length > 1) {
    const folder = parts[parts.length - 2];
    return { key:folder, label:folder.charAt(0).toUpperCase()+folder.slice(1), color:'#64748b', icon:'📁' };
  }
  return { key:'root', label:'Root', color:'#ff6584', icon:'🏠' };
}

// ─── PARSERS ─────────────────────────────────────────────────────────────────
function parseFile(filePath, content) {
  const e     = ext(filePath);
  const edges = [];
  const info  = { functions:[], exports:[], events:[], apis:[],
                  supabase:[], localStorage:[], fetchUrls:[], redirects:[] };

  if (e === 'html' || e === 'htm') {
    for (const m of content.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
      const t = tryResolve(filePath, m[1]);
      if (t) edges.push({ to:t, type:'script_load' });
    }
    for (const m of content.matchAll(/<link[^>]+href=["']([^"'#?][^"']*\.css[^"']*)["']/gi)) {
      const t = tryResolve(filePath, m[1]);
      if (t) edges.push({ to:t, type:'stylesheet' });
    }
    for (const m of content.matchAll(/<a[^>]+href=["']([^"'#?][^"']*)["']/gi)) {
      const t = tryResolve(filePath, m[1]);
      if (t && /\.html?$/i.test(t)) edges.push({ to:t, type:'navigation' });
    }
    const blocks = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
    for (const b of blocks) parseJS(b, filePath, edges, info);
  }

  if (['js','mjs','ts'].includes(e)) {
    for (const m of content.matchAll(/(?:import\s+(?:[^'"]+\s+from\s+)?|require\s*\(\s*)["']([^"']+)["']/g)) {
      const t = tryResolve(filePath, m[1]);
      if (t) edges.push({ to:t, type:'import' });
    }
    for (const m of content.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      const t = tryResolve(filePath, m[1]);
      if (t) edges.push({ to:t, type:'dynamic_import' });
    }
    for (const m of content.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g))
      info.exports.push(m[1]);
    parseJS(content, filePath, edges, info);
  }

  return { edges, info };
}

function parseJS(src, filePath, edges, info) {
  // functions
  for (const m of src.matchAll(/(?:^|[\s;{(])(?:async\s+)?function\s+(\w{2,})\s*\(/gm))
    if (!['if','for','while','switch','catch'].includes(m[1])) info.functions.push(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s+(\w{2,})\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g))
    info.functions.push(m[1]);
  // events
  for (const m of src.matchAll(/addEventListener\s*\(\s*["'](\w+)["']/g)) info.events.push(m[1]);
  for (const m of src.matchAll(/\.on(\w+)\s*=/g)) info.events.push(m[1]);
  // fetch
  for (const m of src.matchAll(/fetch\s*\(\s*[`"']([^`"'\n]{1,200})[`"']/g)) {
    info.fetchUrls.push(m[1]); info.apis.push(m[1]);
    if (/^https?:\/\//.test(m[1])) edges.push({ to:m[1], type:'api_call', external:true });
  }
  for (const m of src.matchAll(/fetch\s*\(`([^`]{1,200})`/g)) {
    const u=m[1].replace(/\$\{[^}]+\}/g,'{…}');
    if (u.includes('/')) info.apis.push(u);
  }
  // supabase
  for (const m of src.matchAll(/\.from\s*\(\s*["'`](\w+)["'`]\s*\)/g)) info.supabase.push('table:'+m[1]);
  for (const m of src.matchAll(/supabase\.(auth|storage|functions|realtime)\b/g)) info.supabase.push(m[1]);
  for (const m of src.matchAll(/\.(select|insert|update|delete|upsert)\s*\(/g)) info.supabase.push('op:'+m[1]);
  // localStorage
  for (const m of src.matchAll(/localStorage\.(get|set|remove)Item\s*\(\s*["'`]([^"'`]+)["'`]/g))
    info.localStorage.push(`${m[1]}("${m[2]}")`);
  // redirects
  for (const m of src.matchAll(/(?:window\.location(?:\.href)?|location\.href)\s*=\s*["'`]([^"'`\n]+)["'`]/g)) {
    const t = tryResolve(filePath, m[1]);
    if (t) { edges.push({ to:t, type:'redirect' }); info.redirects.push(rel(t)); }
  }
  // dedup
  info.functions    = [...new Set(info.functions)].slice(0,40);
  info.events       = [...new Set(info.events)];
  info.supabase     = [...new Set(info.supabase)];
  info.localStorage = [...new Set(info.localStorage)];
  info.apis         = [...new Set(info.apis)].slice(0,20);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log('\n🔍 ArchFlow v2\n'+'─'.repeat(44));
console.log(`📂 ${ROOT}\n`);

const allFiles = walk(ROOT);
console.log(`📄 ${allFiles.length} Dateien\n`);

const nodes  = {};
const edges  = [];
const groups = {};

allFiles.forEach(f => {
  const r = rel(f);
  const g = detectGroup(f);
  const e = ext(f);
  const type = /html?/.test(e)?'page':/[jt]s|mjs/.test(e)?'script':/s?css/.test(e)?'style':e==='json'?'data':'other';
  nodes[r] = { id:r, name:base(f), path:r, ext:e, type, group:g, info:{}, inDegree:0, outDegree:0 };
  if (!groups[g.label]) groups[g.label] = { ...g, files:[] };
  groups[g.label].files.push(r);
});

const edgeSet = new Set();
allFiles.forEach(f => {
  let content;
  try { content = fs.readFileSync(f,'utf8'); } catch { return; }
  const r = rel(f);
  const { edges:fe, info } = parseFile(f, content);
  nodes[r].info = info;

  const bits=[];
  if(info.functions?.length) bits.push(`${info.functions.length}fn`);
  if(info.apis?.length)      bits.push(`${info.apis.length}api`);
  if(info.supabase?.length)  bits.push(`db`);
  console.log(`${/html?/.test(ext(f))?'📄':'⚙️'} ${r}${bits.length?' → '+bits.join(' '):''}`)

  fe.forEach(e => {
    const toKey = e.external ? e.to : (e.to ? rel(e.to) : null);
    if (!toKey) return;
    if (e.external && !nodes[toKey]) {
      let domain;
      try { domain = new URL(toKey.replace(/\{…\}/g,'x')).hostname; } catch { domain = toKey.slice(0,40); }
      nodes[toKey]={ id:toKey, name:domain, path:toKey, ext:'api', type:'api',
        group:{label:'External API',color:'#10b981',icon:'🌐'}, info:{}, inDegree:0, outDegree:0 };
    }
    if (!nodes[toKey]) return;
    const key=`${r}||${toKey}||${e.type}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from:r, to:toKey, type:e.type });
    nodes[r].outDegree++;
    nodes[toKey].inDegree++;
  });
});

const nodeList  = Object.values(nodes);
const groupList = Object.values(groups);
console.log(`\n✅ ${nodeList.length} Nodes | ${edges.length} Kanten | ${groupList.length} Gruppen`);

// ─── HTML VIEWER ─────────────────────────────────────────────────────────────
const DATA = JSON.stringify({ nodes, edges, groups });

const html = /* html */`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>ArchFlow v2 — ${path.basename(ROOT)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap');
:root{
  --bg:#080a10;--s1:#0f1117;--s2:#151821;--s3:#1c2030;
  --b1:#1e2235;--b2:#252a3d;
  --text:#dde4f0;--muted:#4a5578;--muted2:#6b7a9e;
  --acc:#6c63ff;--acc2:#ff6584;--acc3:#43d9ad;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;font-family:'Syne',sans-serif;background:var(--bg);color:var(--text);}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 80% 50% at 50% -5%,rgba(108,99,255,.08),transparent 70%),
  linear-gradient(rgba(108,99,255,.02) 1px,transparent 1px),
  linear-gradient(90deg,rgba(108,99,255,.02) 1px,transparent 1px);
  background-size:100% 100%,36px 36px,36px 36px;}

/* HEADER */
header{position:relative;z-index:50;display:flex;align-items:center;height:54px;
  border-bottom:1px solid var(--b1);background:rgba(8,10,16,.92);backdrop-filter:blur(24px);}
.hlogo{display:flex;align-items:center;gap:10px;padding:0 20px;border-right:1px solid var(--b1);height:100%;}
.hmark{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#6c63ff,#ff6584);
  display:flex;align-items:center;justify-content:center;font-size:14px;}
.htxt{font-size:15px;font-weight:800;letter-spacing:-.5px;}
.hsub{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;}
.hstats{display:flex;height:100%;}
.hstat{display:flex;flex-direction:column;justify-content:center;align-items:center;
  padding:0 18px;border-right:1px solid var(--b1);min-width:65px;}
.hstatv{font-size:20px;font-weight:800;line-height:1;color:var(--acc);}
.hstatl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);
  font-family:'JetBrains Mono',monospace;margin-top:2px;}
.hbtns{display:flex;align-items:center;gap:6px;padding:0 14px;margin-left:auto;}
.hbtn{background:var(--s2);border:1px solid var(--b2);color:var(--muted2);padding:5px 12px;
  border-radius:7px;font-size:11px;font-family:'Syne',sans-serif;font-weight:700;
  cursor:pointer;transition:all .18s;display:flex;align-items:center;gap:5px;}
.hbtn:hover{border-color:var(--acc);color:var(--text);}
.hbtn.on{background:rgba(108,99,255,.15);border-color:var(--acc);color:#a5b4fc;}

/* APP */
.app{display:flex;height:calc(100vh - 54px);position:relative;z-index:1;}

/* LEFT PANEL */
.lp{width:252px;flex-shrink:0;border-right:1px solid var(--b1);
  background:var(--s1);display:flex;flex-direction:column;overflow:hidden;}
.lp-srch{padding:10px 12px;border-bottom:1px solid var(--b1);}
.lp-srch input{width:100%;background:var(--s3);border:1px solid var(--b2);
  color:var(--text);padding:7px 11px;border-radius:9px;font-size:11px;
  font-family:'JetBrains Mono',monospace;outline:none;transition:border .18s;}
.lp-srch input:focus{border-color:var(--acc);}
.lp-f{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--b1);flex-wrap:wrap;}
.fb{padding:3px 8px;border-radius:20px;border:1px solid var(--b2);background:transparent;
  color:var(--muted);font-size:10px;cursor:pointer;font-family:'Syne',sans-serif;
  font-weight:700;transition:all .12s;white-space:nowrap;}
.fb:hover,.fb.on{background:var(--s3);color:var(--text);border-color:var(--b2);}
.lp-list{flex:1;overflow-y:auto;padding:5px;}
.lp-list::-webkit-scrollbar{width:3px;}
.lp-list::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px;}
.lg{margin-bottom:3px;}
.lg-hdr{display:flex;align-items:center;gap:6px;padding:6px 9px;border-radius:8px;
  cursor:pointer;transition:background .12s;user-select:none;}
.lg-hdr:hover{background:var(--s2);}
.lg-dot{width:7px;height:7px;border-radius:2px;flex-shrink:0;}
.lg-name{font-size:11px;font-weight:700;flex:1;}
.lg-cnt{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.lg-arr{font-size:10px;color:var(--muted);transition:transform .18s;}
.lg-arr.open{transform:rotate(90deg);}
.lg-files{display:none;padding-left:3px;}
.lg-files.open{display:block;}
.lf{display:flex;align-items:center;gap:7px;padding:4px 9px;border-radius:7px;
  cursor:pointer;transition:background .1s;font-family:'JetBrains Mono',monospace;}
.lf:hover{background:var(--s2);}
.lf.sel{background:rgba(108,99,255,.14);outline:1px solid rgba(108,99,255,.25);}
.lf-name{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.lf-badge{font-size:8px;padding:1px 4px;border-radius:4px;font-weight:700;
  text-transform:uppercase;flex-shrink:0;}

/* CANVAS */
.cv{flex:1;position:relative;overflow:hidden;}
#cvs{width:100%;height:100%;display:block;cursor:grab;}
#cvs:active{cursor:grabbing;}

/* RIGHT PANEL */
.rp{width:0;flex-shrink:0;border-left:1px solid var(--b1);background:var(--s1);
  overflow:hidden;transition:width .26s cubic-bezier(.4,0,.2,1);}
.rp.open{width:290px;}
.rp-in{width:290px;height:100%;overflow-y:auto;padding:16px 14px;}
.rp-in::-webkit-scrollbar{width:3px;}
.rp-in::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px;}
.rp-close{float:right;background:var(--s2);border:1px solid var(--b1);
  color:var(--muted);width:22px;height:22px;border-radius:5px;cursor:pointer;
  font-size:11px;display:flex;align-items:center;justify-content:center;}
.rp-close:hover{color:var(--text);}
.rp-icon{font-size:26px;margin:8px 0 5px;}
.rp-name{font-size:14px;font-weight:800;word-break:break-all;line-height:1.3;}
.rp-path{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;
  margin-top:3px;word-break:break-all;line-height:1.5;}
.rp-grp{display:inline-flex;align-items:center;gap:5px;margin-top:7px;
  padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;border-width:1px;border-style:solid;}
.rsec{margin-bottom:13px;margin-top:14px;}
.rsec-t{font-size:8px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);
  font-family:'JetBrains Mono',monospace;margin-bottom:7px;display:flex;align-items:center;gap:5px;}
.rsec-t::after{content:'';flex:1;height:1px;background:var(--b1);}
.chips{display:flex;flex-wrap:wrap;gap:3px;}
.chip{padding:2px 7px;border-radius:5px;font-size:9px;font-family:'JetBrains Mono',monospace;
  background:var(--s3);border:1px solid var(--b2);color:var(--muted2);
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.chip.g{border-color:rgba(16,185,129,.3);color:#34d399;background:rgba(16,185,129,.07);}
.chip.p{border-color:rgba(168,85,247,.3);color:#c084fc;background:rgba(168,85,247,.07);}
.chip.a{border-color:rgba(245,158,11,.3);color:#fbbf24;background:rgba(245,158,11,.07);}
.cr{display:flex;align-items:center;gap:7px;padding:5px 9px;border-radius:7px;
  background:var(--s2);margin-bottom:3px;cursor:pointer;transition:background .1s;}
.cr:hover{background:var(--s3);}
.cr-dot{width:6px;height:6px;border-radius:2px;flex-shrink:0;}
.cr-name{font-size:10px;font-family:'JetBrains Mono',monospace;flex:1;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cr-type{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;}

/* FLOAT CONTROLS */
.zctrl{position:absolute;bottom:18px;right:18px;display:flex;flex-direction:column;gap:4px;z-index:10;}
.zbtn{width:32px;height:32px;background:var(--s1);border:1px solid var(--b2);color:var(--text);
  border-radius:7px;cursor:pointer;font-size:15px;font-family:monospace;
  display:flex;align-items:center;justify-content:center;transition:all .18s;}
.zbtn:hover{border-color:var(--acc);color:var(--acc);}
.zlvl{width:32px;height:20px;background:var(--s1);border:1px solid var(--b1);
  border-radius:4px;font-size:9px;font-family:'JetBrains Mono',monospace;color:var(--muted);
  display:flex;align-items:center;justify-content:center;}

.legend{position:absolute;bottom:18px;left:18px;background:rgba(15,17,23,.9);
  border:1px solid var(--b1);border-radius:10px;padding:10px 13px;z-index:10;}
.lr{display:flex;align-items:center;gap:7px;font-size:10px;color:var(--muted2);
  margin-bottom:4px;font-family:'JetBrains Mono',monospace;}
.lr:last-child{margin:0;}
.ll{width:20px;height:2px;border-radius:2px;}

/* TOOLTIP */
#tt{position:fixed;background:var(--s2);border:1px solid var(--b2);border-radius:9px;
  padding:9px 12px;font-size:11px;font-family:'JetBrains Mono',monospace;
  pointer-events:none;z-index:300;display:none;max-width:240px;
  box-shadow:0 10px 36px rgba(0,0,0,.6);}
.ttn{font-weight:700;margin-bottom:2px;color:var(--text);font-family:'Syne',sans-serif;font-size:12px;}
.ttp{color:var(--acc);font-size:9px;margin-bottom:5px;}
.ttr{display:flex;justify-content:space-between;gap:10px;color:var(--muted2);font-size:10px;margin-bottom:1px;}
.ttv{color:var(--text);}
</style>
</head>
<body>
<header>
  <div class="hlogo">
    <div class="hmark">🗺️</div>
    <div><div class="htxt">ArchFlow</div><div class="hsub">${path.basename(ROOT)}</div></div>
  </div>
  <div class="hstats">
    <div class="hstat"><div class="hstatv" id="sn">0</div><div class="hstatl">Nodes</div></div>
    <div class="hstat"><div class="hstatv" id="se">0</div><div class="hstatl">Kanten</div></div>
    <div class="hstat"><div class="hstatv" id="sg">0</div><div class="hstatl">Gruppen</div></div>
    <div class="hstat"><div class="hstatv" id="sa">0</div><div class="hstatl">API-Calls</div></div>
  </div>
  <div class="hbtns">
    <button class="hbtn on" id="btn-group" onclick="setLayout('group')">⬡ Gruppen</button>
    <button class="hbtn" id="btn-hier"  onclick="setLayout('hier')">⬇ Hierarchisch</button>
    <button class="hbtn" onclick="fitView()">🎯 Fit</button>
    <button class="hbtn" onclick="exportPNG()">⬇ PNG</button>
  </div>
</header>
<div class="app">
  <aside class="lp">
    <div class="lp-srch"><input id="srch" type="text" placeholder="🔍 Datei suchen…" oninput="filterList()"></div>
    <div class="lp-f" id="filters"></div>
    <div class="lp-list" id="lplist"></div>
  </aside>
  <div class="cv" id="cvwrap">
    <canvas id="cvs"></canvas>
    <div class="zctrl">
      <button class="zbtn" onclick="zoom(1.2)">+</button>
      <div class="zlvl" id="zlvl">100%</div>
      <button class="zbtn" onclick="zoom(.83)">−</button>
    </div>
    <div class="legend">
      <div class="lr"><div class="ll" style="background:#3b82f6"></div>Navigation</div>
      <div class="lr"><div class="ll" style="background:#f59e0b"></div>Import / Script</div>
      <div class="lr"><div class="ll" style="background:#10b981"></div>API Call</div>
      <div class="lr"><div class="ll" style="background:#ff6584"></div>Redirect</div>
      <div class="lr"><div class="ll" style="background:#a855f7;opacity:.5"></div>Stylesheet</div>
    </div>
  </div>
  <div class="rp" id="rp"><div class="rp-in" id="rpin"></div></div>
</div>
<div id="tt"></div>

<script>
const RAW    = ${DATA};
const NODES  = Object.values(RAW.nodes);
const EDGES  = RAW.edges;
const GROUPS = Object.values(RAW.groups);

const TC = {page:'#3b82f6',script:'#f59e0b',style:'#a855f7',data:'#ef4444',api:'#10b981',other:'#64748b'};
const TE = {page:'📄',script:'⚙️',style:'🎨',data:'📋',api:'🌐',other:'📦'};
const EC = {
  import:'rgba(245,158,11,.7)',require:'rgba(245,158,11,.7)',dynamic_import:'rgba(245,158,11,.45)',
  script_load:'rgba(168,85,247,.7)',stylesheet:'rgba(168,85,247,.3)',
  navigation:'rgba(59,130,246,.8)',api_call:'rgba(16,185,129,.8)',
  redirect:'rgba(255,101,132,.95)',form_submit:'rgba(255,165,0,.7)'
};
const NW=164,NH=46,NR=11,GPAD=36,GGAP=52,NGAPX=22,NGAPY=44;

let tx=0,ty=0,sc=1,dragging=false,ds={x:0,y:0};
let positions={};
let layout='group';
let sel=null,hov=null;
let filterType='all',searchQ='';
const dpr=window.devicePixelRatio||1;
const cvs=document.getElementById('cvs');
const ctx=cvs.getContext('2d');
const wrap=document.getElementById('cvwrap');

// Stats
document.getElementById('sn').textContent=NODES.length;
document.getElementById('se').textContent=EDGES.length;
document.getElementById('sg').textContent=GROUPS.length;
document.getElementById('sa').textContent=NODES.reduce((a,n)=>a+(n.info?.apis?.length||0),0);

// Resize
function resize(){
  const W=wrap.clientWidth,H=wrap.clientHeight;
  cvs.width=W*dpr;cvs.height=H*dpr;
  cvs.style.width=W+'px';cvs.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  render();
}
window.addEventListener('resize',resize);

// ─── LAYOUTS ─────────────────────────────────────────────────────────────────
function computeGroup(){
  const pos={};
  const W=wrap.clientWidth;
  const sorted=[...GROUPS].sort((a,b)=>b.files.length-a.files.length);
  const cols=Math.max(2,Math.ceil(Math.sqrt(sorted.length*1.4)));
  const colW=Math.max(380,W/cols);

  sorted.forEach((g,gi)=>{
    const col=gi%cols,row=Math.floor(gi/cols);
    const files=g.files.filter(f=>RAW.nodes[f]);
    const npr=Math.max(1,Math.floor((colW-GPAD*2+NGAPX)/(NW+NGAPX)));
    const rows=Math.ceil(files.length/npr);
    const bW=GPAD*2+npr*(NW+NGAPX)-NGAPX;
    const bH=GPAD*2+28+rows*(NH+NGAPY)-NGAPY;
    const ox=60+col*(Math.max(bW,colW)+GGAP);
    const oy=60+row*(bH+GGAP);
    g._box={ox,oy,bW,bH,npr};
    files.forEach((fid,fi)=>{
      const r=fi%npr,c=Math.floor(fi/npr);
      pos[fid]={x:ox+GPAD+r*(NW+NGAPX)+NW/2, y:oy+GPAD+28+c*(NH+NGAPY)+NH/2};
    });
  });
  return pos;
}

function computeHier(){
  const pos={};
  const W=wrap.clientWidth;
  const visited=new Set();
  const levels=[];
  let queue=NODES.filter(n=>n.type==='page'&&n.inDegree===0).map(n=>n.id);
  if(!queue.length) queue=NODES.filter(n=>n.type==='page').slice(0,6).map(n=>n.id);

  while(queue.length){
    levels.push([...queue]);
    queue.forEach(id=>visited.add(id));
    const next=[];
    queue.forEach(id=>{
      EDGES.filter(e=>e.from===id&&!visited.has(e.to)).forEach(e=>{if(!next.includes(e.to))next.push(e.to);});
    });
    queue=next.filter(id=>!visited.has(id));
  }
  const rem=NODES.filter(n=>!visited.has(n.id)).map(n=>n.id);
  if(rem.length) levels.push(rem);

  levels.forEach((lv,li)=>{
    lv.forEach((id,ni)=>{
      pos[id]={x:(W/(lv.length+1))*(ni+1), y:80+li*140};
    });
  });
  return pos;
}

// ─── CANVAS RENDER ───────────────────────────────────────────────────────────
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
function ha(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}
function s2w(x,y){return{x:(x-tx)/sc,y:(y-ty)/sc};}

function render(){
  const W=wrap.clientWidth,H=wrap.clientHeight;
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.translate(tx,ty);
  ctx.scale(sc,sc);

  // Group boxes
  if(layout==='group'){
    GROUPS.forEach(g=>{
      if(!g._box) return;
      const{ox,oy,bW,bH}=g._box;
      const c=g.color||'#64748b';
      ctx.save();
      ctx.fillStyle=ha(c,.055);
      ctx.strokeStyle=ha(c,.22);
      ctx.lineWidth=1.5;
      rr(ox,oy,bW,bH,14);ctx.fill();ctx.stroke();
      ctx.font='700 12px Syne,sans-serif';
      ctx.fillStyle=ha(c,.88);
      ctx.fillText(g.icon+' '+g.label,ox+12,oy+19);
      ctx.font='9px JetBrains Mono,monospace';
      ctx.fillStyle='rgba(74,85,120,.8)';
      ctx.textAlign='right';
      ctx.fillText(g.files.length+' files',ox+bW-10,oy+19);
      ctx.textAlign='left';
      ctx.restore();
    });
  }

  // Edges
  const isFilt=sel!==null;
  EDGES.forEach(e=>{
    const a=positions[e.from],b=positions[e.to];
    if(!a||!b) return;
    const conn=sel&&(e.from===sel||e.to===sel);
    ctx.globalAlpha=isFilt?(conn?1:.04):.65;
    const color=EC[e.type]||'rgba(100,116,139,.35)';
    const dashed=e.type==='stylesheet';
    const dx=b.x-a.x,dy=b.y-a.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
    const nx=-dy/dist,ny=dx/dist,bend=Math.min(dist*.2,55);
    const cx=(a.x+b.x)/2+nx*bend,cy=(a.y+b.y)/2+ny*bend;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.quadraticCurveTo(cx,cy,b.x,b.y);
    ctx.strokeStyle=conn?color.replace(/[\d.]+\)$/,'1)'):color;
    ctx.lineWidth=conn?2.2:1.1;
    ctx.setLineDash(dashed?[4,3]:[]);
    ctx.stroke();ctx.setLineDash([]);
    // Arrow
    const t=.9;
    const ax=(1-t)*(1-t)*a.x+2*(1-t)*t*cx+t*t*b.x;
    const ay=(1-t)*(1-t)*a.y+2*(1-t)*t*cy+t*t*b.y;
    const ang=Math.atan2(b.y-ay,b.x-ax),asz=conn?7:5;
    ctx.beginPath();
    ctx.moveTo(b.x,b.y);
    ctx.lineTo(b.x-asz*Math.cos(ang-.4),b.y-asz*Math.sin(ang-.4));
    ctx.lineTo(b.x-asz*Math.cos(ang+.4),b.y-asz*Math.sin(ang+.4));
    ctx.closePath();
    ctx.fillStyle=conn?color.replace(/[\d.]+\)$/,'1)'):color;
    ctx.fill();
    ctx.globalAlpha=1;
  });

  // Nodes
  NODES.forEach(n=>{
    const p=positions[n.id];if(!p) return;
    const isSel=n.id===sel,isHov=n.id===hov;
    const conn=sel&&(n.id===sel||EDGES.some(e=>(e.from===sel&&e.to===n.id)||(e.to===sel&&e.from===n.id)));
    ctx.globalAlpha=isFilt?(conn?1:.12):1;
    const color=n.group?.color||TC[n.type]||'#64748b';
    const x=p.x-NW/2,y=p.y-NH/2;

    if(isSel||isHov){ctx.shadowColor=color;ctx.shadowBlur=isSel?18:9;}
    // BG
    ctx.fillStyle=ha(color,isSel?.2:.09);
    rr(x,y,NW,NH,NR);ctx.fill();
    // Border
    ctx.strokeStyle=ha(color,isSel?1:isHov?.75:.4);
    ctx.lineWidth=isSel?2:1.4;
    rr(x,y,NW,NH,NR);ctx.stroke();
    ctx.shadowBlur=0;ctx.shadowColor='transparent';

    // Left accent bar
    ctx.fillStyle=ha(color,.65);
    ctx.beginPath();
    ctx.moveTo(x,y+NR);ctx.quadraticCurveTo(x,y,x+NR,y);
    ctx.lineTo(x+5,y);ctx.lineTo(x+5,y+NH);ctx.lineTo(x+NR,y+NH);
    ctx.quadraticCurveTo(x,y+NH,x,y+NH-NR);ctx.closePath();ctx.fill();

    // Emoji
    ctx.font='12px serif';ctx.fillText(TE[n.type]||'📦',x+10,p.y+4);

    // Name — truncate to fit
    ctx.font=(isSel?'700 ':'500 ')+'11px Syne,sans-serif';
    ctx.fillStyle='#dde4f0';
    let nm=n.name;
    const maxW=NW-36;
    while(ctx.measureText(nm).width>maxW&&nm.length>3) nm=nm.slice(0,-1);
    if(nm!==n.name) nm=nm.slice(0,-1)+'…';
    ctx.fillText(nm,x+26,p.y-4);

    // Group label
    ctx.font='8px JetBrains Mono,monospace';
    ctx.fillStyle=ha(color,.75);
    const gl=(n.group?.label||n.type).slice(0,22);
    ctx.fillText(gl,x+26,p.y+8);

    // Degree
    if(n.inDegree+n.outDegree>0){
      ctx.font='7px JetBrains Mono,monospace';
      ctx.fillStyle=ha(color,.65);
      ctx.textAlign='right';
      ctx.fillText('↓'+n.inDegree+' ↑'+n.outDegree,x+NW-4,y+10);
      ctx.textAlign='left';
    }

    // Supabase indicator
    if(n.info?.supabase?.length){
      ctx.fillStyle='#22d3ee';ctx.font='8px serif';
      ctx.fillText('🗄️',x+NW-20,p.y+5);
    }
    // API indicator
    if(n.info?.apis?.length){
      ctx.fillStyle='#10b981';ctx.font='8px serif';
      ctx.fillText('🌐',x+NW-34,p.y+5);
    }

    ctx.globalAlpha=1;
  });

  ctx.restore();
}

// ─── LAYOUT SWITCH ───────────────────────────────────────────────────────────
function setLayout(l){
  layout=l;
  ['group','hier'].forEach(id=>document.getElementById('btn-'+id)?.classList.remove('on'));
  document.getElementById('btn-'+l)?.classList.add('on');
  positions=l==='hier'?computeHier():computeGroup();
  fitView();
}

function fitView(){
  const pts=Object.values(positions);if(!pts.length) return;
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const minX=Math.min(...xs)-NW,maxX=Math.max(...xs)+NW;
  const minY=Math.min(...ys)-NH,maxY=Math.max(...ys)+NH;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  sc=Math.min(W/(maxX-minX),H/(maxY-minY),.95)*.9;
  tx=W/2-((minX+maxX)/2)*sc;ty=H/2-((minY+maxY)/2)*sc;
  document.getElementById('zlvl').textContent=Math.round(sc*100)+'%';
  render();
}

function zoom(f){
  sc=Math.max(.06,Math.min(5,sc*f));
  document.getElementById('zlvl').textContent=Math.round(sc*100)+'%';
  render();
}

// ─── INTERACTION ─────────────────────────────────────────────────────────────
function nodeAt(sx,sy){
  const{x:wx,y:wy}=s2w(sx,sy);
  return NODES.find(n=>{
    const p=positions[n.id];if(!p) return false;
    return wx>=p.x-NW/2&&wx<=p.x+NW/2&&wy>=p.y-NH/2&&wy<=p.y+NH/2;
  });
}

cvs.addEventListener('mousedown',e=>{
  const n=nodeAt(e.offsetX,e.offsetY);
  if(n){selectNode(n.id);return;}
  dragging=true;ds={x:e.clientX-tx,y:e.clientY-ty};
  if(sel){sel=null;closeDetail();render();}
});
window.addEventListener('mousemove',e=>{
  if(dragging){tx=e.clientX-ds.x;ty=e.clientY-ds.y;render();return;}
  const rect=cvs.getBoundingClientRect();
  const n=nodeAt(e.clientX-rect.left,e.clientY-rect.top);
  const prev=hov;hov=n?n.id:null;
  if(n) showTT(e,n); else hideTT();
  if(hov!==prev||sel) render();
});
window.addEventListener('mouseup',()=>dragging=false);
cvs.addEventListener('wheel',e=>{
  e.preventDefault();
  const rect=cvs.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  const{x:wx,y:wy}=s2w(mx,my);
  sc=Math.max(.06,Math.min(5,sc*(e.deltaY>0?.88:1.14)));
  tx=mx-wx*sc;ty=my-wy*sc;
  document.getElementById('zlvl').textContent=Math.round(sc*100)+'%';
  render();
},{passive:false});

function selectNode(id){
  sel=id;
  document.querySelectorAll('.lf').forEach(el=>el.classList.toggle('sel',el.dataset.id===id));
  showDetail(id);render();
}

function closeDetail(){
  sel=null;
  document.getElementById('rp').classList.remove('open');
  document.querySelectorAll('.lf').forEach(el=>el.classList.remove('sel'));
  render();
}

function scrollTo(id){
  const p=positions[id];if(!p) return;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  tx=W/2-p.x*sc;ty=H/2-p.y*sc;render();
}

function showDetail(id){
  const n=RAW.nodes[id];if(!n) return;
  const color=n.group?.color||TC[n.type]||'#64748b';
  const out=EDGES.filter(e=>e.from===id);
  const inn=EDGES.filter(e=>e.to===id);
  const info=n.info||{};

  const hxa=(hex,a)=>{
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  };

  let h='<button class="rp-close" onclick="closeDetail()">✕</button>';
  h+='<div class="rp-icon">'+(n.group?.icon||TE[n.type]||'📦')+'</div>';
  h+='<div class="rp-name">'+n.name+'</div>';
  h+='<div class="rp-path">'+n.path+'</div>';
  h+='<div class="rp-grp" style="background:'+hxa(color,.1)+';border-color:'+hxa(color,.3)+';color:'+color+'">'+
    (n.group?.icon||'')+' '+(n.group?.label||n.type)+'</div>';

  // Connections
  h+='<div class="rsec"><div class="rsec-t">Verbindungen</div>';
  h+='<div class="chips" style="margin-bottom:7px"><span class="chip a">'+n.type+'</span>'+
    '<span class="chip a">↓'+n.inDegree+' eingehend</span>'+
    '<span class="chip a">↑'+n.outDegree+' ausgehend</span></div>';
  out.slice(0,14).forEach(e=>{
    const tn=RAW.nodes[e.to];const c2=tn?.group?.color||TC[tn?.type]||'#64748b';
    h+='<div class="cr" onclick="selectNode(\''+e.to+'\');scrollTo(\''+e.to+'\')">'+
      '<div class="cr-dot" style="background:'+c2+'"></div>'+
      '<span class="cr-name">'+(tn?.name||e.to)+'</span>'+
      '<span class="cr-type">'+e.type.replace(/_/g,' ')+'</span></div>';
  });
  if(out.length>14) h+='<div style="font-size:9px;color:var(--muted);padding:3px 9px">+'+(out.length-14)+' weitere…</div>';
  h+='</div>';

  if(inn.length){
    h+='<div class="rsec"><div class="rsec-t">Eingehend von</div>';
    inn.slice(0,8).forEach(e=>{
      const fn=RAW.nodes[e.from];const c2=fn?.group?.color||TC[fn?.type]||'#64748b';
      h+='<div class="cr" onclick="selectNode(\''+e.from+'\');scrollTo(\''+e.from+'\')">'+
        '<div class="cr-dot" style="background:'+c2+'"></div>'+
        '<span class="cr-name">'+(fn?.name||e.from)+'</span>'+
        '<span class="cr-type">'+e.type.replace(/_/g,' ')+'</span></div>';
    });
    h+='</div>';
  }

  if(info.functions?.length){
    h+='<div class="rsec"><div class="rsec-t">⚙️ Funktionen ('+info.functions.length+')</div><div class="chips">';
    info.functions.slice(0,28).forEach(f=>{h+='<span class="chip">'+f+'()</span>';});
    h+='</div></div>';
  }
  if(info.events?.length){
    h+='<div class="rsec"><div class="rsec-t">⚡ Events</div><div class="chips">';
    info.events.forEach(e=>{h+='<span class="chip p">'+e+'</span>';});
    h+='</div></div>';
  }
  if(info.supabase?.length){
    h+='<div class="rsec"><div class="rsec-t">🗄️ Supabase DB</div><div class="chips">';
    [...new Set(info.supabase)].forEach(s=>{h+='<span class="chip g">'+s+'</span>';});
    h+='</div></div>';
  }
  if(info.apis?.length){
    h+='<div class="rsec"><div class="rsec-t">🌐 API Calls ('+info.apis.length+')</div><div class="chips">';
    info.apis.slice(0,10).forEach(a=>{
      const short=a.length>38?a.slice(0,36)+'…':a;
      h+='<span class="chip g" title="'+a+'">'+short+'</span>';
    });
    h+='</div></div>';
  }
  if(info.localStorage?.length){
    h+='<div class="rsec"><div class="rsec-t">💾 localStorage</div><div class="chips">';
    info.localStorage.forEach(s=>{h+='<span class="chip">'+s+'</span>';});
    h+='</div></div>';
  }
  if(info.fetchUrls?.length){
    h+='<div class="rsec"><div class="rsec-t">📡 Fetch URLs</div><div class="chips">';
    info.fetchUrls.slice(0,8).forEach(u=>{
      h+='<span class="chip g" title="'+u+'">'+(u.length>36?u.slice(0,34)+'…':u)+'</span>';
    });
    h+='</div></div>';
  }
  if(info.exports?.length){
    h+='<div class="rsec"><div class="rsec-t">📤 Exports</div><div class="chips">';
    info.exports.slice(0,16).forEach(e=>{h+='<span class="chip a">'+e+'</span>';});
    h+='</div></div>';
  }
  if(info.redirects?.length){
    h+='<div class="rsec"><div class="rsec-t">↪️ Redirects</div><div class="chips">';
    info.redirects.forEach(r=>{h+='<span class="chip p">'+r+'</span>';});
    h+='</div></div>';
  }

  document.getElementById('rpin').innerHTML=h;
  document.getElementById('rp').classList.add('open');
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const ttEl=document.getElementById('tt');
function showTT(e,n){
  ttEl.innerHTML='<div class="ttn">'+(n.group?.icon||TE[n.type]||'📦')+' '+n.name+'</div>'+
    '<div class="ttp">'+n.path+'</div>'+
    '<div class="ttr"><span>Gruppe</span><span class="ttv">'+(n.group?.label||n.type)+'</span></div>'+
    '<div class="ttr"><span>↓ Eingehend</span><span class="ttv">'+n.inDegree+'</span></div>'+
    '<div class="ttr"><span>↑ Ausgehend</span><span class="ttv">'+n.outDegree+'</span></div>'+
    (n.info?.functions?.length?'<div class="ttr"><span>Funktionen</span><span class="ttv">'+n.info.functions.length+'</span></div>':'')+
    (n.info?.supabase?.length?'<div class="ttr"><span>DB ops</span><span class="ttv">'+n.info.supabase.length+'</span></div>':'')+
    (n.info?.apis?.length?'<div class="ttr"><span>API calls</span><span class="ttv">'+n.info.apis.length+'</span></div>':'');
  ttEl.style.display='block';
  ttEl.style.left=(e.clientX+14)+'px';
  ttEl.style.top=(e.clientY-8)+'px';
}
function hideTT(){ttEl.style.display='none';}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const FTYPES=[{id:'all',label:'Alle'},{id:'page',label:'📄 HTML'},{id:'script',label:'⚙️ JS'},
  {id:'style',label:'🎨 CSS'},{id:'api',label:'🌐 API'},{id:'data',label:'📋 JSON'}];
const filtersEl=document.getElementById('filters');
FTYPES.forEach(f=>{
  const b=document.createElement('button');
  b.className='fb'+(f.id==='all'?' on':'');b.textContent=f.label;
  b.onclick=()=>{filterType=f.id;filtersEl.querySelectorAll('.fb').forEach(x=>x.classList.remove('on'));b.classList.add('on');buildList();};
  filtersEl.appendChild(b);
});

function filterList(){searchQ=document.getElementById('srch').value.toLowerCase();buildList();}

function buildList(){
  const list=document.getElementById('lplist');list.innerHTML='';
  GROUPS.forEach(g=>{
    const files=g.files.filter(fid=>{
      const n=RAW.nodes[fid];if(!n) return false;
      if(filterType!=='all'&&n.type!==filterType) return false;
      if(searchQ&&!n.name.toLowerCase().includes(searchQ)&&!n.path.toLowerCase().includes(searchQ)) return false;
      return true;
    });
    if(!files.length) return;
    const div=document.createElement('div');div.className='lg';
    const hdr=document.createElement('div');hdr.className='lg-hdr';
    hdr.innerHTML='<div class="lg-dot" style="background:'+g.color+'"></div>'+
      '<span class="lg-name">'+g.icon+' '+g.label+'</span>'+
      '<span class="lg-cnt">'+files.length+'</span>'+
      '<span class="lg-arr'+(searchQ?' open':'')+'">›</span>';
    const fEl=document.createElement('div');fEl.className='lg-files'+(searchQ?' open':'');
    const arrEl=hdr.querySelector('.lg-arr');
    hdr.onclick=()=>{const o=fEl.classList.toggle('open');arrEl.classList.toggle('open',o);};
    files.forEach(fid=>{
      const n=RAW.nodes[fid];if(!n) return;
      const c=TC[n.type]||'#64748b';
      const f=document.createElement('div');
      f.className='lf'+(sel===fid?' sel':'');f.dataset.id=fid;
      f.innerHTML='<span style="font-size:10px">'+(TE[n.type]||'📦')+'</span>'+
        '<span class="lf-name" title="'+fid+'">'+n.name+'</span>'+
        '<span class="lf-badge" style="background:'+c+'22;color:'+c+';border:1px solid '+c+'44">'+n.ext+'</span>';
      f.onclick=()=>{selectNode(fid);scrollTo(fid);};
      fEl.appendChild(f);
    });
    div.appendChild(hdr);div.appendChild(fEl);list.appendChild(div);
  });
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
function exportPNG(){
  const a=document.createElement('a');
  a.href=cvs.toDataURL('image/png');
  a.download='archflow.png';a.click();
}

// ─── INIT ────────────────────────────────────────────────────────────────────
resize();
setLayout('group');
buildList();
</script>
</body>
</html>`;

fs.writeFileSync(OUT_HTML, html);
console.log('\n🎨 archflow.html erstellt — einfach doppelklicken!\n');
