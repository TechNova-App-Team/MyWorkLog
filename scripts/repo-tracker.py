#!/usr/bin/env python3
"""
  ╭─────────────────────────────────────────╮
  │  REPO TRACKER PRO  v1.3                 │
  │  Enterprise Codebase Intelligence       │
  ╰─────────────────────────────────────────╯
"""

import os, sys, json, hashlib, subprocess, re
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Tuple, Optional

IGNORE_DIRS = {
    '.git','node_modules','__pycache__','.vscode','.idea',
    'dist','build','coverage','.next','venv','env',
    '.cache','.parcel-cache'
}
IGNORE_FILES = {
    'package-lock.json','yarn.lock','pnpm-lock.yaml',
    '.DS_Store','Thumbs.db','.gitkeep'
}
LANGUAGE_MAP = {
    '.html':('HTML','<!--','-->'), '.css':('CSS','/*','*/'),
    '.js':('JavaScript','//',None), '.ts':('TypeScript','//',None),
    '.jsx':('React JSX','//',None), '.tsx':('React TSX','//',None),
    '.py':('Python','#',None), '.json':('JSON',None,None),
    '.md':('Markdown',None,None), '.yml':('YAML','#',None),
    '.yaml':('YAML','#',None), '.sql':('SQL','--',None),
    '.sh':('Shell','#',None), '.bat':('Batch','REM',None),
    '.ps1':('PowerShell','#',None), '.xml':('XML','<!--','-->'),
    '.svg':('SVG','<!--','-->'), '.txt':('Text',None,None),
    '.env':('Environment','#',None), '.toml':('TOML','#',None),
    '.ini':('INI',';',None), '.php':('PHP','//',None),
    '.rb':('Ruby','#',None), '.go':('Go','//',None),
    '.rs':('Rust','//',None), '.java':('Java','//',None),
    '.c':('C','//',None), '.cpp':('C++','//',None),
    '.h':('C Header','//',None),
}

class C:
    RESET='\033[0m'; BOLD='\033[1m'
    GREEN='\033[38;5;46m'; YELLOW='\033[38;5;226m'
    PURPLE='\033[38;5;141m'; CYAN='\033[38;5;87m'
    WHITE='\033[38;5;255m'; GRAY='\033[38;5;245m'
    RED='\033[38;5;196m'
    @staticmethod
    def enable_windows():
        if os.name=='nt':
            try:
                import ctypes; k=ctypes.windll.kernel32; k.SetConsoleMode(k.GetStdHandle(-11),7)
            except: pass

def fmt_num(n): return f"{n:,}".replace(",",".")
def fmt_size(b):
    for u in ['B','KB','MB','GB']:
        if b<1024: return f"{b:.1f} {u}"
        b/=1024
    return f"{b:.1f} TB"
def run_git(cmd,cwd):
    try:
        r=subprocess.run(f'git {cmd}',shell=True,capture_output=True,text=True,cwd=cwd,timeout=30,encoding='utf-8',errors='replace')
        return r.stdout.strip()
    except: return ""
def trunc(t,n=50): return t[:n-2]+'..' if len(t)>n else t

