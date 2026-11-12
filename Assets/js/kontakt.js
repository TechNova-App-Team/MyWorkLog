// ═══ KONTAKT MODULE ═══
// Ein Dialog "Schreib dem Entwickler", der auf der Seite aufgeht, auf der man
// gerade haengt — statt Umweg ueber /support/. Anlass (12.11.2026): Kontakt war
// nur ueber Footer und Sidebar erreichbar, und das Formular auf /support/ fragte
// keine Antwortadresse ab — eine Beschwerde kam an, beantworten ging nicht.
//
// Einbinden: <script defer src="/Assets/js/kontakt.js"> und an jeden Ausloeser
// data-kontakt="frage|problem|kauf|idee" (+ optional data-kontakt-ort="<kategorie>"
// fuer die Auswertung). Ausloeser sind echte Links auf /support/#feedback: fehlt
// das Skript auf einer Seite (der Footer laeuft auf ~170 Seiten), fuehrt der
// Klick dorthin statt ins Leere.
//
// Eigene Farben am Dialog, weil jede Standalone-Seite ihre eigenen Tokens
// mitbringt (preise/kaufen/berichtsheft laden core.css NICHT). --primary wird
// uebernommen, wo es ihn gibt; der Hex dahinter ist nur der Rueckfall.
// position/inset/margin stehen ausdruecklich da: /kaufen/ setzt *{margin:0} und schob
// den Dialog damit in die linke obere Ecke (gemessen 12.11.2026).
(function () {
    'use strict';
    if (window.mwlKontakt) return;

    var isEN = document.documentElement.lang === 'en';
    function L(de, en) { return isEN ? en : de; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Dieselben Kennungen wie Assets/js/support.js — aendert sich das Template, beide nachziehen.
    var EMAILJS_KEY = 'dLaRbQLynU5R8A0ti', EMAILJS_SERVICE = 'service_22m5bcs', EMAILJS_TEMPLATE = 'template_xe5xc1k';
    var EMPFAENGER = 'sven9micha37@gmail.com';
    var VENDOR = '/Assets/js/vendor/emailjs-4.4.1.min.js';

    // Der Praefix steht vorn in der Mail, damit Kauf-Probleme im Postfach sofort auffallen.
    var THEMEN = [
        { id: 'frage',   de: 'Frage',               en: 'Question',          tag: 'FRAGE',
          ph: ['Was möchtest du wissen?', 'What would you like to know?'] },
        { id: 'problem', de: 'Etwas klappt nicht',  en: 'Something is broken', tag: 'PROBLEM',
          ph: ['Was ist passiert, und was hast du davor gemacht?', 'What happened, and what did you do right before?'] },
        { id: 'kauf',    de: 'Kauf und Pass',       en: 'Purchase and pass', tag: 'PASS',
          ph: ['Was ist mit deinem Kauf oder Pass? Wenn du bezahlt hast: wann ungefähr und womit?', 'What is wrong with your purchase or pass? If you paid: roughly when and how?'] },
        { id: 'idee',    de: 'Idee',                en: 'Idea',              tag: 'IDEE',
          ph: ['Was wünschst du dir?', 'What would you like to see?'] }
    ];
    function HINWEIS_MAIL() { return L('Freiwillig. Ohne Adresse kann keine Antwort kommen.', 'Optional. Without an address there is no way to reply.'); }
    function thema(id) { for (var i = 0; i < THEMEN.length; i++) if (THEMEN[i].id === id) return THEMEN[i]; return THEMEN[0]; }

    function ev(name, props) { if (typeof window.mwlEvent === 'function') window.mwlEvent(name, props); }

    // Ohne Regex: Backslashes in Mustern sind in diesem Projekt schon dreimal still kaputtgegangen (CLAUDE.md).
    function mailOk(s) {
        var at = s.indexOf('@');
        return at > 0 && s.indexOf(' ') === -1 && s.lastIndexOf('.') > at + 1 && s.lastIndexOf('.') < s.length - 1;
    }

    var CSS = [
        '.mwl-k{--k-bg:#14161b;--k-fl:#1c1f26;--k-tx:#f3f5f8;--k-mu:#9aa3b2;--k-li:rgba(255,255,255,.1);--k-ak:var(--primary,#5578a8);--k-ok:#3fa36b;--k-warn:#d0894a;',
        'position:fixed;inset:0;margin:auto;height:fit-content;color:var(--k-tx);background:var(--k-bg);border:1px solid var(--k-li);border-radius:16px;padding:0;width:min(520px,calc(100vw - 32px));max-height:calc(100dvh - 32px);',
        'box-shadow:0 24px 60px rgba(0,0,0,.45);font-family:inherit;font-size:16px;line-height:1.5;overflow:auto;overscroll-behavior:contain}',
        '.mwl-k.is-hell{--k-bg:#fff;--k-fl:#f3f5f8;--k-tx:#10151f;--k-mu:#5a6474;--k-li:rgba(16,21,31,.12);box-shadow:0 24px 60px rgba(16,21,31,.18)}',
        '.mwl-k::backdrop{background:rgba(5,7,10,.55)}',
        '.mwl-k[open]{animation:mwlKIn .22s cubic-bezier(.2,.8,.2,1)}',
        '@keyframes mwlKIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
        '@media (prefers-reduced-motion:reduce){.mwl-k[open]{animation:none}}',
        '.mwl-k *{box-sizing:border-box}',
        '.mwl-k-box{display:grid;gap:18px;padding:22px 22px 20px}',
        '.mwl-k-kopf{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}',
        '.mwl-k-titel{margin:0;font-size:1.18rem;font-weight:650;letter-spacing:-.01em;color:var(--k-tx)}',
        '.mwl-k-lead{margin:4px 0 0;font-size:.88rem;color:var(--k-mu);text-wrap:pretty}',
        '.mwl-k-zu{flex:none;width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--k-mu);cursor:pointer;transition:background .2s ease,color .2s ease}',
        '.mwl-k-zu:hover{background:var(--k-fl);color:var(--k-tx)}',
        '.mwl-k fieldset{border:0;margin:0;padding:0;min-width:0}',
        '.mwl-k-feld-t{display:block;margin:0 0 8px;padding:0;font-size:.82rem;font-weight:600;color:var(--k-tx)}',
        '.mwl-k-themen{display:flex;flex-wrap:wrap;gap:8px}',
        '.mwl-k-thema{position:relative}',
        '.mwl-k-thema input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}',
        '.mwl-k-thema span{display:block;padding:7px 13px;border:1px solid var(--k-li);border-radius:999px;font-size:.86rem;color:var(--k-mu);transition:border-color .2s ease,color .2s ease,background .2s ease}',
        '.mwl-k-thema input:checked+span{border-color:var(--k-ak);color:var(--k-tx);background:color-mix(in srgb,var(--k-ak) 16%,transparent)}',
        '.mwl-k-thema input:focus-visible+span{outline:2px solid var(--k-ak);outline-offset:2px}',
        '.mwl-k textarea,.mwl-k input[type=email]{width:100%;font:inherit;font-size:16px;color:var(--k-tx);background:var(--k-fl);border:1px solid var(--k-li);border-radius:8px;padding:10px 12px;transition:border-color .2s ease}',
        '.mwl-k textarea{min-height:132px;resize:vertical}',
        '.mwl-k textarea:focus,.mwl-k input[type=email]:focus{outline:none;border-color:var(--k-ak)}',
        '.mwl-k-hinweis{margin:6px 0 0;font-size:.8rem;color:var(--k-mu)}',
        '.mwl-k-hinweis.is-warn{color:var(--k-warn)}',
        '.mwl-k-ok{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;align-items:start;font-size:.8rem;color:var(--k-mu);cursor:pointer}',
        '.mwl-k-ok input{width:18px;height:18px;margin:2px 0 0;accent-color:var(--k-ak);cursor:pointer}',
        '.mwl-k-ok a,.mwl-k-fuss a{color:var(--k-tx);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--k-li)}',
        '.mwl-k-ok.is-fehlt{color:var(--k-warn)}',
        '.mwl-k-status{margin:0;font-size:.85rem;color:var(--k-warn)}',
        '.mwl-k-status:empty{display:none}',
        '.mwl-k-fuss{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.82rem;color:var(--k-mu)}',
        '.mwl-k-senden{font:inherit;font-size:.92rem;font-weight:600;color:#fff;background:var(--k-ak);border:0;border-radius:8px;padding:10px 18px;cursor:pointer;transition:filter .2s ease,opacity .2s ease}',
        '.mwl-k-senden:hover{filter:brightness(1.08)}',
        '.mwl-k-senden:disabled{opacity:.6;cursor:progress}',
        '.mwl-k-senden:focus-visible,.mwl-k-zu:focus-visible{outline:2px solid var(--k-ak);outline-offset:2px}',
        '.mwl-k-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
        '.mwl-k-fertig{display:grid;gap:10px;justify-items:start}',
        '.mwl-k-haken{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;color:var(--k-ok);background:color-mix(in srgb,var(--k-ok) 16%,transparent)}',
        '.mwl-k-fertig p{margin:0;color:var(--k-mu);font-size:.9rem;text-wrap:pretty}',
        '.mwl-k-fertig strong{color:var(--k-tx);font-weight:600}',
        '@media (max-width:600px){.mwl-k{width:100%;max-width:none;margin:auto 0 0;border-radius:16px 16px 0 0;border-bottom:0;max-height:92dvh}',
        '.mwl-k[open]{animation-name:mwlKUp}@keyframes mwlKUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}',
        '.mwl-k-box{padding:18px 16px calc(16px + env(safe-area-inset-bottom))}}'
    ].join('');

    var IC_X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    var IC_OK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

    var dlg = null, ort = 'unbekannt', ejReady = false, ejLaden = null;

    function hell() {
        var t = document.documentElement.getAttribute('data-theme') || (document.body && document.body.getAttribute('data-theme'));
        if (t) return t === 'light';
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    }

    function formHTML() {
        return '<form class="mwl-k-box" novalidate>' +
            '<div class="mwl-k-kopf"><div>' +
                '<h2 class="mwl-k-titel" id="mwlKTitel">' + L('Schreib dem Entwickler', 'Message the developer') + '</h2>' +
                '<p class="mwl-k-lead">' + L('Die Nachricht geht direkt an den Entwickler, kein Bot. Antwort kommt per Mail, meist innerhalb von zwei Tagen.',
                    'Your message goes straight to the developer, no bot. The reply comes by email, usually within two days.') + '</p>' +
            '</div><button type="button" class="mwl-k-zu" data-k-zu aria-label="' + L('Schließen', 'Close') + '">' + IC_X + '</button></div>' +
            '<fieldset><legend class="mwl-k-feld-t">' + L('Worum geht es?', 'What is it about?') + '</legend><div class="mwl-k-themen">' +
                THEMEN.map(function (t) {
                    return '<label class="mwl-k-thema"><input type="radio" name="thema" value="' + t.id + '"><span>' + esc(L(t.de, t.en)) + '</span></label>';
                }).join('') +
            '</div></fieldset>' +
            '<div><label class="mwl-k-feld-t" for="mwlKText">' + L('Nachricht', 'Message') + '</label>' +
                '<textarea id="mwlKText" maxlength="4000"></textarea></div>' +
            '<div><label class="mwl-k-feld-t" for="mwlKMail">' + L('Deine E-Mail für die Antwort', 'Your email for the reply') + '</label>' +
                '<input type="email" id="mwlKMail" autocomplete="email" inputmode="email" spellcheck="false" placeholder="name@beispiel.de">' +
                '<p class="mwl-k-hinweis" id="mwlKMailHinweis">' + HINWEIS_MAIL() + '</p></div>' +
            '<div class="mwl-k-hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
            '<label class="mwl-k-ok"><input type="checkbox" id="mwlKOk"><span>' +
                L('Ich bin einverstanden, dass Nachricht, Thema, die aktuelle Seite und, falls angegeben, meine E-Mail über EmailJS an den Entwickler gehen.',
                  'I agree that my message, topic, the current page and, if given, my email are sent to the developer via EmailJS.') +
                ' <a href="' + (isEN ? '/en/DSGVO/' : '/DSGVO/') + '#feedback-emailjs" target="_blank" rel="noopener">' + L('Datenschutz', 'Privacy') + '</a></span></label>' +
            '<p class="mwl-k-status" id="mwlKStatus" role="status"></p>' +
            '<div class="mwl-k-fuss"><a href="' + (isEN ? '/en/support/' : '/support/') + '">' + L('Mehr auf der Support-Seite', 'More on the support page') + '</a>' +
                '<button type="submit" class="mwl-k-senden">' + L('Nachricht senden', 'Send message') + '</button></div>' +
        '</form>';
    }

    function bauen() {
        if (dlg) return dlg;
        var st = document.createElement('style');
        st.textContent = CSS;
        document.head.appendChild(st);
        dlg = document.createElement('dialog');
        dlg.className = 'mwl-k';
        dlg.setAttribute('aria-labelledby', 'mwlKTitel');
        dlg.innerHTML = formHTML();
        document.body.appendChild(dlg);
        verdrahten();
        return dlg;
    }

    function $(id) { return dlg.querySelector('#' + id); }

    function setThema(id) {
        var t = thema(id);
        dlg.querySelectorAll('input[name=thema]').forEach(function (r) { r.checked = r.value === t.id; });
        $('mwlKText').setAttribute('placeholder', L(t.ph[0], t.ph[1]));
    }
    function aktThema() {
        var r = dlg.querySelector('input[name=thema]:checked');
        return thema(r ? r.value : 'frage');
    }
    function status(txt) { var s = $('mwlKStatus'); if (s) s.textContent = txt || ''; }

    function verdrahten() {
        dlg.addEventListener('click', function (e) {
            if (e.target === dlg || e.target.closest('[data-k-zu]')) dlg.close();
        });
        dlg.addEventListener('change', function (e) {
            if (e.target.name === 'thema') setThema(e.target.value);
            if (e.target.id === 'mwlKOk') e.target.closest('.mwl-k-ok').classList.remove('is-fehlt');
        });
        dlg.addEventListener('submit', senden);
    }

    // EmailJS erst beim ersten Senden holen — die Seiten sollen dafuer nichts vorladen.
    function mailer() {
        if (window.emailjs) return Promise.resolve(window.emailjs);
        if (!ejLaden) {
            ejLaden = new Promise(function (ok, nein) {
                var s = document.createElement('script');
                s.src = VENDOR;
                s.onload = function () { window.emailjs ? ok(window.emailjs) : nein(new Error('emailjs fehlt')); };
                s.onerror = function () { ejLaden = null; nein(new Error('emailjs nicht ladbar')); };
                document.head.appendChild(s);
            });
        }
        return ejLaden;
    }

    function senden(e) {
        e.preventDefault();
        var form = dlg.querySelector('form');
        var text = $('mwlKText'), mail = $('mwlKMail'), ok = $('mwlKOk');
        var nachricht = text.value.trim(), adresse = mail.value.trim();
        status('');
        mail.removeAttribute('aria-invalid');
        $('mwlKMailHinweis').classList.remove('is-warn');
        $('mwlKMailHinweis').textContent = HINWEIS_MAIL();

        if (!nachricht) { status(L('Schreib zuerst etwas in das Nachrichtenfeld.', 'Write something in the message field first.')); text.focus(); return; }
        if (adresse && !mailOk(adresse)) {
            mail.setAttribute('aria-invalid', 'true');
            $('mwlKMailHinweis').classList.add('is-warn');
            $('mwlKMailHinweis').textContent = L('Diese Adresse sieht unvollständig aus. Prüf sie oder lass das Feld leer.', 'This address looks incomplete. Check it or leave the field empty.');
            mail.focus();
            return;
        }
        if (!ok.checked) {
            ok.closest('.mwl-k-ok').classList.add('is-fehlt');
            status(L('Setz den Haken beim Einverständnis, ohne ihn wird nichts gesendet.', 'Tick the consent box, nothing is sent without it.'));
            ok.focus();
            return;
        }
        var t = aktThema();
        // Honeypot: ein Bot fuellt das versteckte Feld; dann still "fertig" zeigen, nichts senden.
        if (form.elements.website && form.elements.website.value) { fertig(adresse); return; }

        var seite = location.pathname;
        var kopf = '[' + t.tag + '] ' + nachricht;
        var anhang = '\n\n---\n' +
            'Antwort an: ' + (adresse || '(keine Adresse angegeben)') + '\n' +
            'Seite: ' + seite + '\n' +
            'Sprache: ' + (isEN ? 'EN' : 'DE');
        var payload = {
            email: EMPFAENGER,
            message: kopf + anhang,
            rating: '0',
            rating_emoji: '—',
            from_name: adresse || L('Kontaktfenster', 'Contact window'),
            reply_to: adresse,
            date: new Date().toLocaleString(isEN ? 'en-GB' : 'de-DE'),
            data_mode: 'kontakt'
        };

        var knopf = dlg.querySelector('.mwl-k-senden');
        knopf.disabled = true;
        knopf.textContent = L('Wird gesendet …', 'Sending …');
        mailer().then(function (ej) {
            if (!ejReady) { ej.init(EMAILJS_KEY); ejReady = true; }
            return ej.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, payload);
        }).then(function () {
            ev('kontakt_gesendet', { thema: t.id, ort: ort, mit_adresse: !!adresse });
            fertig(adresse);
        }).catch(function (err) {
            console.warn('Kontakt: Senden fehlgeschlagen', err);
            status(L('Senden hat nicht geklappt (offline oder blockiert). Dein Text steht noch da. Versuch es gleich nochmal oder schreib an support@myworklog.de.',
                     'Sending failed (offline or blocked). Your text is still here. Try again in a moment or write to support@myworklog.de.'));
            knopf.disabled = false;
            knopf.textContent = L('Nachricht senden', 'Send message');
        });
    }

    function fertig(adresse) {
        var box = dlg.querySelector('.mwl-k-box');
        box.innerHTML =
            '<div class="mwl-k-kopf"><div class="mwl-k-haken">' + IC_OK + '</div>' +
            '<button type="button" class="mwl-k-zu" data-k-zu aria-label="' + L('Schließen', 'Close') + '">' + IC_X + '</button></div>' +
            '<div class="mwl-k-fertig">' +
                '<h2 class="mwl-k-titel" id="mwlKTitel" tabindex="-1">' + L('Nachricht gesendet', 'Message sent') + '</h2>' +
                (adresse
                    ? '<p>' + L('Die Antwort geht an', 'The reply goes to') + ' <strong>' + esc(adresse) + '</strong>. ' +
                        L('Schau auch im Spam-Ordner nach.', 'Check your spam folder too.') + '</p>'
                    : '<p>' + L('Du hast keine E-Mail angegeben, deshalb kann keine Antwort kommen. Gelesen wird die Nachricht trotzdem.',
                                'You did not give an email, so there is no way to reply. Your message will still be read.') + '</p>') +
            '</div>' +
            '<div class="mwl-k-fuss"><span></span><button type="button" class="mwl-k-senden" data-k-zu>' + L('Schließen', 'Close') + '</button></div>';
        var h = box.querySelector('#mwlKTitel');
        if (h) h.focus();
        // Beim naechsten Oeffnen wieder ein leeres Formular.
        dlg.addEventListener('close', function zuruck() {
            dlg.removeEventListener('close', zuruck);
            box.outerHTML = formHTML();
        });
    }

    function oeffnen(themaId, wo) {
        bauen();
        ort = wo || 'unbekannt';
        if (!dlg.querySelector('#mwlKText')) dlg.innerHTML = formHTML();
        dlg.classList.toggle('is-hell', hell());
        setThema(themaId || (dlg.querySelector('input[name=thema]:checked') || {}).value || 'frage');
        status('');
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        var feld = $('mwlKText');
        if (feld && !(window.matchMedia && window.matchMedia('(hover: none)').matches)) feld.focus();
        ev('kontakt_geoeffnet', { thema: thema(themaId).id, ort: ort });
    }

    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('[data-kontakt]');
        if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        oeffnen(a.getAttribute('data-kontakt'), a.getAttribute('data-kontakt-ort'));
    });

    window.mwlKontakt = oeffnen;
})();
