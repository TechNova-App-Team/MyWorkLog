/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          MyWorkLog — NFC Backend Engine  v1.0.0                            ║
 * ║          Web NFC API · NDEF · QR Fallback · Action Router                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Architektur:
 *   NFCEngine          → Haupt-Controller (Singleton)
 *   NFCChipWriter      → Schreibt NDEF-Records auf Chips
 *   NFCChipReader      → Liest & parst NDEF-Records
 *   NFCActionRouter    → Verarbeitet Actions → MyWorkLog Einträge
 *   NFCPayloadCodec    → Encode/Decode komprimierter Chip-Payloads
 *   NFCFallbackQR      → QR-Code Generator für iOS Fallback
 *   NFCChipRegistry    → Chip-Verwaltung (Name, Typ, Farbe)
 *   NFCEventBus        → Interne Events zwischen Modulen
 *   NFCLogger          → Strukturiertes Logging mit History
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 1. KONSTANTEN & TYPEN
// ─────────────────────────────────────────────────────────────────────────────

const NFC_CONSTANTS = Object.freeze({
  BASE_URL: 'https://myworklog.de/nfc',
  NDEF_RECORD_TYPE: 'U',       // URL Record
  APP_SCHEME: 'mwl://',        // Custom URL-Scheme für PWA
  VERSION: '1',                // Payload-Version für Backwards-Compat
  MAX_NDEF_SIZE: 1024,         // Bytes — NTAG213 Limit
  DEBOUNCE_MS: 2500,           // Verhindert Doppel-Scan
  STORAGE_KEY: 'mwl_nfc_chips',
  LOG_STORAGE_KEY: 'mwl_nfc_log',
  MAX_LOG_ENTRIES: 500,
});

const ACTION_TYPES = Object.freeze({
  CHECKIN:    'ci',   // Arbeitsbeginn
  CHECKOUT:   'co',   // Arbeitsende
  SCHOOL_IN:  'si',   // Schulbeginn
  SCHOOL_OUT: 'so',   // Schulende
  BREAK_IN:   'bi',   // Pause Start
  BREAK_OUT:  'bo',   // Pause Ende
  SICK:       'sk',   // Krank melden
  VACATION:   'va',   // Urlaub
  TOGGLE:     'tg',   // Smart Toggle (Auto-detect In/Out)
  CUSTOM:     'cu',   // Custom Entry
});