class RepoAnalyzer:
    def __init__(self,path):
        self.repo_path=os.path.abspath(path)
        self.files=[]; self.total_lines=self.code_lines=self.comment_lines=self.blank_lines=self.total_size=0
        self.languages={}; self.todos=[]; self.duplicates=[]; self.file_hashes=defaultdict(list)
        self.git_available=False; self.start_time=datetime.now()

    def scan(self):
        print(f"\n{C.PURPLE}{C.BOLD}  Scanning...{C.RESET} {C.GRAY}{self.repo_path}{C.RESET}\n")
        result=run_git('rev-parse --is-inside-work-tree',self.repo_path)
        self.git_available=result=='true'
        self._scan_files()
        for h,paths in self.file_hashes.items():
            if len(paths)>1:
                for i in range(len(paths)):
                    for j in range(i+1,len(paths)): self.duplicates.append((paths[i],paths[j]))

    def _scan_files(self):
        binary_exts={'.png','.jpg','.jpeg','.gif','.ico','.woff','.woff2','.ttf','.eot','.mp3','.mp4','.zip','.pdf','.exe','.dll'}
        for root,dirs,files in os.walk(self.repo_path):
            dirs[:]=[d for d in dirs if d not in IGNORE_DIRS]
            for fname in files:
                if fname in IGNORE_FILES: continue
                filepath=os.path.join(root,fname); relpath=os.path.relpath(filepath,self.repo_path); ext=Path(fname).suffix.lower()
                try: fsize=os.path.getsize(filepath)
                except: continue
                if ext in binary_exts or fsize>2_000_000:
                    self.files.append({'path':relpath,'ext':ext,'size':fsize,'lines':0,'code':0,'comments':0,'blanks':0,'binary':True,'language':'Binary'})
                    self.total_size+=fsize; continue
                li=LANGUAGE_MAP.get(ext,('Other',None,None)); ln=li[0]; cs=li[1]
                try:
                    with open(filepath,'r',encoding='utf-8',errors='replace') as f: content=f.read(); lines=content.splitlines()
                except: continue
                total=len(lines); code=comments=blanks=0; in_block=False
                for line in lines:
                    s=line.strip()
                    if not s: blanks+=1; continue
                    if li[2]:
                        if li[1] in s and li[2] in s: comments+=1; continue
                        if li[1] in s: in_block=True; comments+=1; continue
                        if li[2] in s: in_block=False; comments+=1; continue
                        if in_block: comments+=1; continue
                    if cs and s.startswith(cs): comments+=1; continue
                    code+=1
                    skip={'.md','.txt','.json','.html','.xml','.svg','.yml','.yaml','.css'}
                    if ext not in skip and cs:
                        for mk in ['TODO','FIXME','HACK','BUG','XXX']:
                            if mk in s.upper() and (s.startswith(cs) or f' {cs}' in s):
                                self.todos.append({'file':relpath,'line':lines.index(line)+1,'marker':mk,'text':s[:120]})
                if total>5: self.file_hashes[hashlib.md5(content.encode()).hexdigest()].append(relpath)
                self.files.append({'path':relpath,'ext':ext,'size':fsize,'lines':total,'code':code,'comments':comments,'blanks':blanks,'binary':False,'language':ln})
                self.total_lines+=total; self.code_lines+=code; self.comment_lines+=comments; self.blank_lines+=blanks; self.total_size+=fsize
                if ln not in self.languages: self.languages[ln]={'files':0,'lines':0,'code':0,'size':0}
                self.languages[ln]['files']+=1; self.languages[ln]['lines']+=total; self.languages[ln]['code']+=code; self.languages[ln]['size']+=fsize

    def get_git_stats(self):
        if not self.git_available: return {}
        s={}
        s['total_commits']=int(run_git('rev-list --count HEAD',self.repo_path) or 0)
        br=run_git('branch -a',self.repo_path); s['branches']=[b.strip().lstrip('* ') for b in br.splitlines()] if br else []
        s['current_branch']=run_git('branch --show-current',self.repo_path)
        ar=run_git('shortlog -sne HEAD',self.repo_path); s['authors']=[]
        if ar:
            for line in ar.splitlines():
                m=re.match(r'\s*(\d+)\s+(.+)',line.strip())
                if m: s['authors'].append({'commits':int(m.group(1)),'name':m.group(2).strip()})
        s['last_commit']=run_git('log -1 --format="%H|%an|%ae|%ai|%s"',self.repo_path)
        since=(datetime.now()-timedelta(days=30)).strftime('%Y-%m-%d')
        dr=run_git(f'log --since="{since}" --format="%ai" HEAD',self.repo_path); dc=Counter()
        if dr:
            for line in dr.splitlines(): dc[line[:10]]+=1
        s['daily_commits']=dict(sorted(dc.items()))
        wr=run_git('log --format="%ad" --date=format:"%u" HEAD',self.repo_path); wn={1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat',7:'Sun'}; wc=Counter()
        if wr:
            for line in wr.splitlines():
                try: wc[wn[int(line)]]+=1
                except: pass
        s['weekday_commits']=dict(wc)
        hr=run_git('log --format="%ad" --date=format:"%H" HEAD',self.repo_path); hc=Counter()
        if hr:
            for line in hr.splitlines():
                try: hc[int(line)]+=1
                except: pass
        s['hourly_commits']=dict(sorted(hc.items()))
        fr=run_git('log --reverse --format=%ai HEAD',self.repo_path)
        s['first_commit_date']=fr.splitlines()[0].strip().strip('"')[:10] if fr else 'N/A'
        sr=run_git('status --porcelain',self.repo_path); s['uncommitted_changes']=len(sr.splitlines()) if sr else 0
        tr=run_git('tag --sort=-creatordate',self.repo_path); s['tags']=tr.splitlines()[:10] if tr else []
        return s

    def calc_complexity(self):
        score=0; factors=[]
        cl=self.code_lines
        if cl>50000: s=25; f='Massive Codebase (50k+ lines)'
        elif cl>20000: s=20; f='Large Codebase (20k+ lines)'
        elif cl>10000: s=15; f='Medium Codebase (10k+)'
        elif cl>5000: s=10; f='Small Codebase (5k+)'
        else: s=5; f='Micro Codebase (<5k)'
        score+=s; factors.append((f,s))
        code_langs=[l for l in self.languages if l not in ('Text','Markdown','JSON','Other','YAML','TOML','INI','Environment')]
        nl=len(code_langs)
        if nl>=5: s=20; f='Polyglot Architecture'
        elif nl>=3: s=15; f='Multi-Language Stack'
        else: s=5; f='Focused Stack'
        score+=s; factors.append((f,s))
        tf=len([x for x in self.files if not x['binary']])
        if tf>100: s=15; f='Complex Structure (100+ files)'
        elif tf>50: s=10; f='Moderate Structure (50+)'
        else: s=5; f='Simple Structure'
        score+=s; factors.append((f,s))
        mf=[x for x in self.files if x['ext'] in ('.md','.txt') and not x['binary']]
        ml=sum(x['lines'] for x in mf); dl=self.comment_lines+ml
        if self.total_lines>0:
            dr2=dl/self.total_lines*100
            if dr2>20: s=10; f=f'Excellent Docs ({len(mf)} files)'
            elif dr2>10: s=7; f='Well Documented'
            elif len(mf)>=3: s=5; f=f'Documented ({len(mf)} READMEs)'
            else: s=2; f='Minimal Docs'
            score+=s; factors.append((f,s))
        if self.git_available:
            fr2=run_git('log --reverse --format=%ai HEAD',self.repo_path)
            if fr2:
                try:
                    ds=fr2.splitlines()[0].strip().strip('"')[:10]; fd=datetime.strptime(ds,'%Y-%m-%d'); days=(datetime.now()-fd).days
                    if days>365: s=15; f=f'Mature Project ({days//365}y+)'
                    elif days>180: s=12; f=f'Established ({days}d)'
                    elif days>90: s=10; f=f'Growing ({days}d)'
                    elif days>30: s=7; f=f'Active ({days}d)'
                    else: s=5; f=f'New ({days}d)'
                    score+=s; factors.append((f,s))
                except: pass
        pp=os.path.join(self.repo_path,'package.json')
        if os.path.exists(pp):
            try:
                with open(pp,'r',encoding='utf-8') as f2: pkg=json.load(f2)
                deps=len(pkg.get('dependencies',{}))+len(pkg.get('devDependencies',{}))
                if deps>20: s=15; f=f'Heavy Deps ({deps})'
                elif deps>10: s=10; f=f'Moderate Deps ({deps})'
                elif deps>0: s=5; f=f'Lean Deps ({deps})'
                else: s=5; f='Zero Dependencies'
                score+=s; factors.append((f,s))
            except: pass
        has_readme=any(x['path'].lower() in ('readme.md','readme.txt') for x in self.files)
        has_license=any('license' in x['path'].lower() for x in self.files)
        has_contrib=any('contributing' in x['path'].lower() for x in self.files)
        cs2=sum([has_readme,has_license,has_contrib])
        if cs2>=3: s=10; f=f'Pro Community Files ({cs2}/3)'
        elif cs2>=1: s=5; f=f'Community Files ({cs2}/3)'
        else: s=2; f='Basic Setup'
        score+=s; factors.append((f,s))
        return {'score':min(score,100),'factors':factors}

    def print_report(self):
        tf=[x for x in self.files if not x['binary']]; bf=[x for x in self.files if x['binary']]
        cp=(self.code_lines/self.total_lines*100) if self.total_lines>0 else 0
        print(f"""
{C.PURPLE}{C.BOLD}  REPO TRACKER PRO  v3.0{C.RESET}
  {C.GRAY}{'─'*40}{C.RESET}
  {C.CYAN}Files{C.RESET}   {C.WHITE}{C.BOLD}{fmt_num(len(self.files))}{C.RESET}  ({len(tf)} text · {len(bf)} binary)
  {C.CYAN}Lines{C.RESET}   {C.WHITE}{C.BOLD}{fmt_num(self.total_lines)}{C.RESET}
  {C.CYAN}Code{C.RESET}    {C.GREEN}{fmt_num(self.code_lines)}{C.RESET}  ({cp:.1f}%)
  {C.CYAN}Size{C.RESET}    {C.WHITE}{fmt_size(self.total_size)}{C.RESET}
  {C.CYAN}Langs{C.RESET}   {C.WHITE}{len(self.languages)}{C.RESET}""")
        if self.git_available:
            gs2=self.get_git_stats()
            print(f"  {C.CYAN}Commits{C.RESET} {C.WHITE}{C.BOLD}{fmt_num(gs2.get('total_commits',0))}{C.RESET}  {C.GRAY}on {gs2.get('current_branch','?')}{C.RESET}")
        cx=self.calc_complexity(); sc=cx['score']
        print(f"  {C.CYAN}Score{C.RESET}   {C.PURPLE}{C.BOLD}{sc}/100{C.RESET}  {C.GRAY}todos:{len(self.todos)} · dups:{len(self.duplicates)}{C.RESET}\n")
        elapsed=(datetime.now()-self.start_time).total_seconds()
        self._generate_html_report()
        print(f"  {C.GREEN}Done in {elapsed:.2f}s{C.RESET} {C.GRAY}→ repo-report.html{C.RESET}\n")

    def _generate_html_report(self):
        import html as hmod
        tf=[x for x in self.files if not x['binary']]
        cx=self.calc_complexity(); gs=self.get_git_stats() if self.git_available else {}
        sl=sorted(self.languages.items(),key=lambda x:x[1]['code'],reverse=True)

        lang_labels=[l[0] for l in sl[:9]]
        lang_values=[l[1]['code'] for l in sl[:9]]
        lang_palette=['#a78bfa','#38bdf8','#34d399','#fb923c','#f472b6','#e879f9','#4ade80','#facc15','#60a5fa']

        top_files=sorted(tf,key=lambda x:x['lines'],reverse=True)[:14]
        files_labels=[trunc(x['path'],26) for x in top_files]
        files_values=[x['lines'] for x in top_files]

        today=datetime.now(); tl=[]; tv=[]
        daily=gs.get('daily_commits',{})
        for i in range(29,-1,-1):
            d=(today-timedelta(days=i)).strftime('%Y-%m-%d')
            tl.append(d[-5:]); tv.append(daily.get(d,0))

        wd_order=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        wd_data=gs.get('weekday_commits',{})
        wd_vals=[wd_data.get(d,0) for d in wd_order]

        hourly=gs.get('hourly_commits',{})
        max_h=max(hourly.values()) if hourly else 1
        hour_cells=''
        for h in range(24):
            cnt=hourly.get(h,0); intensity=cnt/max_h if max_h>0 else 0
            alpha=0.06+intensity*0.88
            hour_cells+=f'<div class="hcell" style="--a:{alpha:.2f}" title="{h:02d}:00 — {cnt} commits"></div>'

        git_branch=hmod.escape(str(gs.get('current_branch','—')))
        git_commits=fmt_num(gs.get('total_commits',0))
        git_first=gs.get('first_commit_date','—')
        git_uncommitted=gs.get('uncommitted_changes',0)
        git_branches=len(gs.get('branches',[]))
        git_tags=len(gs.get('tags',[]))

        lc_html=''
        lraw=gs.get('last_commit','')
        if lraw and '|' in lraw:
            p=lraw.split('|')
            if len(p)>=5:
                lc_html=f'''<div class="lc-box">
  <div class="lc-msg">{hmod.escape(p[4])}</div>
  <div class="lc-meta"><span class="lc-author">{hmod.escape(p[1])}</span><span class="lc-hash">{p[0][:7]}</span><span class="lc-date">{p[3][:10]}</span></div>
</div>'''

        auth_html=''
        if gs.get('authors'):
            tc2=sum(a['commits'] for a in gs['authors'])
            pal=['#a78bfa','#38bdf8','#34d399','#fb923c','#f472b6','#e879f9','#4ade80','#facc15']
            for i,a in enumerate(gs['authors'][:7]):
                pct=a['commits']/tc2*100 if tc2>0 else 0
                nm=hmod.escape(a['name']); ini=''.join(w[0].upper() for w in nm.split()[:2]); col=pal[i%len(pal)]
                auth_html+=f'''<div class="auth-row">
  <div class="auth-av" style="--c:{col}">{ini}</div>
  <div class="auth-info"><div class="auth-name">{nm}</div>
    <div class="auth-track"><div class="auth-fill" style="width:{pct:.1f}%;background:{col}"></div></div>
  </div>
  <div class="auth-stat"><div class="auth-num">{a["commits"]}</div><div class="auth-pct" style="color:{col}">{pct:.0f}%</div></div>
</div>'''

        sc=cx['score']
        if sc>=80: tier='S'; tier_lbl='Enterprise Grade'; tc='#a78bfa'
        elif sc>=60: tier='A'; tier_lbl='Production Ready'; tc='#34d399'
        elif sc>=40: tier='B'; tier_lbl='Growing Project'; tc='#38bdf8'
        elif sc>=20: tier='C'; tier_lbl='Starter'; tc='#fb923c'
        else: tier='D'; tier_lbl='Prototype'; tc='#f87171'
        fct_html=''
        for fn,fsc in cx['factors']:
            w=min(fsc/25*100,100)
            fct_html+=f'<div class="fct-row"><span class="fct-name">{hmod.escape(fn)}</span><div class="fct-track"><div class="fct-fill" style="width:{w:.0f}%"></div></div><span class="fct-val">+{fsc}</span></div>'

        todo_html=''
        if self.todos:
            mc={'TODO':('#facc15','◎'),'FIXME':('#f87171','✕'),'BUG':('#f87171','⬡'),'HACK':('#fb923c','⚡'),'XXX':('#c084fc','▲')}
            for t in self.todos[:35]:
                col,ico=mc.get(t['marker'],('#94a3b8','◦'))
                todo_html+=f'''<div class="todo-row">
  <span class="todo-tag" style="color:{col}">{ico} {t["marker"]}</span>
  <span class="todo-file">{hmod.escape(trunc(t["file"],34))}:{t["line"]}</span>
  <span class="todo-txt">{hmod.escape(trunc(t["text"],95))}</span>
</div>'''
        else:
            todo_html='<div class="empty-note">No action items found — clean codebase ✓</div>'

        lc_map={'JavaScript':'#facc15','TypeScript':'#38bdf8','Python':'#34d399','HTML':'#f87171',
                'CSS':'#38bdf8','React JSX':'#67e8f9','React TSX':'#67e8f9','Go':'#67e8f9',
                'Rust':'#fb923c','Java':'#facc15','PHP':'#a78bfa','Ruby':'#f87171','Shell':'#34d399','Markdown':'#94a3b8','JSON':'#facc15'}
        ftable=''
        for x in sorted(tf,key=lambda x:x['lines'],reverse=True):
            lc2=lc_map.get(x['language'],'#a78bfa')
            cr=(x['code']/x['lines']*100) if x['lines']>0 else 0
            ftable+=f'''<tr>
  <td class="td-path">{hmod.escape(trunc(x["path"],52))}</td>
  <td><span class="badge" style="color:{lc2};background:{lc2}18;border-color:{lc2}28">{hmod.escape(x["language"])}</span></td>
  <td class="td-n">{fmt_num(x["lines"])}</td>
  <td class="td-n">{fmt_num(x["code"])}</td>
  <td class="td-n">{fmt_num(x["comments"])}</td>
  <td><div class="ratio"><div style="width:{cr:.0f}%;background:{lc2}"></div></div></td>
  <td class="td-n td-muted">{fmt_size(x["size"])}</td>
</tr>'''

        cdata=json.dumps({'ll':lang_labels,'lv':lang_values,'lc':lang_palette,
                          'fl':files_labels,'fv':files_values,
                          'tl':tl,'tv':tv,'wl':wd_order,'wv':wd_vals,
                          'code':self.code_lines,'cmt':self.comment_lines,'blank':self.blank_lines})

        gen=datetime.now().strftime('%d %b %Y, %H:%M'); yr=datetime.now().strftime('%Y')
        rn=hmod.escape(os.path.basename(self.repo_path))
        tc_count=Counter(t['marker'] for t in self.todos)
        code_pct=(self.code_lines/self.total_lines*100) if self.total_lines>0 else 0

        HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{rn} — Code Intelligence</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@300;400;500&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
:root {{
  --bg:       #06060f;
  --bg2:      #0c0c18;
  --bg3:      #111120;
  --glass:    rgba(255,255,255,0.028);
  --glass2:   rgba(255,255,255,0.05);
  --border:   rgba(255,255,255,0.065);
  --border2:  rgba(255,255,255,0.11);
  --text:     #e4e6f5;
  --sub:      #636585;
  --dim:      #2a2c45;
  --v1:       #a78bfa;
  --v2:       #7c3aed;
  --b1:       #38bdf8;
  --g1:       #34d399;
  --o1:       #fb923c;
  --r1:       #f87171;
  --y1:       #facc15;
  --p1:       #f472b6;
  --font:     'Outfit', sans-serif;
  --mono:     'Fira Code', monospace;
  --rad:      18px;
  --radsm:    10px;
  --glow:     0 0 60px rgba(124,58,237,0.1);
  --shad:     0 4px 32px rgba(0,0,0,0.45);
}}
*,*::before,*::after {{ box-sizing:border-box; margin:0; padding:0; }}
html {{ scroll-behavior:smooth; }}
body {{
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  letter-spacing:-0.01em;
}}

/* ─── BACKGROUND FX ─── */
.orbs {{ position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; }}
.orb {{
  position:absolute; border-radius:50%;
  filter:blur(100px); opacity:0.55;
}}
.o1 {{
  width:800px; height:800px; top:-350px; right:-200px;
  background:radial-gradient(circle,rgba(124,58,237,0.18),transparent 65%);
  animation:driftA 20s ease-in-out infinite alternate;
}}
.o2 {{
  width:600px; height:600px; bottom:-150px; left:-150px;
  background:radial-gradient(circle,rgba(56,189,248,0.12),transparent 65%);
  animation:driftB 25s ease-in-out infinite alternate;
}}
.o3 {{
  width:400px; height:400px; top:45%; right:15%;
  background:radial-gradient(circle,rgba(52,211,153,0.08),transparent 65%);
  animation:driftC 18s ease-in-out infinite alternate;
}}
@keyframes driftA {{ to{{ transform:translate(-60px,80px) scale(1.1); }} }}
@keyframes driftB {{ to{{ transform:translate(50px,-40px) scale(1.15); }} }}
@keyframes driftC {{ to{{ transform:translate(-30px,50px) scale(0.9); }} }}

/* subtle noise */
body::after {{
  content:''; position:fixed; inset:0; z-index:1; pointer-events:none; opacity:0.4;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}}

/* ─── LAYOUT ─── */
.wrap {{ position:relative; z-index:2; max-width:1380px; margin:0 auto; padding:0 2.5rem 7rem; }}

/* ─── NAV ─── */
nav {{
  display:flex; align-items:center; justify-content:space-between;
  padding:1.8rem 0 1.6rem;
  border-bottom:1px solid var(--border);
}}
.nav-brand {{
  display:flex; align-items:center; gap:0.55rem;
  font-size:0.7rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--sub);
}}
.nav-brand .pulse {{
  width:6px; height:6px; border-radius:50%; background:var(--v1);
  box-shadow:0 0 0 0 rgba(167,139,250,0.6);
  animation:pulse-anim 2.5s ease infinite;
}}
@keyframes pulse-anim {{
  0%{{ box-shadow:0 0 0 0 rgba(167,139,250,0.5); }}
  70%{{ box-shadow:0 0 0 9px rgba(167,139,250,0); }}
  100%{{ box-shadow:0 0 0 0 rgba(167,139,250,0); }}
}}
.nav-right {{
  display:flex; gap:2.5rem; font-family:var(--mono); font-size:0.7rem; color:var(--sub);
}}

