<?xml version="1.0" encoding="UTF-8"?>
<!--
  MyWorkLog &#8212; High-Premium XML-Sitemap Stylesheet
  Rein kosmetisch: Rendert sitemap.xml und sitemap_index.xml im Browser als hochmoderne, interaktive HTML-Oberfl&#228;che.
  Crawler (Googlebot etc.) ignorieren XSLT vollst&#228;ndig und verarbeiten die reinen XML-Knoten.
-->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                exclude-result-prefixes="sm image xhtml">

<xsl:output method="html" version="5.0" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

<xsl:template match="/">
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="robots" content="noindex, follow"/>
  <title>Sitemap &#183; MyWorkLog</title>
  <link rel="icon" href="/Grafiken/icon-192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
  <style>
    :root {
      --bg-base: #08090c;
      --bg-card: rgba(17, 20, 28, 0.7);
      --bg-card-hover: rgba(255, 255, 255, 0.025);
      --bg-chip: rgba(255, 255, 255, 0.04);
      --bg-chip-hover: rgba(255, 255, 255, 0.08);
      
      --border-subtle: rgba(255, 255, 255, 0.07);
      --border-strong: rgba(255, 255, 255, 0.12);
      --border-glow: rgba(99, 102, 241, 0.35);
      
      --text-main: #f8fafc;
      --text-secondary: #94a3b8;
      --text-dim: #64748b;
      --text-muted: #475569;
      
      --brand: #6366f1;
      --brand-hover: #818cf8;
      
      --emerald: #10b981;
      --amber: #f59e0b;
      
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      
      --shadow-card: 0 20px 40px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html, body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-main);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      background-image: 
        radial-gradient(1100px 450px at 50% -80px, rgba(99, 102, 241, 0.08), transparent 70%),
        radial-gradient(700px 300px at 85% 15%, rgba(56, 189, 248, 0.03), transparent 60%);
      background-attachment: fixed;
    }

    a {
      color: var(--text-main);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    a:hover {
      color: var(--brand-hover);
    }

    .container {
      max-width: 1180px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }

    /* TOP BAR / NAV */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-icon {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      border: 1px solid var(--border-strong);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }
    .brand-icon svg {
      width: 21px;
      height: 21px;
      stroke: #f8fafc;
      opacity: 0.95;
    }

    .brand-details h1 {
      font-size: 19px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-details .site-pill {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--bg-chip);
      border: 1px solid var(--border-subtle);
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .brand-details .site-pill:hover {
      background: var(--bg-chip-hover);
      color: #ffffff;
      border-color: var(--border-strong);
    }
    .brand-details .site-pill svg {
      width: 11px;
      height: 11px;
      stroke: currentColor;
    }

    .brand-details .subtitle {
      font-size: 12.5px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    /* ACTIONS / SEARCH */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-box svg {
      position: absolute;
      left: 12px;
      width: 15px;
      height: 15px;
      stroke: var(--text-dim);
      pointer-events: none;
      transition: stroke 0.15s ease;
    }
    .search-input {
      width: 260px;
      background: var(--bg-chip);
      border: 1px solid var(--border-subtle);
      border-radius: 9px;
      padding: 8px 36px 8px 34px;
      color: var(--text-main);
      font-family: var(--font-main);
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }
    .search-input::placeholder {
      color: var(--text-muted);
    }
    .search-input:focus {
      width: 300px;
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-glow);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }
    .search-box:focus-within svg {
      stroke: var(--brand-hover);
    }
    .kbd-shortcut {
      position: absolute;
      right: 10px;
      padding: 1px 5px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      background: rgba(0,0,0,0.25);
      pointer-events: none;
    }

    /* STATS STRIP */
    .stats-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .stat-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      background: var(--bg-chip);
      border: 1px solid var(--border-subtle);
      border-radius: 7px;
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .stat-chip .val {
      color: var(--text-main);
      font-family: var(--font-mono);
      font-weight: 600;
    }
    .stat-chip.live-dot::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }

    .stat-chip a {
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .stat-chip a:hover {
      color: #ffffff;
    }

    /* DATA TABLE */
    .table-card {
      background: var(--bg-card);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: var(--shadow-card);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    thead th {
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
      user-select: none;
    }

    tbody tr {
      transition: background-color 0.12s ease;
      border-bottom: 1px solid var(--border-subtle);
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    tbody tr:hover {
      background-color: var(--bg-card-hover);
    }

    td {
      padding: 12px 18px;
      font-size: 13.5px;
      vertical-align: middle;
    }

    .col-idx {
      width: 50px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
    }

    .col-url {
      min-width: 320px;
    }
    .url-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .url-link {
      color: var(--text-main);
      font-weight: 500;
      word-break: break-all;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .url-link:hover {
      color: var(--brand-hover);
    }
    .url-link svg {
      opacity: 0;
      width: 12px;
      height: 12px;
      stroke: currentColor;
      transition: opacity 0.15s ease, transform 0.15s ease;
      flex-shrink: 0;
    }
    tbody tr:hover .url-link svg {
      opacity: 0.7;
      transform: translate(1px, -1px);
    }

    /* COPY BUTTON */
    .btn-copy {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    tbody tr:hover .btn-copy {
      opacity: 0.8;
    }
    .btn-copy:hover {
      opacity: 1;
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-copy svg {
      width: 13px;
      height: 13px;
      stroke: currentColor;
    }

    /* PRIORITY METER */
    .col-prio {
      width: 130px;
      white-space: nowrap;
    }
    .prio-meter {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .prio-track {
      width: 38px;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }
    .prio-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: linear-gradient(90deg, #6366f1, #38bdf8);
      border-radius: 999px;
    }
    .prio-val {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      min-width: 24px;
    }

    /* FREQUENCY PILL */
    .col-freq {
      width: 120px;
      white-space: nowrap;
    }
    .freq-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 5px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      color: var(--text-dim);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
    }
    .freq-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--text-muted);
    }
    .freq-daily .freq-dot,
    .freq-weekly .freq-dot {
      background: var(--emerald);
      box-shadow: 0 0 5px rgba(16, 185, 129, 0.5);
    }
    .freq-daily, .freq-weekly {
      color: var(--text-secondary);
    }
    .freq-monthly .freq-dot {
      background: var(--amber);
    }

    /* LASTMOD */
    .col-mod {
      width: 140px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-dim);
      white-space: nowrap;
    }

    /* IMAGE DRAWER */
    .has-image td {
      border-bottom-color: transparent !important;
    }
    .img-drawer td {
      padding: 0 18px 12px 50px;
      background: transparent;
    }
    .img-card {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 7px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    .img-card svg {
      width: 14px;
      height: 14px;
      stroke: var(--text-dim);
      flex-shrink: 0;
    }
    .img-card .img-title {
      font-weight: 500;
      color: var(--text-main);
    }
    .img-card .img-sep {
      color: var(--text-muted);
    }
    .img-card .img-caption {
      color: var(--text-dim);
    }

    /* EMPTY SEARCH STATE */
    .empty-state {
      display: none;
      padding: 48px 24px;
      text-align: center;
      color: var(--text-dim);
    }
    .empty-state svg {
      width: 32px;
      height: 32px;
      stroke: var(--text-muted);
      margin-bottom: 12px;
    }
    .empty-state p {
      font-size: 14px;
      color: var(--text-secondary);
    }

    /* FOOTER */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .footer a {
      color: var(--text-dim);
    }
    .footer a:hover {
      color: var(--text-secondary);
    }

    /* TOAST FEEDBACK */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #18181b;
      color: #fafafa;
      border: 1px solid var(--border-strong);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
      z-index: 1000;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* RESPONSIVE */
    @media (max-width: 820px) {
      .container { padding: 24px 16px 60px; }
      .top-bar { flex-direction: column; align-items: flex-start; gap: 16px; }
      .header-actions { width: 100%; }
      .search-box { width: 100%; }
      .search-input { width: 100% !important; }
      .col-idx, .col-freq, .col-mod { display: none; }
      th, td { padding: 10px 12px; }
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- TOP HEADER -->
    <header class="top-bar">
      <div class="brand-section">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <rect x="3" y="17" width="6" height="4" rx="1"/>
            <rect x="15" y="17" width="6" height="4" rx="1"/>
            <path d="M12 7v5"/>
            <path d="M6 17v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/>
          </svg>
        </div>
        <div class="brand-details">
          <h1>
            Sitemap
            <a href="/" class="site-pill" title="Startseite &#246;ffnen">
              <span>myworklog.de</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
          </h1>
          <div class="subtitle">Kostenlose Azubi-Zeiterfassung &#183; XML-Verzeichnis</div>
        </div>
      </div>

      <div class="header-actions">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="searchInput" class="search-input" placeholder="URL filtern..." autocomplete="off" spellcheck="false"/>
          <span class="kbd-shortcut">/</span>
        </div>
      </div>
    </header>

    <!-- METRICS STRIP -->
    <div class="stats-bar">
      <div class="stat-chip live-dot">
        <xsl:choose>
          <xsl:when test="sm:sitemapindex">
            <span class="val" id="totalCount"><xsl:value-of select="count(sm:sitemapindex/sm:sitemap)"/></span>
            <span style="margin-left:2px;">Sitemaps</span>
          </xsl:when>
          <xsl:otherwise>
            <span id="filteredCount" class="val"><xsl:value-of select="count(sm:urlset/sm:url)"/></span>
            <xsl:if test="count(sm:urlset/sm:url) &gt; 0">
              <span style="color:var(--text-dim);font-weight:400;margin-left:2px;">von</span>
              <span class="val" id="totalCount" style="margin-left:2px;"><xsl:value-of select="count(sm:urlset/sm:url)"/></span>
            </xsl:if>
            <span style="margin-left:2px;">URLs</span>
          </xsl:otherwise>
        </xsl:choose>
      </div>

      <div class="stat-chip">
        <span style="color:var(--text-dim);">Format</span>
        <span class="val">sitemaps.org 0.9</span>
      </div>

      <div class="stat-chip">
        <span style="color:var(--text-dim);">Sprache</span>
        <span class="val">de-DE</span>
      </div>

      <div class="stat-chip">
        <a href="/robots.txt" target="_blank" rel="noopener">
          <span>robots.txt</span>
          <svg style="width:11px;height:11px;stroke:currentColor;" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"/>
            <polyline points="7 7 17 7 17 17"/>
          </svg>
        </a>
      </div>
    </div>

    <!-- MAIN DATA TABLE -->
    <div class="table-card">
      <table id="sitemapTable">
        <thead>
          <xsl:choose>
            <xsl:when test="sm:sitemapindex">
              <tr>
                <th class="col-idx">#</th>
                <th class="col-url">Sitemap-URL</th>
                <th class="col-mod">Zuletzt ge&#228;ndert</th>
              </tr>
            </xsl:when>
            <xsl:otherwise>
              <tr>
                <th class="col-idx">#</th>
                <th class="col-url">URL</th>
                <th class="col-prio">Priorit&#228;t</th>
                <th class="col-freq">Frequenz</th>
                <th class="col-mod">Ge&#228;ndert</th>
              </tr>
            </xsl:otherwise>
          </xsl:choose>
        </thead>
        <tbody id="sitemapBody">
          <!-- SITEMAP INDEX MODE -->
          <xsl:for-each select="sm:sitemapindex/sm:sitemap">
            <tr class="url-entry-row">
              <td class="col-idx"><xsl:value-of select="position()"/></td>
              <td class="col-url">
                <div class="url-row">
                  <a class="url-link" href="{sm:loc}">
                    <span><xsl:value-of select="sm:loc"/></span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"/>
                      <polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </a>
                  <button type="button" class="btn-copy" title="URL kopieren" onclick="copyUrl('{sm:loc}', this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </td>
              <td class="col-mod">
                <xsl:choose>
                  <xsl:when test="contains(sm:lastmod, 'T')">
                    <span title="{sm:lastmod}"><xsl:value-of select="substring-before(sm:lastmod, 'T')"/></span>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="sm:lastmod"/>
                  </xsl:otherwise>
                </xsl:choose>
              </td>
            </tr>
          </xsl:for-each>

          <!-- REGULAR URLSET MODE -->
          <xsl:for-each select="sm:urlset/sm:url">
            <xsl:variable name="hasImage" select="count(image:image) &gt; 0"/>
            <tr class="url-entry-row">
              <xsl:if test="$hasImage">
                <xsl:attribute name="class">url-entry-row has-image</xsl:attribute>
              </xsl:if>
              <td class="col-idx"><xsl:value-of select="position()"/></td>
              <td class="col-url">
                <div class="url-row">
                  <a class="url-link" href="{sm:loc}" target="_blank" rel="noopener">
                    <span><xsl:value-of select="sm:loc"/></span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"/>
                      <polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </a>
                  <button type="button" class="btn-copy" title="URL kopieren" onclick="copyUrl('{sm:loc}', this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </td>
              <td class="col-prio">
                <div class="prio-meter">
                  <div class="prio-track">
                    <div class="prio-bar">
                      <xsl:attribute name="style">width: <xsl:value-of select="number(sm:priority) * 100"/>%;</xsl:attribute>
                    </div>
                  </div>
                  <span class="prio-val">
                    <xsl:choose>
                      <xsl:when test="string-length(sm:priority) &gt; 0">
                        <xsl:value-of select="sm:priority"/>
                      </xsl:when>
                      <xsl:otherwise>0.5</xsl:otherwise>
                    </xsl:choose>
                  </span>
                </div>
              </td>
              <td class="col-freq">
                <span>
                  <xsl:attribute name="class">freq-pill freq-<xsl:value-of select="sm:changefreq"/></xsl:attribute>
                  <span class="freq-dot"></span>
                  <xsl:value-of select="sm:changefreq"/>
                </span>
              </td>
              <td class="col-mod">
                <xsl:choose>
                  <xsl:when test="contains(sm:lastmod, 'T')">
                    <span title="{sm:lastmod}"><xsl:value-of select="substring-before(sm:lastmod, 'T')"/></span>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="sm:lastmod"/>
                  </xsl:otherwise>
                </xsl:choose>
              </td>
            </tr>

            <!-- OPTIONAL IMAGE SUB-ROW -->
            <xsl:if test="$hasImage">
              <tr class="img-drawer">
                <td colspan="5">
                  <div class="img-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span class="img-title"><xsl:value-of select="image:image/image:title"/></span>
                    <xsl:if test="string-length(image:image/image:caption) &gt; 0">
                      <span class="img-sep">&#183;</span>
                      <span class="img-caption"><xsl:value-of select="image:image/image:caption"/></span>
                    </xsl:if>
                  </div>
                </td>
              </tr>
            </xsl:if>
          </xsl:for-each>
        </tbody>
      </table>

      <!-- EMPTY STATE -->
      <div id="emptyState" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>Keine passenden URLs gefunden</p>
      </div>
    </div>

    <!-- FOOTER -->
    <footer class="footer">
      <span>XML-Sitemap f&#252;r Suchmaschinen &#183; Bereitgestellt von <a href="/">myworklog.de</a></span>
      <span>Status: Valide &#183; UTF-8</span>
    </footer>

    <!-- TOAST -->
    <div id="toast" class="toast">
      <svg style="width:14px;height:14px;stroke:#10b981;" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>In Zwischenablage kopiert</span>
    </div>

  </div>

  <script type="text/javascript">
  <![CDATA[
    // Live Search Filter
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('sitemapBody');
    const filteredCount = document.getElementById('filteredCount');
    const totalCount = document.getElementById('totalCount');
    const emptyState = document.getElementById('emptyState');
    const toast = document.getElementById('toast');

    if (searchInput && tableBody) {
      searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        const rows = tableBody.querySelectorAll('tr.url-entry-row');
        let visible = 0;

        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          const match = text.includes(query);
          row.style.display = match ? '' : 'none';
          
          // Image drawer handling
          const next = row.nextElementSibling;
          if (next && next.classList.contains('img-drawer')) {
            next.style.display = match ? '' : 'none';
          }
          if (match) visible++;
        });

        if (filteredCount) filteredCount.textContent = visible;
        if (emptyState) emptyState.style.display = (visible === 0) ? 'block' : 'none';
      });

      // Keyboard Shortcut '/' or 'Ctrl+K'
      window.addEventListener('keydown', function(e) {
        if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        } else if (e.key === 'Escape' && document.activeElement === searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
          searchInput.blur();
        }
      });
    }

    // Copy to clipboard
    let toastTimeout;
    window.copyUrl = function(url, btn) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          showToast();
        });
      } else {
        const temp = document.createElement('input');
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast();
      }
    };

    function showToast() {
      if (!toast) return;
      toast.classList.add('show');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  ]]>
  </script>
</body>
</html>
</xsl:template>

</xsl:stylesheet>
