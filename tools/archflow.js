#!/usr/bin/env node
/**
 * ArchFlow v3 — Vanilla HTML/CSS/JS Workflow Analyzer
 * Usage:  npm run archflow            (Repo scannen, pages/archflow/archflow-data.js neu schreiben)
 *         node tools/archflow.js [project-path] [output-dir]
 * Output: NUR archflow-data.js. Der Viewer (pages/archflow/index.html) ist
 *         handgepflegt (Canonical, hreflang, Maintenance-Gate, Footer) und wird
 *         hier bewusst NICHT mehr generiert — die HTML-Vorlage ist entfernt.
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(process.argv[2] || '.');
const OUTDIR   = path.resolve(process.argv[3] || path.join(ROOT, 'pages', 'archflow'));
const OUT_DATA = path.join(OUTDIR, 'archflow-data.js');

// ─── IGNORE ──────────────────────────────────────────────────────────────────
const IGNORE_DIRS  = new Set(['node_modules','.git','.vscode','dist','build',
  '.next','__pycache__','vendor','.idea','coverage','tmp','.cache','.parcel-cache']);
const IGNORE_FILES = new Set(['.DS_Store','thumbs.db','package-lock.json','yarn.lock',
  'archflow-data.js','archflow.html']);
// Generierte Artefakte (Build-Ausgabe) — im Architektur-Bild reines Rauschen.
// index.html bleibt drin: es ist der Einstiegspunkt, dessen <script>-Tags die
// meisten Kanten des Graphen ausmachen (ohne bricht der Graph auseinander).
const IGNORE_PATHS = [/^pages\/en\//, /^Assets\/i18n\//];
const CODE_EXTS    = new Set(['.html','.htm','.js','.mjs','.ts','.css','.scss','.json']);

// ─── WALK ────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (IGNORE_FILES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (IGNORE_PATHS.some(rx => rx.test(rel(full)))) continue;
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
  // Root-relative paths (/Assets/...) resolve from project root, not filesystem root
  const abs = /^\//.test(clean)
    ? path.join(ROOT, clean)
    : path.resolve(path.dirname(from), clean);
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
  for (const m of src.matchAll(/(?:^|[\s;{(])(?:async\s+)?function\s+(\w{2,})\s*\(/gm))
    if (!['if','for','while','switch','catch'].includes(m[1])) info.functions.push(m[1]);
  for (const m of src.matchAll(/(?:const|let|var)\s+(\w{2,})\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g))
    info.functions.push(m[1]);
  for (const m of src.matchAll(/addEventListener\s*\(\s*["'](\w+)["']/g)) info.events.push(m[1]);
  for (const m of src.matchAll(/\.on(\w+)\s*=/g)) info.events.push(m[1]);
  for (const m of src.matchAll(/fetch\s*\(\s*[`"']([^`"'\n]{1,200})[`"']/g)) {
    info.fetchUrls.push(m[1]); info.apis.push(m[1]);
    if (/^https?:\/\//.test(m[1])) edges.push({ to:m[1], type:'api_call', external:true });
  }
  for (const m of src.matchAll(/fetch\s*\(`([^`]{1,200})`/g)) {
    const u=m[1].replace(/\$\{[^}]+\}/g,'{…}');
    if (u.includes('/')) info.apis.push(u);
  }
  for (const m of src.matchAll(/\.from\s*\(\s*["'`](\w+)["'`]\s*\)/g)) info.supabase.push('table:'+m[1]);
  for (const m of src.matchAll(/supabase\.(auth|storage|functions|realtime)\b/g)) info.supabase.push(m[1]);
  for (const m of src.matchAll(/\.(select|insert|update|delete|upsert)\s*\(/g)) info.supabase.push('op:'+m[1]);
  for (const m of src.matchAll(/localStorage\.(get|set|remove)Item\s*\(\s*["'`]([^"'`]+)["'`]/g))
    info.localStorage.push(`${m[1]}("${m[2]}")`);
  for (const m of src.matchAll(/(?:window\.location(?:\.href)?|location\.href)\s*=\s*["'`]([^"'`\n]+)["'`]/g)) {
    const t = tryResolve(filePath, m[1]);
    if (t) { edges.push({ to:t, type:'redirect' }); info.redirects.push(rel(t)); }
  }
  info.functions    = [...new Set(info.functions)].slice(0,40);
  info.events       = [...new Set(info.events)];
  info.supabase     = [...new Set(info.supabase)];
  info.localStorage = [...new Set(info.localStorage)];
  info.apis         = [...new Set(info.apis)].slice(0,20);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log('\n⬡  ArchFlow v3\n' + '─'.repeat(44));
console.log(`📂 ${ROOT}\n`);

const allFiles = walk(ROOT);
console.log(`📄 ${allFiles.length} files found\n`);

const nodes  = {};
const edges  = [];
const groups = {};

allFiles.forEach(f => {
  const r = rel(f);
  const g = detectGroup(f);
  const e = ext(f);
  /* Verankert pruefen: '/[jt]s|mjs/' traf ungewollt auch 'json' ("js" steckt darin),
     dadurch liefen 59 JSON-Dateien als JavaScript durch den Graphen. */
  const type = /^html?$/.test(e)?'page'
    :/^(js|mjs|cjs|jsx|ts|tsx)$/.test(e)?'script'
    :/^s?css$/.test(e)?'style'
    :e==='json'?'data':'other';
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
  if(info.supabase?.length)  bits.push('db');
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
console.log(`\n✅ ${nodeList.length} nodes | ${edges.length} edges | ${groupList.length} groups`);

// ─── WRITE DATA FILE ─────────────────────────────────────────────────────────
const meta = {
  project:    path.basename(ROOT),
  generated:  new Date().toISOString(),
  nodeCount:  nodeList.length,
  edgeCount:  edges.length,
  groupCount: groupList.length,
};
const dataPayload = { nodes, edges, groups, meta };
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUT_DATA,
  `/* ArchFlow v3 — auto-generated, do not edit */\nwindow.__ARCHFLOW_DATA__ = ${JSON.stringify(dataPayload)};\n`
);
const dataKB = (JSON.stringify(dataPayload).length / 1024).toFixed(1);
console.log(`💾 ${path.relative(ROOT, OUT_DATA).replace(/\\/g, '/')}  (${dataKB} KB)`);
console.log('   Viewer: /archflow/ — index.html wird NICHT generiert.\n');