/* ─── HERO ─── */
.hero {{ padding:4.5rem 0 3rem; }}
.hero-label {{
  display:inline-flex; align-items:center; gap:0.5rem; margin-bottom:1.1rem;
  font-size:0.68rem; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--v1);
}}
.hero-label::before {{ content:''; display:block; width:18px; height:1px; background:var(--v1); }}
h1 {{
  font-size:clamp(2.6rem,5vw,5rem);
  font-weight:800; line-height:0.93; letter-spacing:-0.04em; margin-bottom:1.1rem;
}}
h1 .ghost {{ -webkit-text-stroke:1px rgba(255,255,255,0.12); color:transparent; font-weight:300; }}
.hero-meta {{
  display:flex; flex-wrap:wrap; gap:1.2rem 2rem;
  font-family:var(--mono); font-size:0.75rem; color:var(--sub);
}}
.hero-meta span {{ display:flex; align-items:center; gap:0.35rem; }}
.hero-meta span::before {{ content:'◈'; color:var(--v1); font-size:0.6rem; }}

/* ─── KPI BAND ─── */
.kpi-band {{
  display:grid; grid-template-columns:repeat(6,1fr);
  background:var(--bg2); border:1px solid var(--border);
  border-radius:var(--rad); overflow:hidden; margin-bottom:2.5rem;
}}
.kpi {{
  padding:1.8rem 1.5rem; border-right:1px solid var(--border);
  position:relative; transition:background 0.2s ease;
}}
.kpi:last-child {{ border-right:none; }}
.kpi:hover {{ background:var(--bg3); }}
.kpi-shimmer {{
  position:absolute; bottom:0; left:0; right:0; height:2px; border-radius:2px 2px 0 0;
  background:linear-gradient(90deg,var(--v1),var(--b1));
  transform:scaleX(0); transform-origin:left; transition:transform 0.4s cubic-bezier(.34,1.4,.64,1);
}}
.kpi:hover .kpi-shimmer {{ transform:scaleX(1); }}
.kpi-lbl {{ font-size:0.6rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--sub); margin-bottom:0.5rem; }}
.kpi-v {{ font-size:2rem; font-weight:800; letter-spacing:-0.025em; line-height:1; }}
.cv1 {{ color:var(--v1); }} .cg1 {{ color:var(--g1); }} .cb1 {{ color:var(--b1); }} .co1 {{ color:var(--o1); }} .cy1 {{ color:var(--y1); }}
.kpi-sub {{ font-family:var(--mono); font-size:0.62rem; color:var(--sub); margin-top:0.3rem; }}