const ENTRY_TYPE_MAP = Object.freeze({
  [ACTION_TYPES.CHECKIN]:    { type: 'Arbeit',       icon: '💼', color: '#4ADE80' },
  [ACTION_TYPES.CHECKOUT]:   { type: 'Arbeit',       icon: '🏠', color: '#60A5FA' },
  [ACTION_TYPES.SCHOOL_IN]:  { type: 'Berufsschule', icon: '📚', color: '#F59E0B' },
  [ACTION_TYPES.SCHOOL_OUT]: { type: 'Berufsschule', icon: '📚', color: '#F59E0B' },
  [ACTION_TYPES.BREAK_IN]:   { type: 'Pause',        icon: '☕', color: '#A78BFA' },
  [ACTION_TYPES.BREAK_OUT]:  { type: 'Pause',        icon: '▶️', color: '#A78BFA' },
  [ACTION_TYPES.SICK]:       { type: 'Krank',        icon: '💊', color: '#F87171' },
  [ACTION_TYPES.VACATION]:   { type: 'Urlaub',       icon: '🌴', color: '#34D399' },
  [ACTION_TYPES.TOGGLE]:     { type: 'auto',         icon: '⚡', color: '#FBBF24' },
  [ACTION_TYPES.CUSTOM]:     { type: 'custom',       icon: '✨', color: '#E879F9' },
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EVENT BUS
// ─────────────────────────────────────────────────────────────────────────────

class NFCEventBus {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return () => this.off(event, fn); // Unsubscribe fn zurückgeben
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    this.#listeners.get(event)?.forEach(fn => {
      try { fn(data); }
      catch (e) { console.error(`[NFCEventBus] Handler error on "${event}":`, e); }
    });
    // Wildcard listener
    this.#listeners.get('*')?.forEach(fn => {
      try { fn({ event, data }); }
      catch (e) {}
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOGGER
// ─────────────────────────────────────────────────────────────────────────────

class NFCLogger {
  #entries = [];
  #maxEntries;

  constructor(maxEntries = NFC_CONSTANTS.MAX_LOG_ENTRIES) {
    this.#maxEntries = maxEntries;
    this.#load();
  }

  #load() {
    try {
      const raw = localStorage.getItem(NFC_CONSTANTS.LOG_STORAGE_KEY);
      this.#entries = raw ? JSON.parse(raw) : [];
    } catch { this.#entries = []; }
  }

  #persist() {
    try {
      localStorage.setItem(NFC_CONSTANTS.LOG_STORAGE_KEY, JSON.stringify(this.#entries));
    } catch {}
  }

  #write(level, module, msg, meta = {}) {
    const entry = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      level,
      module,
      msg,
      meta,
    };

    this.#entries.unshift(entry);
    if (this.#entries.length > this.#maxEntries) this.#entries.length = this.#maxEntries;
    this.#persist();

    const style = {
      info:    'color:#60A5FA',
      success: 'color:#4ADE80',
      warn:    'color:#FBBF24',
      error:   'color:#F87171',
    }[level] || '';

    console.log(`%c[NFC:${module}] ${msg}`, style, meta);
    return entry;
  }

  info(module, msg, meta)    { return this.#write('info',    module, msg, meta); }
  success(module, msg, meta) { return this.#write('success', module, msg, meta); }
  warn(module, msg, meta)    { return this.#write('warn',    module, msg, meta); }
  error(module, msg, meta)   { return this.#write('error',   module, msg, meta); }

  getAll()                   { return [...this.#entries]; }
  getByLevel(level)          { return this.#entries.filter(e => e.level === level); }
  getByModule(module)        { return this.#entries.filter(e => e.module === module); }
  clear()                    { this.#entries = []; this.#persist(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYLOAD CODEC
// ─────────────────────────────────────────────────────────────────────────────

class NFCPayloadCodec {
  /**
   * Chip URL Format:
   * https://myworklog.de/nfc?v=1&a=ci&c=HOME&t=1700000000
   *
   * Kompakt-Version (für kleine Chips wie NTAG213):
   * mwl://nfc/v1/ci/HOME
   *
   * Params:
   *   v = version
   *   a = action (ci/co/tg/...)
   *   c = chip-id (max 16 chars)
   *   t = timestamp (optional, für pre-signed chips)
   *   n = custom label (optional)
   */

  static encode(config) {
    const { action, chipId, label, useCompact = false, baseUrl = NFC_CONSTANTS.BASE_URL } = config;

    if (!ACTION_TYPES[action] && !Object.values(ACTION_TYPES).includes(action)) {
      throw new Error(`Unbekannte Action: "${action}"`);
    }

    const actionCode = Object.values(ACTION_TYPES).includes(action)
      ? action
      : ACTION_TYPES[action];

    const safeChipId = (chipId || 'DEFAULT').substring(0, 16).replace(/[^a-zA-Z0-9_-]/g, '_');

    if (useCompact) {
      // Custom Scheme für PWA Web App Manifest (url_handlers)
      const parts = [NFC_CONSTANTS.APP_SCHEME + 'nfc', `v${NFC_CONSTANTS.VERSION}`, actionCode, safeChipId];
      if (label) parts.push(encodeURIComponent(label.substring(0, 20)));
      return parts.join('/');
    }

    // Standard HTTPS URL (funktioniert ohne PWA-Install)
    const url = new URL(baseUrl);
    url.searchParams.set('v', NFC_CONSTANTS.VERSION);
    url.searchParams.set('a', actionCode);
    url.searchParams.set('c', safeChipId);
    if (label) url.searchParams.set('n', label.substring(0, 30));

    return url.toString();
  }

  static decode(urlOrScheme) {
    try {
      let params;

      if (urlOrScheme.startsWith(NFC_CONSTANTS.APP_SCHEME)) {
        // mwl://nfc/v1/ci/CHIP_ID/Label
        const path = urlOrScheme.replace(NFC_CONSTANTS.APP_SCHEME, '');
        const parts = path.split('/');
        // parts: ['nfc', 'v1', 'ci', 'CHIP_ID', 'Label?']
        params = {
          v: parts[1]?.replace('v', '') || NFC_CONSTANTS.VERSION,
          a: parts[2] || ACTION_TYPES.TOGGLE,
          c: parts[3] || 'UNKNOWN',
          n: parts[4] ? decodeURIComponent(parts[4]) : null,
        };
      } else {
        // HTTPS URL
        const url = new URL(urlOrScheme);
        if (!url.hostname.includes('myworklog.de') && !url.hostname.includes('localhost')) {
          throw new Error('URL gehört nicht zu MyWorkLog');
        }
        params = Object.fromEntries(url.searchParams.entries());
      }

      if (!params.a) throw new Error('Keine Action in Payload');

      return {
        version: params.v || NFC_CONSTANTS.VERSION,
        action: params.a,
        chipId: params.c || 'UNKNOWN',
        label: params.n || null,
        raw: urlOrScheme,
        isValid: true,
      };

    } catch (err) {
      return { isValid: false, error: err.message, raw: urlOrScheme };
    }
  }

  static validate(payload) {
    if (!payload?.isValid) return { ok: false, reason: payload?.error || 'Ungültiger Payload' };
    if (!Object.values(ACTION_TYPES).includes(payload.action)) {
      return { ok: false, reason: `Unbekannte Action: "${payload.action}"` };
    }
    return { ok: true };
  }

  static buildNDEFRecord(url) {
    // Erstellt einen Web NFC NDEF URL Record
    return {
      recordType: 'url',
      data: url,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CHIP REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

class NFCChipRegistry {
  #chips = new Map();
  #bus;
  #logger;

  constructor(bus, logger) {
    this.#bus    = bus;
    this.#logger = logger;
    this.#load();
  }

  #load() {
    try {
      const raw = localStorage.getItem(NFC_CONSTANTS.STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        arr.forEach(chip => this.#chips.set(chip.id, chip));
      }
    } catch { this.#chips.clear(); }
  }

  #persist() {
    try {
      localStorage.setItem(NFC_CONSTANTS.STORAGE_KEY, JSON.stringify([...this.#chips.values()]));
    } catch (e) { this.#logger.error('Registry', 'Persist fehlgeschlagen', { e }); }
  }

  register(config) {
    const chip = {
      id:          config.id || crypto.randomUUID().substring(0, 8).toUpperCase(),
      label:       config.label || 'Unbenannt',
      action:      config.action || ACTION_TYPES.TOGGLE,
      color:       config.color || '#60A5FA',
      icon:        config.icon || '📍',
      location:    config.location || '',
      createdAt:   new Date().toISOString(),
      lastScan:    null,
      scanCount:   0,
      encodedUrl:  null,
    };

    chip.encodedUrl = NFCPayloadCodec.encode({
      action:  chip.action,
      chipId:  chip.id,
      label:   chip.label,
    });

    this.#chips.set(chip.id, chip);
    this.#persist();
    this.#bus.emit('chip:registered', chip);
    this.#logger.success('Registry', `Chip registriert: ${chip.label}`, chip);
    return chip;
  }

  recordScan(chipId) {
    const chip = this.#chips.get(chipId);
    if (!chip) return null;
    chip.lastScan  = new Date().toISOString();
    chip.scanCount = (chip.scanCount || 0) + 1;
    this.#persist();
    return chip;
  }

  get(chipId)    { return this.#chips.get(chipId) || null; }
  getAll()       { return [...this.#chips.values()]; }
  delete(chipId) { this.#chips.delete(chipId); this.#persist(); }

  update(chipId, updates) {
    const chip = this.#chips.get(chipId);
    if (!chip) return null;
    const updated = { ...chip, ...updates, id: chip.id, createdAt: chip.createdAt };
    // Re-encode URL wenn sich Action oder Label ändert
    if (updates.action || updates.label) {
      updated.encodedUrl = NFCPayloadCodec.encode({
        action: updated.action,
        chipId:  updated.id,
        label:   updated.label,
      });
    }
    this.#chips.set(chipId, updated);
    this.#persist();
    this.#bus.emit('chip:updated', updated);
    return updated;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. NFC CHIP WRITER
// ─────────────────────────────────────────────────────────────────────────────

class NFCChipWriter {
  #bus;
  #logger;
  #isWriting = false;
  #abortCtrl = null;

  constructor(bus, logger) {
    this.#bus    = bus;
    this.#logger = logger;
  }

  get isSupported() {
    return 'NDEFReader' in window;
  }

  async write(chip) {
    if (!this.isSupported) throw new Error('Web NFC nicht unterstützt (nur Android Chrome)');
    if (this.#isWriting)   throw new Error('Schreibvorgang läuft bereits');

    this.#isWriting = true;
    this.#abortCtrl = new AbortController();

    this.#bus.emit('writer:start', { chip });
    this.#logger.info('Writer', `Schreibe Chip: ${chip.label}`, { url: chip.encodedUrl });

    try {
      const ndef = new NDEFReader();

      await ndef.write(
        { records: [NFCPayloadCodec.buildNDEFRecord(chip.encodedUrl)] },
        { signal: this.#abortCtrl.signal, overwrite: true }
      );

      this.#bus.emit('writer:success', { chip });
      this.#logger.success('Writer', `Chip erfolgreich beschrieben: ${chip.label}`);
      return { ok: true, chip };

    } catch (err) {
      if (err.name === 'AbortError') {
        this.#bus.emit('writer:aborted', { chip });
        this.#logger.warn('Writer', 'Schreiben abgebrochen');
        return { ok: false, aborted: true };
      }
      this.#bus.emit('writer:error', { chip, error: err });
      this.#logger.error('Writer', err.message, { err });
      throw err;

    } finally {
      this.#isWriting = false;
      this.#abortCtrl = null;
    }
  }

  abort() {
    if (this.#abortCtrl) {
      this.#abortCtrl.abort();
      this.#isWriting = false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. NFC CHIP READER
// ─────────────────────────────────────────────────────────────────────────────

class NFCChipReader {
  #bus;
  #logger;
  #isReading  = false;
  #abortCtrl  = null;
  #lastScanTs = 0;
  #ndef       = null;

  constructor(bus, logger) {
    this.#bus    = bus;
    this.#logger = logger;
  }

  get isSupported() { return 'NDEFReader' in window; }
  get isReading()   { return this.#isReading; }

  async startScan() {
    if (!this.isSupported) throw new Error('Web NFC nicht unterstützt');
    if (this.#isReading)   return; // Bereits aktiv

    this.#abortCtrl = new AbortController();
    this.#isReading = true;
    this.#ndef      = new NDEFReader();

    this.#bus.emit('reader:scanning', {});
    this.#logger.info('Reader', 'NFC-Scan gestartet — halte Chip ans Gerät');

    this.#ndef.addEventListener('reading', (event) => this.#onReading(event));
    this.#ndef.addEventListener('readingerror', (event) => {
      this.#logger.error('Reader', 'Lesefehler', { event });
      this.#bus.emit('reader:error', { error: 'Chip konnte nicht gelesen werden' });
    });

    try {
      await this.#ndef.scan({ signal: this.#abortCtrl.signal });
    } catch (err) {
      if (err.name !== 'AbortError') {
        this.#logger.error('Reader', err.message);
        this.#bus.emit('reader:error', { error: err.message });
        this.#isReading = false;
        throw err;
      }
    }
  }

  #onReading(event) {
    // Debounce: Kein Doppel-Scan
    const now = Date.now();
    if (now - this.#lastScanTs < NFC_CONSTANTS.DEBOUNCE_MS) {
      this.#logger.warn('Reader', 'Debounce — Scan ignoriert');
      return;
    }
    this.#lastScanTs = now;

    const { message, serialNumber } = event;
    this.#logger.info('Reader', `Chip erkannt: ${serialNumber}`);

    let decodedPayload = null;

    for (const record of message.records) {
      if (record.recordType === 'url') {
        const decoder  = new TextDecoder();
        const urlBytes = record.data;
        // URL-Prefix-Byte laut NDEF-Spec
        const prefixMap = {
          0x00: '',
          0x01: 'http://www.',
          0x02: 'https://www.',
          0x03: 'http://',
          0x04: 'https://',
          0x05: 'tel:',
          0x06: 'mailto:',
          0x0D: 'https://myworklog.de',
        };

        const prefixCode = new Uint8Array(urlBytes.buffer)[0];
        const prefix     = prefixMap[prefixCode] || '';
        const rest       = decoder.decode(urlBytes.slice(1));
        const fullUrl    = prefix + rest;

        decodedPayload = NFCPayloadCodec.decode(fullUrl);
        break; // Ersten URL-Record verwenden
      }

      // Fallback: Text-Record
      if (record.recordType === 'text') {
        const decoder = new TextDecoder(record.lang || 'de');
        const text    = decoder.decode(record.data);
        decodedPayload = NFCPayloadCodec.decode(text);
        break;
      }
    }

    if (!decodedPayload) {
      this.#bus.emit('reader:unknown', { serialNumber, message });
      this.#logger.warn('Reader', 'Kein MyWorkLog-Payload auf Chip');
      return;
    }

    const validation = NFCPayloadCodec.validate(decodedPayload);
    if (!validation.ok) {
      this.#bus.emit('reader:invalid', { payload: decodedPayload, reason: validation.reason });
      this.#logger.warn('Reader', `Ungültiger Payload: ${validation.reason}`);
      return;
    }

    this.#bus.emit('reader:scanned', { payload: decodedPayload, serialNumber });
    this.#logger.success('Reader', `Payload gelesen: action=${decodedPayload.action} chip=${decodedPayload.chipId}`);
  }

  stopScan() {
    if (this.#abortCtrl) {
      this.#abortCtrl.abort();
      this.#isReading = false;
      this.#bus.emit('reader:stopped', {});
      this.#logger.info('Reader', 'Scan gestoppt');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ACTION ROUTER — Kern-Logic
// ─────────────────────────────────────────────────────────────────────────────

class NFCActionRouter {
  #bus;
  #logger;
  #registry;

  constructor(bus, logger, registry) {
    this.#bus      = bus;
    this.#logger   = logger;
    this.#registry = registry;
  }

  /**
   * Verarbeitet einen gescannten Payload und erstellt den passenden Eintrag.
   * Gibt einen NFCActionResult zurück, den die App nutzt.
   */
  async process(payload) {
    const { action, chipId, label } = payload;

    // Chip-Scan-Count aktualisieren
    this.#registry.recordScan(chipId);
    const chipMeta = this.#registry.get(chipId);

    let resolvedAction = action;

    // TOGGLE: Smart-Logic — letzten Eintrag prüfen
    if (action === ACTION_TYPES.TOGGLE) {
      resolvedAction = await this.#resolveToggle();
      this.#logger.info('Router', `Toggle resolved: ${action} → ${resolvedAction}`);
    }

    const entryMeta = ENTRY_TYPE_MAP[resolvedAction];
    if (!entryMeta) {
      this.#logger.error('Router', `Kein Mapping für Action: ${resolvedAction}`);
      return { ok: false, error: `Unbekannte Action: ${resolvedAction}` };
    }

    const now        = new Date();
    const timeString = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const dateString = now.toISOString().substring(0, 10); // YYYY-MM-DD

    const entry = this.#buildEntry({
      action:    resolvedAction,
      entryMeta,
      timeString,
      dateString,
      chipMeta,
      label:     label || chipMeta?.label || null,
    });

    // Eintrag in MyWorkLog speichern
    const saveResult = this.#saveToMyWorkLog(entry);

    const result = {
      ok:        saveResult.ok,
      action:    resolvedAction,
      entry,
      chip:      chipMeta,
      timestamp: now.toISOString(),
      message:   this.#buildMessage(resolvedAction, timeString, chipMeta),
    };

    if (saveResult.ok) {
      this.#bus.emit('router:entry_created', result);
      this.#logger.success('Router', result.message, result);
      // Vibration Feedback
      if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
    } else {
      this.#bus.emit('router:entry_failed', { ...result, error: saveResult.error });
      this.#logger.error('Router', `Eintrag fehlgeschlagen: ${saveResult.error}`);
    }

    return result;
  }

  /**
   * Bestimmt ob Check-IN oder Check-OUT folgt.
   * Analysiert den letzten Eintrag des heutigen Tages.
   */
  async #resolveToggle() {
    try {
      const today      = new Date().toISOString().substring(0, 10);
      const entries    = this.#getTodaysEntries(today);
      const lastEntry  = entries[entries.length - 1];

      if (!lastEntry) return ACTION_TYPES.CHECKIN;

      const isArbeit   = lastEntry.type === 'Arbeit';
      const hasStart   = lastEntry.startTime && !lastEntry.endTime;

      // Offener Arbeitseintrag → Check-OUT
      if (isArbeit && hasStart) return ACTION_TYPES.CHECKOUT;

      // Abgeschlossener Eintrag → neuer Check-IN
      return ACTION_TYPES.CHECKIN;

    } catch {
      return ACTION_TYPES.CHECKIN; // Safe fallback
    }
  }

  #getTodaysEntries(today) {
    try {
      // MyWorkLog speichert Einträge unter 'mwl_entries' o.ä. — anpassen je nach echtem Storage-Key
      const raw     = localStorage.getItem('worklog_entries') ||
                      localStorage.getItem('mwl_entries') ||
                      localStorage.getItem('timeentries');
      if (!raw) return [];
      const all = JSON.parse(raw);
      return Array.isArray(all)
        ? all.filter(e => e.date === today || e.startDate === today)
        : [];
    } catch { return []; }
  }

  #buildEntry({ action, entryMeta, timeString, dateString, chipMeta, label }) {
    const isStart = [ACTION_TYPES.CHECKIN, ACTION_TYPES.SCHOOL_IN, ACTION_TYPES.BREAK_IN].includes(action);
    const isEnd   = [ACTION_TYPES.CHECKOUT, ACTION_TYPES.SCHOOL_OUT, ACTION_TYPES.BREAK_OUT].includes(action);

    return {
      id:        `nfc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      date:      dateString,
      type:      entryMeta.type,
      startTime: isStart ? timeString : undefined,
      endTime:   isEnd   ? timeString : undefined,
      note:      `NFC: ${label || chipMeta?.label || 'Chip'} · ${action.toUpperCase()}`,
      source:    'nfc',
      chipId:    chipMeta?.id || 'unknown',
      nfcAction: action,
      createdAt: new Date().toISOString(),
    };
  }

  #saveToMyWorkLog(entry) {
    try {
      // Versuche alle bekannten MyWorkLog Storage-Keys
      const KEYS_TO_TRY = ['worklog_entries', 'mwl_entries', 'timeentries', 'mwl_worklog'];

      let savedKey  = null;
      let existing  = [];

      for (const key of KEYS_TO_TRY) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            existing  = JSON.parse(raw);
            savedKey  = key;
            break;
          }
        } catch {}
      }

      // Wenn noch kein Key existiert, neuen anlegen
      if (!savedKey) savedKey = 'mwl_nfc_entries';

      if (!Array.isArray(existing)) existing = [];
      existing.push(entry);
      localStorage.setItem(savedKey, JSON.stringify(existing));

      // Dispatch Custom Event für MyWorkLog App
      window.dispatchEvent(new CustomEvent('mwl:nfc_entry', {
        detail: entry,
        bubbles: true,
      }));

      return { ok: true, key: savedKey };

    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  #buildMessage(action, time, chip) {
    const name = chip?.label || 'Chip';
    const messages = {
      [ACTION_TYPES.CHECKIN]:    `✅ Arbeit gestartet um ${time} — ${name}`,
      [ACTION_TYPES.CHECKOUT]:   `🏠 Feierabend um ${time} — ${name}`,
      [ACTION_TYPES.SCHOOL_IN]:  `📚 Schule gestartet um ${time}`,
      [ACTION_TYPES.SCHOOL_OUT]: `📚 Schule beendet um ${time}`,
      [ACTION_TYPES.BREAK_IN]:   `☕ Pause gestartet um ${time}`,
      [ACTION_TYPES.BREAK_OUT]:  `▶️ Weitergearbeitet um ${time}`,
      [ACTION_TYPES.SICK]:       `💊 Krank für heute eingetragen`,
      [ACTION_TYPES.VACATION]:   `🌴 Urlaubstag für heute eingetragen`,
      [ACTION_TYPES.CUSTOM]:     `✨ Custom-Eintrag um ${time}`,
    };
    return messages[action] || `Eintrag erstellt um ${time}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. QR FALLBACK (iOS)
// ─────────────────────────────────────────────────────────────────────────────

class NFCFallbackQR {
  /**
   * Generiert eine QR-Code URL via qrserver.com (kein npm nötig)
   * oder gibt einen Data-URL via canvas zurück wenn offline.
   */
  static generateUrl(text, size = 256, options = {}) {
    const { errorCorrection = 'M', margin = 4, color = '000000', bg = 'ffffff' } = options;
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&ecc=${errorCorrection}&margin=${margin}&color=${color}&bgcolor=${bg}`;
  }

  /**
   * Erstellt ein <img> Element mit QR-Code
   */
  static createImageElement(chip, size = 256) {
    const img       = document.createElement('img');
    img.src         = this.generateUrl(chip.encodedUrl, size);
    img.alt         = `QR-Code für Chip: ${chip.label}`;
    img.width       = size;
    img.height      = size;
    img.loading     = 'lazy';
    img.style.cssText = 'border-radius:8px;image-rendering:pixelated;';
    return img;
  }

  /**
   * URL-Handler: Wenn User QR scannt, landet er auf /nfc?...
   * Diese Funktion parst die URL und triggert die Action.
   */
  static parseCurrentUrl() {
    return NFCPayloadCodec.decode(window.location.href);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. NFC ENGINE — Haupt-Controller (Singleton)
// ─────────────────────────────────────────────────────────────────────────────

class NFCEngine {
  static #instance = null;

  #bus;
  #logger;
  #registry;
  #writer;
  #reader;
  #router;
  #initialized = false;

  constructor() {
    if (NFCEngine.#instance) return NFCEngine.#instance;
    NFCEngine.#instance = this;

    this.#bus      = new NFCEventBus();
    this.#logger   = new NFCLogger();
    this.#registry = new NFCChipRegistry(this.#bus, this.#logger);
    this.#writer   = new NFCChipWriter(this.#bus, this.#logger);
    this.#reader   = new NFCChipReader(this.#bus, this.#logger);
    this.#router   = new NFCActionRouter(this.#bus, this.#logger, this.#registry);
  }

  static getInstance() {
    if (!NFCEngine.#instance) new NFCEngine();
    return NFCEngine.#instance;
  }

  // Public API ───────────────────────────────────────────────────────────────

  get bus()      { return this.#bus; }
  get logger()   { return this.#logger; }
  get registry() { return this.#registry; }
  get writer()   { return this.#writer; }
  get reader()   { return this.#reader; }
  get router()   { return this.#router; }
  get codec()    { return NFCPayloadCodec; }
  get qr()       { return NFCFallbackQR; }
  get actions()  { return ACTION_TYPES; }
  get isNFCSupported() { return this.#writer.isSupported; }

  /**
   * Initialisiert die Engine.
   * Verbindet Reader → Router Pipeline automatisch.
   */
  init() {
    if (this.#initialized) return this;

    // Reader → Router Pipeline
    this.#bus.on('reader:scanned', async ({ payload }) => {
      await this.#router.process(payload);
    });

    // URL-Handler beim Start (QR-Code Fallback für iOS)
    if (window.location.search.includes('a=') || window.location.search.includes('action=')) {
      const payload = NFCFallbackQR.parseCurrentUrl();
      if (payload.isValid) {
        this.#logger.info('Engine', 'URL-Parameter erkannt — QR-Scan Fallback', payload);
        setTimeout(() => this.#router.process(payload), 300);
      }
    }

    this.#initialized = true;
    this.#logger.success('Engine', '🚀 NFCEngine initialisiert', {
      nfcSupported: this.isNFCSupported,
      chips: this.#registry.getAll().length,
    });

    return this;
  }

  /**
   * Convenience: Chip registrieren + direkt beschreiben
   */
  async createAndWriteChip(config) {
    const chip = this.#registry.register(config);
    const result = await this.#writer.write(chip);
    return { chip, writeResult: result };
  }

  /**
   * Convenience: Scan starten
   */
  async startScan() {
    return this.#reader.startScan();
  }

  stopScan() {
    this.#reader.stopScan();
  }

  /**
   * Manuell eine Action triggern (für Tests / UI ohne echten Chip)
   */
  async simulateScan(chipIdOrAction) {
    const chip = this.#registry.get(chipIdOrAction);
    const payload = chip
      ? NFCPayloadCodec.decode(chip.encodedUrl)
      : { isValid: true, action: chipIdOrAction, chipId: 'SIMULATED', label: 'Simulation' };

    return this.#router.process(payload);
  }

  getStatus() {
    return {
      nfcSupported: this.isNFCSupported,
      isScanning:   this.#reader.isReading,
      chips:        this.#registry.getAll(),
      logs:         this.#logger.getAll().slice(0, 20),
      initialized:  this.#initialized,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

// Browser Global
window.MWLNfc = NFCEngine.getInstance();
window.MWLNfc.init();

// ES Module Export (falls Build-Tool genutzt wird)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NFCEngine,
    NFCChipWriter,
    NFCChipReader,
    NFCActionRouter,
    NFCPayloadCodec,
    NFCFallbackQR,
    NFCChipRegistry,
    NFCEventBus,
    NFCLogger,
    ACTION_TYPES,
    ENTRY_TYPE_MAP,
    NFC_CONSTANTS,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. USAGE EXAMPLES (in comments, nicht ausgeführt)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ═══════════════════════════════════════════════════════
 * BEISPIELE
 * ═══════════════════════════════════════════════════════
 *
 * // 1. Engine holen (Singleton)
 * const nfc = window.MWLNfc;
 *
 * // 2. Chip für Arbeit-Eingang erstellen & auf Chip schreiben
 * const { chip } = await nfc.createAndWriteChip({
 *   label:    'Arbeit',
 *   action:   'tg',      // Toggle: Smart In/Out
 *   icon:     '💼',
 *   color:    '#4ADE80',
 *   location: 'Büro-Eingang',
 * });
 *
 * // 3. Manuellen Scan starten (Handy ans Chip halten)
 * await nfc.startScan();
 *
 * // 4. Auf Events hören
 * nfc.bus.on('router:entry_created', ({ message, entry }) => {
 *   showToast(message);
 *   refreshDashboard();
 * });
 *
 * // 5. Scan simulieren (für Tests)
 * const result = await nfc.simulateScan('tg');
 * console.log(result.message); // "✅ Arbeit gestartet um 07:34 — Arbeit"
 *
 * // 6. QR-Code für iOS
 * const qrUrl = nfc.qr.generateUrl(chip.encodedUrl, 300);
 * document.getElementById('qr').src = qrUrl;
 *
 * // 7. Status
 * console.log(nfc.getStatus());
 * // { nfcSupported: true, isScanning: false, chips: [...], logs: [...] }
 */