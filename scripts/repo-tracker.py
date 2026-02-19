#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════╗
║  🔥 REPO TRACKER PRO v2.0 – Hochmoderne Projekt-Fortschrittsanalyse  ║
║  ─────────────────────────────────────────────────────────────────    ║
║  Features:                                                           ║
║  • Zeilen-Analyse (Code / Kommentare / Leerzeilen)                  ║
║  • Datei-Heatmap (größte Dateien)                                    ║
║  • Git-Statistiken (Commits, Autoren, Branches)                      ║
║  • Sprachen-Verteilung                                               ║
║  • Komplexitäts-Score                                                ║
║  • Duplikat-Erkennung                                                ║
║  • TODO/FIXME/HACK Scanner                                           ║
║  • Dependency-Check                                                  ║
║  • Timeline (Commit-History Visualisierung)                          ║
║  • HTML Report Export                                                ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import hashlib
import subprocess
import re
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Tuple, Optional

# ══════════════════════════════════════════════════════════════
# KONFIGURATION
# ══════════════════════════════════════════════════════════════

IGNORE_DIRS = {
    '.git', 'node_modules', '__pycache__', '.vscode', '.idea',
    'dist', 'build', 'coverage', '.next', 'venv', 'env',
    '.cache', '.parcel-cache', 'package-lock.json'
}

IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.DS_Store', 'Thumbs.db', '.gitkeep'
}

LANGUAGE_MAP = {
    '.html': ('HTML', '<!--', '-->'),
    '.css': ('CSS', '/*', '*/'),
    '.js': ('JavaScript', '//', None),
    '.ts': ('TypeScript', '//', None),
    '.jsx': ('React JSX', '//', None),
    '.tsx': ('React TSX', '//', None),
    '.py': ('Python', '#', None),
    '.json': ('JSON', None, None),
    '.md': ('Markdown', None, None),
    '.yml': ('YAML', '#', None),
    '.yaml': ('YAML', '#', None),
    '.sql': ('SQL', '--', None),
    '.sh': ('Shell', '#', None),
    '.bat': ('Batch', 'REM', None),
    '.ps1': ('PowerShell', '#', None),
    '.xml': ('XML', '<!--', '-->'),
    '.svg': ('SVG', '<!--', '-->'),
    '.txt': ('Text', None, None),
    '.env': ('Environment', '#', None),
    '.toml': ('TOML', '#', None),
    '.ini': ('INI', ';', None),
    '.php': ('PHP', '//', None),
    '.rb': ('Ruby', '#', None),
    '.go': ('Go', '//', None),
    '.rs': ('Rust', '//', None),
    '.java': ('Java', '//', None),
    '.c': ('C', '//', None),
    '.cpp': ('C++', '//', None),
    '.h': ('C Header', '//', None),
}

# ══════════════════════════════════════════════════════════════
# ANSI FARBEN (Windows Terminal Support)
# ══════════════════════════════════════════════════════════════

class C:
    """Terminal-Farben mit Windows-Support"""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    ITALIC = '\033[3m'
    UNDERLINE = '\033[4m'
    
    # Farben
    RED = '\033[38;5;196m'
    GREEN = '\033[38;5;46m'
    YELLOW = '\033[38;5;226m'
    BLUE = '\033[38;5;33m'
    PURPLE = '\033[38;5;141m'
    CYAN = '\033[38;5;87m'
    ORANGE = '\033[38;5;208m'
    PINK = '\033[38;5;213m'
    WHITE = '\033[38;5;255m'
    GRAY = '\033[38;5;245m'
    DARK_GRAY = '\033[38;5;240m'
    
    # Hintergrund
    BG_PURPLE = '\033[48;5;53m'
    BG_GREEN = '\033[48;5;22m'
    BG_RED = '\033[48;5;52m'
    BG_BLUE = '\033[48;5;17m'
    BG_DARK = '\033[48;5;236m'

    @staticmethod
    def enable_windows():
        """Aktiviere ANSI-Support für Windows Terminal"""
        if os.name == 'nt':
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
            except:
                pass

# ══════════════════════════════════════════════════════════════
# UTILITY FUNKTIONEN
# ══════════════════════════════════════════════════════════════

def format_number(n: int) -> str:
    """Formatiert Zahlen mit Tausendertrennung"""
    return f"{n:,}".replace(",", ".")