/* ─── SECTION ─── */
.sec {{
  font-size:0.6rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--sub);
  display:flex; align-items:center; gap:0.75rem; margin:3rem 0 1.2rem;
}}
.sec::after {{ content:''; flex:1; height:1px; background:var(--border); }}

/* ─── CARD ─── */
.card {{
  background:var(--glass);
  border:1px solid var(--border);
  border-radius:var(--rad); padding:1.75rem;
  backdrop-filter:blur(30px) saturate(150%);
  -webkit-backdrop-filter:blur(30px) saturate(150%);
  box-shadow:var(--shad);
  transition:border-color 0.3s, box-shadow 0.3s;
  animation:rise 0.5s cubic-bezier(.22,.9,.38,1) both;
}}
.card:hover {{
  border-color:rgba(167,139,250,0.2);
  box-shadow:var(--shad), var(--glow);
}}
@keyframes rise {{
  from{{ opacity:0; transform:translateY(20px); }}
  to{{ opacity:1; transform:translateY(0); }}
}}
.card-ttl {{
  font-size:0.6rem; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;
  color:var(--sub); margin-bottom:1.3rem;
}}

/* ─── GRIDS ─── */
.g2  {{ display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-bottom:1.2rem; }}
.g3  {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.2rem; margin-bottom:1.2rem; }}
.g32 {{ display:grid; grid-template-columns:2.2fr 1fr; gap:1.2rem; margin-bottom:1.2rem; }}

