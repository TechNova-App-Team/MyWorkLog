// ═══ SEITENWECHSEL MODULE ═══
// In der installierten App (TWA / PWA) öffnen Links auf die eigene Domain im
// SELBEN Fenster, auch wenn sie target="_blank" tragen oder per window.open(…,'_blank')
// kommen. Grund (gemessen 15.10.2026): Ein neues Fenster gibt Chrome als Intent an
// die Android-App zurück, die startet ihre LauncherActivity neu und zeigt dabei den
// Startbildschirm — jeder Wechsel auf eine Standalone-Seite sah aus wie ein Neustart.
// Im selben Fenster greift dagegen der Übergang aus seitenwechsel.css, und die
// Zurück-Geste führt zurück in die App. Im Browser-Tab bleibt alles wie es ist.
(function () {
  var app = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(function (m) {
    return window.matchMedia && matchMedia('(display-mode: ' + m + ')').matches;
  }) || document.referrer.indexOf('android-app://') === 0;
  if (!app) return;

  function eigen(url) {
    // blob:-Adressen (PDF-Vorschau, Export) haben dieselbe origin, bleiben aber im neuen Fenster.
    try { var u = new URL(url, location.href); return /^https?:$/.test(u.protocol) && u.origin === location.origin; }
    catch (e) { return false; }
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[target="_blank"][href]');
    if (!a || a.hasAttribute('download') || !eigen(a.href)) return;
    e.preventDefault();
    location.href = a.href;
  }, true);

  var original = window.open;
  window.open = function (url, ziel) {
    if (url && (ziel === '_blank' || ziel === undefined) && eigen(url)) {
      location.href = new URL(url, location.href).href;
      return window;
    }
    return original.apply(window, arguments);
  };
})();
