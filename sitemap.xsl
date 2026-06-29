<?xml version="1.0" encoding="UTF-8"?>
<!--
  MyWorkLog — Sitemap XSL Stylesheet
  Rein kosmetisch: rendert sitemap.xml im Browser als lesbare HTML-Seite.
  Crawler (Googlebot etc.) ignorieren XSL und sehen nur die rohen XML-Daten.
  SEO-Impact: 0.
-->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                exclude-result-prefixes="sm image xhtml">

<xsl:output method="html" version="5.0" encoding="UTF-8" indent="yes"
            doctype-system="about:legacy-compat"/>

<xsl:template match="/">
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="robots" content="noindex, follow"/>
  <title>Sitemap · MyWorkLog</title>
  <link rel="icon" href="/Grafiken/icon-192.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet"/>
  <style>
    :root {
      --bg-deep: #030305;
      --bg-card: rgba(255,255,255,0.025);
      --bg-elevated: rgba(255,255,255,0.04);
      --bg-hover: rgba(168,85,247,0.06);
      --border: rgba(255,255,255,0.06);
      --border-strong: rgba(255,255,255,0.1);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #a855f7;
      --primary-rgb: 168,85,247;
      --primary-dim: rgba(168,85,247,0.15);
      --success: #10b981;
      --amber: #f59e0b;
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: var(--bg-deep);
      color: var(--text-main);
      font-family: var(--font-main);
      font-size: 15px;
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(168,85,247,0.08), transparent 60%),
        var(--bg-deep);
    }
    a { color: var(--primary); text-decoration: none; transition: all 0.2s ease; }
    a:hover { text-decoration: underline; }
    .container { max-width: 1200px; margin: 0 auto; padding: 48px 24px 80px; }

    /* HEADER */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 32px;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--border);
    }
    .logo {
      width: 48px; height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(168,85,247,0.25);
      flex-shrink: 0;
    }
    .logo svg { width: 24px; height: 24px; stroke: white; }
    .header-text h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 2px;
    }
    .header-text p {
      font-size: 13px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .header-text p a { color: var(--text-muted); }
    .header-text p a:hover { color: var(--primary); }

    /* INFO BAR */
    .info {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      align-items: center;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .info-item .label { color: var(--text-muted); }
    .info-item .value {
      color: var(--text-main);
      font-weight: 600;
      font-family: var(--font-mono);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--primary-dim);
      border: 1px solid rgba(var(--primary-rgb), 0.3);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--primary);
    }
    .badge::before {
      content: '';
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 8px var(--primary);
    }

    /* TABLE */
    .table-wrap {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead { background: var(--bg-elevated); }
    th {
      text-align: left;
      padding: 14px 18px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    td {
      padding: 14px 18px;
      font-size: 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr { transition: background 0.15s ease; }
    tbody tr:hover { background: var(--bg-hover); }

    .col-num { width: 48px; color: var(--text-dim); font-family: var(--font-mono); font-size: 12px; }
    .col-url a {
      font-weight: 500;
      word-break: break-all;
    }
    .col-url .desc {
      display: block;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
      font-weight: 400;
    }
    .col-prio { width: 90px; }
    .col-freq { width: 110px; }
    .col-mod  { width: 130px; }

    /* Priority Bar */
    .prio {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
    }
    .prio-bar {
      width: 40px;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }
    .prio-fill {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      background: linear-gradient(90deg, var(--primary), #c084fc);
      border-radius: 999px;
    }

    .freq-chip {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .freq-weekly  { background: rgba(16,185,129,0.10);  border-color: rgba(16,185,129,0.25);  color: var(--success); }
    .freq-monthly { background: rgba(245,158,11,0.10);  border-color: rgba(245,158,11,0.25);  color: var(--amber); }
    .freq-yearly  { background: rgba(100,116,139,0.10); border-color: rgba(100,116,139,0.25); color: var(--text-muted); }

    .mod {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Image thumbnail row */
    .has-image td {
      border-bottom-color: transparent;
    }
    .img-row td {
      padding: 0 18px 14px 66px;
      font-size: 12px;
      color: var(--text-muted);
      background: transparent;
    }
    .img-row .img-title {
      color: var(--text-main);
      font-weight: 500;
      margin-bottom: 2px;
    }
    .img-row .img-caption {
      line-height: 1.5;
    }

    /* FOOTER */
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-dim);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer a { color: var(--text-muted); }

    /* MOBILE */
    @media (max-width: 768px) {
      .container { padding: 28px 16px 48px; }
      .header { padding-bottom: 20px; margin-bottom: 20px; }
      .header-text h1 { font-size: 18px; }
      .info { padding: 12px 14px; gap: 14px; font-size: 12px; }
      th, td { padding: 12px 12px; font-size: 13px; }
      .col-num { display: none; }
      .col-freq, .col-mod { display: none; }
      .col-prio { width: 70px; }
      .img-row td { padding-left: 12px; }
      thead th:first-child { padding-left: 12px; }
    }
  </style>
</head>
<body>
  <div class="container">

    <header class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>Sitemap · MyWorkLog</h1>
        <p><a href="/">myworklog.de</a> — Kostenlose Azubi-Zeiterfassung</p>
      </div>
    </header>

    <div class="info">
      <span class="badge">XML-Sitemap</span>
      <div class="info-item">
        <span class="label">URLs:</span>
        <span class="value"><xsl:value-of select="count(sm:urlset/sm:url)"/></span>
      </div>
      <div class="info-item">
        <span class="label">Sprache:</span>
        <span class="value">de-DE</span>
      </div>
      <div class="info-item">
        <span class="label">Schema:</span>
        <span class="value">sitemaps.org 0.9</span>
      </div>
      <div class="info-item">
        <span class="label">Robots:</span>
        <span class="value"><a href="/robots.txt">/robots.txt</a></span>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-url">URL</th>
            <th class="col-prio">Priorität</th>
            <th class="col-freq">Frequenz</th>
            <th class="col-mod">Geändert</th>
          </tr>
        </thead>
        <tbody>
          <xsl:for-each select="sm:urlset/sm:url">
            <xsl:variable name="hasImage" select="count(image:image) &gt; 0"/>
            <tr>
              <xsl:if test="$hasImage"><xsl:attribute name="class">has-image</xsl:attribute></xsl:if>
              <td class="col-num"><xsl:value-of select="position()"/></td>
              <td class="col-url">
                <a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a>
              </td>
              <td class="col-prio">
                <span class="prio">
                  <span class="prio-bar">
                    <span class="prio-fill">
                      <xsl:attribute name="style">width: <xsl:value-of select="number(sm:priority) * 100"/>%;</xsl:attribute>
                    </span>
                  </span>
                  <xsl:value-of select="sm:priority"/>
                </span>
              </td>
              <td class="col-freq">
                <span>
                  <xsl:attribute name="class">freq-chip freq-<xsl:value-of select="sm:changefreq"/></xsl:attribute>
                  <xsl:value-of select="sm:changefreq"/>
                </span>
              </td>
              <td class="col-mod mod"><xsl:value-of select="sm:lastmod"/></td>
            </tr>
            <xsl:if test="$hasImage">
              <tr class="img-row">
                <td colspan="5">
                  <div class="img-title"><xsl:value-of select="image:image/image:title"/></div>
                  <div class="img-caption"><xsl:value-of select="image:image/image:caption"/></div>
                </td>
              </tr>
            </xsl:if>
          </xsl:for-each>
        </tbody>
      </table>
    </div>

    <footer class="footer">
      <span>Diese Ansicht ist nur für Menschen. Crawler verarbeiten die rohen XML-Daten.</span>
      <span><a href="/">← myworklog.de</a></span>
    </footer>

  </div>
</body>
</html>
</xsl:template>

</xsl:stylesheet>