/* ─── CHART ─── */
.ch {{ position:relative; }}
.h250 {{ height:250px; }} .h200 {{ height:195px; }} .h300 {{ height:295px; }}

/* ─── LANG TABLE ─── */
.lang-list {{ display:flex; flex-direction:column; }}
.lang-row {{
  display:flex; align-items:center; gap:0.75rem; padding:0.55rem 0;
  border-bottom:1px solid var(--border); font-size:0.82rem;
}}
.lang-row:last-child {{ border-bottom:none; }}
.l-dot {{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }}
.l-nm {{ flex:1; font-weight:500; }}
.l-bar {{ width:80px; height:3px; background:var(--dim); border-radius:2px; overflow:hidden; flex-shrink:0; }}
.l-fill {{ height:100%; border-radius:2px; }}
.l-pct {{ font-family:var(--mono); font-size:0.68rem; color:var(--sub); min-width:34px; text-align:right; }}
.l-files {{ font-family:var(--mono); font-size:0.64rem; color:var(--dim); min-width:44px; text-align:right; }}

/* ─── GIT ─── */
.gr {{ display:flex; flex-direction:column; }}
.git-row {{ display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--border); }}
.git-row:last-child {{ border-bottom:none; }}
.gk {{ font-size:0.68rem; color:var(--sub); letter-spacing:0.04em; }}
.gv {{ font-weight:600; font-family:var(--mono); font-size:0.82rem; }}
.gv.v1 {{ color:var(--v1); }} .gv.g1 {{ color:var(--g1); }} .gv.y1 {{ color:var(--y1); }} .gv.b1 {{ color:var(--b1); }}

.lc-box {{
  margin-top:1rem; padding:0.9rem 1rem;
  background:rgba(167,139,250,0.045); border:1px solid rgba(167,139,250,0.12);
  border-radius:var(--radsm);
}}
.lc-msg {{ font-size:0.83rem; font-weight:500; line-height:1.4; margin-bottom:0.45rem; }}
.lc-meta {{ display:flex; flex-wrap:wrap; gap:0.8rem; font-family:var(--mono); font-size:0.67rem; }}
.lc-author {{ color:var(--b1); }} .lc-hash {{ color:var(--y1); }} .lc-date {{ color:var(--sub); }}

