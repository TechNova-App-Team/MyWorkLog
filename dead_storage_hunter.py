#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════╗
║          💀  DEAD STORAGE HUNTER  v2.0  💀               ║
║       Echter statischer localStorage-Analyzer            ║
║  Konstanten · Aliase · Wrapper · Vendor-Filter · HTML    ║
╚═══════════════════════════════════════════════════════════╝

Features:
  • Konstanten-Auflösung  (const KEY = 'foo' → setItem(KEY))
  • Alias-Tracking        (const ls = localStorage → ls.setItem)
  • Wrapper-Erkennung     (function save(k,v){localStorage.setItem(k,v)})
  • Vendor-Auto-Skip      (.min.js, .venv, node_modules, dist, …)
  • Conditional-SET-Flag  (Key nur in if/try gesetzt → Warnung)
  • HTML-Report           (--html report.html)
  • Fix-Vorschläge        (--fix)
  • JSON-Export           (--json report.json)
  • Severity-Levels       (--min-severity dead|ghost|all)

Usage:
  python dead_storage_hunter_v2.py ./src
  python dead_storage_hunter_v2.py . --ext .js .ts .jsx .tsx .vue
  python dead_storage_hunter_v2.py . --html report.html --fix
  python dead_storage_hunter_v2.py . --min-severity dead