def format_size(size_bytes: int) -> str:
    """Formatiert Dateigröße"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"

def progress_bar(pct: float, width: int = 30, filled_char: str = '█', empty_char: str = '░') -> str:
    """Erstellt einen farbigen Fortschrittsbalken"""
    filled = int(width * pct / 100)
    empty = width - filled
    
    if pct >= 80:
        color = C.GREEN
    elif pct >= 50:
        color = C.YELLOW
    elif pct >= 25:
        color = C.ORANGE
    else:
        color = C.RED
    
    return f"{color}{filled_char * filled}{C.DARK_GRAY}{empty_char * empty}{C.RESET}"

def sparkline(values: list) -> str:
    """Erstellt eine Sparkline aus Werten"""
    if not values:
        return ""
    blocks = '▁▂▃▄▅▆▇█'
    mn, mx = min(values), max(values)
    rng = mx - mn if mx != mn else 1
    return ''.join(blocks[min(int((v - mn) / rng * 7), 7)] for v in values)

def run_git(cmd: str, cwd: str) -> str:
    """Führt Git-Befehl aus und gibt Output zurück"""
    try:
        result = subprocess.run(
            f'git {cmd}',
            shell=True, capture_output=True, text=True,
            cwd=cwd, timeout=30, encoding='utf-8', errors='replace'
        )
        return result.stdout.strip()
    except:
        return ""

def truncate(text: str, max_len: int = 50) -> str:
    """Kürzt Text"""
    return text[:max_len-2] + '..' if len(text) > max_len else text

# ══════════════════════════════════════════════════════════════
# KERN-ANALYSE
# ══════════════════════════════════════════════════════════════

class RepoAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = os.path.abspath(repo_path)
        self.files: List[dict] = []
        self.total_lines = 0
        self.code_lines = 0
        self.comment_lines = 0
        self.blank_lines = 0
        self.total_size = 0
        self.languages: Dict[str, dict] = {}
        self.todos: List[dict] = []
        self.duplicates: List[Tuple[str, str]] = []
        self.file_hashes: Dict[str, List[str]] = defaultdict(list)
        self.git_available = False
        self.start_time = datetime.now()
        
    def scan(self):
        """Hauptscan-Routine"""
        print(f"\n{C.PURPLE}{C.BOLD}  ⟐ Scanne Repository...{C.RESET}")
        print(f"  {C.GRAY}Pfad: {self.repo_path}{C.RESET}\n")
        
        self._check_git()
        self._scan_files()
        self._detect_duplicates()
        
    def _check_git(self):
        """Prüfe ob Git verfügbar ist"""
        result = run_git('rev-parse --is-inside-work-tree', self.repo_path)
        self.git_available = result == 'true'
        
    def _scan_files(self):
        """Scannt alle Dateien im Repository"""
        for root, dirs, files in os.walk(self.repo_path):
            # Ignorierte Verzeichnisse überspringen
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for fname in files:
                if fname in IGNORE_FILES:
                    continue
                    
                filepath = os.path.join(root, fname)
                relpath = os.path.relpath(filepath, self.repo_path)
                ext = Path(fname).suffix.lower()
                
                try:
                    fsize = os.path.getsize(filepath)
                except OSError:
                    continue
                
                # Binärdateien überspringen (> 1MB oder bekannte Binärformate)
                binary_exts = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.zip', '.pdf', '.exe', '.dll'}
                if ext in binary_exts or fsize > 2_000_000:
                    self.files.append({
                        'path': relpath, 'ext': ext, 'size': fsize,
                        'lines': 0, 'code': 0, 'comments': 0, 'blanks': 0,
                        'binary': True, 'language': 'Binary'
                    })
                    self.total_size += fsize
                    continue
                
                # Textdatei analysieren
                lang_info = LANGUAGE_MAP.get(ext, ('Other', None, None))
                lang_name = lang_info[0]
                comment_single = lang_info[1]
                
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                        lines = content.splitlines()
                except:
                    continue
                    
                total = len(lines)
                code = 0
                comments = 0
                blanks = 0
                in_block_comment = False
                
                for line in lines:
                    stripped = line.strip()
                    
                    if not stripped:
                        blanks += 1
                        continue
                    
                    # Block-Kommentare (/* ... */ oder <!-- ... -->)
                    if lang_info[2]:  # Hat Block-Kommentar
                        if lang_info[1] in stripped and lang_info[2] in stripped:
                            comments += 1
                            continue
                        if lang_info[1] in stripped:
                            in_block_comment = True
                            comments += 1
                            continue
                        if lang_info[2] in stripped:
                            in_block_comment = False
                            comments += 1
                            continue
                        if in_block_comment:
                            comments += 1
                            continue
                    
                    # Einzeilige Kommentare
                    if comment_single and stripped.startswith(comment_single):
                        comments += 1
                        continue
                    
                    code += 1
                    
                    # TODO/FIXME/HACK Scanner (nur in Code-Dateien, nicht in Docs)
                    skip_todo_exts = {'.md', '.txt', '.json', '.html', '.xml', '.svg', '.yml', '.yaml', '.css'}
                    if ext not in skip_todo_exts and comment_single:
                        for marker in ['TODO', 'FIXME', 'HACK', 'BUG', 'XXX']:
                            # Nur in Kommentar-Zeilen matchen (echte Code-TODOs)
                            if marker in stripped.upper() and (
                                stripped.startswith(comment_single) or
                                f' {comment_single}' in stripped
                            ):
                                self.todos.append({
                                    'file': relpath,
                                    'line': lines.index(line) + 1,
                                    'marker': marker,
                                    'text': stripped[:120]
                                })
                
                # Hash für Duplikat-Erkennung
                if total > 5:  # Nur Dateien > 5 Zeilen
                    content_hash = hashlib.md5(content.encode()).hexdigest()
                    self.file_hashes[content_hash].append(relpath)
                
                self.files.append({
                    'path': relpath, 'ext': ext, 'size': fsize,
                    'lines': total, 'code': code, 'comments': comments,
                    'blanks': blanks, 'binary': False, 'language': lang_name
                })
                
                self.total_lines += total
                self.code_lines += code
                self.comment_lines += comments
                self.blank_lines += blanks
                self.total_size += fsize
                
                # Sprachen-Statistik
                if lang_name not in self.languages:
                    self.languages[lang_name] = {'files': 0, 'lines': 0, 'code': 0, 'size': 0}
                self.languages[lang_name]['files'] += 1
                self.languages[lang_name]['lines'] += total
                self.languages[lang_name]['code'] += code
                self.languages[lang_name]['size'] += fsize
    
    def _detect_duplicates(self):
        """Erkennt duplizierte Dateien"""
        for h, paths in self.file_hashes.items():
            if len(paths) > 1:
                for i in range(len(paths)):
                    for j in range(i + 1, len(paths)):
                        self.duplicates.append((paths[i], paths[j]))

    # ══════════════════════════════════════════════════════════
    # GIT-ANALYSE
    # ══════════════════════════════════════════════════════════

    def get_git_stats(self) -> dict:
        """Sammelt Git-Statistiken"""
        if not self.git_available:
            return {}
        
        stats = {}
        
        # Gesamte Commits
        stats['total_commits'] = int(run_git('rev-list --count HEAD', self.repo_path) or 0)
        
        # Branches
        branches_raw = run_git('branch -a', self.repo_path)
        stats['branches'] = [b.strip().lstrip('* ') for b in branches_raw.splitlines()] if branches_raw else []
        stats['current_branch'] = run_git('branch --show-current', self.repo_path)
        
        # Autoren
        authors_raw = run_git('shortlog -sne HEAD', self.repo_path)
        stats['authors'] = []
        if authors_raw:
            for line in authors_raw.splitlines():
                match = re.match(r'\s*(\d+)\s+(.+)', line.strip())
                if match:
                    stats['authors'].append({
                        'commits': int(match.group(1)),
                        'name': match.group(2).strip()
                    })
        
        # Letzter Commit
        stats['last_commit'] = run_git('log -1 --format="%H|%an|%ae|%ai|%s"', self.repo_path)
        
        # Commits pro Tag (letzte 30 Tage)
        since = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        daily_raw = run_git(f'log --since="{since}" --format="%ai" HEAD', self.repo_path)
        daily_commits = Counter()
        if daily_raw:
            for line in daily_raw.splitlines():
                day = line[:10]
                daily_commits[day] += 1
        stats['daily_commits'] = dict(sorted(daily_commits.items()))
        
        # Commits pro Wochentag
        weekday_raw = run_git('log --format="%ad" --date=format:"%u" HEAD', self.repo_path)
        weekday_names = {1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So'}
        weekday_counts = Counter()
        if weekday_raw:
            for line in weekday_raw.splitlines():
                try:
                    weekday_counts[weekday_names[int(line)]] += 1
                except:
                    pass
        stats['weekday_commits'] = dict(weekday_counts)
        
        # Commits pro Stunde
        hour_raw = run_git('log --format="%ad" --date=format:"%H" HEAD', self.repo_path)
        hour_counts = Counter()
        if hour_raw:
            for line in hour_raw.splitlines():
                try:
                    hour_counts[int(line)] += 1
                except:
                    pass
        stats['hourly_commits'] = dict(sorted(hour_counts.items()))
        
        # Erster Commit (Projektstart)
        first_raw = run_git('log --reverse --format=%ai HEAD', self.repo_path)
        stats['first_commit_date'] = first_raw.splitlines()[0].strip().strip('"')[:10] if first_raw else 'N/A'
        
        # Geänderte Dateien (uncommitted)
        status_raw = run_git('status --porcelain', self.repo_path)
        stats['uncommitted_changes'] = len(status_raw.splitlines()) if status_raw else 0
        
        # Tags
        tags_raw = run_git('tag --sort=-creatordate', self.repo_path)
        stats['tags'] = tags_raw.splitlines()[:10] if tags_raw else []
        
        return stats

    # ══════════════════════════════════════════════════════════
    # KOMPLEXITÄTS-SCORE
    # ══════════════════════════════════════════════════════════

    def calculate_complexity_score(self) -> dict:
        """Berechnet einen Komplexitäts-Score für das Projekt"""
        score = 0
        factors = []
        
        # Faktor 1: Codezeilen
        if self.code_lines > 50000:
            s = 25; factors.append(('📏 Massive Codebase (50k+)', s))
        elif self.code_lines > 20000:
            s = 20; factors.append(('📏 Große Codebase (20k+)', s))
        elif self.code_lines > 10000:
            s = 15; factors.append(('📏 Mittlere Codebase (10k+)', s))
        elif self.code_lines > 5000:
            s = 10; factors.append(('📏 Kleine Codebase (5k+)', s))
        else:
            s = 5; factors.append(('📏 Micro Codebase (<5k)', s))
        score += s
        
        # Faktor 2: Sprachen-Vielfalt (nur echte Programmiersprachen)
        code_langs = [l for l in self.languages if l not in ('Text', 'Markdown', 'JSON', 'Other', 'YAML', 'TOML', 'INI', 'Environment')]
        num_langs = len(code_langs)
        if num_langs >= 5:
            s = 20; factors.append(('🌐 Polyglot (5+ Sprachen)', s))
        elif num_langs >= 3:
            s = 15; factors.append(('🌐 Multi-Language (3+)', s))
        else:
            s = 5; factors.append(('🌐 Focused Stack', s))
        score += s
        
        # Faktor 3: Dateianzahl
        total_files = len([f for f in self.files if not f['binary']])
        if total_files > 100:
            s = 15; factors.append(('📁 Complex Structure (100+)', s))
        elif total_files > 50:
            s = 10; factors.append(('📁 Moderate Structure', s))
        else:
            s = 5; factors.append(('📁 Simple Structure', s))
        score += s
        
        # Faktor 4: Dokumentation (Kommentare + Markdown/README Dateien)
        md_files = [f for f in self.files if f['ext'] in ('.md', '.txt') and not f['binary']]
        md_lines = sum(f['lines'] for f in md_files)
        doc_lines = self.comment_lines + md_lines
        
        if self.total_lines > 0:
            doc_ratio = doc_lines / self.total_lines * 100
            if doc_ratio > 20:
                s = 10; factors.append((f'💬 Excellent Docs ({len(md_files)} READMEs + Kommentare)', s))
            elif doc_ratio > 10:
                s = 7; factors.append((f'💬 Well Documented ({len(md_files)} READMEs)', s))
            elif len(md_files) >= 5:
                s = 7; factors.append((f'💬 Good Docs ({len(md_files)} READMEs, {format_number(md_lines)} Zeilen)', s))
            elif doc_ratio > 5 or len(md_files) >= 3:
                s = 5; factors.append((f'💬 Documented ({len(md_files)} READMEs)', s))
            else:
                s = 2; factors.append(('💬 Low Documentation', s))
            score += s
        
        # Faktor 5: Projektlaufzeit
        if self.git_available:
            first = run_git('log --reverse --format=%ai HEAD', self.repo_path)
            if first:
                try:
                    date_str = first.splitlines()[0].strip().strip('"')[:10]
                    first_date = datetime.strptime(date_str, '%Y-%m-%d')
                    days = (datetime.now() - first_date).days
                    if days > 365:
                        s = 15; factors.append((f'📅 Mature Project ({days // 365}yr+, {days} Tage)', s))
                    elif days > 180:
                        s = 12; factors.append((f'📅 Established ({days} Tage)', s))
                    elif days > 90:
                        s = 10; factors.append((f'📅 Growing Project ({days} Tage)', s))
                    elif days > 30:
                        s = 7; factors.append((f'📅 Active Project ({days} Tage)', s))
                    else:
                        s = 5; factors.append((f'📅 New Project ({days} Tage)', s))
                    score += s
                except Exception as e:
                    factors.append(('📅 Projektlaufzeit: Parse-Fehler', 0))
        
        # Faktor 6: Dependencies
        pkg_path = os.path.join(self.repo_path, 'package.json')
        if os.path.exists(pkg_path):
            try:
                with open(pkg_path, 'r', encoding='utf-8') as f:
                    pkg = json.load(f)
                deps = len(pkg.get('dependencies', {})) + len(pkg.get('devDependencies', {}))
                if deps > 20:
                    s = 15; factors.append((f'📦 Heavy Dependencies ({deps})', s))
                elif deps > 10:
                    s = 10; factors.append((f'📦 Moderate Deps ({deps})', s))
                elif deps > 0:
                    s = 5; factors.append((f'📦 Lean Deps ({deps})', s))
                else:
                    s = 5; factors.append(('📦 Zero-Dep (Standalone)', s))
                score += s
            except:
                pass
        
        # Faktor 7: Projektstruktur (Bonus für READMEs, CI, Tests, etc.)
        has_readme = any(f['path'].lower() in ('readme.md', 'readme.txt') for f in self.files)
        has_license = any('license' in f['path'].lower() for f in self.files)
        has_contributing = any('contributing' in f['path'].lower() for f in self.files)
        has_security = any('security' in f['path'].lower() for f in self.files)
        has_coc = any('code_of_conduct' in f['path'].lower() for f in self.files)
        
        community_score = sum([has_readme, has_license, has_contributing, has_security, has_coc])
        if community_score >= 4:
            s = 10; factors.append((f'🏛️ Pro Community Files ({community_score}/5)', s))
        elif community_score >= 2:
            s = 5; factors.append((f'🏛️ Community Files ({community_score}/5)', s))
        else:
            s = 2; factors.append(('🏛️ Basic Setup', s))
        score += s
        
        return {'score': min(score, 100), 'factors': factors}

    # ══════════════════════════════════════════════════════════
    # REPORT-AUSGABE
    # ══════════════════════════════════════════════════════════

    def print_report(self):
        """Gibt den kompletten Report aus"""
        self._print_header()
        self._print_overview()
        self._print_languages()
        self._print_file_heatmap()
        self._print_complexity()
        
        if self.git_available:
            git_stats = self.get_git_stats()
            self._print_git_stats(git_stats)
            self._print_commit_timeline(git_stats)
            self._print_coding_patterns(git_stats)
        
        if self.todos:
            self._print_todos()
        
        if self.duplicates:
            self._print_duplicates()
        
        self._print_dependencies()
        self._print_footer()
        
        # HTML Report generieren
        self._generate_html_report()

    def _print_header(self):
        """Header ausgeben"""
        print(f"""
{C.BG_PURPLE}{C.WHITE}{C.BOLD}                                                                    {C.RESET}
{C.BG_PURPLE}{C.WHITE}{C.BOLD}   🔥 REPO TRACKER PRO v2.0                                         {C.RESET}
{C.BG_PURPLE}{C.WHITE}{C.BOLD}   Hochmoderne Projekt-Fortschrittsanalyse                           {C.RESET}
{C.BG_PURPLE}{C.WHITE}{C.BOLD}                                                                    {C.RESET}
{C.GRAY}   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}
{C.GRAY}   📁 {self.repo_path}{C.RESET}
{C.GRAY}   📅 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}{C.RESET}
{C.GRAY}   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}""")

    def _print_overview(self):
        """Übersicht ausgeben"""
        text_files = [f for f in self.files if not f['binary']]
        binary_files = [f for f in self.files if f['binary']]
        
        code_pct = (self.code_lines / self.total_lines * 100) if self.total_lines > 0 else 0
        comment_pct = (self.comment_lines / self.total_lines * 100) if self.total_lines > 0 else 0
        blank_pct = (self.blank_lines / self.total_lines * 100) if self.total_lines > 0 else 0
        
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  📊 PROJEKT-ÜBERSICHT                                      ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}

   {C.CYAN}📄 Dateien gesamt{C.RESET}     {C.WHITE}{C.BOLD}{format_number(len(self.files))}{C.RESET}  ({len(text_files)} Text, {len(binary_files)} Binär)
   {C.CYAN}📏 Zeilen gesamt{C.RESET}      {C.WHITE}{C.BOLD}{format_number(self.total_lines)}{C.RESET}
   {C.CYAN}💾 Größe gesamt{C.RESET}       {C.WHITE}{C.BOLD}{format_size(self.total_size)}{C.RESET}
   {C.CYAN}🌐 Sprachen{C.RESET}           {C.WHITE}{C.BOLD}{len(self.languages)}{C.RESET}

   {C.GREEN}▓ Code{C.RESET}       {format_number(self.code_lines):>10}  {progress_bar(code_pct, 25)} {code_pct:.1f}%
   {C.YELLOW}▓ Kommentare{C.RESET} {format_number(self.comment_lines):>10}  {progress_bar(comment_pct, 25)} {comment_pct:.1f}%
   {C.GRAY}▓ Leerzeilen{C.RESET} {format_number(self.blank_lines):>10}  {progress_bar(blank_pct, 25)} {blank_pct:.1f}%""")

    def _print_languages(self):
        """Sprachen-Verteilung ausgeben"""
        if not self.languages:
            return
            
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  🌐 SPRACHEN-VERTEILUNG                                    ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        sorted_langs = sorted(self.languages.items(), key=lambda x: x[1]['code'], reverse=True)
        
        lang_colors = [C.PURPLE, C.CYAN, C.GREEN, C.YELLOW, C.ORANGE, C.PINK, C.BLUE, C.RED]
        
        for i, (lang, info) in enumerate(sorted_langs[:10]):
            color = lang_colors[i % len(lang_colors)]
            pct = (info['code'] / self.code_lines * 100) if self.code_lines > 0 else 0
            bar = progress_bar(pct, 20)
            print(f"   {color}{C.BOLD}{lang:<16}{C.RESET} {info['files']:>4} files │ {format_number(info['code']):>8} code │ {bar} {pct:>5.1f}%")

    def _print_file_heatmap(self):
        """Top Dateien nach Größe"""
        text_files = sorted([f for f in self.files if not f['binary']], key=lambda x: x['lines'], reverse=True)
        
        if not text_files:
            return
            
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  🔥 DATEI-HEATMAP (Top 15 nach Zeilen)                     ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        max_lines = text_files[0]['lines'] if text_files else 1
        
        for i, f in enumerate(text_files[:15]):
            pct = (f['lines'] / max_lines * 100) if max_lines > 0 else 0
            
            # Heatmap Farbe
            if pct > 75:
                color = C.RED
                icon = '🔴'
            elif pct > 50:
                color = C.ORANGE
                icon = '🟠'
            elif pct > 25:
                color = C.YELLOW
                icon = '🟡'
            else:
                color = C.GREEN
                icon = '🟢'
            
            bar = progress_bar(pct, 15)
            rank = f"#{i+1}"
            print(f"   {C.GRAY}{rank:>3}{C.RESET} {icon} {color}{truncate(f['path'], 40):<42}{C.RESET} {format_number(f['lines']):>7} lines │ {bar}")

    def _print_complexity(self):
        """Komplexitäts-Score ausgeben"""
        result = self.calculate_complexity_score()
        score = result['score']
        
        if score >= 80:
            grade = 'S'; grade_color = C.PURPLE; label = 'ENTERPRISE-GRADE'
        elif score >= 60:
            grade = 'A'; grade_color = C.GREEN; label = 'PRODUCTION-READY'
        elif score >= 40:
            grade = 'B'; grade_color = C.CYAN; label = 'GROWING PROJECT'
        elif score >= 20:
            grade = 'C'; grade_color = C.YELLOW; label = 'STARTER PROJECT'
        else:
            grade = 'D'; grade_color = C.ORANGE; label = 'PROTOTYPE'
        
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  🧬 KOMPLEXITÄTS-ANALYSE                                   ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}

   {C.WHITE}{C.BOLD}Score:{C.RESET} {progress_bar(score, 30)} {grade_color}{C.BOLD}{score}/100{C.RESET}
   {C.WHITE}{C.BOLD}Grade:{C.RESET} {grade_color}{C.BOLD}  {grade}  {C.RESET} {C.GRAY}({label}){C.RESET}