/* ─── AUTHORS ─── */
.auth-row {{
  display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0;
  border-bottom:1px solid var(--border);
}}
.auth-row:last-child {{ border-bottom:none; }}
.auth-av {{
  width:32px; height:32px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:0.62rem; font-weight:800;
  background:color-mix(in srgb,var(--c) 12%,transparent);
  color:var(--c); border:1px solid color-mix(in srgb,var(--c) 22%,transparent);
}}
.auth-info {{ flex:1; min-width:0; }}
.auth-name {{ font-size:0.8rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:5px; }}
.auth-track {{ height:2px; background:var(--dim); border-radius:2px; overflow:hidden; }}
.auth-fill {{ height:100%; border-radius:2px; }}
.auth-stat {{ text-align:right; min-width:48px; }}
.auth-num {{ font-family:var(--mono); font-size:0.73rem; font-weight:600; line-height:1.3; }}
.auth-pct {{ font-size:0.6rem; font-family:var(--mono); }}

/* ─── SCORE ─── */
.score-hero {{
  text-align:center; padding:1.2rem 0 0.8rem; margin-bottom:0.5rem;
}}
.score-big {{
  font-size:4.8rem; font-weight:800; letter-spacing:-0.05em; line-height:1;
  background:linear-gradient(135deg, var(--v1) 30%, var(--b1) 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}}
.score-den {{ font-size:1.6rem; color:var(--sub); font-weight:300; }}
.score-badge {{
  display:inline-block; margin-top:0.5rem; padding:3px 14px; border-radius:20px;
  font-size:0.6rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; border:1px solid;
}}
.fct-list {{ margin-top:0.75rem; }}
.fct-row {{ display:flex; align-items:center; gap:0.65rem; padding:0.42rem 0; border-bottom:1px solid var(--border); }}
.fct-row:last-child {{ border-bottom:none; }}
.fct-nm {{ flex:1; font-size:0.74rem; color:#8082a8; }}
.fct-track {{ width:44px; height:2px; background:var(--dim); border-radius:2px; overflow:hidden; flex-shrink:0; }}
.fct-fill {{ height:100%; background:linear-gradient(90deg,var(--v1),var(--b1)); border-radius:2px; }}
.fct-val {{ font-family:var(--mono); font-size:0.68rem; color:var(--v1); min-width:24px; text-align:right; }}

/* ─── HEATMAP ─── */
.hmap {{ display:grid; grid-template-columns:repeat(12,1fr); gap:5px; margin:0.3rem 0; }}
.hcell {{
  aspect-ratio:1; border-radius:7px;
  background:rgba(167,139,250,var(--a,0.05));
  cursor:default; position:relative; transition:transform 0.15s;
}}
.hcell:hover {{ transform:scale(1.3); z-index:1; }}
.hcell::after {{
  content:attr(title); display:none;
  position:absolute; bottom:calc(100% + 7px); left:50%; transform:translateX(-50%);
  background:#0c0c18; color:#e4e6f5; font-size:0.6rem; padding:3px 8px; border-radius:6px;
  white-space:nowrap; font-family:var(--mono); border:1px solid var(--border); pointer-events:none;
  white-space:nowrap;
}}
.hcell:hover::after {{ display:block; }}
.hmap-lbl {{ display:flex; justify-content:space-between; font-family:var(--mono); font-size:0.58rem; color:var(--sub); margin-top:5px; }}

/* ─── TODO ─── */
.todo-scroll {{ max-height:340px; overflow-y:auto; }}
.todo-scroll::-webkit-scrollbar {{ width:3px; }}
.todo-scroll::-webkit-scrollbar-thumb {{ background:rgba(167,139,250,0.22); border-radius:2px; }}
.todo-row {{
  display:grid; grid-template-columns:82px 1fr; grid-template-rows:auto auto;
  gap:1px 0.75rem; padding:0.7rem 0; border-bottom:1px solid var(--border);
}}
.todo-row:last-child {{ border-bottom:none; }}
.todo-tag {{ font-family:var(--mono); font-size:0.68rem; font-weight:700; grid-row:span 2; display:flex; align-items:center; gap:0.3rem; }}
.todo-file {{ font-family:var(--mono); font-size:0.66rem; color:var(--sub); }}
.todo-txt {{ font-size:0.74rem; color:#80829a; }}
.empty-note {{ padding:2rem; text-align:center; color:var(--sub); font-family:var(--mono); font-size:0.78rem; }}

/* ─── DONUT LEGEND ─── */
.dl {{ display:flex; flex-direction:column; gap:0.65rem; }}
.dl-r {{ display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; }}
.dl-dot {{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }}
.dl-lbl {{ flex:1; color:#80829a; font-size:0.78rem; }}
.dl-val {{ font-family:var(--mono); font-size:0.7rem; }}

/* ─── TABLE ─── */
.tbl-wrap {{ overflow-x:auto; max-height:480px; overflow-y:auto; }}
.tbl-wrap::-webkit-scrollbar {{ width:3px; height:3px; }}
.tbl-wrap::-webkit-scrollbar-thumb {{ background:rgba(167,139,250,0.2); border-radius:2px; }}
table {{ width:100%; border-collapse:collapse; font-size:0.79rem; }}
thead {{ position:sticky; top:0; z-index:2; background:var(--bg2); }}
th {{
  text-align:left; padding:0.75rem 0.75rem;
  font-size:0.58rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;
  color:var(--sub); border-bottom:1px solid var(--border); white-space:nowrap;
}}
td {{ padding:0.55rem 0.75rem; border-bottom:1px solid rgba(255,255,255,0.022); vertical-align:middle; }}
tr:hover td {{ background:rgba(167,139,250,0.022); }}
.td-path {{ font-family:var(--mono); font-size:0.7rem; color:#8082a8; }}
.badge {{ font-size:0.58rem; font-weight:700; padding:2px 7px; border-radius:20px; border:1px solid; white-space:nowrap; }}
.td-n {{ font-family:var(--mono); font-size:0.72rem; text-align:right; }}
.td-muted {{ color:var(--sub); }}
.ratio {{ width:50px; height:3px; background:var(--dim); border-radius:2px; overflow:hidden; }}
.ratio div {{ height:100%; border-radius:2px; opacity:0.7; }}

/* ─── FOOTER ─── */
footer {{
  margin-top:5rem; padding-top:1.75rem; border-top:1px solid var(--border);
  display:flex; justify-content:space-between; align-items:center;
  font-family:var(--mono); font-size:0.67rem; color:var(--sub);
}}

/* ─── RESPONSIVE ─── */
@media(max-width:1100px) {{
  .kpi-band {{ grid-template-columns:repeat(3,1fr); }}
  .g3,.g32 {{ grid-template-columns:1fr; }}
}}
@media(max-width:768px) {{
  .kpi-band {{ grid-template-columns:repeat(2,1fr); }}
  .g2 {{ grid-template-columns:1fr; }}
  .nav-right {{ display:none; }}
  h1 {{ font-size:2.4rem; }}
  .wrap {{ padding:0 1.25rem 5rem; }}
}}
</style>
</head>
<body>
<div class="orbs"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div></div>
<div class="wrap">

<!-- NAV -->
<nav>
  <div class="nav-brand"><span class="pulse"></span>Repo Intelligence</div>
  <div class="nav-right"><span>{rn}</span><span>{gen}</span></div>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-label">Codebase Analysis</div>
  <h1>{rn}<br><span class="ghost">Intelligence</span></h1>
  <div class="hero-meta">
    <span>{len(tf)} files analysed</span>
    <span>{fmt_num(self.total_lines)} total lines</span>
    <span>{fmt_size(self.total_size)}</span>
    <span>{len(self.languages)} languages detected</span>
  </div>
</div>

<!-- KPI -->
<div class="kpi-band">
  <div class="kpi"><div class="kpi-lbl">Total Lines</div><div class="kpi-v cv1">{fmt_num(self.total_lines)}</div><div class="kpi-sub">{fmt_size(self.total_size)}</div><div class="kpi-shimmer"></div></div>
  <div class="kpi"><div class="kpi-lbl">Code Lines</div><div class="kpi-v">{fmt_num(self.code_lines)}</div><div class="kpi-sub">{code_pct:.1f}% of total</div><div class="kpi-shimmer"></div></div>
  <div class="kpi"><div class="kpi-lbl">Files</div><div class="kpi-v cb1">{fmt_num(len(tf))}</div><div class="kpi-sub">{len(self.languages)} languages</div><div class="kpi-shimmer"></div></div>
  <div class="kpi"><div class="kpi-lbl">Commits</div><div class="kpi-v cg1">{git_commits}</div><div class="kpi-sub">since {git_first}</div><div class="kpi-shimmer"></div></div>
  <div class="kpi"><div class="kpi-lbl">Score</div><div class="kpi-v" style="color:{tc}">{sc}/100</div><div class="kpi-sub">{tier_lbl}</div><div class="kpi-shimmer"></div></div>
  <div class="kpi"><div class="kpi-lbl">Items</div><div class="kpi-v co1">{len(self.todos)}</div><div class="kpi-sub">{tc_count.get("TODO",0)} todo · {tc_count.get("FIXME",0)+tc_count.get("BUG",0)} bug</div><div class="kpi-shimmer"></div></div>
</div>

<!-- DISTRIBUTION -->
<div class="sec">Distribution</div>
<div class="g2">
  <div class="card" style="animation-delay:.04s">
    <div class="card-ttl">Language Breakdown</div>
    <div class="ch h250"><canvas id="cLang"></canvas></div>
  </div>
  <div class="card" style="animation-delay:.08s">
    <div class="card-ttl">Lines Composition</div>
    <div style="display:grid;grid-template-columns:130px 1fr;gap:1.5rem;align-items:center">
      <div class="ch" style="height:130px"><canvas id="cLines"></canvas></div>
      <div class="dl">
        <div class="dl-r"><span class="dl-dot" style="background:#a78bfa"></span><span class="dl-lbl">Code</span><span class="dl-val">{fmt_num(self.code_lines)}</span></div>
        <div class="dl-r"><span class="dl-dot" style="background:#38bdf8"></span><span class="dl-lbl">Comments</span><span class="dl-val">{fmt_num(self.comment_lines)}</span></div>
        <div class="dl-r"><span class="dl-dot" style="background:#1e2038"></span><span class="dl-lbl">Blank</span><span class="dl-val">{fmt_num(self.blank_lines)}</span></div>
      </div>
    </div>
    <div style="margin-top:1.4rem">
      <div class="card-ttl">Top Files by Lines</div>
      <div class="ch h200"><canvas id="cFiles"></canvas></div>
    </div>
  </div>
</div>

<!-- ACTIVITY -->
<div class="sec">Activity Patterns</div>
<div class="g32">
  <div class="card" style="animation-delay:.06s">
    <div class="card-ttl">Commit Timeline — Last 30 Days</div>
    <div class="ch h250"><canvas id="cTimeline"></canvas></div>
  </div>
  <div class="card" style="animation-delay:.1s">
    <div class="card-ttl">Commits by Weekday</div>
    <div class="ch h250"><canvas id="cWeekday"></canvas></div>
  </div>
</div>

<!-- HEATMAP -->
<div class="card" style="margin-bottom:1.2rem;animation-delay:.12s">
  <div class="card-ttl">Hourly Commit Heatmap</div>
  <div class="hmap">{hour_cells}</div>
  <div class="hmap-lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
</div>

<!-- INTELLIGENCE -->
<div class="sec">Project Intelligence</div>
<div class="g3">
  <div class="card" style="animation-delay:.06s">
    <div class="card-ttl">Git Status</div>
    <div class="gr">
      <div class="git-row"><span class="gk">Branch</span><span class="gv g1">{git_branch}</span></div>
      <div class="git-row"><span class="gk">Commits</span><span class="gv v1">{git_commits}</span></div>
      <div class="git-row"><span class="gk">Branches</span><span class="gv">{git_branches}</span></div>
      <div class="git-row"><span class="gk">Tags</span><span class="gv">{git_tags}</span></div>
      <div class="git-row"><span class="gk">Project Start</span><span class="gv">{git_first}</span></div>
      <div class="git-row"><span class="gk">Uncommitted</span><span class="gv y1">{git_uncommitted}</span></div>
    </div>
    {lc_html}
  </div>
  <div class="card" style="animation-delay:.1s">
    <div class="card-ttl">Complexity Score</div>
    <div class="score-hero">
      <div><span class="score-big">{sc}</span><span class="score-den">/100</span></div>
      <div class="score-badge" style="color:{tc};border-color:{tc}30;background:{tc}0c">{tier} · {tier_lbl}</div>
    </div>
    <div class="fct-list">{fct_html}</div>
  </div>
  <div class="card" style="animation-delay:.14s">
    <div class="card-ttl">Top Contributors</div>
    {auth_html if auth_html else '<div class="empty-note">No git history available</div>'}
  </div>
</div>

<!-- TODOS -->
<div class="sec">Action Items</div>
<div class="card" style="margin-bottom:1.2rem;animation-delay:.08s">
  <div class="card-ttl">TODO / FIXME / BUG Scanner — {len(self.todos)} items</div>
  <div class="todo-scroll">{todo_html}</div>
</div>

<!-- FILES -->
<div class="sec">File Explorer</div>
<div class="card" style="animation-delay:.08s">
  <div class="card-ttl">All Source Files — {len(tf)} files</div>
  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>Path</th><th>Language</th>
        <th style="text-align:right">Lines</th><th style="text-align:right">Code</th>
        <th style="text-align:right">Comments</th><th>Ratio</th>
        <th style="text-align:right">Size</th>
      </tr></thead>
      <tbody>{ftable}</tbody>
    </table>
  </div>
</div>

<footer>
  <span>Repo Tracker Pro v3.0 — Enterprise Intelligence</span>
  <span>Generated {gen} · © {yr}</span>
</footer>
</div>

<script>
const D = {cdata};
const MN = "'Fira Code',monospace";
const TIP = {{
  backgroundColor:'#0c0c18', borderColor:'rgba(167,139,250,0.18)', borderWidth:1,
  titleColor:'#e4e6f5', bodyColor:'#636585', padding:10, cornerRadius:9,
  titleFont:{{family:MN,size:11}}, bodyFont:{{family:MN,size:10}}
}};
const GR = {{ color:'rgba(255,255,255,0.04)' }};
const TK = {{ color:'#636585', font:{{family:MN,size:9}} }};
const BASE = {{
  responsive:true, maintainAspectRatio:false,
  animation:{{duration:900,easing:'easeOutQuart'}},
  plugins:{{tooltip:TIP, legend:{{labels:{{color:'#636585',font:{{family:MN,size:10}},boxWidth:8,padding:12}}}}}}
}};

// Language donut
new Chart(document.getElementById('cLang'),{{
  type:'doughnut',
  data:{{ labels:D.ll, datasets:[{{
    data:D.lv,
    backgroundColor:D.lc.map(c=>c+'20'),
    borderColor:D.lc, borderWidth:1.5, hoverBorderWidth:2.5, hoverOffset:5,
  }}]}},
  options:{{...BASE, cutout:'70%', plugins:{{...BASE.plugins, legend:{{position:'right',labels:{{color:'#636585',font:{{family:MN,size:10}},boxWidth:7,padding:9}}}}}}}}
}});

// Lines donut
new Chart(document.getElementById('cLines'),{{
  type:'doughnut',
  data:{{ labels:['Code','Comments','Blank'], datasets:[{{
    data:[D.code,D.cmt,D.blank],
    backgroundColor:['#a78bfa20','#38bdf820','#1a1c30'],
    borderColor:['#a78bfa','#38bdf8','#252740'], borderWidth:1.5,
  }}]}},
  options:{{...BASE, cutout:'74%', plugins:{{...BASE.plugins, legend:{{display:false}}}}}}
}});

// Files bar
new Chart(document.getElementById('cFiles'),{{
  type:'bar',
  data:{{ labels:D.fl, datasets:[{{
    data:D.fv,
    backgroundColor:'rgba(167,139,250,0.16)', borderColor:'#a78bfa80',
    borderWidth:1, borderRadius:5, borderSkipped:false,
  }}]}},
  options:{{...BASE, indexAxis:'y', plugins:{{...BASE.plugins,legend:{{display:false}}}},
    scales:{{ x:{{grid:GR,ticks:TK}}, y:{{grid:{{display:false}},ticks:{{...TK,font:{{family:MN,size:8}}}}}} }}
  }}
}});

// Timeline
new Chart(document.getElementById('cTimeline'),{{
  type:'line',
  data:{{ labels:D.tl, datasets:[{{
    data:D.tv, borderColor:'#a78bfa',
    backgroundColor:(ctx)=>{{ const g=ctx.chart.ctx.createLinearGradient(0,0,0,250); g.addColorStop(0,'rgba(167,139,250,0.3)'); g.addColorStop(1,'rgba(167,139,250,0)'); return g; }},
    fill:true, tension:0.45, pointRadius:0, pointHoverRadius:5,
    pointBackgroundColor:'#a78bfa', pointBorderColor:'#06060f', pointBorderWidth:2, borderWidth:2,
  }}]}},
  options:{{...BASE, plugins:{{...BASE.plugins,legend:{{display:false}}}},
    scales:{{ x:{{grid:GR,ticks:{{...TK,maxTicksLimit:10}}}}, y:{{grid:GR,ticks:TK,beginAtZero:true}} }}
  }}
}});

// Weekday
new Chart(document.getElementById('cWeekday'),{{
  type:'bar',
  data:{{ labels:D.wl, datasets:[{{
    data:D.wv,
    backgroundColor:['#a78bfa28','#38bdf828','#34d39928','#fb923c28','#f472b628','#e879f928','#facc1528'],
    borderColor:['#a78bfa','#38bdf8','#34d399','#fb923c','#f472b6','#e879f9','#facc15'],
    borderWidth:1.5, borderRadius:8, borderSkipped:false,
  }}]}},
  options:{{...BASE, plugins:{{...BASE.plugins,legend:{{display:false}}}},
    scales:{{ x:{{grid:{{display:false}},ticks:TK}}, y:{{grid:GR,ticks:TK,beginAtZero:true}} }}
  }}
}});
</script>
</body>
</html>'''

        try:
            out=os.path.join(self.repo_path,'repo-report.html')
            with open(out,'w',encoding='utf-8') as f: f.write(HTML)
            print(f"  {C.GREEN}✓{C.RESET} {C.GRAY}Saved: {out}{C.RESET}")
        except:
            try:
                out=os.path.join(os.getcwd(),'repo-report.html')
                with open(out,'w',encoding='utf-8') as f: f.write(HTML)
                print(f"  {C.GREEN}✓{C.RESET} {C.GRAY}Saved: {out}{C.RESET}")
            except Exception as e:
                print(f"  {C.RED}✗ Error: {e}{C.RESET}")


def main():
    C.enable_windows()
    path=sys.argv[1] if len(sys.argv)>1 else os.getcwd()
    if not os.path.isdir(path):
        print(f"{C.RED}✗ Not found: {path}{C.RESET}"); sys.exit(1)
    a=RepoAnalyzer(path); a.scan(); a.print_report()

if __name__=='__main__':
    main()