"""

import re, sys, json, argparse, textwrap, html as html_mod
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

# ══════════════════════════════════════════════════════════════
#  VENDOR / NOISE FILTER
# ══════════════════════════════════════════════════════════════

VENDOR_PATH_PARTS = {
    'node_modules', '.git', '.venv', 'venv', '__pycache__',
    'dist', 'build', 'coverage', '.nyc_output', '.next',
    'out', '.nuxt', '.svelte-kit', 'vendor', 'bower_components',
    'site-packages', 'labextension', 'htmlfiles',
}

VENDOR_FILENAME_PATTERNS = [
    re.compile(r'\.min\.[cm]?js$'),
    re.compile(r'\.bundle\.[cm]?js$'),
    re.compile(r'\.(chunk|prod)\.[cm]?js$'),
    re.compile(r'^[a-f0-9]{8,}\.[a-f0-9]+\.[cm]?js$'),  # content-hash filenames
]

def is_vendor(path: Path) -> bool:
    for part in path.parts:
        if part.lower() in VENDOR_PATH_PARTS:
            return True
    for pat in VENDOR_FILENAME_PATTERNS:
        if pat.search(path.name):
            return True
    return False

# ══════════════════════════════════════════════════════════════
#  REGEX PATTERNS
# ══════════════════════════════════════════════════════════════

# localStorage aliases: const ls = localStorage  /  const {setItem} = localStorage
ALIAS_RE = re.compile(
    r'(?:const|let|var)\s+(\w+)\s*=\s*(?:window\.)?localStorage\b',
    re.MULTILINE
)
# Destrukturierung: const { setItem, getItem } = localStorage
DESTR_RE = re.compile(
    r'(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:window\.)?localStorage\b',
    re.MULTILINE
)

# Konstanten-Definitionen: const MY_KEY = 'somekey'  /  KEY_FOO = "bar"
CONST_RE = re.compile(
    r'(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*[\'"]([^\'"]{1,80})[\'"]\s*[;,\n]',
    re.MULTILINE
)
# Auch normale camelCase-Konstanten erfassen
CONST_CAMEL_RE = re.compile(
    r'(?:const|let|var)\s+([a-zA-Z_$][\w$]*[Kk]ey[s]?|[a-zA-Z_$][\w$]*[Nn]ame[s]?|STORAGE_\w+|LS_\w+|LOCAL_\w+)\s*=\s*[\'"]([^\'"]{1,80})[\'"]\s*[;,\n]',
    re.MULTILINE
)

# Template: `prefix_${something}` — als dynamisch markieren mit prefix-Hinweis
TEMPLATE_PREFIX_RE = re.compile(
    r'localStorage\.(?:setItem|getItem|removeItem)\s*\(\s*`([^`$]*)\$\{',
    re.MULTILINE
)

# Wrapper-Funktionen die localStorage intern nutzen
WRAPPER_DEF_RE = re.compile(
    r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:const|let|var)\s+(\w+)\s*=\s*function)\s*\([^)]*\)\s*\{[^}]*localStorage\.(setItem|getItem|removeItem)\s*\(\s*(\w+)',
    re.MULTILINE | re.DOTALL
)

# Conditional context detection
CONDITIONAL_RE = re.compile(
    r'(?:if\s*\(|try\s*\{|switch\s*\()',
)

def build_ls_patterns(aliases: list[str]) -> dict:
    """Baut Patterns für localStorage + alle Aliase."""
    prefixes = ['localStorage', 'window\\.localStorage'] + [re.escape(a) for a in aliases]
    pat_group = '|'.join(prefixes)
    return {
        'set':    re.compile(rf'(?:{pat_group})\.setItem\s*\(\s*([\'"`])([^\'"` {{}}]+)\1', re.MULTILINE),
        'get':    re.compile(rf'(?:{pat_group})\.getItem\s*\(\s*([\'"`])([^\'"` {{}}]+)\1', re.MULTILINE),
        'remove': re.compile(rf'(?:{pat_group})\.removeItem\s*\(\s*([\'"`])([^\'"` {{}}]+)\1', re.MULTILINE),
        # Variable als Key: setItem(MY_KEY, ...)
        'set_var':    re.compile(rf'(?:{pat_group})\.setItem\s*\(\s*([A-Za-z_$][\w$]*)\s*,', re.MULTILINE),
        'get_var':    re.compile(rf'(?:{pat_group})\.getItem\s*\(\s*([A-Za-z_$][\w$]*)\s*\)', re.MULTILINE),
        'remove_var': re.compile(rf'(?:{pat_group})\.removeItem\s*\(\s*([A-Za-z_$][\w$]*)\s*\)', re.MULTILINE),
        # Dynamisch (Template-String)
        'set_dyn':    re.compile(rf'(?:{pat_group})\.setItem\s*\(\s*`', re.MULTILINE),
        'get_dyn':    re.compile(rf'(?:{pat_group})\.getItem\s*\(\s*`', re.MULTILINE),
        'remove_dyn': re.compile(rf'(?:{pat_group})\.removeItem\s*\(\s*`', re.MULTILINE),
    }

# ══════════════════════════════════════════════════════════════
#  DATA STRUCTURES
# ══════════════════════════════════════════════════════════════

@dataclass
class Occurrence:
    file: str
    line: int
    snippet: str
    conditional: bool = False   # gesetzt/gelesen in if/try?
    resolved_from: str = ''     # wenn via Konstante aufgelöst

@dataclass
class DynamicOccurrence:
    file: str
    line: int
    snippet: str
    prefix: str = ''            # z.B. 'mwl_export_reminder_shown_'
    op: str = ''                # set/get/remove

@dataclass
class WrapperCall:
    wrapper_name: str
    file: str
    line: int
    op: str                     # set/get/remove

@dataclass
class KeyReport:
    key: str
    setters:   list[Occurrence] = field(default_factory=list)
    getters:   list[Occurrence] = field(default_factory=list)
    removers:  list[Occurrence] = field(default_factory=list)
    dynamics:  list[DynamicOccurrence] = field(default_factory=list)
    wrappers:  list[WrapperCall] = field(default_factory=list)

    @property
    def effective_setters(self):
        return self.setters + [w for w in self.wrappers if w.op == 'set']

    @property
    def effective_getters(self):
        return self.getters + [w for w in self.wrappers if w.op == 'get']

    @property
    def all_conditional_sets(self):
        return all(o.conditional for o in self.setters) and bool(self.setters)

    @property
    def status(self) -> str:
        has_set    = bool(self.effective_setters)
        has_get    = bool(self.effective_getters)
        has_remove = bool(self.removers)
        has_dyn    = bool(self.dynamics)

        if has_dyn and not has_set and not has_get:
            return 'DYNAMIC'
        if has_set and not has_get and not has_remove:
            return 'DEAD'
        if has_get and not has_set:
            return 'GHOST'
        if has_remove and not has_set and not has_get:
            return 'ORPHAN'
        if has_set and has_get:
            if self.all_conditional_sets:
                return 'CONDITIONAL'
            return 'CLEAN'
        return 'UNKNOWN'

    @property
    def severity(self) -> int:
        return {'DEAD': 0, 'GHOST': 1, 'ORPHAN': 2, 'CONDITIONAL': 3,
                'DYNAMIC': 4, 'CLEAN': 5, 'UNKNOWN': 6}.get(self.status, 99)

# ══════════════════════════════════════════════════════════════
#  FILE SCANNER
# ══════════════════════════════════════════════════════════════

def get_line_number(content: str, pos: int) -> int:
    return content[:pos].count('\n') + 1

def get_snippet(lines: list[str], line_num: int, maxlen: int = 90) -> str:
    return lines[line_num - 1].strip()[:maxlen] if line_num <= len(lines) else ''

def is_in_conditional(content: str, pos: int, window: int = 200) -> bool:
    before = content[max(0, pos - window):pos]
    return bool(CONDITIONAL_RE.search(before))

def extract_aliases(content: str) -> list[str]:
    aliases = []
    for m in ALIAS_RE.finditer(content):
        aliases.append(m.group(1))
    return aliases

def extract_constants(content: str) -> dict[str, str]:
    """Gibt {VAR_NAME: 'string_value'} zurück."""
    consts = {}
    for pat in (CONST_RE, CONST_CAMEL_RE):
        for m in pat.finditer(content):
            consts[m.group(1)] = m.group(2)
    # Auch einfachere Definitionen: const myKey = 'value'
    simple = re.finditer(
        r'(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*[\'"]([^\'"]{1,80})[\'"]\s*[;,\n]',
        content, re.MULTILINE
    )
    for m in simple:
        name, val = m.group(1), m.group(2)
        # Nur nehmen wenn Name wie ein Key aussieht
        if any(kw in name.lower() for kw in ('key', 'name', 'storage', 'ls_', 'local_', '_key', 'prefix')):
            consts[name] = val
    return consts

def extract_wrapper_functions(content: str, filepath: str, lines: list[str]) -> dict[str, str]:
    """
    Findet Wrapper-Funktionen die localStorage intern nutzen.
    Gibt {funcName: 'set'|'get'|'remove'} zurück.
    """
    wrappers = {}
    # Suche Funktionen die localStorage.X intern aufrufen
    func_re = re.compile(
        r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>))'
        r'[^{]*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
        re.MULTILINE | re.DOTALL
    )
    for m in func_re.finditer(content):
        fname = m.group(1) or m.group(2)
        if not fname:
            continue
        body = m.group(3)
        if 'localStorage.setItem' in body or 'setItem' in body:
            wrappers[fname] = 'set'
        elif 'localStorage.getItem' in body or 'getItem' in body:
            wrappers[fname] = 'get'
        elif 'localStorage.removeItem' in body or 'removeItem' in body:
            wrappers[fname] = 'remove'
    return wrappers

def scan_file(filepath: Path, root: Path, global_consts: dict[str, str]) -> tuple[dict, list, list]:
    """
    Scannt eine einzelne Datei.
    Gibt zurück: (key_occurrences, dynamic_occurrences, warnings)
    key_occurrences = {key: {'set':[], 'get':[], 'remove':[], 'wrappers':[]}}
    """
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        return {}, [], [f"Lesefehler {filepath}: {e}"]

    rel = str(filepath.relative_to(root))
    lines = content.splitlines()
    warnings = []

    # Aliase in dieser Datei
    aliases = extract_aliases(content)

    # Lokale Konstanten + globale mergen
    local_consts = extract_constants(content)
    consts = {**global_consts, **local_consts}

    # Wrapper-Funktionen
    wrappers = extract_wrapper_functions(content, rel, lines)

    # Patterns bauen (inkl. Aliase)
    pats = build_ls_patterns(aliases)

    key_data: dict[str, dict] = defaultdict(lambda: {'set': [], 'get': [], 'remove': [], 'wrappers': []})
    dynamic_occurrences: list[DynamicOccurrence] = []

    def record(op: str, key: str, pos: int, resolved_from: str = ''):
        ln = get_line_number(content, pos)
        snip = get_snippet(lines, ln)
        cond = is_in_conditional(content, pos)
        occ = Occurrence(file=rel, line=ln, snippet=snip,
                         conditional=cond, resolved_from=resolved_from)
        key_data[key][op].append(occ)

    # 1) Statische String-Keys
    for op, pat in [('set', pats['set']), ('get', pats['get']), ('remove', pats['remove'])]:
        for m in pat.finditer(content):
            record(op, m.group(2), m.start())

    # 2) Variable-Keys auflösen
    for op, pat in [('set', pats['set_var']), ('get', pats['get_var']), ('remove', pats['remove_var'])]:
        for m in pat.finditer(content):
            var_name = m.group(1)
            # Nicht als Variable werten wenn bereits als String gematcht (Überschneidung)
            if var_name in ('true', 'false', 'null', 'undefined'):
                continue
            if var_name in consts:
                resolved_key = consts[var_name]
                record(op, resolved_key, m.start(), resolved_from=var_name)
            # Sonst: als unresolvierbare Variable melden
            # (wird von dynamic_occurrences abgedeckt wenn template)

    # 3) Dynamische Template-String-Keys
    for op, pat in [('set', pats['set_dyn']), ('get', pats['get_dyn']), ('remove', pats['remove_dyn'])]:
        for m in pat.finditer(content):
            ln = get_line_number(content, m.start())
            snip = get_snippet(lines, ln)
            # Prefix extrahieren
            prefix_m = TEMPLATE_PREFIX_RE.search(snip)
            prefix = prefix_m.group(1) if prefix_m else ''
            dynamic_occurrences.append(DynamicOccurrence(
                file=rel, line=ln, snippet=snip, prefix=prefix, op=op
            ))

    # 4) Wrapper-Aufrufe erkennen
    # z.B. saveToStorage('myKey', value) wenn saveToStorage als Wrapper bekannt
    for fname, op in wrappers.items():
        call_re = re.compile(
            rf'\b{re.escape(fname)}\s*\(\s*[\'"]([^\'"]+)[\'"]',
            re.MULTILINE
        )
        for m in call_re.finditer(content):
            key = m.group(1)
            ln = get_line_number(content, m.start())
            snip = get_snippet(lines, ln)
            key_data[key]['wrappers'].append(
                WrapperCall(wrapper_name=fname, file=rel, line=ln, op=op)
            )

    return dict(key_data), dynamic_occurrences, warnings


def collect_global_constants(root: Path, extensions: list[str]) -> dict[str, str]:
    """
    Erster Pass: Sammelt alle Konstanten aus allen Dateien für Cross-File-Auflösung.
    """
    consts = {}
    for ext in extensions:
        for fp in root.rglob(f'*{ext}'):
            if is_vendor(fp):
                continue
            try:
                content = fp.read_text(encoding='utf-8', errors='ignore')
                consts.update(extract_constants(content))
            except Exception:
                pass
    return consts


def scan_project(root: Path, extensions: list[str]) -> tuple[dict, list, list, int]:
    """
    Haupt-Scan. Gibt (reports, dynamics, warnings, file_count) zurück.
    """
    # Pass 1: Globale Konstanten sammeln
    global_consts = collect_global_constants(root, extensions)

    reports: dict[str, KeyReport] = {}
    all_dynamics: list[tuple[str, DynamicOccurrence]] = []  # (file_rel, occ)
    all_warnings: list[str] = []
    file_count = 0

    def get_report(key: str) -> KeyReport:
        if key not in reports:
            reports[key] = KeyReport(key=key)
        return reports[key]

    # Pass 2: Jede Datei scannen
    for ext in extensions:
        for fp in root.rglob(f'*{ext}'):
            if is_vendor(fp):
                continue
            file_count += 1
            key_data, dynamics, warnings = scan_file(fp, root, global_consts)
            all_warnings.extend(warnings)

            for key, ops in key_data.items():
                r = get_report(key)
                r.setters.extend(ops['set'])
                r.getters.extend(ops['get'])
                r.removers.extend(ops['remove'])
                r.wrappers.extend(ops['wrappers'])

            for dyn in dynamics:
                # Versuche Prefix-Match mit bekannten Keys
                matched = False
                if dyn.prefix:
                    for key in list(reports.keys()):
                        if key.startswith(dyn.prefix):
                            reports[key].dynamics.append(dyn)
                            matched = True
                if not matched:
                    all_dynamics.append((dyn.file, dyn))

    # Ungematched dynamics als eigene Einträge
    for file_rel, dyn in all_dynamics:
        label = f'[DYN:{dyn.prefix or "?"}]_{dyn.file.replace("/","_").replace("\\","_")[:30]}'
        r = get_report(label)
        r.dynamics.append(dyn)

    return reports, all_warnings, global_consts, file_count


# ══════════════════════════════════════════════════════════════
#  TERMINAL REPORTER
# ══════════════════════════════════════════════════════════════

C = {
    'RED':    '\033[91m', 'YELLOW': '\033[93m', 'GREEN': '\033[92m',
    'ORANGE': '\033[38;5;208m', 'CYAN': '\033[96m', 'MAGENTA': '\033[95m',
    'BLUE':   '\033[94m', 'BOLD':   '\033[1m',  'DIM':   '\033[2m',
    'RESET':  '\033[0m',  'WHITE':  '\033[97m',
}

def c(col: str, text: str) -> str:
    return f"{C[col]}{text}{C['RESET']}"

STATUS_CFG = {
    'DEAD':        ('🔴', 'LEICHE',       'RED'),
    'GHOST':       ('🟡', 'GEIST',        'YELLOW'),
    'ORPHAN':      ('🟠', 'WAISE',        'ORANGE'),
    'CONDITIONAL': ('🔵', 'CONDITIONAL',  'BLUE'),
    'DYNAMIC':     ('⚡', 'DYNAMISCH',    'MAGENTA'),
    'CLEAN':       ('🟢', 'CLEAN',        'GREEN'),
    'UNKNOWN':     ('⚪', 'UNBEKANNT',    'DIM'),
}

def print_banner():
    print(c('CYAN', c('BOLD', """