""")
        for factor_name, factor_score in result['factors']:
            bar_mini = progress_bar(factor_score / 25 * 100, 10)
            print(f"   {C.GRAY}├─{C.RESET} {factor_name:<38} {bar_mini} {C.WHITE}+{factor_score}{C.RESET}")

    def _print_git_stats(self, stats: dict):
        """Git-Statistiken ausgeben"""
        if not stats:
            return
            
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  🌿 GIT-STATISTIKEN                                        ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}

   {C.CYAN}🔢 Commits gesamt{C.RESET}     {C.WHITE}{C.BOLD}{format_number(stats.get('total_commits', 0))}{C.RESET}
   {C.CYAN}🌿 Aktueller Branch{C.RESET}   {C.GREEN}{C.BOLD}{stats.get('current_branch', 'N/A')}{C.RESET}
   {C.CYAN}🏷️  Branches{C.RESET}           {C.WHITE}{len(stats.get('branches', []))}{C.RESET}
   {C.CYAN}🏷️  Tags{C.RESET}               {C.WHITE}{len(stats.get('tags', []))}{C.RESET}
   {C.CYAN}📅 Projektstart{C.RESET}       {C.WHITE}{stats.get('first_commit_date', 'N/A')}{C.RESET}
   {C.CYAN}⚠️  Uncommitted{C.RESET}        {C.YELLOW}{C.BOLD}{stats.get('uncommitted_changes', 0)}{C.RESET} Änderungen""")
        
        # Letzter Commit
        last = stats.get('last_commit', '')
        if last and '|' in last:
            parts = last.split('|')
            if len(parts) >= 5:
                print(f"""
   {C.GRAY}─── Letzter Commit ───{C.RESET}
   {C.WHITE}Hash:{C.RESET}    {C.YELLOW}{parts[0][:8]}{C.RESET}
   {C.WHITE}Autor:{C.RESET}   {C.CYAN}{parts[1]}{C.RESET}
   {C.WHITE}Datum:{C.RESET}   {C.GRAY}{parts[3][:19]}{C.RESET}
   {C.WHITE}Message:{C.RESET} {C.GREEN}{parts[4]}{C.RESET}""")
        
        # Autoren
        if stats.get('authors'):
            print(f"\n   {C.GRAY}─── Top Autoren ───{C.RESET}")
            total_commits = sum(a['commits'] for a in stats['authors'])
            for a in stats['authors'][:5]:
                pct = a['commits'] / total_commits * 100 if total_commits > 0 else 0
                bar = progress_bar(pct, 15)
                print(f"   {C.WHITE}{a['name']:<35}{C.RESET} {a['commits']:>5} commits {bar} {pct:.0f}%")

    def _print_commit_timeline(self, stats: dict):
        """Commit-Timeline (letzte 30 Tage)"""
        daily = stats.get('daily_commits', {})
        if not daily:
            return
        
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  📈 COMMIT-TIMELINE (30 Tage)                              ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        # Letzte 30 Tage
        today = datetime.now()
        values = []
        labels = []
        for i in range(29, -1, -1):
            day = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            count = daily.get(day, 0)
            values.append(count)
            labels.append(day)
        
        max_val = max(values) if values else 1
        
        # Sparkline
        spark = sparkline(values)
        print(f"   {C.PURPLE}{spark}{C.RESET}")
        print(f"   {C.GRAY}{'▔' * 30}{C.RESET}")
        
        # Mini-Heatmap
        blocks = ' ░▒▓█'
        line = "   "
        for v in values:
            idx = min(int(v / max(max_val, 1) * 4), 4) if v > 0 else 0
            if idx >= 3:
                line += f"{C.GREEN}{blocks[idx]}{C.RESET}"
            elif idx >= 2:
                line += f"{C.YELLOW}{blocks[idx]}{C.RESET}"
            elif idx >= 1:
                line += f"{C.DARK_GRAY}{blocks[idx]}{C.RESET}"
            else:
                line += f"{C.DARK_GRAY}·{C.RESET}"
        print(line)
        print(f"   {C.GRAY}{labels[0][-5:]}{'':>20}{labels[-1][-5:]}{C.RESET}")
        print(f"   {C.GRAY}Total: {sum(values)} commits │ Max: {max_val}/Tag │ Avg: {sum(values)/30:.1f}/Tag{C.RESET}")

    def _print_coding_patterns(self, stats: dict):
        """Coding-Pattern Analyse"""
        weekday = stats.get('weekday_commits', {})
        hourly = stats.get('hourly_commits', {})
        
        if not weekday and not hourly:
            return
        
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  🧠 CODING-PATTERNS                                        ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        if weekday:
            max_wd = max(weekday.values()) if weekday else 1
            print(f"   {C.WHITE}{C.BOLD}Commits pro Wochentag:{C.RESET}")
            for day in ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']:
                count = weekday.get(day, 0)
                bar = progress_bar(count / max_wd * 100 if max_wd > 0 else 0, 20)
                print(f"   {C.CYAN}{day}{C.RESET}  {bar} {count:>4}")
        
        if hourly:
            print(f"\n   {C.WHITE}{C.BOLD}Aktivste Stunden:{C.RESET}")
            top_hours = sorted(hourly.items(), key=lambda x: x[1], reverse=True)[:5]
            for hour, count in top_hours:
                print(f"   {C.YELLOW}{hour:02d}:00{C.RESET}  {C.WHITE}{count} commits{C.RESET}")

    def _print_todos(self):
        """TODO/FIXME Scanner"""
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  📌 TODO/FIXME SCANNER                                     ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        marker_counts = Counter(t['marker'] for t in self.todos)
        for marker, count in marker_counts.most_common():
            color = C.YELLOW if marker == 'TODO' else C.RED if marker in ('FIXME', 'BUG') else C.ORANGE
            print(f"   {color}{marker}{C.RESET}: {count}")
        
        print()
        for t in self.todos[:15]:
            color = C.YELLOW if t['marker'] == 'TODO' else C.RED
            print(f"   {color}{t['marker']}{C.RESET} {C.GRAY}{truncate(t['file'], 30)}:{t['line']}{C.RESET}")
            print(f"   {C.DARK_GRAY}{truncate(t['text'], 70)}{C.RESET}")
        
        if len(self.todos) > 15:
            print(f"\n   {C.GRAY}... und {len(self.todos) - 15} weitere{C.RESET}")

    def _print_duplicates(self):
        """Duplikat-Erkennung"""
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  ♻️  DUPLIKAT-ERKENNUNG                                     ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        print(f"   {C.YELLOW}⚠  {len(self.duplicates)} Duplikat-Paare gefunden:{C.RESET}")
        for f1, f2 in self.duplicates[:10]:
            print(f"   {C.RED}═{C.RESET} {C.WHITE}{truncate(f1, 35)}{C.RESET}")
            print(f"   {C.RED}╚═{C.RESET} {C.GRAY}{truncate(f2, 35)}{C.RESET}")

    def _print_dependencies(self):
        """Dependency-Check"""
        pkg_path = os.path.join(self.repo_path, 'package.json')
        if not os.path.exists(pkg_path):
            return
            
        try:
            with open(pkg_path, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
        except:
            return
        
        deps = pkg.get('dependencies', {})
        dev_deps = pkg.get('devDependencies', {})
        
        if not deps and not dev_deps:
            return
        
        print(f"""
{C.PURPLE}{C.BOLD}   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓{C.RESET}
{C.PURPLE}{C.BOLD}   ┃  📦 DEPENDENCIES                                           ┃{C.RESET}
{C.PURPLE}{C.BOLD}   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛{C.RESET}
""")
        if deps:
            print(f"   {C.GREEN}Production ({len(deps)}):{C.RESET}")
            for name, version in list(deps.items())[:10]:
                print(f"   {C.GRAY}├─{C.RESET} {C.WHITE}{name}{C.RESET} {C.CYAN}{version}{C.RESET}")
        
        if dev_deps:
            print(f"\n   {C.YELLOW}Development ({len(dev_deps)}):{C.RESET}")
            for name, version in list(dev_deps.items())[:10]:
                print(f"   {C.GRAY}├─{C.RESET} {C.WHITE}{name}{C.RESET} {C.DARK_GRAY}{version}{C.RESET}")

    def _print_footer(self):
        """Footer ausgeben"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        
        print(f"""
{C.GRAY}   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}
   {C.PURPLE}⚡{C.RESET} {C.GRAY}Analyse abgeschlossen in {elapsed:.2f}s{C.RESET}
   {C.PURPLE}📄{C.RESET} {C.GRAY}HTML-Report: Pages/Info/repo-report.html{C.RESET}
{C.GRAY}   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}
""")

    # ══════════════════════════════════════════════════════════
    # HTML REPORT EXPORT
    # ══════════════════════════════════════════════════════════

    def _generate_html_report(self):
        """Generiert einen interaktiven HTML-Report"""
        import html as html_mod
        
        text_files = [f for f in self.files if not f['binary']]
        complexity = self.calculate_complexity_score()
        git_stats = self.get_git_stats() if self.git_available else {}
        
        sorted_langs = sorted(self.languages.items(), key=lambda x: x[1]['code'], reverse=True)
        
        # Daten für Charts als JSON
        lang_labels = json.dumps([l[0] for l in sorted_langs[:8]])
        lang_values = json.dumps([l[1]['code'] for l in sorted_langs[:8]])
        lang_colors = json.dumps(['#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#8b5cf6'])
        
        top_files = sorted(text_files, key=lambda x: x['lines'], reverse=True)[:20]
        files_labels = json.dumps([truncate(f['path'], 25) for f in top_files])
        files_values = json.dumps([f['lines'] for f in top_files])
        
        daily = git_stats.get('daily_commits', {})
        today = datetime.now()
        timeline_labels = []
        timeline_values = []
        for i in range(29, -1, -1):
            day = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            timeline_labels.append(day[-5:])
            timeline_values.append(daily.get(day, 0))
        
        weekday_data = git_stats.get('weekday_commits', {})
        wd_labels = json.dumps(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
        wd_values = json.dumps([weekday_data.get(d, 0) for d in ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']])
        
        # Git info
        git_branch = git_stats.get('current_branch', 'N/A')
        git_commits = format_number(git_stats.get('total_commits', 0))
        git_first = git_stats.get('first_commit_date', 'N/A')
        git_uncommitted = git_stats.get('uncommitted_changes', 0)
        git_branches_count = len(git_stats.get('branches', []))
        git_tags_count = len(git_stats.get('tags', []))
        
        last_commit_parts = []
        last_raw = git_stats.get('last_commit', '')
        if last_raw and '|' in last_raw:
            last_commit_parts = last_raw.split('|')
        
        # Autoren
        authors_html = ''
        if git_stats.get('authors'):
            total_c = sum(a['commits'] for a in git_stats['authors'])
            for a in git_stats['authors'][:5]:
                pct = a['commits'] / total_c * 100 if total_c > 0 else 0
                name_safe = html_mod.escape(a['name'])
                authors_html += f'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.85rem;"><span style="color:#e2e8f0;">{name_safe}</span><div style="display:flex;align-items:center;gap:10px;"><span style="color:#64748b;">{a["commits"]} commits</span><div style="width:80px;height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden;"><div style="height:100%;width:{pct:.0f}%;background:#a855f7;border-radius:3px;"></div></div><span style="color:#a855f7;font-weight:600;min-width:35px;text-align:right;">{pct:.0f}%</span></div></div>'
        
        # Complexity factors
        factors_html = ''
        for f_name, f_score in complexity['factors']:
            f_name_safe = html_mod.escape(f_name)
            factors_html += f'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem;"><span>{f_name_safe}</span><span style="color:#a855f7;font-weight:600;">+{f_score}</span></div>'
        
        tier = 'S-TIER' if complexity['score'] >= 80 else 'A-TIER' if complexity['score'] >= 60 else 'B-TIER' if complexity['score'] >= 40 else 'C-TIER'
        
        # TODOs
        todos_html = ''
        if self.todos:
            for t in self.todos[:25]:
                marker = html_mod.escape(t['marker'])
                t_file = html_mod.escape(truncate(t['file'], 30))
                t_text = html_mod.escape(truncate(t['text'], 90))
                todos_html += f'<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.82rem;"><span style="font-weight:700;color:{"#f59e0b" if t["marker"]=="TODO" else "#ef4444" if t["marker"] in ("FIXME","BUG") else "#f97316"};">{marker}</span> <span style="color:#64748b;">{t_file}:{t["line"]}</span><br><span style="color:#94a3b8;">{t_text}</span></div>'
        else:
            todos_html = '<p style="color:#475569;">Keine TODOs gefunden</p>'
        
        # Files table
        files_table_html = ''
        for f in sorted(text_files, key=lambda x: x['lines'], reverse=True):
            f_path = html_mod.escape(truncate(f['path'], 50))
            f_lang = html_mod.escape(f['language'])
            files_table_html += f"<tr><td>{f_path}</td><td><span class='badge-purple' style='display:inline-block;padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:600;background:rgba(168,85,247,0.15);color:#a855f7;'>{f_lang}</span></td><td>{format_number(f['lines'])}</td><td>{format_number(f['code'])}</td><td>{format_number(f['comments'])}</td><td>{format_size(f['size'])}</td></tr>"
        
        # Hourly patterns
        hourly = git_stats.get('hourly_commits', {})
        hourly_html = ''
        if hourly:
            top_hours = sorted(hourly.items(), key=lambda x: x[1], reverse=True)[:6]
            for hour, count in top_hours:
                hourly_html += f'<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:0.85rem;"><span style="color:#f59e0b;">{hour:02d}:00</span><span style="color:#e2e8f0;">{count} commits</span></div>'
        
        # Last commit html
        last_commit_html = ''
        if len(last_commit_parts) >= 5:
            lc_hash = html_mod.escape(last_commit_parts[0][:8])
            lc_author = html_mod.escape(last_commit_parts[1])
            lc_date = html_mod.escape(last_commit_parts[3][:19])
            lc_msg = html_mod.escape(last_commit_parts[4])
            last_commit_html = f'''
            <div style="margin-top:1rem;padding:1rem;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
                <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Letzter Commit</div>
                <div style="font-size:0.85rem;color:#10b981;margin-bottom:4px;">{lc_msg}</div>
                <div style="font-size:0.78rem;color:#64748b;">{lc_author} &middot; <span style="color:#f59e0b;">{lc_hash}</span> &middot; {lc_date}</div>
            </div>'''
        
        # Alle Daten als JSON für Charts (SICHER, kein f-string in JS)
        chart_data = json.dumps({
            'langLabels': json.loads(lang_labels),
            'langValues': json.loads(lang_values),
            'langColors': json.loads(lang_colors),
            'filesLabels': json.loads(files_labels),
            'filesValues': json.loads(files_values),
            'timelineLabels': timeline_labels,
            'timelineValues': timeline_values,
            'wdLabels': json.loads(wd_labels),
            'wdValues': json.loads(wd_values),
            'codeLines': self.code_lines,
            'commentLines': self.comment_lines,
            'blankLines': self.blank_lines,
        })
        
        gen_date = datetime.now().strftime('%d.%m.%Y um %H:%M:%S')
        gen_year = datetime.now().strftime('%Y')
        repo_name = html_mod.escape(os.path.basename(self.repo_path))
        
        html = f'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Repo Tracker Pro - Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Segoe UI',system-ui,sans-serif; background:#0a0a0f; color:#e2e8f0; min-height:100vh; }}
.container {{ max-width:1200px; margin:0 auto; padding:2rem; }}
.header {{ text-align:center; padding:3rem 0; background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(6,182,212,0.1)); border-radius:24px; margin-bottom:2rem; border:1px solid rgba(168,85,247,0.2); }}
.header h1 {{ font-size:2.5rem; background:linear-gradient(135deg,#a855f7,#06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:0.5rem; }}
.header p {{ color:#94a3b8; font-size:0.9rem; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:1.5rem; margin-bottom:2rem; }}
.grid-2 {{ display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:2rem; }}
.grid-2-1 {{ display:grid; grid-template-columns:2fr 1fr; gap:1.5rem; margin-bottom:2rem; }}
.grid-3 {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.5rem; margin-bottom:2rem; }}
.card {{ background:rgba(15,15,25,0.8); border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:1.5rem; backdrop-filter:blur(20px); }}
.card h3 {{ color:#a855f7; margin-bottom:1rem; font-size:1rem; }}
.kpi {{ text-align:center; }}
.kpi .value {{ font-size:2.5rem; font-weight:800; background:linear-gradient(135deg,#a855f7,#06b6d4); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }}
.kpi .label {{ color:#64748b; font-size:0.78rem; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }}
.chart-box {{ position:relative; height:300px; }}
table {{ width:100%; border-collapse:collapse; font-size:0.82rem; }}
th {{ text-align:left; padding:10px; color:#64748b; border-bottom:1px solid rgba(255,255,255,0.06); font-weight:600; text-transform:uppercase; font-size:0.7rem; letter-spacing:0.5px; }}
td {{ padding:10px; border-bottom:1px solid rgba(255,255,255,0.03); }}
tr:hover {{ background:rgba(168,85,247,0.03); }}
.git-stat {{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:0.85rem; }}
.git-stat .lbl {{ color:#64748b; }}
.git-stat .val {{ color:#e2e8f0; font-weight:600; }}
.footer {{ text-align:center; padding:2rem 0; color:#475569; font-size:0.8rem; }}
::-webkit-scrollbar {{ width:6px; }}
::-webkit-scrollbar-track {{ background:transparent; }}
::-webkit-scrollbar-thumb {{ background:rgba(168,85,247,0.3); border-radius:6px; }}
@media (max-width:768px) {{ .grid-2,.grid-2-1,.grid-3 {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body>
<div class="container">

<!-- Header -->
<div class="header">
    <h1>🔥 Repo Tracker Pro</h1>
    <p>Generiert am {gen_date} | {repo_name}</p>
</div>

<!-- KPIs -->
<div class="grid" style="grid-template-columns:repeat(4,1fr);">
    <div class="card kpi"><div class="value">{format_number(self.total_lines)}</div><div class="label">Zeilen gesamt</div></div>
    <div class="card kpi"><div class="value">{format_number(self.code_lines)}</div><div class="label">Code-Zeilen</div></div>
    <div class="card kpi"><div class="value">{len(text_files)}</div><div class="label">Dateien</div></div>
    <div class="card kpi"><div class="value">{git_commits}</div><div class="label">Commits</div></div>
</div>

<!-- Charts Row 1 -->
<div class="grid-2">
    <div class="card"><h3>🌐 Sprachen-Verteilung</h3><div class="chart-box"><canvas id="langChart"></canvas></div></div>
    <div class="card"><h3>🔥 Top Dateien (Zeilen)</h3><div class="chart-box"><canvas id="filesChart"></canvas></div></div>
</div>

<!-- Charts Row 2 -->
<div class="grid-2-1">
    <div class="card"><h3>📈 Commit-Timeline (30 Tage)</h3><div class="chart-box"><canvas id="timelineChart"></canvas></div></div>
    <div class="card"><h3>📊 Commits pro Wochentag</h3><div class="chart-box"><canvas id="weekdayChart"></canvas></div></div>
</div>

<!-- Git + Complexity + Lines -->
<div class="grid-3">
    <!-- Git Stats -->
    <div class="card">
        <h3>🌿 Git-Statistiken</h3>
        <div class="git-stat"><span class="lbl">Branch</span><span class="val" style="color:#10b981;">{git_branch}</span></div>
        <div class="git-stat"><span class="lbl">Commits</span><span class="val">{git_commits}</span></div>
        <div class="git-stat"><span class="lbl">Branches</span><span class="val">{git_branches_count}</span></div>
        <div class="git-stat"><span class="lbl">Tags</span><span class="val">{git_tags_count}</span></div>
        <div class="git-stat"><span class="lbl">Projektstart</span><span class="val">{git_first}</span></div>
        <div class="git-stat"><span class="lbl">Uncommitted</span><span class="val" style="color:#f59e0b;">{git_uncommitted}</span></div>
        {last_commit_html}
        <div style="margin-top:1rem;"><div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Top Autoren</div>{authors_html}</div>
    </div>
    
    <!-- Complexity -->
    <div class="card">
        <h3>🧬 Komplexitaets-Score</h3>
        <div style="text-align:center;margin:1rem 0;">
            <div style="font-size:3.2rem;font-weight:800;background:linear-gradient(135deg,#a855f7,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">{complexity['score']}/100</div>
            <div style="margin-top:8px;display:inline-block;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:600;background:rgba(168,85,247,0.2);color:#a855f7;">{tier}</div>
        </div>
        {factors_html}
    </div>
    
    <!-- Lines + Hours -->
    <div class="card">
        <h3>📏 Zeilen-Aufteilung</h3>
        <div class="chart-box" style="height:200px;"><canvas id="linesChart"></canvas></div>
        <div style="margin-top:1rem;">
            <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Aktivste Stunden</div>
            {hourly_html}
        </div>
    </div>
</div>

<!-- TODOs -->
<div class="card" style="margin-bottom:2rem;">
    <h3>📌 TODOs &amp; FIXMEs ({len(self.todos)})</h3>
    <div style="max-height:350px;overflow-y:auto;">
        {todos_html}
    </div>
</div>

<!-- All Files Table -->
<div class="card" style="margin-bottom:2rem;">
    <h3>📄 Alle Dateien ({len(text_files)})</h3>
    <div style="max-height:500px;overflow-y:auto;">
    <table>
        <thead><tr><th>Datei</th><th>Sprache</th><th>Zeilen</th><th>Code</th><th>Kommentare</th><th>Groesse</th></tr></thead>
        <tbody>{files_table_html}</tbody>
    </table>
    </div>
</div>

<div class="footer">🔥 Generated by Repo Tracker Pro v2.0 | {gen_year}</div>

</div>

<script>
const D = {chart_data};
const defaults = {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ labels: {{ color: '#94a3b8', font: {{ size: 11 }} }} }} }} }};

new Chart(document.getElementById('langChart'), {{
    type: 'doughnut',
    data: {{ labels: D.langLabels, datasets: [{{ data: D.langValues, backgroundColor: D.langColors, borderWidth: 0 }}] }},
    options: {{ ...defaults, cutout: '65%' }}
}});

new Chart(document.getElementById('filesChart'), {{
    type: 'bar',
    data: {{ labels: D.filesLabels, datasets: [{{ data: D.filesValues, backgroundColor: 'rgba(168,85,247,0.6)', borderRadius: 6 }}] }},
    options: {{ ...defaults, indexAxis: 'y', plugins: {{ legend: {{ display: false }} }}, scales: {{ x: {{ grid: {{ color: 'rgba(255,255,255,0.04)' }}, ticks: {{ color: '#64748b' }} }}, y: {{ grid: {{ display: false }}, ticks: {{ color: '#94a3b8', font: {{ size: 10 }} }} }} }} }}
}});

new Chart(document.getElementById('timelineChart'), {{
    type: 'line',
    data: {{ labels: D.timelineLabels, datasets: [{{ data: D.timelineValues, borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#a855f7' }}] }},
    options: {{ ...defaults, plugins: {{ legend: {{ display: false }} }}, scales: {{ x: {{ grid: {{ color: 'rgba(255,255,255,0.04)' }}, ticks: {{ color: '#64748b', maxTicksLimit: 10 }} }}, y: {{ grid: {{ color: 'rgba(255,255,255,0.04)' }}, ticks: {{ color: '#64748b' }}, beginAtZero: true }} }} }}
}});

new Chart(document.getElementById('weekdayChart'), {{
    type: 'polarArea',
    data: {{ labels: D.wdLabels, datasets: [{{ data: D.wdValues, backgroundColor: ['#a855f780','#06b6d480','#10b98180','#f59e0b80','#ef444480','#ec489980','#3b82f680'] }}] }},
    options: {{ ...defaults, scales: {{ r: {{ grid: {{ color: 'rgba(255,255,255,0.06)' }}, ticks: {{ display: false }} }} }} }}
}});

new Chart(document.getElementById('linesChart'), {{
    type: 'doughnut',
    data: {{ labels: ['Code', 'Kommentare', 'Leerzeilen'], datasets: [{{ data: [D.codeLines, D.commentLines, D.blankLines], backgroundColor: ['#a855f7', '#f59e0b', '#334155'], borderWidth: 0 }}] }},
    options: {{ ...defaults, cutout: '70%' }}
}});
</script>
</body>
</html>'''
        
        try:
            report_path = os.path.join(self.repo_path, 'Pages', 'Info', 'repo-report.html')
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"   {C.GREEN}✅ HTML-Report erstellt: {report_path}{C.RESET}")
        except Exception as e:
            print(f"   {C.RED}❌ HTML-Report Fehler: {e}{C.RESET}")

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

def main():
    C.enable_windows()
    
    # Repository-Pfad bestimmen
    if len(sys.argv) > 1:
        repo_path = sys.argv[1]
    else:
        repo_path = os.getcwd()
    
    if not os.path.isdir(repo_path):
        print(f"{C.RED}❌ Verzeichnis nicht gefunden: {repo_path}{C.RESET}")
        sys.exit(1)
    
    analyzer = RepoAnalyzer(repo_path)
    analyzer.scan()
    analyzer.print_report()

if __name__ == '__main__':
    main()