╔═══════════════════════════════════════════════════════════╗
║          💀  DEAD STORAGE HUNTER  v2.0  💀               ║
║   Konstanten · Aliase · Wrapper · Vendor-Filter · HTML   ║
╚═══════════════════════════════════════════════════════════╝
""")))

def fmt_occ(occ: Occurrence, op: str, col: str) -> str:
    resolved = f' {c("CYAN","← via "+occ.resolved_from)}' if occ.resolved_from else ''
    cond     = f' {c("BLUE","[CONDITIONAL]")}' if occ.conditional else ''
    return (
        f'      {c(col, op.ljust(6))} {c("DIM", occ.file)}:{c("BOLD", str(occ.line))}'
        f'{resolved}{cond}\n'
        f'        {c("DIM","→")} {occ.snippet}'
    )

def print_report(reports: dict[str, KeyReport], warnings: list[str],
                 consts: dict, file_count: int, root: Path,
                 min_severity: int = 0, show_fix: bool = False):
    print_banner()
    print(c('DIM', f'  Gescannt:  {root.resolve()}'))
    print(c('DIM', f'  Dateien:   {file_count}'))
    print(c('DIM', f'  Konst.:    {len(consts)} Konstanten aufgelöst\n'))

    if warnings:
        print(c('YELLOW', '  ─── DATEI-FEHLER ──────────────────────────'))
        for w in warnings:
            print(f'  {w}')
        print()

    order = {'DEAD':0,'GHOST':1,'ORPHAN':2,'CONDITIONAL':3,'DYNAMIC':4,'CLEAN':5,'UNKNOWN':6}
    sorted_r = sorted(reports.values(), key=lambda r: order.get(r.status, 99))
    counts = defaultdict(int)

    for r in sorted_r:
        s = r.status
        counts[s] += 1
        if order.get(s, 99) < min_severity:
            continue
        if s in ('UNKNOWN',) and not (r.setters or r.getters or r.removers or r.wrappers):
            continue

        emoji, label, col = STATUS_CFG.get(s, ('⚪','?','DIM'))
        print(f'\n  {emoji} {c(col, c("BOLD", label))}: Key {c("BOLD", repr(r.key))}')

        if s == 'DEAD':
            print(f'     {c("DIM","Gesetzt in:")}')
            for o in r.effective_setters:
                if isinstance(o, WrapperCall):
                    print(f'      {c("RED","WRAP  ")} {c("DIM",o.file)}:{c("BOLD",str(o.line))} via {c("CYAN",o.wrapper_name+"()")}')
                else:
                    print(fmt_occ(o, 'SET', 'RED'))
            print(f'     {c("RED","→ Nirgendwo per getItem abgerufen! (Dead Storage)")}')
            if show_fix:
                for o in r.setters:
                    print(f'     {c("CYAN","[FIX]")} Entferne Zeile {o.line} in {o.file}')

        elif s == 'GHOST':
            print(f'     {c("DIM","Abgerufen in:")}')
            for o in r.effective_getters:
                print(fmt_occ(o, 'GET', 'YELLOW'))
            if r.removers:
                for o in r.removers:
                    print(fmt_occ(o, 'REMOVE', 'ORANGE'))
            print(f'     {c("YELLOW","→ Kein setItem! Externer Ursprung oder fehlende Initialisierung?")}')

        elif s == 'ORPHAN':
            print(f'     {c("DIM","Nur removeItem:")}')
            for o in r.removers:
                print(fmt_occ(o, 'REMOVE', 'ORANGE'))
            print(f'     {c("ORANGE","→ Nur removeItem — Migrations-Überrest?")}')
            if show_fix:
                for o in r.removers:
                    print(f'     {c("CYAN","[FIX]")} Prüfe ob removeItem in Zeile {o.line} ({o.file}) noch nötig')

        elif s == 'CONDITIONAL':
            print(f'     {c("DIM","Gesetzt nur in if/try/switch:")}')
            for o in r.setters:
                print(fmt_occ(o, 'SET', 'BLUE'))
            print(f'     {c("DIM","Gelesen in:")}')
            for o in r.getters:
                print(fmt_occ(o, 'GET', 'BLUE'))
            print(f'     {c("BLUE","→ Key existiert nur unter Bedingungen — Default-Fallback vorhanden?")}')

        elif s == 'DYNAMIC':
            print(f'     {c("DIM","Nur dynamische Zugriffe (Template-String):")}')
            for d in r.dynamics:
                prefix_info = f' {c("CYAN","prefix: "+repr(d.prefix))}' if d.prefix else ''
                print(f'      {c("MAGENTA",d.op.upper().ljust(6))} {c("DIM",d.file)}:{d.line}{prefix_info}')
                print(f'        {c("DIM","→")} {d.snippet}')
            print(f'     {c("MAGENTA","→ Nicht statisch analysierbar — manuell prüfen!")}')

        elif s == 'CLEAN':
            set_files = list(dict.fromkeys(
                (o.wrapper_name+'()' if isinstance(o, WrapperCall) else o.file)
                for o in r.effective_setters
            ))
            get_files = list(dict.fromkeys(
                (o.wrapper_name+'()' if isinstance(o, WrapperCall) else o.file)
                for o in r.effective_getters
            ))
            print(f'     {c("DIM","set:")} {", ".join(set_files)}')
            print(f'     {c("DIM","get:")} {", ".join(get_files)}')
            if r.removers:
                rm_files = list(dict.fromkeys(o.file for o in r.removers))
                print(f'     {c("DIM","remove:")} {", ".join(rm_files)}')

    # Summary
    print(f'\n{c("CYAN","  ─── ZUSAMMENFASSUNG ────────────────────────────")}')
    print(f'  Gesamt Keys:      {c("BOLD", str(len(reports)))}')
    print(f'  🔴 Leichen:       {c("RED",     str(counts["DEAD"]))}')
    print(f'  🟡 Geister:       {c("YELLOW",  str(counts["GHOST"]))}')
    print(f'  🟠 Waisen:        {c("ORANGE",  str(counts["ORPHAN"]))}')
    print(f'  🔵 Conditional:   {c("BLUE",    str(counts["CONDITIONAL"]))}')
    print(f'  ⚡ Dynamisch:     {c("MAGENTA", str(counts["DYNAMIC"]))}')
    print(f'  🟢 Clean:         {c("GREEN",   str(counts["CLEAN"]))}')

    problems = counts['DEAD'] + counts['GHOST'] + counts['ORPHAN']
    if problems == 0:
        print(c('GREEN', c('BOLD', '\n  ✅ Sauber! Keine Leichen gefunden.\n')))
    else:
        print(c('RED', c('BOLD', f'\n  ☠️  {problems} problematische Keys. Aufräumen!\n')))

# ══════════════════════════════════════════════════════════════
#  HTML REPORT
# ══════════════════════════════════════════════════════════════

HTML_CSS = """
:root{--bg:#0d1117;--bg2:#161b22;--bg3:#1c2128;--border:#30363d;
--text:#e6edf3;--muted:#8b949e;--red:#ff7b72;--yellow:#e3b341;
--green:#3fb950;--blue:#79c0ff;--purple:#d2a8ff;--orange:#ffa657;
--magenta:#f778ba;font-family:'JetBrains Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);padding:2rem;font-size:14px}
h1{font-size:1.8rem;color:var(--blue);margin-bottom:.25rem}
.sub{color:var(--muted);margin-bottom:2rem;font-size:.85rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.75rem;margin-bottom:2rem}
.stat{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:1rem;text-align:center}
.stat-n{font-size:2rem;font-weight:700;line-height:1}
.stat-l{font-size:.75rem;color:var(--muted);margin-top:.25rem}
.filters{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem}
.filter-btn{background:var(--bg3);border:1px solid var(--border);color:var(--text);
padding:.4rem 1rem;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.8rem}
.filter-btn.active{border-color:var(--blue);color:var(--blue)}
.key-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;
margin-bottom:.75rem;overflow:hidden}
.key-header{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;cursor:pointer;
user-select:none}
.key-header:hover{background:var(--bg3)}
.badge{font-size:.7rem;padding:.2rem .6rem;border-radius:4px;font-weight:700}
.badge-DEAD{background:#3d1212;color:var(--red)}
.badge-GHOST{background:#332900;color:var(--yellow)}
.badge-ORPHAN{background:#2d1e00;color:var(--orange)}
.badge-CLEAN{background:#122312;color:var(--green)}
.badge-CONDITIONAL{background:#0d2340;color:var(--blue)}
.badge-DYNAMIC{background:#2d1030;color:var(--magenta)}
.badge-UNKNOWN{background:var(--bg3);color:var(--muted)}
.key-name{font-weight:700;font-size:.95rem;flex:1}
.key-body{padding:1rem;border-top:1px solid var(--border);display:none}
.key-body.open{display:block}
.occ-group{margin-bottom:.75rem}
.occ-label{color:var(--muted);font-size:.75rem;text-transform:uppercase;margin-bottom:.35rem;letter-spacing:.05em}
.occ{background:var(--bg);border-left:3px solid var(--border);padding:.5rem .75rem;
margin-bottom:.35rem;border-radius:0 4px 4px 0;font-size:.82rem}
.occ.set{border-color:var(--red)}
.occ.get{border-color:var(--yellow)}
.occ.remove{border-color:var(--orange)}
.occ.wrap{border-color:var(--purple)}
.occ-file{color:var(--blue)}
.occ-line{color:var(--green);margin:0 .5rem}
.occ-resolved{color:var(--purple);font-size:.75rem}
.occ-cond{color:var(--blue);font-size:.75rem}
.occ-snip{color:var(--muted);margin-top:.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fix-box{background:#0d2340;border:1px solid #1f4068;border-radius:6px;padding:.75rem;margin-top:.5rem;color:var(--blue);font-size:.82rem}
.warn-box{background:#2d1e00;border:1px solid var(--orange);border-radius:6px;padding:.75rem;color:var(--orange);font-size:.82rem;margin-bottom:1rem}
.search{width:100%;background:var(--bg3);border:1px solid var(--border);color:var(--text);
padding:.5rem 1rem;border-radius:6px;font-family:inherit;font-size:.9rem;margin-bottom:1rem}
.hidden{display:none!important}
footer{margin-top:3rem;color:var(--muted);font-size:.75rem;text-align:center}
"""

def occ_html(occ, op_class: str) -> str:
    resolved = f'<span class="occ-resolved"> ← via {html_mod.escape(occ.resolved_from)}</span>' if occ.resolved_from else ''
    cond     = '<span class="occ-cond"> [CONDITIONAL]</span>' if occ.conditional else ''
    snip     = html_mod.escape(occ.snippet)
    return (
        f'<div class="occ {op_class}">'
        f'<span class="occ-file">{html_mod.escape(occ.file)}</span>'
        f'<span class="occ-line">:{occ.line}</span>'
        f'{resolved}{cond}'
        f'<div class="occ-snip">{snip}</div>'
        f'</div>'
    )

def generate_html(reports: dict[str, KeyReport], warnings: list[str],
                  consts: dict, file_count: int, root: Path, output_path: str):
    counts = defaultdict(int)
    for r in reports.values():
        counts[r.status] += 1

    cards_html = []
    order = {'DEAD':0,'GHOST':1,'ORPHAN':2,'CONDITIONAL':3,'DYNAMIC':4,'CLEAN':5,'UNKNOWN':6}
    sorted_r = sorted(reports.values(), key=lambda r: order.get(r.status, 99))

    for r in sorted_r:
        s = r.status
        emoji = STATUS_CFG.get(s, ('⚪','?','DIM'))[0]
        label = STATUS_CFG.get(s, ('⚪','?','DIM'))[1]
        body_parts = []

        if r.setters or (r.wrappers and any(w.op=='set' for w in r.wrappers)):
            body_parts.append('<div class="occ-group"><div class="occ-label">SET</div>')
            for o in r.setters:
                body_parts.append(occ_html(o, 'set'))
            for w in r.wrappers:
                if w.op == 'set':
                    body_parts.append(
                        f'<div class="occ wrap">'
                        f'<span class="occ-file">{html_mod.escape(w.file)}</span>'
                        f'<span class="occ-line">:{w.line}</span>'
                        f' <span class="occ-resolved">via wrapper {html_mod.escape(w.wrapper_name)}()</span>'
                        f'</div>'
                    )
            body_parts.append('</div>')

        if r.getters or (r.wrappers and any(w.op=='get' for w in r.wrappers)):
            body_parts.append('<div class="occ-group"><div class="occ-label">GET</div>')
            for o in r.getters:
                body_parts.append(occ_html(o, 'get'))
            body_parts.append('</div>')

        if r.removers:
            body_parts.append('<div class="occ-group"><div class="occ-label">REMOVE</div>')
            for o in r.removers:
                body_parts.append(occ_html(o, 'remove'))
            body_parts.append('</div>')

        if r.dynamics:
            body_parts.append('<div class="occ-group"><div class="occ-label">DYNAMISCH</div>')
            for d in r.dynamics:
                prefix_info = f' [prefix: {html_mod.escape(d.prefix)}]' if d.prefix else ''
                body_parts.append(
                    f'<div class="occ">'
                    f'<span class="occ-file">{html_mod.escape(d.file)}</span>'
                    f'<span class="occ-line">:{d.line}</span>'
                    f'<span class="occ-resolved">{html_mod.escape(prefix_info)}</span>'
                    f'<div class="occ-snip">{html_mod.escape(d.snippet)}</div>'
                    f'</div>'
                )
            body_parts.append('</div>')

        # Fix-Vorschläge
        if s == 'DEAD':
            fixes = ''.join(f'→ Entferne Zeile {o.line} in {html_mod.escape(o.file)}<br>' for o in r.setters)
            body_parts.append(f'<div class="fix-box">💡 Fix-Vorschlag:<br>{fixes}</div>')
        elif s == 'ORPHAN':
            fixes = ''.join(f'→ Prüfe removeItem Zeile {o.line} in {html_mod.escape(o.file)}<br>' for o in r.removers)
            body_parts.append(f'<div class="fix-box">💡 Fix-Vorschlag:<br>{fixes}</div>')

        key_escaped = html_mod.escape(r.key)
        card = (
            f'<div class="key-card" data-status="{s}">'
            f'<div class="key-header" onclick="toggle(this)">'
            f'<span>{emoji}</span>'
            f'<span class="badge badge-{s}">{label}</span>'
            f'<span class="key-name">{key_escaped}</span>'
            f'<span style="color:var(--muted);font-size:.8rem">▼</span>'
            f'</div>'
            f'<div class="key-body">{"".join(body_parts)}</div>'
            f'</div>'
        )
        cards_html.append(card)

    warn_html = ''
    if warnings:
        warn_html = '<div class="warn-box">⚠️ Datei-Fehler:<br>' + '<br>'.join(html_mod.escape(w) for w in warnings) + '</div>'

    stats_html = ''
    for s, (emoji, label, _) in STATUS_CFG.items():
        n = counts.get(s, 0)
        col_map = {'RED':'var(--red)','YELLOW':'var(--yellow)','GREEN':'var(--green)',
                   'ORANGE':'var(--orange)','BLUE':'var(--blue)','MAGENTA':'var(--magenta)','DIM':'var(--muted)'}
        col = col_map.get(STATUS_CFG[s][2], 'var(--text)')
        stats_html += f'<div class="stat"><div class="stat-n" style="color:{col}">{n}</div><div class="stat-l">{emoji} {label}</div></div>'

    # Total
    stats_html += f'<div class="stat"><div class="stat-n">{len(reports)}</div><div class="stat-l">📦 Gesamt</div></div>'
    stats_html += f'<div class="stat"><div class="stat-n" style="color:var(--muted)">{file_count}</div><div class="stat-l">📄 Dateien</div></div>'
    stats_html += f'<div class="stat"><div class="stat-n" style="color:var(--purple)">{len(consts)}</div><div class="stat-l">🔑 Konst. aufgelöst</div></div>'

    filter_btns = '<button class="filter-btn active" onclick="filterCards(\'ALL\',this)">Alle</button>'
    for s, (emoji, label, _) in STATUS_CFG.items():
        filter_btns += f'<button class="filter-btn" onclick="filterCards(\'{s}\',this)">{emoji} {label}</button>'

    doc = f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dead Storage Hunter Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>{HTML_CSS}</style>
</head>
<body>
<h1>💀 Dead Storage Hunter v2.0</h1>
<div class="sub">Report generiert: {datetime.now().strftime('%d.%m.%Y %H:%M')} | Verzeichnis: {html_mod.escape(str(root.resolve()))}</div>
{warn_html}
<div class="stats">{stats_html}</div>
<input class="search" type="text" placeholder="Key suchen..." oninput="searchCards(this.value)">
<div class="filters">{filter_btns}</div>
<div id="cards">{"".join(cards_html)}</div>
<footer>Dead Storage Hunter v2.0 — Statischer localStorage-Analyzer</footer>
<script>
function toggle(h){{const b=h.nextElementSibling;b.classList.toggle('open');}}
function filterCards(s,btn){{
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.key-card').forEach(c=>{{
    c.classList.toggle('hidden', s!=='ALL' && c.dataset.status!==s);
  }});
}}
function searchCards(q){{
  const ql=q.toLowerCase();
  document.querySelectorAll('.key-card').forEach(c=>{{
    const name=c.querySelector('.key-name').textContent.toLowerCase();
    c.classList.toggle('hidden',!!q && !name.includes(ql));
  }});
}}
</script>
</body>
</html>"""

    Path(output_path).write_text(doc, encoding='utf-8')
    print(c('CYAN', f'  📄 HTML-Report: {output_path}\n'))

# ══════════════════════════════════════════════════════════════
#  JSON EXPORT
# ══════════════════════════════════════════════════════════════

def export_json(reports: dict[str, KeyReport], path: str):
    def occ_dict(o):
        return {'file': o.file, 'line': o.line, 'snippet': o.snippet,
                'conditional': o.conditional, 'resolved_from': o.resolved_from}
    data = {
        key: {
            'status':   r.status,
            'setters':  [occ_dict(o) for o in r.setters],
            'getters':  [occ_dict(o) for o in r.getters],
            'removers': [occ_dict(o) for o in r.removers],
            'wrappers': [{'name':w.wrapper_name,'file':w.file,'line':w.line,'op':w.op} for w in r.wrappers],
            'dynamics': [{'file':d.file,'line':d.line,'snippet':d.snippet,'prefix':d.prefix,'op':d.op} for d in r.dynamics],
        }
        for key, r in reports.items()
    }
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(c('CYAN', f'  💾 JSON-Report: {path}\n'))

# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description='💀 Dead Storage Hunter v2 — Echter statischer localStorage-Analyzer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
        Beispiele:
          python dead_storage_hunter_v2.py ./src
          python dead_storage_hunter_v2.py . --ext .js .ts .jsx .tsx .vue
          python dead_storage_hunter_v2.py . --html report.html --fix
          python dead_storage_hunter_v2.py . --min-severity ghost --json out.json
          python dead_storage_hunter_v2.py . --only-problems
        """)
    )
    parser.add_argument('root', help='Projektverzeichnis')
    parser.add_argument('--ext', nargs='+',
        default=['.js','.ts','.jsx','.tsx','.vue','.svelte','.mjs','.cjs'],
        metavar='EXT', help='Dateiendungen')
    parser.add_argument('--html', metavar='FILE', help='HTML-Report ausgeben')
    parser.add_argument('--json', metavar='FILE', help='JSON-Report ausgeben')
    parser.add_argument('--fix', action='store_true', help='Fix-Vorschläge anzeigen')
    parser.add_argument('--only-problems', action='store_true',
        help='Nur DEAD + GHOST + ORPHAN anzeigen')
    parser.add_argument('--min-severity', choices=['dead','ghost','orphan','conditional','dynamic','clean'],
        default='dead', help='Minimale Severity anzeigen (default: dead)')
    parser.add_argument('--no-color', action='store_true', help='Kein ANSI-Farben')

    args = parser.parse_args()

    if args.no_color:
        for k in C:
            C[k] = ''

    root = Path(args.root)
    if not root.exists():
        print(f'❌ Verzeichnis nicht gefunden: {root}')
        sys.exit(1)

    sev_map = {'dead':0,'ghost':1,'orphan':2,'conditional':3,'dynamic':4,'clean':5}
    min_sev = sev_map.get(args.min_severity, 0)
    if args.only_problems:
        min_sev = 0

    print(c('DIM', f'\n  Scanne {root.resolve()} …\n'))

    reports, warnings, consts, file_count = scan_project(root, args.ext)

    if args.only_problems:
        reports = {k: v for k, v in reports.items() if v.status in ('DEAD','GHOST','ORPHAN')}

    print_report(reports, warnings, consts, file_count, root,
                 min_severity=min_sev, show_fix=args.fix)

    if args.html:
        generate_html(reports, warnings, consts, file_count, root, args.html)

    if args.json:
        export_json(reports, args.json)

    has_problems = any(r.status in ('DEAD','GHOST','ORPHAN') for r in reports.values())
    sys.exit(1 if has_problems else 0)

if __name__ == '__main__':
    main()