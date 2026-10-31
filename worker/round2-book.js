/* Round2 booking Worker (Cloudflare). Test build – see docs/own-booking-plan.md.
   Secrets: HITPAY_KEY, HITPAY_SALT, HITPAY_API (sandbox), HITPAY_LIVE_KEY, HITPAY_LIVE_SALT, TEST_CODE, SWITCH_PASS, SWITCH_PIN, SB_COMPANY, SB_USER, SB_PASS.  Vars: SB_PUBLIC_KEY, DRY_RUN ("1" = don't create SimplyBook bookings).
   Durable Object HOLDBOOK (class HoldBook): one place that holds unpaid slots, so two guests can't hold the same time,
   and whose alarm releases a hold after 10 min AND cancels its HitPay link (no paying for a released slot).
   Routes: GET /ph, POST /quote, POST /checkout, POST /release, POST /hitpay (webhook), GET /done?ref=, GET /test, GET /selftest
   TIMES: a SimplyBook booking's end = the guest's session end + 15 min cleaning (docs/booking-times.md). Guests, prices, TV
   messages and "time's up" use the SESSION end; only SimplyBook (and its availability) uses the end with cleaning. */
import { DurableObject } from 'cloudflare:workers';

const SB = 'https://user-api.simplybook.asia';
const ICS = 'https://calendar.google.com/calendar/ical/en.singapore%23holiday%40group.v.calendar.google.com/public/basic.ics';
const EXTRA_PH = [];                       // in-lieu days Google hasn't listed yet, e.g. '2027-02-08'
const ROOMS = { 5: ['Vale', 'netflix'], 7: ['Kaeden', 'netflix'], 8: ['Scarlett', 'netflix'], 9: ['Kai', 'deluxe'], 10: ['Bella', 'deluxe'], 12: ['Atlas', 'deluxe'], 11: ['Max', 'vip'] };
const SVC = { netflix: { off: 28, peak: 29, eb: 32 }, deluxe: { off: 35, peak: 37, eb: 33 }, vip: { off: 36, peak: 38, eb: 34 } };
const MIRROR = { 5: 12, 12: 5 };
const MAX_PAX = { 5: 3, 7: 3, 8: 3, 9: 4, 10: 4, 12: 5, 11: 6 };   // most guests per room          // Vale sits under Atlas
/* ===== PRICES – edit here. base = 3 hours; ext = extra price for +1h / +2h / +3h. =====
   Early Bird = 11:00 start only. Its extensions default to the day's rate ÷ 3 per hour (no discount). */
const PRICES = {
  netflix: { off: { base: 49, ext: [16.30, 28.58, 39.20] }, peak: { base: 69, ext: [23, 40.25, 55.20] }, eb: { base: 35, ext: { off: [16.33, 32.67, 49], peak: [23, 46, 69] } } },
  deluxe:  { off: { base: 79, ext: [26.30, 39.50, 47.40] }, peak: { base: 99, ext: [33, 49.50, 59.40] }, eb: { base: 35, ext: { off: [26.33, 52.67, 79], peak: [33, 66, 99] } } },
  vip:     { off: { base: 109, ext: [36.30, 54.50, 65.40] }, peak: { base: 129, ext: [43, 64.50, 77.40] }, eb: { base: 35, ext: { off: [36.33, 72.67, 109], peak: [43, 86, 129] } } },
};
const PAX_FIELD = 'fb11a6d3f6a3baaf248df77785de850e';
const BUF = 15, HOLD_SEC = 600, EB_START = 660;
/* cleaning time is only needed before the NEXT booking: a session may run right up to closing (11:15pm),
   so the last start is 8:15pm, not 8pm */
const CLOSE = 23 * 60 + 15;
const bufTo = (t) => (t >= CLOSE ? 0 : BUF);
/* guest messages (round2-tv-launcher docs/guest-messages.md): a celebration message written while booking */
/* the Make webhook: secret GM_HOOK_URL once the webhook is swapped for a new one (the old address below is public in git history) */
const GM_HOOK = 'https://hook.eu1.make.com/0vs25z4g3omjuvbdxwstdgofqhc3p2e4';
const FOLLOW_MS = 6 * 3600e3;   /* backstop only: SimplyBook tells the engine about changes straight away (/sb/notify) */
const GM_ROOM = { 5: 'vale', 7: 'kaeden', 8: 'scarlett', 9: 'kai', 10: 'bella', 12: 'atlas', 11: 'max' };
const GM_KINDS = ['birthday', 'anniversary', 'celebrate', 'note'];

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
const H = (html) => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const r2 = (x) => Math.round(x * 100) / 100;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function rpc(path, method, params, headers = {}) {
  const r = await fetch(SB + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }) });
  const j = await r.json();
  if (j.error) throw new Error(method + ': ' + (j.error.message || JSON.stringify(j.error)));
  return j.result;
}
async function pub(env) {
  const tok = await rpc('/login', 'getToken', [env.SB_COMPANY, env.SB_PUBLIC_KEY]);
  return (m, p) => rpc('', m, p, { 'X-Company-Login': env.SB_COMPANY, 'X-Token': tok });
}
async function admin(env) {
  const tok = await rpc('/login/', 'getUserToken', [env.SB_COMPANY, env.SB_USER, env.SB_PASS]);
  return (m, p) => rpc('/admin', m, p, { 'X-Company-Login': env.SB_COMPANY, 'X-User-Token': tok });
}

/* ---------- public holidays (Google calendar, cached a day) ---------- */
async function holidays() {
  const t = await (await fetch(ICS, { cf: { cacheTtl: 86400, cacheEverything: true } })).text();
  const out = new Set(EXTRA_PH);
  for (const ev of t.split('BEGIN:VEVENT').slice(1)) {
    const d = (ev.match(/DTSTART;VALUE=DATE:(\d{8})/) || [])[1];
    const desc = ((ev.match(/DESCRIPTION:(.*)/) || [])[1] || '');
    if (d && /^Public holiday/.test(desc)) out.add(d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6));
  }
  return out;
}

/* ---------- quote: which service, how much ---------- */
async function quote(env, b) {
  const unit = String(b.unit), room = ROOMS[unit];
  if (!room) throw new Error('Unknown room');
  if (!/^\d{4}-\d\d-\d\d$/.test(b.date || '')) throw new Error('Bad date');
  if (!/^\d\d:\d\d$/.test(b.time || '') || mins(b.time) % 15) throw new Error('Pick a time on the quarter hour');
  const hours = +b.hours; if (![3, 4, 5, 6].includes(hours)) throw new Error('Length must be 3 to 6 hours');
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  if (b.date < today) throw new Error('That date has passed');
  const ph = await holidays();
  const dow = new Date(b.date + 'T00:00:00Z').getUTCDay();          // 0 Sun … 6 Sat
  const peak = dow === 0 || dow === 5 || dow === 6 || ph.has(b.date);
  const ids = SVC[room[1]], P = PRICES[room[1]], dt = peak ? 'peak' : 'off';
  const start = mins(b.time), eb = start === EB_START;
  const extH = hours - 3;
  let base, ext, eventId;
  if (eb) { eventId = ids.eb; base = P.eb.base; ext = extH ? P.eb.ext[dt][extH - 1] : 0; }
  else { eventId = ids[dt]; base = P[dt].base; ext = extH ? P[dt].ext[extH - 1] : 0; }
  const end = start + hours * 60;
  return {
    unit: +unit, room: room[0], type: room[1], date: b.date, time: b.time, hours, peak, ph: ph.has(b.date), earlyBird: eb,
    eventId, checkEventId: peak ? ids.peak : ids.off,
    end: hhmm(end), endDate: end >= 1440 ? addDays(b.date, 1) : b.date,
    base, ext, total: r2(base + ext),
  };
}

/* free gaps for a room on a day = SimplyBook gaps of the day's service UNION the Early Bird service
   (the off-peak/peak services open at 11:15, Early Bird owns 11:00) */
async function gapsFor(p, date, unit, dt) {
  const ids = SVC[ROOMS[unit][1]];
  const rs = await Promise.all([ids[dt], ids.eb].map((sid) => p('getAvailableTimeIntervals', [date, date, sid, unit, 1])
    .then((r) => ((r && r[date] && r[date][unit]) || []).map((g) => { const f = mins(g.from); let t = mins(g.to); if (t <= f) t += 1440;
      /* online guests never get past closing, even if SimplyBook's hours run later (staff stretch late sessions by hand) */
      return [f, Math.min(t, CLOSE)]; }).filter(([f, t]) => t > f))));
  const all = rs.flat().sort((a, b) => a[0] - b[0]), out = [];
  for (const g of all) { const l = out[out.length - 1]; if (l && g[0] <= l[1]) l[1] = Math.max(l[1], g[1]); else out.push([g[0], g[1]]); }
  return out;
}

/* ---------- one day for the board: every room's free starts (15-min steps) with prices for 3–6 h ---------- */
async function dayBoard(env, date) {
  if (!/^\d{4}-\d\d-\d\d$/.test(date || '')) throw new Error('Bad date');
  const ph = await holidays();
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  const peak = dow === 0 || dow === 5 || dow === 6 || ph.has(date), dt = peak ? 'peak' : 'off';
  const now = new Date(Date.now() + 8 * 3600e3), today = now.toISOString().slice(0, 10), nowM = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (date < today) return { date, peak, ph: ph.has(date), rooms: {} };
  const p = await pub(env);
  const units = Object.keys(ROOMS);
  const gaps = await Promise.all(units.map((u) => gapsFor(p, date, u, dt).catch(() => null)));
  const holds = await book(env).list(date);
  const rooms = {};
  units.forEach((u, i) => {
    const P = PRICES[ROOMS[u][1]], starts = [];
    const mine = holds.filter((h) => h.unit === +u || h.unit === MIRROR[u]);
    (gaps[i] || []).forEach(([f, t]) => {
      for (let m = Math.ceil(f / 15) * 15; m + 180 + bufTo(t) <= t; m += 15) {
        if (date === today && m < nowM + 15) continue;
        let room = t - bufTo(t) - m;                               // minutes until the room is needed again
        mine.forEach((h) => { if (h.s < m + room + BUF && h.e + BUF > m) room = h.s >= m ? Math.min(room, h.s - BUF - m) : -1; });
        if (room < 180) continue;
        const eb = m === EB_START, maxH = Math.min(6, Math.floor(room / 60));
        const prices = {};
        for (let hrs = 3; hrs <= maxH; hrs++) prices[hrs] = eb ? r2(P.eb.base + (hrs > 3 ? P.eb.ext[dt][hrs - 4] : 0)) : r2(P[dt].base + (hrs > 3 ? P[dt].ext[hrs - 4] : 0));
        starts.push({ m, eb, maxH, prices });
      }
    });
    rooms[u] = starts;
  });
  return { date, peak, ph: ph.has(date), failed: gaps.every((g) => g === null), rooms };
}

/* ---------- HitPay ---------- */
async function hitpay(env, method, path, form) {
  const r = await fetch(env.HITPAY_API + path, {
    method, headers: { 'X-BUSINESS-API-KEY': env.HITPAY_KEY, 'X-Requested-With': 'XMLHttpRequest', ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('HitPay ' + r.status + ': ' + JSON.stringify(j).slice(0, 200));
  return j;
}
const cancelLink = (env, pr) => pr ? hitpay(env, 'DELETE', '/payment-requests/' + pr).catch(() => null) : null;
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* ---------- HoldBook: every unpaid hold lives here (one instance, strongly consistent) ---------- */
export class HoldBook extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS holds (ref TEXT PRIMARY KEY, date TEXT, unit INTEGER, s INTEGER, e INTEGER, exp INTEGER,
      pr TEXT, phone TEXT, email TEXT, status TEXT, data TEXT, created INTEGER)`);
  }
  rows(q, ...a) { return [...this.sql.exec(q, ...a)]; }
  /* guest messages front door (/gm): a short cache of each link, edit counts, and a per-visitor rate limit */
  gmInit() {
    if (this.gmReady) return; this.gmReady = true;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS gm (code TEXT PRIMARY KEY, link TEXT, err TEXT, exp INTEGER, edits INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS gmrate (who TEXT, t INTEGER)`);
  }
  gmRate(who, max) {
    this.gmInit(); const now = Date.now();
    this.sql.exec(`DELETE FROM gmrate WHERE t < ? AND who NOT LIKE 'sw:%'`, now - 600e3);
    const n = this.rows(`SELECT COUNT(*) AS n FROM gmrate WHERE who = ?`, who)[0].n;
    if (n >= max) return false;
    this.sql.exec(`INSERT INTO gmrate VALUES (?, ?)`, who, now); return true;
  }
  gmGet(code) { this.gmInit(); const r = this.rows(`SELECT * FROM gm WHERE code = ?`, code)[0]; return r ? { link: r.link ? JSON.parse(r.link) : null, err: r.err, exp: r.exp, edits: r.edits } : null; }
  gmPut(code, link, err, ttl) {
    this.gmInit(); const o = this.gmGet(code);
    this.sql.exec(`INSERT OR REPLACE INTO gm VALUES (?, ?, ?, ?, ?)`, code, link ? JSON.stringify(link) : null, err || null, Date.now() + ttl, o ? o.edits : 0);
  }
  gmEdit(code) { this.gmInit(); this.sql.exec(`UPDATE gm SET edits = edits + 1 WHERE code = ?`, code); }
  gmDrop(code) { this.gmInit(); this.sql.exec(`UPDATE gm SET exp = 0 WHERE code = ?`, code); }
  /* ---- message timer (replaces Make's [BACKEND] GUEST MESSAGE TIMER): each queued message (guest or Round2) with its
     show time; the alarm sends it to its TV ("push") a minute before. Rebuilt from Make's list whenever the engine reads
     it, and at least once a day. docs/guest-messages.md "Timer". */
  qInit() {
    if (this.qReady) return; this.qReady = true;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS gmq (code TEXT PRIMARY KEY, room TEXT, at INTEGER, endt INTEGER, pushed INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`);
  }
  qSet(code, room, at, endt) {
    this.qInit();
    this.sql.exec(`INSERT OR REPLACE INTO gmq VALUES (?, ?, ?, ?, 0)`, code, room || '', +at, +endt || +at + 3 * 3600e3);
    this.arm();
  }
  qDel(code) { this.qInit(); this.sql.exec(`DELETE FROM gmq WHERE code = ?`, code); }
  /* the whole queue from Make's list: approved, not on the TV yet, not finished */
  qSync(links) {
    this.qInit(); const now = Date.now();
    this.sql.exec(`DELETE FROM gmq`);
    for (const x of links || []) {
      const d = x.data || {};
      if (d.status === 'approved' && d.onTv !== 'yes' && +d.end > now && +d.at) this.sql.exec(`INSERT OR REPLACE INTO gmq VALUES (?, ?, ?, ?, 0)`, x.key, d.room || '', +d.at, +d.end);
    }
    this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('synced', ?)`, String(now));
    this.lSync(links);
    this.arm();
    return this.rows(`SELECT COUNT(*) AS n FROM gmq`)[0].n;
  }
  qList() { this.qInit(); return this.rows(`SELECT * FROM gmq ORDER BY at`); }
  /* ---- messages follow their booking (docs/guest-messages.md "Follows the booking"): every open guest link with its room
     and start, and the SimplyBook booking it belongs to (bid = the booking in that room starting at exactly that time).
     Every 10 min, and just before a message goes to its TV, the engine looks at SimplyBook: booking moved (time or room)
     → the link moves with it; booking cancelled → the link is cancelled (or, if the same guest has exactly one other
     upcoming booking, i.e. cancel-and-rebook, it moves there). Staff moving a link by hand unbinds it, so the engine
     never fights a manual change; it binds again only if a booking starts exactly at the new room + time. */
  lInit() {
    this.qInit(); if (this.lReady) return; this.lReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS gml (code TEXT PRIMARY KEY, room TEXT, start INTEGER, endt INTEGER, bid TEXT, cid TEXT)`);
    try { this.sql.exec(`ALTER TABLE gml ADD COLUMN cr INTEGER`); } catch (e) {}   /* when the link was made */
    if (!this.rows(`SELECT 1 FROM kv WHERE k = 'fv2'`).length) { this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('fv2', '1')`); this.fSoon(); }
  }
  /* run the follow check about a minute from now (new link learned) */
  fSoon() { this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('followed', ?)`, String(Date.now() - FOLLOW_MS + 60e3)); }
  lSet(code, room, start, endt, bid) { this.lInit(); if (!this.rows(`SELECT 1 FROM gml WHERE code = ?`, code).length) this.sql.exec(`INSERT INTO gml (code, room, start, endt, bid, cid, cr) VALUES (?, ?, ?, ?, ?, NULL, ?)`, code, room || '', +start, +endt, bid ? String(bid) : null, Date.now()); this.arm(); }
  lSync(links) {
    this.lInit(); const now = Date.now(), keep = new Set();
    for (const x of links || []) {
      const d = x.data || {};
      if (!x.key || /^R2/.test(x.key) || d.status === 'cancelled' || !(+d.end > now) || !(+d.start)) continue;
      keep.add(x.key);
      const o = this.rows(`SELECT * FROM gml WHERE code = ?`, x.key)[0];
      if (!o) { this.sql.exec(`INSERT INTO gml (code, room, start, endt, bid, cid, cr) VALUES (?, ?, ?, ?, NULL, NULL, ?)`, x.key, d.room || '', +d.start, +d.end, +d.created || Date.now()); this.fSoon(); }
      else if (o.room !== (d.room || '') || +o.start !== +d.start) this.sql.exec(`UPDATE gml SET room = ?, start = ?, endt = ?, bid = NULL, cid = NULL WHERE code = ?`, d.room || '', +d.start, +d.end, x.key);
    }
    for (const r of this.rows(`SELECT code FROM gml`)) if (!keep.has(r.code)) this.sql.exec(`DELETE FROM gml WHERE code = ?`, r.code);
  }
  lList() { this.lInit(); return this.rows(`SELECT * FROM gml ORDER BY start`); }
  fLog(e) {
    this.lInit(); const r = this.rows(`SELECT v FROM kv WHERE k = 'follow'`)[0], l = r ? JSON.parse(r.v) : [];
    l.unshift(Object.assign({ t: Date.now() }, e)); this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('follow', ?)`, JSON.stringify(l.slice(0, 30)));
  }
  fStat() { this.lInit(); this.arm(); const now = Date.now(), L = this.rows(`SELECT bid FROM gml WHERE endt > ?`, now); return { links: L.length, bound: L.filter((x) => x.bid).length, last: +((this.rows(`SELECT v FROM kv WHERE k = 'followed'`)[0] || {}).v || 0), log: this.fLogGet().slice(0, 5).map((x) => ({ t: x.t, a: x.a, room: x.room, why: x.why })) }; }
  fLogGet() { this.lInit(); const r = this.rows(`SELECT v FROM kv WHERE k = 'follow'`)[0]; return r ? JSON.parse(r.v) : []; }
  async follow(dry) {
    this.lInit(); const env = this.env, now = Date.now();
    if (!dry) this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('followed', ?)`, String(now));
    this.sql.exec(`DELETE FROM gml WHERE endt < ?`, now);
    const L = this.rows(`SELECT * FROM gml WHERE start > ? ORDER BY start`, now - 30 * 60e3);
    if (!L.length || !env.SB_USER || !env.GM_STAFF) return { links: 0 };
    const a = await admin(env), UNIT = {}; for (const u in GM_ROOM) UNIT[GM_ROOM[u]] = +u;
    const sgMs = (t) => { const m = String(t || '').match(/(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - 8 * 3600e3 : 0; };
    const day = new Date(now + 8 * 3600e3).toISOString().slice(0, 10), rng = { date_from: addDays(day, -1), date_to: addDays(day, 120) };
    let raw0 = null;
    const get = async (type) => Object.values((await a('getBookings', [Object.assign({ booking_type: type }, rng)])) || {})
      .map((b) => { if (!raw0) raw0 = b; return b; }).map((b) => ({ id: String(b.id), unit: +b.unit_id, start: sgMs(b.start_date || b.start_date_time), cid: String(b.client_id || ''), made: sgMs(b.record_date) })).filter((b) => b.id && b.start);
    const live = await get('non_cancelled');
    const seen = { n: live.length, fields: raw0 ? Object.keys(raw0).slice(0, 40) : [], sample: raw0 ? { start_date: raw0.start_date, unit_id: raw0.unit_id } : null };
    if (!live.length) return { links: L.length, seen, error: 'SimplyBook gave no bookings – nothing changed' };
    let gone = null; const acts = [], bound = new Set(L.map((l) => l.bid).filter(Boolean));
    for (const l of L) {
      if (!l.bid) {
        const m = live.filter((b) => b.unit === UNIT[l.room] && b.start === +l.start);
        /* a different guest took the same room + time: the link was made for a booking that is now cancelled (made before the
           link), while the live one was made after the link → the message isn't theirs, cancel it instead of tying it */
        if (m.length === 1 && l.cr && m[0].made > +l.cr) {
          gone = gone || await get('cancelled').catch(() => []);
          if (gone.some((x) => x.unit === UNIT[l.room] && x.start === +l.start && x.made && x.made <= +l.cr)) { acts.push({ code: l.code, a: 'cancel', why: 'its booking was cancelled; another guest has the slot now', room: l.room, from: +l.start }); continue; }
        }
        if (m.length === 1) { acts.push({ code: l.code, a: 'bind', bid: m[0].id }); if (!dry) this.sql.exec(`UPDATE gml SET bid = ?, cid = ? WHERE code = ?`, m[0].id, m[0].cid, l.code); bound.add(m[0].id); }
        else if (!m.length) {   /* its booking was cancelled before the engine could tie them together */
          gone = gone || await get('cancelled').catch(() => []);
          if (gone.some((x) => x.unit === UNIT[l.room] && x.start === +l.start)) acts.push({ code: l.code, a: 'cancel', why: 'booking cancelled', room: l.room, from: +l.start });
        }
        continue;
      }
      let b = live.find((x) => x.id === l.bid), how = 'move';
      if (!b) {
        gone = gone || await get('cancelled').catch(() => []);
        if (!gone.some((x) => x.id === l.bid)) { acts.push({ code: l.code, a: 'lost', bid: l.bid }); continue; }   // not in SimplyBook's lists: leave it
        const again = l.cid ? live.filter((x) => x.cid === l.cid && x.start > now && !bound.has(x.id) && GM_ROOM[x.unit]) : [];
        if (again.length === 1) { b = again[0]; how = 'rebooked'; } else { acts.push({ code: l.code, a: 'cancel', bid: l.bid, room: l.room, from: +l.start }); continue; }
      }
      if (!GM_ROOM[b.unit]) { acts.push({ code: l.code, a: 'skip', why: 'room ' + b.unit }); continue; }
      if (b.unit !== UNIT[l.room] || b.start !== +l.start || b.id !== l.bid) acts.push({ code: l.code, a: how, bid: b.id, cid: b.cid, room: GM_ROOM[b.unit], start: b.start, fromRoom: l.room, from: +l.start });
    }
    /* safety: SimplyBook hiccups shouldn't wipe the day's messages */
    if (acts.filter((x) => x.a === 'cancel').length > 3) { const e = { a: 'held', why: 'more than 3 cancels at once – nothing cancelled, check by hand' }; if (!dry) this.fLog(e); return { links: L.length, acts, held: true }; }
    if (dry) return { links: L.length, acts, seen };
    const call = (body) => fetch(env.GM_HOOK_URL || GM_HOOK, { method: 'POST', body: new URLSearchParams(body) }).then((r) => r.text()).catch((e) => 'error ' + e);
    let changed = false;
    for (const x of acts) {
      if (x.a === 'move' || x.a === 'rebooked') {
        this.sql.exec(`UPDATE gml SET room = ?, start = ?, endt = ?, bid = ?, cid = ? WHERE code = ?`, x.room, x.start, x.start + 3 * 3600e3, x.bid, x.cid, x.code);
        const r = await call({ action: 'move', staff: env.GM_STAFF, code: x.code, start: x.start, room: x.room });
        this.fLog({ code: x.code, a: x.a, room: x.room, start: x.start, fromRoom: x.fromRoom, from: x.from, r: String(r).slice(0, 60) }); changed = true;
      } else if (x.a === 'cancel') {
        this.sql.exec(`DELETE FROM gml WHERE code = ?`, x.code); this.sql.exec(`DELETE FROM gmq WHERE code = ?`, x.code);
        const r = await call({ action: 'cancel', staff: env.GM_STAFF, code: x.code });
        this.fLog({ code: x.code, a: 'cancel', room: x.room, from: x.from, r: String(r).slice(0, 60) }); changed = true;
      }
    }
    if (changed) {   /* the timer's queue and the staff list follow */
      this.gmDrop('__LIST__');
      try { const j = JSON.parse(await call({ action: 'list', staff: env.GM_STAFF })); if (j.links) this.qSync(j.links); } catch (e) {}
    }
    return { links: L.length, acts };
  }
  /* booking switch (control centre › Systems): 'new' = this booking page, 'simplybook' = safe mode, guests book on SimplyBook */
  getMode() { this.qInit(); const r = this.rows(`SELECT v FROM kv WHERE k = 'mode'`)[0]; return Object.assign({ booking: 'new' }, r ? JSON.parse(r.v) : {}); }
  setMode(m) { this.qInit(); this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('mode', ?)`, JSON.stringify(m)); return m; }
  /* wrong-password lock for the booking switch: 5 wrong tries in 30 min → locked for 30 min */
  lockOk(who) { this.gmInit(); this.sql.exec(`DELETE FROM gmrate WHERE t < ?`, Date.now() - 1800e3); return this.rows(`SELECT COUNT(*) AS n FROM gmrate WHERE who = ?`, who)[0].n < 5; }
  lockFail(who) { this.gmInit(); this.sql.exec(`INSERT INTO gmrate VALUES (?, ?)`, who, Date.now()); }
  /* food menu orders waiting for payment (status pending → sending → paid) */
  mInit() { if (this.mReady) return; this.mReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS menu (ref TEXT PRIMARY KEY, data TEXT, status TEXT, t INTEGER)`); }
  menuPut(ref, rec) { this.mInit(); this.sql.exec(`INSERT OR REPLACE INTO menu VALUES (?, ?, 'pending', ?)`, ref, JSON.stringify(rec), Date.now()); this.sql.exec(`DELETE FROM menu WHERE t < ?`, Date.now() - 30 * 86400e3); }
  menuGet(ref) { this.mInit(); const r = this.rows(`SELECT * FROM menu WHERE ref = ?`, ref)[0]; return r ? { ...JSON.parse(r.data), status: r.status } : null; }
  menuClaim(ref) { this.mInit(); const r = this.rows(`SELECT status FROM menu WHERE ref = ?`, ref)[0]; if (!r || r.status !== 'pending') return false; this.sql.exec(`UPDATE menu SET status = 'paid' WHERE ref = ?`, ref); return true; }
  menuSet(ref, st) { this.mInit(); this.sql.exec(`UPDATE menu SET status = ? WHERE ref = ?`, st, ref); }
  /* any pending hold overlapping s–e (plus cleaning buffer) on these rooms? */
  clash(date, units, s, e, ignore = '') {
    const now = Date.now();
    return this.rows(`SELECT ref, unit, s, e FROM holds WHERE date = ? AND status = 'pending' AND exp > ? AND ref != ?`, date, now, ignore)
      .some((h) => units.includes(h.unit) && s < h.e + BUF && h.s < e + BUF);
  }
  /* atomic: drop this guest's earlier unpaid holds, then hold the slot if nobody else has it */
  hold(h) {
    const released = [];
    for (const o of this.rows(`SELECT ref, pr FROM holds WHERE status = 'pending' AND (phone = ? OR email = ?)`, h.phone, h.email)) {
      this.sql.exec(`UPDATE holds SET status = 'released' WHERE ref = ?`, o.ref); released.push(o.pr);
    }
    if (this.clash(h.date, h.units, h.s, h.e)) return { ok: false, released };
    this.sql.exec(`INSERT INTO holds VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, h.ref, h.date, h.unit, h.s, h.e, Date.now() + HOLD_SEC * 1000,
      '', h.phone, h.email, 'pending', JSON.stringify(h.data), Date.now());
    this.arm();
    return { ok: true, released };
  }
  list(date) { return this.rows(`SELECT unit, s, e FROM holds WHERE date = ? AND status = 'pending' AND exp > ?`, date, Date.now()); }
  setPr(ref, pr) { this.sql.exec(`UPDATE holds SET pr = ? WHERE ref = ?`, pr, ref); }
  get(ref) { const r = this.rows(`SELECT * FROM holds WHERE ref = ?`, ref)[0]; return r ? { ...r, data: JSON.parse(r.data || '{}') } : null; }
  /* guest came back without paying → free the slot now */
  release(ref) {
    const r = this.rows(`SELECT pr FROM holds WHERE ref = ? AND status = 'pending'`, ref)[0];
    if (!r) return null;
    this.sql.exec(`UPDATE holds SET status = 'released' WHERE ref = ?`, ref);
    return { pr: r.pr };
  }
  /* payment confirmed → only the FIRST caller (webhook or redirect) gets true, so we never book twice */
  claim(ref) {
    const r = this.rows(`SELECT status FROM holds WHERE ref = ?`, ref)[0];
    if (!r || r.status === 'paid' || r.status === 'booking' || r.status === 'cancelled') return false;
    this.sql.exec(`UPDATE holds SET status = 'booking' WHERE ref = ?`, ref);
    return true;
  }
  /* "Find my booking": paid, not yet past, matching email + last 8 digits of the mobile */
  find(email, p8, today) { return this.rows(`SELECT ref, date, CAST(json_extract(data, '$.done.bookingId') AS TEXT) AS bid FROM holds WHERE status = 'paid' AND email = ? AND phone = ? AND date >= ? ORDER BY date, s LIMIT 6`, email, p8, today); }
  /* cancelled in SimplyBook → no longer shown in "View your booking", its /done and /b pages say so */
  cancelBid(bid) { this.sql.exec(`UPDATE holds SET status = 'cancelled' WHERE status = 'paid' AND CAST(json_extract(data, '$.done.bookingId') AS TEXT) = ?`, String(bid)); }
  /* SimplyBook told us a booking was made, changed or cancelled (/sb/notify): act now instead of waiting for a check */
  async onSb(bid, type) {
    if (type === 'cancel') this.cancelBid(bid);
    this.lInit();
    if (!this.rows(`SELECT 1 FROM gml WHERE endt > ?`, Date.now()).length) return { links: 0 };
    return this.follow(false).catch((e) => this.fLog({ a: 'error', why: String(e.message || e).slice(0, 80) }));
  }
  /* the guest ticked the terms + "non-cancellable, non-refundable" boxes on the hold step */
  agree(ref) { const h = this.get(ref); if (!h || h.status !== 'pending' || h.data.agreed) return false; h.data.agreed = Date.now(); this.sql.exec(`UPDATE holds SET data = ? WHERE ref = ?`, JSON.stringify(h.data), ref); return true; }
  /* the link in SimplyBook's confirmation email: …/b/<SimplyBook booking code> */
  byCode(code) { return this.rows(`SELECT ref FROM holds WHERE status = 'paid' AND json_extract(data, '$.done.code') = ? LIMIT 1`, code)[0] || null; }
  setTv(ref, tv) { const h = this.get(ref); if (!h || !h.data.done) return; h.data.done.tv = tv; this.sql.exec(`UPDATE holds SET data = ? WHERE ref = ?`, JSON.stringify(h.data), ref); }
  done(ref, result) {
    const h = this.get(ref); if (!h) return;
    h.data.done = result;
    this.sql.exec(`UPDATE holds SET status = 'paid', data = ? WHERE ref = ?`, JSON.stringify(h.data), ref);
  }
  arm() {
    this.qInit();
    const n = this.rows(`SELECT MIN(exp) AS t FROM holds WHERE status = 'pending'`)[0];
    const q = this.rows(`SELECT MIN(at) AS t FROM gmq WHERE pushed = 0`)[0];
    const syn = +((this.rows(`SELECT v FROM kv WHERE k = 'synced'`)[0] || {}).v || 0);
    this.lInit();
    const fl = this.rows(`SELECT COUNT(*) AS n FROM gml WHERE endt > ?`, Date.now())[0].n, fol = +((this.rows(`SELECT v FROM kv WHERE k = 'followed'`)[0] || {}).v || 0);
    const lsy = this.rows(`SELECT 1 FROM kv WHERE k = 'lsynced'`).length;
    const ts = [n && n.t ? n.t + 1000 : 0, q && q.t ? q.t - 60e3 : 0, syn ? syn + 86400e3 : 0, fl ? fol + FOLLOW_MS : 0, lsy ? 0 : Date.now() + 2000].filter((t) => t > 0);
    if (ts.length) this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, Math.min(...ts)));
  }
  /* timer ran out → release the hold and kill its HitPay link */
  async alarm() {
    const due = this.rows(`SELECT ref, pr, data FROM holds WHERE status = 'pending' AND exp <= ?`, Date.now());
    for (const d of due) { this.sql.exec(`UPDATE holds SET status = 'released' WHERE ref = ?`, d.ref); let pay = ''; try { pay = JSON.parse(d.data || '{}').pay; } catch (e) {} await cancelLink(envFor(this.env, pay), d.pr); }
    this.sql.exec(`DELETE FROM holds WHERE status = 'released' AND created < ?`, Date.now() - 7 * 86400e3);
    try { await this.qRun(); } catch (e) {}
    this.arm();
  }
  async qRun() {
    this.qInit(); const now = Date.now(), env = this.env;
    if (!env.GM_STAFF) return;
    const call = (body) => fetch(env.GM_HOOK_URL || GM_HOOK, { method: 'POST', body: new URLSearchParams(body) }).then((r) => r.text()).catch(() => '');
    /* once a day: rebuild the queue from Make (anything queued another way still goes out) */
    const syn = +((this.rows(`SELECT v FROM kv WHERE k = 'synced'`)[0] || {}).v || 0);
    const lsy = this.rows(`SELECT 1 FROM kv WHERE k = 'lsynced'`).length;   /* first run of "follows the booking": learn every open link once */
    if (!lsy) this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('lsynced', '1')`);   // only ever once, even if Make doesn't answer
    if (now - syn > 86400e3 || !lsy) { try { const j = JSON.parse(await call({ action: 'list', staff: env.GM_STAFF })); if (j.links) this.qSync(j.links); } catch (e) { this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('synced', ?)`, String(now - 86400e3 + 3600e3)); } }
    this.sql.exec(`DELETE FROM gmq WHERE endt < ?`, now);
    /* messages follow their booking: every 10 min, and again right before one goes to its TV */
    this.lInit();
    const fol = +((this.rows(`SELECT v FROM kv WHERE k = 'followed'`)[0] || {}).v || 0);
    const soon = this.rows(`SELECT 1 FROM gmq WHERE pushed = 0 AND at - 120000 <= ?`, now).length;
    if (now - fol >= FOLLOW_MS - 5000 || (soon && now - fol > 60e3)) await this.follow(false).catch((e) => this.fLog({ a: 'error', why: String(e.message || e).slice(0, 80) }));
    for (const m of this.rows(`SELECT * FROM gmq WHERE pushed = 0 AND at - 60000 <= ? ORDER BY at`, now)) {
      /* a Round2 message (e.g. "That's a wrap") never pushes a guest's message off the TV before they've pressed OK:
         it waits (checked every 2 min) until the guest message is acknowledged, or until its own cut-off drops it */
      if (/^R2/.test(m.code) && env.TV_KEY) {
        const base = 'https://round2-tv-default-rtdb.asia-southeast1.firebasedatabase.app/r2/' + env.TV_KEY + '/' + m.room;
        const [c, k] = await Promise.all([fetch(base + '/msg.json').then((r) => r.json()).catch(() => null), fetch(base + '/msgAck.json').then((r) => r.json()).catch(() => null)]);
        if (c && /^g/.test(String(c.id || '')) && c.ack !== false && +c.until > now && +c.at <= now + 60e3 && !(k && k.id === c.id)) {
          this.sql.exec(`UPDATE gmq SET at = ? WHERE code = ?`, now + 120e3, m.code);
          this.held = this.held || new Set(); if (!this.held.has(m.code)) { this.held.add(m.code); this.fLog({ a: 'held', why: 'guest message not seen yet', room: m.room }); }
          continue;
        }
      }
      const t = await call({ action: 'push', staff: env.GM_STAFF, code: m.code });
      this.sql.exec(`UPDATE gmq SET pushed = 1 WHERE code = ?`, m.code);
      /* the TV keeps one message: a later one for the same room may have been put back in the queue by this push,
         so let those go again at their own time (pushing one that's already on the TV changes nothing) */
      this.sql.exec(`UPDATE gmq SET pushed = 0 WHERE room = ? AND at > ? AND code != ?`, m.room, m.at, m.code);
      this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('last', ?)`, JSON.stringify({ code: m.code, t: now, r: String(t).slice(0, 80) }));
    }
    this.sql.exec(`DELETE FROM gmq WHERE pushed = 1 AND at < ?`, now - 3600e3);
  }
}
const book = (env) => env.HOLDBOOK.get(env.HOLDBOOK.idFromName('main'));

/* ---------- is the slot free? (SimplyBook gaps + unpaid holds) ---------- */
async function isFree(env, q, ignoreRef) {
  const p = await pub(env);
  const gaps = await gapsFor(p, q.date, q.unit, q.peak ? 'peak' : 'off');
  const s = mins(q.time), e = s + q.hours * 60;
  if (!gaps.some(([f, t]) => s >= f && e + bufTo(t) <= t)) return false;
  return !(await book(env).clash(q.date, [q.unit, MIRROR[q.unit]].filter(Boolean), s, e, ignoreRef || ''));
}

/* ---------- checkout: hold the slot (atomic), then make the HitPay payment ---------- */
const RET_OK = /^https:\/\/([a-z0-9-]+\.)*(round2\.sg|github\.io|githack\.com|workers\.dev)\//;
async function checkout(env0, b, origin) {
  const env = envFor(env0, isTestRun(env0, b.test) ? 'test' : 'live'), pay = payOf(env);   /* test tools → sandbox, guests → live */
  if ((await book(env).getMode()).booking === 'simplybook') throw new Error('Online booking is on our SimplyBook page right now: www.round2.sg/booknow');
  const q = await quote(env, b);
  const ret = RET_OK.test(String(b.ret || '')) ? String(b.ret).split(/[?#]/)[0] : '';
  let name = String(b.name || '').trim().slice(0, 80), email = String(b.email || '').trim().toLowerCase().slice(0, 120), phone = String(b.phone || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 16);
  const pax = Math.max(1, Math.min(MAX_PAX[q.unit] || 3, +b.pax || 1));
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Please fill in name, email and phone');
  /* mobile with country code (+65 by default on the page; overseas guests change it). Staff may WhatsApp this number. */
  if (/^\d{8}$/.test(phone)) phone = '+65' + phone;
  if (!/^\+\d{7,15}$/.test(phone) || (phone.startsWith('+65') && !/^\+65[3689]\d{7}$/.test(phone))) throw new Error('Please check your mobile number and country code');
  /* optional celebration message for the room TV, shown 0–60 min after the start */
  let msg = null;
  if (b.msg && GM_KINDS.includes(b.msg.kind)) {
    const t = (x, n) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, n);
    msg = { kind: b.msg.kind, to: t(b.msg.to, 40), from: t(b.msg.from, 40), title: t(b.msg.title, 60), text: String(b.msg.text || '').trim().slice(0, 600),
      after: Math.max(0, Math.min(60, Math.round((+b.msg.after || 0) / 15) * 15)) };
    if (!msg.title || !msg.text) throw new Error('Add a headline and a message for the TV, or untick the celebration');
  }
  const p = await pub(env);
  const s = mins(q.time), e = s + q.hours * 60;
  const gaps = await gapsFor(p, q.date, q.unit, q.peak ? 'peak' : 'off');
  if (!gaps.some(([f, t]) => s >= f && e + bufTo(t) <= t)) throw new Error('Sorry, that time was just taken – please pick another');
  const ref = 'R2B' + crypto.randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase();
  const hb = book(env);
  const h = await hb.hold({ ref, date: q.date, unit: q.unit, units: [q.unit, MIRROR[q.unit]].filter(Boolean), s, e, phone: phone.slice(-8), email, data: { q, name, email, phone, pax, ret, msg, pay } });
  for (const old of h.released || []) await cancelAny(env, old);            // their earlier unpaid link stops working
  if (!h.ok) throw new Error('Sorry, someone is paying for that time right now – please pick another');
  const when = new Date(q.date + 'T00:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  let pr;
  try {
    pr = await hitpay(env, 'POST', '/payment-requests', {
      amount: q.total.toFixed(2), currency: 'SGD', name, email, phone,
      purpose: (pay === 'test' ? 'TEST · ' : '') + `Round2 ${q.room} · ${when} ${q.time}–${q.end} (${q.hours}h)`,
      reference_number: ref, redirect_url: `${PUBLIC_BOOK}/done?ref=${ref}`, webhook: `${origin}/booking/hitpay`,
    });
  } catch (err) { await hb.release(ref); throw err; }
  await hb.setPr(ref, pr.id);
  return { ref, url: pr.url, total: q.total, room: q.room, date: q.date, time: q.time, end: q.end, holdUntil: Date.now() + HOLD_SEC * 1000, test: pay === 'test' || undefined };
}

/* ---------- after payment: put the booking into SimplyBook (exactly once) ---------- */
/* staff alerts (Telegram): secret STAFF_CHAT = the chat id of a staff-only group with the Round2 kitchen bot in it */
async function staffAlert(env, text) {
  if (!env.TG_BOT_TOKEN || !env.STAFF_CHAT) return;
  await fetch('https://api.telegram.org/bot' + env.TG_BOT_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.STAFF_CHAT, text }) });
}
async function finalize(env, ref, source) {
  const hb = book(env);
  let h = await hb.get(ref); if (!h) return { ok: false, err: 'unknown ref' };
  if (!(await hb.claim(ref))) { h = await hb.get(ref); return { ok: true, already: true, h: h.data }; }
  const d = h.data, q = d.q;
  let result;
  try {
    if (h.status === 'released' && !(await isFree(env, q, ref))) throw new Error('slot was released and re-taken – refund needed');
    if (env.DRY_RUN === '1') {
      result = { dryRun: true, would: ['book', q.eventId, q.unit, 'client(' + d.email + ')', q.date, q.time + ':00', '(end + 15 min cleaning)', 0, { [PAX_FIELD]: String(d.pax) }] };
    } else {
      const a = await admin(env);
      /* every booking gets its OWN contact with exactly the name typed on the page – guests use fun names or a
         different name each time, and staff greet them by it at the door. Never reuse an old contact. */
      /* ONE email per guest: SimplyBook emails once when the booking is made and again when it's confirmed. So the contact is
         made without the email, booked (that email goes nowhere), given the email, then confirmed → only the confirmation
         email reaches the guest. If SimplyBook won't take a contact without email, fall back to the normal way (2 emails). */
      let cid = await a('addClient', [{ name: d.name, phone: d.phone }]).catch(() => null), late = !!cid;
      if (!cid) cid = await a('addClient', [{ name: d.name, email: d.email, phone: d.phone }]).catch(() => null);
      if (!cid) {                            // only if SimplyBook refuses a second contact for this email
        const found = Object.values((await a('getClientList', [d.email, 1]).catch(() => null)) || {});
        if (!found[0]) throw new Error('could not create the SimplyBook contact');
        cid = found[0].id;                   // the note below still carries the typed name
      }
      /* SimplyBook's own bookings end 15 min after the session (its "buffer after" = cleaning time, e.g. 11:00–14:15 for 3 h),
         so ours do too – the calendar then blocks the cleaning time and nobody can book into it */
      const eB = mins(q.time) + q.hours * 60 + BUF, endDate = eB >= 1440 ? addDays(q.date, 1) : q.date;
      const bk = await a('book', [q.eventId, q.unit, cid, q.date, q.time + ':00', endDate, hhmm(eB) + ':00', 0, { [PAX_FIELD]: String(d.pax) }]);
      const b0 = bk && bk.bookings && bk.bookings[0];
      result = { bookingId: b0 && b0.id, code: b0 && b0.code };
      if (late) result.email = await a('editClient', [cid, { name: d.name, email: d.email, phone: d.phone }]).then(() => 'ok').catch((e) => 'no: ' + String(e.message || e).slice(0, 60));
      /* SimplyBook's own guest bookings are confirmed; ours come in unconfirmed. Confirming sends the guest's one email. */
      if (b0 && b0.id) result.confirm = await a('confirmBooking', [b0.id]).then(() => 'ok').catch((e) => 'no: ' + String(e.message || e).slice(0, 60));
      /* the details SimplyBook doesn't show: the name typed on the page (SimplyBook keeps an existing contact's name),
         what was really paid (SimplyBook shows the base service price) */
      const note = (d.pay === 'test' ? '*** TEST BOOKING (HitPay sandbox, nobody paid) – CANCEL IT ***\n' : '') + `Online booking (round2.sg) · paid $${q.total.toFixed(2)} via HitPay · ref ${ref}\nBooked as: ${d.name} · ${d.phone} · ${d.email} · ${d.pax} guests` +
        `\nGuest session ${q.time}–${q.end} (the SimplyBook end, ${hhmm(eB)}, includes 15 min cleaning)` +
        (q.hours > 3 ? `\nIncludes +${q.hours - 3}h extension (${q.time}–${q.end})` : '') + (d.msg ? `\nTV message: ${d.msg.kind}, ${d.msg.after} min after start` : '') +
        (d.agreed ? `\nAgreed to T&C, privacy policy and "non-cancellable, non-refundable" at ${new Date(d.agreed + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')}` : '');
      if (b0 && b0.id) result.comment = await a('setBookingComment', [b0.id, note]).then(() => 'saved').catch((e) => 'not saved: ' + String(e.message || e).slice(0, 80));
    }
    if (d.msg && !result.dryRun) result.tv = await tvMessage(env, d, q, ref, result.bookingId).catch((e) => ({ problem: String(e.message || e).slice(0, 120) }));
  } catch (err) { result = { problem: 'paid – booking not created: ' + String(err.message || err).slice(0, 150) }; }
  result.at = Date.now(); result.source = source;
  /* paid but not in SimplyBook (slot gone, SimplyBook down…): tell staff straight away so they can call / refund */
  if (result.problem) await staffAlert(env, `⚠️ ONLINE BOOKING NEEDS A HUMAN\n${result.problem}\n\nRef ${ref}\n${q.room} · ${q.date} ${q.time}–${q.end} (${q.hours}h) · paid $${q.total.toFixed(2)}\n${d.name} · ${d.phone} · ${d.email}`).catch(() => null);
  else if (!result.dryRun) await staffAlert(env, `🎮 NEW ONLINE BOOKING\n${q.unit === 11 ? 'Maximillion' : q.room} · ${q.date} ${q.time}–${q.end} (${q.hours}h)\n${d.name} · ${d.pax} guests · ${d.phone}\nPaid $${q.total.toFixed(2)}${d.pay === 'test' ? ' (TEST – sandbox, cancel it)' : ''} · ref ${ref}${d.msg ? '\nTV message: ' + d.msg.kind : ''}`).catch(() => null);
  await hb.done(ref, result);
  if (!result.problem && !result.dryRun) await paidStat(q, d).catch(() => null);
  d.done = result;
  return result.problem ? { ok: false, err: result.problem, h: d } : { ok: true, h: d };
}

/* website stats (Firebase /web, round2-tv-launcher docs/site-stats.md): +1 paid booking for today, per room, per length.
   Numbers only. The control centre's Website tab shows them next to the booking page's own counters. */
async function paidStat(q, d) {
  const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10), inc = { '.sv': { increment: 1 } };
  const body = { board_paid: inc, ['board_paid_' + GM_ROOM[q.unit].replace('max', 'maximillion')]: inc, ['board_paid_len_' + q.hours]: inc };
  await fetch('https://round2-tv-default-rtdb.asia-southeast1.firebasedatabase.app/web/days/' + day + '.json', { method: 'PATCH', body: JSON.stringify(body) });
}

/* celebration message → the guest messages system (Make "GUEST MESSAGE LINKS"): a link for this booking, then the
   message on it. It then shows in the control centre's Guest messages like any other (staff can move or cancel it),
   and the guest can still change it at cue.round2.sg/CODE until it pops up. */
async function tvMessage(env, d, q, ref, bid) {
  if (!env.GM_STAFF) return { problem: 'no staff code' };
  const call = async (body) => {
    const r = await fetch(env.GM_HOOK_URL || GM_HOOK, { method: 'POST', body: new URLSearchParams(body) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('Make: ' + t.slice(0, 60)); }
    if (j.error) throw new Error(j.error); return j;
  };
  const start = Date.UTC(+q.date.slice(0, 4), +q.date.slice(5, 7) - 1, +q.date.slice(8, 10), +q.time.slice(0, 2), +q.time.slice(3, 5)) - 8 * 3600e3;
  const link = await call({ action: 'create', staff: env.GM_STAFF, room: GM_ROOM[q.unit], start, label: 'Online · ' + d.name.slice(0, 30) });
  const m = d.msg;
  await call({ action: 'submit', code: link.code, kind: m.kind, to: m.to, from: m.from, title: m.title, text: m.text, at: start + m.after * 60e3 });
  await book(env).qSet(link.code, GM_ROOM[q.unit], start + m.after * 60e3, start + q.hours * 3600e3).catch(() => null);
  await book(env).lSet(link.code, GM_ROOM[q.unit], start, start + 3 * 3600e3, bid).catch(() => null);
  await book(env).gmDrop('__LIST__').catch(() => null);
  return { code: link.code, at: start + m.after * 60e3 };
}

/* ---------- guest messages front door: POST /gm (same form fields as the Make webhook) ----------
   The cue page (round2-tv-launcher manager/msg/), the staff page and the control centre call this instead of Make, so the
   Make webhook address isn't in any public page. It only passes on what Make would accept: real codes, real changes,
   the right staff code; it caches each link for a minute (page reloads cost nothing), caps guest edits, and limits how
   often one visitor can call. Saves Make operations (10,000 a month shared) – docs/guest-messages.md "Front door". */
const GM_GUEST_EDITS = 8, GM_STAFF_ACTIONS = ['create', 'list', 'move', 'now', 'cancel', 'r2', 'push'];
async function gmFwd(env, fields) {
  const r = await fetch(env.GM_HOOK_URL || GM_HOOK, { method: 'POST', body: new URLSearchParams(fields) });
  return r.text();
}
const gmJ = (o) => J(o);
/* Make's full list (staff code), kept for 15 min and used to rebuild the timer's queue */
async function gmList(env, hb) {
  const raw = await gmFwd(env, { action: 'list', staff: env.GM_STAFF });
  if (raw && raw.trim().charAt(0) === '{' && !/"error"/.test(raw.slice(0, 40))) {
    await hb.gmPut('__LIST__', { raw }, null, 900e3);
    try { await hb.qSync(JSON.parse(raw).links || []); } catch (e) {}
  }
  return raw;
}
async function gm(env, req) {
  const f = Object.fromEntries(new URLSearchParams(await req.text()));
  const act = String(f.action || ''), who = req.headers.get('cf-connecting-ip') || 'x', hb = book(env);
  const guest = act === 'get' || act === 'submit';
  if (act === 'queue') {   /* staff: what the timer will send, and the last send */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (f.sync) await gmList(env, hb);
    return gmJ({ ok: true, queue: await hb.qList(), follow: await hb.lList(), followLog: await hb.fLogGet(), now: Date.now() });
  }
  if (act === 'follow') {   /* staff: run the "messages follow their booking" check now (dry=1: only show what it would do) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (!f.dry) await gmList(env, hb).catch(() => null);
    return gmJ(Object.assign({ ok: true }, await hb.follow(!!f.dry)));
  }
  if (!guest && !GM_STAFF_ACTIONS.includes(act)) return gmJ({ error: 'Unknown action.' });
  if (!(await hb.gmRate(who + (guest ? ':g' : ':s'), guest ? 30 : 200))) return gmJ({ error: 'Too many tries. Wait a few minutes and try again.' });
  const code = String(f.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /* staff: check the staff code here, so wrong guesses never reach Make; then pass straight through */
  if (!guest) {
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    /* list: the staff page and the control centre ask for it every minute or so. Answer from memory (15 min), and
       ask Make again only after something changed through here. Saves thousands of Make operations a month. */
    if (act === 'list') {
      const L = await hb.gmGet('__LIST__');
      if (L && L.exp > Date.now() && L.link && L.link.raw) return new Response(L.link.raw, { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
      return new Response(await gmList(env, hb), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }
    const t = await gmFwd(env, f);
    await hb.gmDrop('__LIST__');
    if (act !== 'push') await gmList(env, hb).catch(() => null);         // something moved: the timer's queue follows
    if (code) await hb.gmDrop(code);                                   // staff moved/cancelled it: guests see the change
    return new Response(t, { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  }
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return gmJ({ error: 'That link isn’t right. Check the code with Round2.' });
  /* the link, from the 1-minute cache or Make */
  const fresh = async () => {
    const t = await gmFwd(env, { action: 'get', code });
    let j; try { j = JSON.parse(t); } catch (e) { throw new Error('Round2’s server didn’t answer properly. Try again in a minute.'); }
    if (j.error) await hb.gmPut(code, null, j.error, 300e3); else if (j.link) await hb.gmPut(code, j.link, null, 60e3);
    return j;
  };
  let c = await hb.gmGet(code);
  if (act === 'get') {
    if (c && c.exp > Date.now()) return gmJ(c.err ? { error: c.err } : { link: c.link });
    return gmJ(await fresh());
  }
  /* submit: check it the way Make does, drop unchanged saves, cap the number of changes */
  if (!c || c.exp <= Date.now() || c.err) { const j = await fresh(); if (j.error) return gmJ({ error: j.error }); c = await hb.gmGet(code); }
  const L = c.link || {}, at = +f.at, start = +L.start;
  const t = (x, n) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const m = { kind: String(f.kind || ''), to: t(f.to, 40), from: t(f.from, 40), title: t(f.title, 120), text: String(f.text || '').trim() };
  if (L.status === 'cancelled') return gmJ({ error: 'This link was cancelled. Message Round2 if that’s wrong.' });
  if (!GM_KINDS.includes(m.kind)) return gmJ({ error: 'Pick an occasion.' });
  if (!m.title) return gmJ({ error: 'Add a headline.' });
  if (m.text.length > 600) return gmJ({ error: 'Keep the message under 600 characters.' });
  if (!(at >= start && at <= start + 3600e3 && (at - start) % 900e3 === 0)) return gmJ({ error: 'Pick when it pops up: at the start or up to an hour after.' });
  if (L.status === 'approved' && L.at && Date.now() >= L.at) return gmJ({ error: 'It’s already on the TV. To change it now, message Round2.' });
  const same = L.status === 'approved' && L.kind === m.kind && (L.to || '') === m.to && (L.from || '') === m.from && (L.title || '') === m.title && (L.text || '') === m.text && +L.at === at;
  if (same) return gmJ({ ok: true, unchanged: true });
  if ((c.edits || 0) >= GM_GUEST_EDITS) return gmJ({ error: 'This message has been changed a lot already. Message Round2 if it still needs a change.' });
  const out = await gmFwd(env, { action: 'submit', code, kind: m.kind, to: m.to, from: m.from, title: m.title, text: m.text, at });
  let j; try { j = JSON.parse(out); } catch (e) { return gmJ({ error: 'Round2’s server didn’t answer properly. Try again in a minute.' }); }
  if (!j.error) { await hb.gmEdit(code); await hb.gmPut(code, { ...L, ...m, at, status: 'approved' }, null, 60e3); await hb.gmDrop('__LIST__'); await hb.qSet(code, L.room, at, +L.end || at + 3 * 3600e3); }
  return gmJ(j);
}

/* ---------- food menu (room QR menu, round2sg-home menu/) ----------
   Payments: guests pay LIVE once the live key is in Cloudflare; the control centre's test tools (TEST_CODE) always use the
   HitPay sandbox – see envFor below. Same rule for the booking page and the menu.
   POST /menu/checkout (form field "order"): re-prices from the published menu.json exactly like Make's old ROOM MENU
     CHECKOUT, keeps the order here, makes the HitPay payment (webhook → /menu/hitpay, back to the menu page).
   POST /menu/hitpay (HitPay) and POST /menu/return (the menu page when the guest comes back): ask HitPay itself whether it's
     paid (never trust the caller), then – once – send the TV alert and the kitchen Telegram slip from here, and hand the order
     to Make's [BACKEND] ROOM MENU PAID ORDER for the accounting sheet and the Drive slip that the kitchen phone prints
     (fields order, details, k = secret MENU_MAKE_K, tv/tg = "sent" when done here so Make skips them).
   Test payments (sandbox) go out with base 0, which Make already prints as "*** TEST PAYMENT - DO NOT MAKE ***" and
   files as TEST in the sheet. */
/* Guest-facing addresses on round2.sg (repos round2-book / round2-menu, GitHub Pages; DNS in Wix). Guests never see workers.dev:
   HitPay sends them back to these, and the engine's own pages run inside book.round2.sg. Webhooks stay on workers.dev. */
const PUBLIC_BOOK = 'https://book.round2.sg';
const PUBLIC_MENU = 'https://menu.round2.sg/';
const MENU_JSON = 'https://donttelldadyet-prog.github.io/round2sg-home/menu/menu.json';
const MENU_PAID_HOOK = 'https://hook.eu1.make.com/55nh6wniq1wftco8af9486noj4xugasl';
const MENU_RETURN = PUBLIC_MENU;
const MENU_ROOMS = ['Kai', 'Bella', 'Atlas', 'Max', 'Scarlett', 'Vale', 'Kaeden'];
const isSandbox = (env) => /sandbox/i.test(env.HITPAY_API || '');
/* TWO HitPay accounts in Cloudflare (no switch): real guests always pay on LIVE (HITPAY_LIVE_KEY / HITPAY_LIVE_SALT,
   api.hit-pay.com) once those are pasted in; test runs always use the SANDBOX (HITPAY_KEY / HITPAY_SALT / HITPAY_API).
   A test run = the booking page or menu sends the secret TEST_CODE (the control centre's test tools do this).
   Until the live key is in Cloudflare, everything uses the sandbox (pre-launch). Each hold / order remembers which one
   it used (data.pay = 'test' | 'live'), so its payment is always checked and cancelled with the right keys. */
const HITPAY_LIVE_API = 'https://api.hit-pay.com/v1';
const liveReady = (env) => !!env.HITPAY_LIVE_KEY && !!env.HITPAY_LIVE_SALT && !/paste/.test(env.HITPAY_LIVE_KEY + env.HITPAY_LIVE_SALT);
function rawEnv(env) { return env.RAW || env; }
function envFor(env, pay) {
  const e0 = rawEnv(env);
  if (pay === 'test' || !liveReady(e0)) return e0;
  const e = Object.assign(Object.create(e0), e0, { HITPAY_KEY: e0.HITPAY_LIVE_KEY, HITPAY_SALT: e0.HITPAY_LIVE_SALT, HITPAY_API: HITPAY_LIVE_API });
  e.RAW = e0; return e;
}
const payOf = (env) => (isSandbox(env) ? 'test' : 'live');
const isTestRun = (env, code) => !!rawEnv(env).TEST_CODE && !!code && String(code) === rawEnv(env).TEST_CODE;
/* a HitPay link whose account isn't known (an older unpaid hold): try both */
const cancelAny = async (env, pr) => { if (!pr) return; await cancelLink(envFor(env, 'live'), pr); if (liveReady(rawEnv(env))) await cancelLink(envFor(env, 'test'), pr); };
async function menuCheckout(env0, req, origin) {
  const no = (msg, s = 409) => J({ error: msg }, s);
  const form = new URLSearchParams(await req.text()), env = envFor(env0, isTestRun(env0, form.get('test')) ? 'test' : 'live'), pay = payOf(env);
  if (!env.HITPAY_KEY || !env.HITPAY_API || !env.MENU_MAKE_K) return no('Payment isn’t set up yet. Please WhatsApp us to order.', 503);
  const hb = book(env), who = req.headers.get('cf-connecting-ip') || 'x';
  if (!(await hb.gmRate(who + ':menu', 20))) return no('Too many tries. Wait a few minutes, or WhatsApp us.', 429);
  let o; try { o = JSON.parse(form.get('order') || ''); } catch (e) { return no('Something in your order couldn’t be read. Refresh the page and try again.', 400); }
  let menu; try { const r = await fetch(MENU_JSON + '?v=' + Date.now(), { cf: { cacheTtl: 30 } }); menu = await r.json(); } catch (e) { return no('The menu couldn’t be checked just now. Try again in a minute.', 503); }
  const P = menu.prices || {}, pc = P.pc || {}, pm = P.pm || {}, pn = P.pn || {}, g = +((menu.settings || {}).gst) || 0;
  const items = Array.isArray(o.items) ? o.items : [];
  const L = items.map((x) => { const k = String(x.k || ''), q = Math.round(+x.q || 0), c = k in pc ? +pc[k] : -1, m = k in pm ? +pm[k] : 0;
    return { k, q, c, t: c * q, mt: m * q, l: q + ' x ' + (pn[k] || 'UNKNOWN ITEM') }; });
  const sub = L.reduce((a, x) => a + x.t, 0), base = L.reduce((a, x) => a + x.mt, 0), gst = Math.round(base * g), total = sub + gst;
  const room = String(o.room || '');
  if (!MENU_ROOMS.includes(room)) return no('Please choose your room first.');
  if (!L.length || L.length > 30 || L.some((x) => x.q < 1 || x.q > 20)) return no('Your order couldn’t be checked. Refresh the page and try again.');
  if (L.some((x) => x.c < 0)) return no('Something in your order is sold out or no longer on the menu. Refresh the page and check your order.');
  /* test-only items (the 50-cent payment test) can only be ordered from the control centre's test mode */
  const testIds = new Set(); (menu.sections || []).forEach((sec) => (sec.items || []).forEach((it) => { if (it.test) testIds.add(it.id); }));
  if (pay !== 'test' && L.some((x) => testIds.has(String(x.k).split('--')[0]))) return no('Something in your order is sold out or no longer on the menu. Refresh the page and check your order.');
  if (total <= 0 || total !== Math.round(+o.shown_total * 100)) return no('The menu prices changed. Refresh the page and check your order.');
  const sg = new Date(Date.now() + 8 * 3600e3).toISOString(), ymd = sg.slice(2, 10).replace(/-/g, ''), hms = sg.slice(11, 19).replace(/:/g, '');
  const ref = 'R2-' + ymd + '-' + hms + '-' + room.toUpperCase(), orderNo = hms;
  const lines = L.map((x) => x.l), summary = lines.join(', ');
  let pr;
  try {
    pr = await hitpay(env, 'POST', '/payment-requests', { amount: (total / 100).toFixed(2), currency: 'SGD', reference_number: ref, send_email: 'false', allow_repeated_payments: 'false',
      purpose: (pay === 'test' ? 'TEST · ' : '') + 'Round2 food order #' + orderNo + ' (' + room + '): ' + (summary.length > 190 ? summary.slice(0, 187) + '...' : summary),
      webhook: origin + '/menu/hitpay', redirect_url: MENU_RETURN + '?room=' + room.toLowerCase() });
  } catch (e) { return no('The payment page couldn’t be opened. Try again, or WhatsApp us.', 502); }
  await hb.menuPut(ref, { pay, gst, sub, base: pay === 'test' ? 0 : base, note: String(o.note || '').slice(0, 500), room, lines: lines.join('\n'), total, status: 'pending', orderNo, createdAt: new Date().toISOString(), requestId: pr.id });
  const prev = String(o.prev || '');
  if (prev && prev !== pr.id) await cancelLink(env, prev);
  return J({ url: pr.url, order: ref, no: orderNo, request_id: pr.id, test: pay === 'test' || undefined });
}
const KITCHEN_CHAT = '-5417846512';
function kitchenSlip(rec) {
  return '================================\n          ROUND2 FOOD\n================================\n' + (rec.base === 0 ? '*** TEST PAYMENT - DO NOT MAKE ***' : '') +
    '\nROOM: ' + String(rec.room).toUpperCase() + '\nORDER: #' + rec.orderNo + '\n\n--------------------------------\n' + rec.lines +
    '\n--------------------------------\n\nREMARKS: ' + (rec.note || '-') + '\nSTATUS: PAID\n\nPrepared in collaboration with\nMadd Pizza <3\n================================';
}
/* the TV in the room: same record Make used to write (secret TV_KEY = the TV messages key) */
async function menuTv(env, rec, ref) {
  if (!env.TV_KEY) return '';
  const r = await fetch('https://round2-tv-default-rtdb.asia-southeast1.firebasedatabase.app/r2/' + env.TV_KEY + '/' + String(rec.room).toLowerCase() + '/last.json', { method: 'PUT',
    body: JSON.stringify({ type: 'received', no: rec.orderNo, items: String(rec.lines).split('\n').join(' · '), ref, t: { '.sv': 'timestamp' } }) }).catch(() => null);
  return r && r.ok ? 'sent' : '';
}
/* the kitchen's Telegram group (secret TG_BOT_TOKEN = the bot Make uses; without it Make still sends the slip) */
async function menuTelegram(env, rec, ref) {
  if (!env.TG_BOT_TOKEN) return '';
  const r = await fetch('https://api.telegram.org/bot' + env.TG_BOT_TOKEN + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: KITCHEN_CHAT, text: kitchenSlip(rec), reply_markup: { inline_keyboard: [[{ text: '✅ Food is at the pickup point', callback_data: 'pickup:' + ref }]] } }) }).catch(() => null);
  return r && r.ok ? 'sent' : '';
}
/* paid? ask HitPay, then hand it to Make exactly once */
async function menuPaid(env0, ref) {
  const hb = book(env0), rec = await hb.menuGet(ref);
  if (!rec) return { ok: false, err: 'unknown order' };
  const env = envFor(env0, rec.pay || (rec.base === 0 ? 'test' : 'live'));
  if (rec.status !== 'pending') return { ok: true, already: rec.status };
  const d = await hitpay(env, 'GET', '/payment-requests/' + rec.requestId).catch(() => null);
  if (!d || d.status !== 'completed' || Math.round(+d.amount * 100) !== rec.total) return { ok: false, err: 'not paid yet' };
  if (!(await hb.menuClaim(ref))) return { ok: true, already: 'paid' };
  const pay = (d.payments || [])[0] || {};
  const details = { status: d.status, amount: d.amount, id: d.id, reference_number: d.reference_number || ref,
    payments: [{ id: pay.id || '', amount: pay.amount || d.amount, fees: pay.fees || 0, payment_type: pay.payment_type || '', status: pay.status || 'succeeded', updated_at: pay.updated_at || new Date().toISOString() }] };
  /* straight away, from here: the room's TV ("order locked in") and the kitchen's Telegram slip with the pickup button
     (button presses still go to Make's [CONTROL] MADD PAYOUT TELEGRAM). Make is told what's done so it doesn't repeat it. */
  const tv = await menuTv(env, rec, ref), tg = await menuTelegram(env, rec, ref);
  const r = await fetch(MENU_PAID_HOOK, { method: 'POST', body: new URLSearchParams({ reference_number: ref, k: env.MENU_MAKE_K, order: JSON.stringify(rec), details: JSON.stringify(details), tv, tg }) }).catch(() => null);
  if (!r || !r.ok) { await hb.menuSet(ref, 'pending'); return { ok: false, err: 'Make didn’t answer – will retry on the next HitPay call' }; }
  return { ok: true, sent: true };
}

/* ---------- the guest's confirmation page (after paying; the same link shows it again later) ---------- */
const ROOM_LOOK = { 5: ['#E8436A', '#0b0914', 'Netflix room'], 7: ['#4DB848', '#0b0914', 'Netflix room'], 8: ['#F2C21B', '#0b0914', 'Netflix room'],
  9: ['#24B49A', '#0b0914', 'Deluxe room'], 10: ['#7A5BE0', '#ffffff', 'Deluxe room'], 12: ['#E9E7EF', '#0b0914', 'Deluxe room'], 11: ['#E0402F', '#ffffff', 'VIP room'] };
function bookedPage(env, ref, d, origin) {
  const q = d.q, done = d.done || {}, look = ROOM_LOOK[q.unit] || ['#f4f1fb', '#0b0914', ''], room = q.unit === 11 ? 'Maximillion' : q.room;
  const dt = new Date(q.date + 'T12:00:00Z'), dayTxt = dt.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const clock = (t) => { const [h, m] = t.split(':').map(Number); return ((h + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (h % 24 < 12 ? 'am' : 'pm'); };
  const msg = d.msg, tv = done.tv && done.tv.code ? done.tv : null, test = !!done.dryRun || d.pay === 'test';
  /* add-to-calendar file (session time only – the 15 min cleaning isn't the guest's) */
  const z = (t) => q.date.replace(/-/g, '') + 'T' + t.replace(':', '') + '00', endDay = q.endDate.replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Round2//Booking//EN', 'BEGIN:VEVENT', 'UID:' + ref + '@round2.sg', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    'DTSTART;TZID=Asia/Singapore:' + z(q.time), 'DTEND;TZID=Asia/Singapore:' + endDay + 'T' + q.end.replace(':', '') + '00', 'SUMMARY:Round2 · ' + room, 'DESCRIPTION:Booking ref ' + ref + '. Your booking and TV message: ' + PUBLIC_BOOK + '/done?ref=' + ref + ' · Questions? WhatsApp +65 9162 5767.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const msgBox = tv
    ? `<div class="card msg"><div class="k">TV MESSAGE</div><p>${msg ? `<b>${esc(msg.title)}</b> pops up on the TV ${msg.after ? msg.after + ' minutes after you start' : 'when you start'}.` : 'Your message link is ready.'}</p><a class="btn ghost" href="https://cue.round2.sg/${esc(tv.code)}">${msg ? 'Change the message' : 'Write the message'}</a><p class="fine">You can change it until it pops up: cue.round2.sg/${esc(tv.code)}</p></div>`
    : `<div class="card msg"><div class="k">CELEBRATING?</div><p>We’ll put your birthday, anniversary or any message on the big screen in your Round2 room. It pops up during your session.</p><a class="btn ghost" href="${origin}/done/message?ref=${esc(ref)}">Add a message for the TV</a></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You're booked · Round2</title>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
<style>:root{--rc:${look[0]};--ri:${look[1]}}*{box-sizing:border-box}body{margin:0;background:#06050a;color:#f4f1fb;font:16px/1.5 'Chakra Petch',system-ui,sans-serif}
main{max-width:520px;margin:0 auto;padding:28px 16px 40px}.px{font-family:'Press Start 2P',monospace;letter-spacing:.08em}
.kick{font-size:9px;color:#a79fbd}h1{font-family:'Press Start 2P',monospace;font-size:18px;line-height:1.5;margin:10px 0 18px}
.ticket{border:1px solid rgba(244,241,251,.14);border-top:4px solid var(--rc);background:#0b0914;padding:18px 18px 14px}
.room{font-size:26px;font-weight:700;color:var(--rc);margin:0}.type{font-size:12px;color:#a79fbd;text-transform:uppercase;letter-spacing:.1em}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:16px 0 4px}dt{color:#a79fbd;font-size:13px}dd{margin:0;font-weight:600}
.big{font-size:20px}.ref{font-family:'Press Start 2P',monospace;font-size:10px;letter-spacing:.08em}
.card{margin-top:14px;border:1px solid rgba(244,241,251,.14);background:#0b0914;padding:16px 18px}.k{font:9px 'Press Start 2P',monospace;letter-spacing:.1em;color:var(--rc);margin-bottom:8px}
.card p{margin:0 0 12px}.fine{font-size:12px;color:#a79fbd;margin:10px 0 0!important}ul{margin:0;padding-left:18px}li{margin:4px 0}
.btn{display:block;text-align:center;padding:13px 14px;font:10px 'Press Start 2P',monospace;letter-spacing:.08em;text-decoration:none;background:var(--rc);color:var(--ri);border:0;margin-top:10px}
.btn.ghost{background:transparent;color:#f4f1fb;border:1px solid var(--rc)}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.test{background:#F2C21B;color:#0b0914;padding:8px 12px;font-weight:700;margin-bottom:14px}</style></head><body><main>
${test ? '<div class="test">TEST BOOKING · nothing was really charged</div>' : ''}
<div class="px kick">SAVE FILE CREATED</div><h1>YOU’RE BOOKED!</h1>
<div class="ticket"><p class="room">${esc(room)}</p><div class="type">${esc(look[2])}${q.earlyBird ? ' · Early bird' : ''}</div>
<dl><dt>Date</dt><dd>${esc(dayTxt)}</dd><dt>Time</dt><dd class="big">${esc(clock(q.time))} – ${esc(clock(q.end))}</dd><dt>Length</dt><dd>${q.hours} hours</dd>
<dt>Name</dt><dd>${esc(d.name)}</dd><dt>Guests</dt><dd>${esc(d.pax)}</dd><dt>Paid</dt><dd>$${q.total.toFixed(2)}</dd><dt>Ref</dt><dd class="ref">${esc(ref)}</dd></dl></div>
${msgBox}
<div class="card"><div class="k">WHEN YOU ARRIVE</div><ul><li>Come in and take a seat in our lobby. We’ll know you’ve arrived and come to show you to ${esc(room)}.</li><li>Your booking is under <b>${esc(d.name)}</b>.</li><li>Please be on time: your session ends at ${esc(clock(q.end))}.</li><li>A confirmation email is on its way to ${esc(d.email)}.</li></ul></div>
<div class="row"><a class="btn ghost" download="Round2-${esc(ref)}.ics" href="data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}">Add to calendar</a><a class="btn ghost" href="https://wa.me/6591625767?text=${encodeURIComponent('Hi Round2, about my booking ' + ref)}">WhatsApp us</a></div>
${d.ret ? `<a class="btn" href="${esc(d.ret)}">Back to Round2</a>` : '<a class="btn" href="https://www.round2.sg">Back to Round2</a>'}
<p class="fine">Closed this page? The link in your confirmation email brings you back here, and so does your calendar entry.</p>
<script>try{sessionStorage.clear()}catch(e){}</script><script>/* inside book.round2.sg: keep its address bar in step; links that leave these pages open outside the frame */(function(){if(window.top===window)return;try{parent.postMessage({r2:'page',path:location.pathname+location.search,title:document.title},'${PUBLIC_BOOK}')}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;var u=new URL(a.href,location.href);if(u.origin===location.origin&&!/^\\/done\\/message/.test(u.pathname))return;a.target=/(^|\\.)round2\\.sg$/.test(u.hostname)||u.origin===location.origin?'_top':'_blank';a.rel='noopener'},true)})()</script></main></body></html>`;
}

/* ---------- pages ---------- */
/* small engine pages (View your booking, not found, errors, the old test form): same look as the booking page */
const PAGE = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Round2 · Booking</title>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}body{margin:0;background:#06050a;color:#f4f1fb;font:16px/1.5 'Chakra Petch',system-ui,sans-serif}
main{max-width:520px;margin:0 auto;padding:28px 16px 40px}
main::before{content:'ROUND2 · SAVE MENU';display:block;font:9px 'Press Start 2P',monospace;letter-spacing:.14em;color:#a79fbd;margin-bottom:10px}
h1{font-family:'Press Start 2P',monospace;font-size:18px;line-height:1.5;letter-spacing:.04em;margin:0 0 14px;text-transform:uppercase}
p{color:#c9c2dc}a{color:#f4f1fb}
form,.card{margin-top:16px;border:1px solid rgba(244,241,251,.14);background:#0b0914;padding:16px 18px}
label{display:block;margin:12px 0 4px;color:#a79fbd;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
select,input{display:block;width:100%;padding:12px;border:1px solid rgba(244,241,251,.2);background:#06050a;color:#f4f1fb;font:16px 'Chakra Petch',sans-serif}
input:focus,select:focus{outline:none;border-color:#f4f1fb}
button,.btn{display:block;width:100%;text-align:center;margin-top:18px;padding:14px;border:0;background:#f4f1fb;color:#0b0914;font:10px 'Press Start 2P',monospace;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;cursor:pointer}
.ghost{background:transparent;border:1px solid rgba(244,241,251,.3);color:#f4f1fb}
.q{margin-top:14px;padding:12px;background:#0b0914;border:1px solid rgba(244,241,251,.14)}.err{color:#ff8a8a}
.tag{display:inline-block;background:#F2C21B;color:#111;padding:0 6px;font-size:12px;margin-left:6px}
.hold{display:none;margin-top:18px;padding:16px;border:1px solid #f4f1fb}.big{font-size:28px;font-weight:700}</style></head><body><main>${body}</main><script>/* inside book.round2.sg: keep its address bar in step; links that leave these pages open outside the frame */(function(){if(window.top===window)return;try{parent.postMessage({r2:'page',path:location.pathname+location.search,title:document.title},'${PUBLIC_BOOK}')}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;var u=new URL(a.href,location.href);if(u.origin===location.origin&&!/^\\/done\\/message/.test(u.pathname))return;a.target=/(^|\\.)round2\\.sg$/.test(u.hostname)||u.origin===location.origin?'_top':'_blank';a.rel='noopener'},true)})()</script></body></html>`;

function testForm() {
  const opts = Object.entries(ROOMS).map(([u, [n, t]]) => `<option value="${u}">${n} (${t})</option>`).join('');
  let times = ''; for (let m = 660; m <= 1395; m += 15) times += `<option>${hhmm(m)}</option>`;
  return PAGE(`<h1>Round2 booking <span class="tag">TEST · sandbox</span></h1>
<p class="q" id="note" style="display:none"></p>
<div id="form">
<label>Room</label><select id="unit">${opts}</select>
<label>Date</label><input id="date" type="date">
<label>Start</label><select id="time">${times}</select>
<label>Length</label><select id="hours"><option value="3">3 hours</option><option value="4">4 hours</option><option value="5">5 hours</option><option value="6">6 hours</option></select>
<div class="q" id="q">Pick a date</div>
<label>Name</label><input id="name"><label>Email</label><input id="email" type="email"><label>Mobile</label><input id="phone" type="tel"><label>Guests</label><input id="pax" type="number" min="1" max="6" value="2">
<button id="go">Continue</button><p class="err" id="err"></p>
</div>
<div class="hold" id="hold"><div id="hwhat"></div><p>We're holding this for you for</p><div class="big" id="cd">10:00</div>
<a class="btn" id="pay">Pay</a><button class="ghost" id="cancel">Change booking</button></div>
<script>
const $=id=>document.getElementById(id);const ss={get:k=>{try{return sessionStorage.getItem(k)}catch(e){}},set:(k,v)=>{try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(e){}}};
$('date').value=new Date(Date.now()+8*36e5+864e5).toISOString().slice(0,10);
const body=()=>({unit:$('unit').value,date:$('date').value,time:$('time').value,hours:$('hours').value});
async function q(){const r=await fetch('/quote',{method:'POST',body:JSON.stringify(body())});const j=await r.json();
$('q').textContent=j.error?j.error:(j.earlyBird?'Early Bird · ':'')+(j.peak?'Peak':'Off-peak')+(j.ph?' (public holiday)':'')+' · '+j.time+'–'+j.end+' · $'+j.total.toFixed(2)+(j.free===false?' · NOT FREE':'');}
['unit','date','time','hours'].forEach(i=>$(i).onchange=q);q();
let timer;
function note(t){$('note').style.display=t?'block':'none';$('note').textContent=t||'';}
async function release(why){const ref=ss.get('r2ref');ss.set('r2ref',null);ss.set('r2went',null);clearInterval(timer);$('hold').style.display='none';$('form').style.display='block';$('go').disabled=false;
 if(ref)await fetch('/release',{method:'POST',body:JSON.stringify({ref}),keepalive:true});if(why)note(why);q();}
function showHold(j){$('form').style.display='none';$('hold').style.display='block';note('');
 $('hwhat').innerHTML='<b>'+j.room+'</b> · '+j.date+' · '+j.time+'–'+j.end+'<br>$'+j.total.toFixed(2);$('pay').href=j.url;$('pay').textContent='Pay $'+j.total.toFixed(2);
 clearInterval(timer);timer=setInterval(()=>{const s=Math.max(0,Math.round((j.holdUntil-Date.now())/1000));$('cd').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
 if(!s)release('Your 10 minutes ran out, so the slot was released. Pick a time again.');},500);}
$('go').onclick=async()=>{$('err').textContent='';$('go').disabled=true;const b={...body(),name:$('name').value,email:$('email').value,phone:$('phone').value,pax:$('pax').value};
 const r=await fetch('/checkout',{method:'POST',body:JSON.stringify(b)});const j=await r.json();
 if(j.url){ss.set('r2ref',j.ref);ss.set('r2hold',JSON.stringify(j));showHold(j);}else{$('err').textContent=j.error;$('go').disabled=false;}};
$('cancel').onclick=()=>release('Slot released – pick again.');
/* came back from HitPay with the back button (page restored or reloaded) → free the slot */
addEventListener('pageshow',()=>{if(ss.get('r2ref')&&ss.get('r2went'))release('You left the payment page, so we released the slot. Pick a time again.');});
$('pay').onclick=()=>ss.set('r2went','1');
const back=new URLSearchParams(location.search).get('released');if(back)note('Payment not completed – the slot was released. Pick a time again.');
</script>`);
}

export default {
  async fetch(req, env0, ctx) {
    const u = new URL(req.url);
    const env = envFor(env0, 'live');   /* default for anything not tied to a hold/order: live once the live key is in */
    try {
      if (req.method === 'OPTIONS') return J({});
      if (u.pathname === '/ph') return J([...(await holidays())].sort());
      /* control centre › Systems / Test bench: which mode the engine is in and what's switched on (yes/no only, never a secret) */
      /* booking switch (control centre › Systems): GET /mode for the booking page; POST {pass, pin, booking, by} to switch.
         Two separate secrets must both match (SWITCH_PASS + SWITCH_PIN, set in Cloudflare); 5 wrong tries locks it for 30 min. */
      if (u.pathname === '/mode') {
        const hb = book(env);
        if (req.method !== 'POST') return J(await hb.getMode());
        const f = await req.json().catch(() => ({}));
        if (!env0.SWITCH_PASS || !env0.SWITCH_PIN || /paste/.test(env0.SWITCH_PASS + env0.SWITCH_PIN)) return J({ error: 'The switch passwords aren’t set up in Cloudflare yet' }, 403);
        const ip = req.headers.get('cf-connecting-ip') || '?';
        if (!(await hb.lockOk('sw:' + ip)) || !(await hb.lockOk('sw:all'))) return J({ error: 'Locked for 30 minutes after too many wrong tries' }, 429);
        if (String(f.pass || '') !== env0.SWITCH_PASS || String(f.pin || '') !== env0.SWITCH_PIN) {
          await hb.lockFail('sw:' + ip); await hb.lockFail('sw:all');
          return J({ error: 'Password or PIN is wrong' }, 403);
        }
        const cur = await hb.getMode(), by = String(f.by || '').slice(0, 30), nm = Object.assign({}, cur, { t: Date.now(), by });
        if (f.booking !== undefined) { if (!['new', 'simplybook'].includes(f.booking)) return J({ error: 'booking must be new or simplybook' }, 400); nm.booking = f.booking; }
        if (f.pay !== undefined) return J({ error: 'Payments aren’t switched: guests always pay live, test tools always use the sandbox' }, 400);
        const m = await hb.setMode(nm);
        const said = (f.booking !== undefined && f.booking !== cur.booking ? (f.booking === 'simplybook' ? '🛟 Online booking switched to SAFE MODE (SimplyBook page)' : '✅ Online booking switched back to the NEW booking page') : '') +
'';
        if (said) await staffAlert(env, said + (by ? ' · by ' + by : '')).catch(() => null);
        return J(m);
      }
      if (u.pathname === '/status') {
        const st = { payments: liveReady(env0) ? 'live' : 'test', testCode: !!env0.TEST_CODE, dryRun: env.DRY_RUN === '1', simplybook: !!(env.SB_COMPANY && env.SB_USER && env.SB_PASS),
          sbSecret: !!env.SB_SECRET && !/paste/.test(env.SB_SECRET), kitchenBot: !!env.TG_BOT_TOKEN, staffAlerts: !!env.STAFF_CHAT, guestMessages: !!env.GM_STAFF,
          menuSheet: !!env.MENU_MAKE_K, tvKey: !!env.TV_KEY, liveKeys: liveReady(env0), switchSet: !!env0.SWITCH_PASS && !/paste/.test(env0.SWITCH_PASS + env0.SWITCH_PIN), booking: (await book(env).getMode()).booking, t: Date.now() };
        if (u.searchParams.get('deep')) {
          st.sbLogin = await admin(env).then(() => 'ok').catch((e) => 'failed: ' + String(e.message || e).slice(0, 80));
          st.sbPublic = await pub(env).then(() => 'ok').catch((e) => 'failed: ' + String(e.message || e).slice(0, 80));
          st.timerQueue = await book(env).qList().then((l) => l.length).catch(() => null);
          st.follow = await book(env).fStat().catch((e) => ({ error: String(e.message || e).slice(0, 80) }));
          if (st.follow && st.follow.links) { const fd = await book(env).follow(true).catch((e) => ({ error: String(e.message || e).slice(0, 80) })); st.follow.check = { seen: fd.seen && fd.seen.n, error: fd.error, would: (fd.acts || []).map((x) => x.a + (x.room ? ' ' + x.room : '')) }; if (u.searchParams.get('deep') === '2') st.follow.check.sb = fd.seen; }   /* messages follow their booking (no codes here) */
        }
        return J(st);
      }
      if (u.pathname === '/day') return J(await dayBoard(env, u.searchParams.get('date')));
      if (u.pathname === '/quote' && req.method === 'POST') { const b = await req.json(); const q = await quote(env, b); q.free = await isFree(env, q); return J(q); }
      if (u.pathname === '/checkout' && req.method === 'POST') return J(await checkout(env, await req.json(), u.origin));
      if (u.pathname === '/agree' && req.method === 'POST') { const { ref } = await req.json(); return J({ ok: await book(env).agree(String(ref || '').replace(/[^A-Z0-9]/g, '')) }); }
      if (u.pathname === '/release' && req.method === 'POST') { const { ref } = await req.json(); const hb = book(env), h0 = await hb.get(String(ref || '')); const r = await hb.release(String(ref || '')); if (r) await cancelLink(envFor(env, h0 && h0.data.pay), r.pr); return J({ released: !!r }); }
      if (u.pathname === '/hitpay' && req.method === 'POST') {
        const raw = await req.text(), sig = req.headers.get('Hitpay-Signature') || '';
        if ((await hmacHex(envFor(env, 'live').HITPAY_SALT, raw)) !== sig && (await hmacHex(envFor(env, 'test').HITPAY_SALT, raw)) !== sig) return J({ error: 'bad signature' }, 401);
        const p = JSON.parse(raw);
        if (p.status === 'completed' && p.reference_number) return J(await finalize(env, p.reference_number, 'webhook'));
        return J({ ignored: p.status });
      }
      if (u.pathname === '/done') {
        const ref = (u.searchParams.get('ref') || '').replace(/[^A-Z0-9]/g, '');
        const h = await book(env).get(ref); if (!h) return H(PAGE('<h1>Booking not found</h1>'));
        if (h.status === 'cancelled') return H(PAGE('<h1>This booking was cancelled</h1><p>It’s no longer in our calendar. If that’s not right, message us on <a href="https://wa.me/6591625767">WhatsApp</a>.</p>'));
        const henv = envFor(env, h.data.pay);
        const pr = h.pr ? await hitpay(henv, 'GET', '/payment-requests/' + h.pr).catch(() => ({})) : {};
        if (pr.status !== 'completed' && h.status !== 'paid' && h.status !== 'booking') {
          const p2 = await book(env).release(ref); if (p2) await cancelLink(henv, p2.pr);
          return Response.redirect((h.data.ret || u.origin + '/test') + '?released=1', 302);
        }
        const f = await finalize(env, ref, 'redirect');
        const q = f.h.q;
        if (f.ok) return H(bookedPage(env, ref, f.h, u.origin));
        return H(PAGE(f.ok ? `<h1>You're booked 🎉</h1><p><b>${esc(q.room)}</b>, ${esc(q.date)}, ${esc(q.time)}–${esc(q.end)} (${q.hours}h) · $${q.total.toFixed(2)} paid.</p><p>Ref ${esc(ref)}${f.h.done && f.h.done.dryRun ? ' · <span class="tag">TEST – not put in calendar</span>' : ''}</p><p>A confirmation email is on its way.</p>${f.h.done && f.h.done.tv && f.h.done.tv.code ? `<p>Your message pops up on the TV ${f.h.msg.after ? f.h.msg.after + ' minutes after you start' : 'when you start'}. Want to change it? <a style="color:#F2C21B" href="https://cue.round2.sg/${esc(f.h.done.tv.code)}">cue.round2.sg/${esc(f.h.done.tv.code)}</a></p>` : ''}${f.h.ret ? `<a class="btn" href="${esc(f.h.ret)}">Back to Round2</a>` : ''}<script>try{sessionStorage.clear()}catch(e){}</script>`
          : `<h1>Payment received</h1><p class="err">${esc(f.err)}</p><p>We'll WhatsApp you shortly. Ref ${esc(ref)}.</p>`));
      }
      /* SimplyBook's confirmation email links here with its booking code → that booking's page (see it, add/change the TV message) */
      if (u.pathname.startsWith('/b/')) {
        const code = u.pathname.slice(3).replace(/[^a-z0-9]/gi, '').slice(0, 20), r = code ? await book(env).byCode(code) : null;
        if (r) return Response.redirect(u.origin + '/done?ref=' + r.ref, 302);
        return H(PAGE(`<h1>Your booking</h1><p>This booking was made with us directly, so its details are with our team. Want a birthday or celebration message on the big screen in your Round2 room? Message us on WhatsApp and we’ll set it up.</p><a class="btn" href="https://wa.me/6591625767?text=${encodeURIComponent('Hi Round2, about my booking ' + code)}">WhatsApp us</a>`));
      }
      /* "Find my booking": email + mobile → the confirmation page again (to see it or add/change the TV message) */
      if (u.pathname === '/find') {
        const form = (err, em = '') => H(PAGE(`<h1>View your booking</h1><p>Enter the email and mobile number you booked with to see your booking and add or change your TV message.</p>
<form method="post"><label>Email</label><input name="email" type="email" required value="${esc(em)}"><label>Mobile</label><input name="phone" type="tel" required placeholder="8123 4567"><button>Show my booking</button></form>${err ? `<p class="err">${err}</p>` : ''}
<p style="font-size:14px;margin-top:18px">Booked on WhatsApp or by phone? Message us on <a href="https://wa.me/6591625767">WhatsApp</a>.</p>`));
        if (req.method !== 'POST') return form();
        const f = new URLSearchParams(await req.text()), em = String(f.get('email') || '').trim().toLowerCase(), p8 = String(f.get('phone') || '').replace(/\D/g, '').slice(-8);
        if (!em || p8.length < 8) return form('Please enter your email and full mobile number.', em);
        const hb = book(env);
        if (!(await hb.gmRate('find:' + (req.headers.get('cf-connecting-ip') || '?'), 10))) return form('Too many tries. Please wait 10 minutes, or WhatsApp us.', em);
        const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
        let list = await hb.find(em, p8, today);
        const bids = list.map((r) => r.bid).filter((x) => x && x !== 'null');
        if (bids.length) {
          try {
            const a = await admin(env), to = list.reduce((m, r) => (r.date > m ? r.date : m), today);
            const gone = new Set(Object.values((await a('getBookings', [{ booking_type: 'cancelled', date_from: today, date_to: to }])) || {}).map((b) => String(b.id)));
            for (const b of bids) if (gone.has(b)) await hb.cancelBid(b);
            list = list.filter((r) => !gone.has(r.bid));
          } catch (e) {}
        }
        if (!list.length) return form('We couldn’t find an upcoming online booking with that email and mobile. Check for typos, or WhatsApp us.', em);
        if (list.length === 1) return Response.redirect(u.origin + '/done?ref=' + list[0].ref, 303);
        const rows = [];
        for (const r of list) { const h = await hb.get(r.ref), q = h.data.q; rows.push(`<a class="btn ghost" style="margin-top:10px" href="/done?ref=${r.ref}">${esc(q.unit === 11 ? 'Maximillion' : q.room)} · ${esc(q.date)} · ${esc(q.time)}</a>`); }
        return H(PAGE(`<h1>Your bookings</h1><p>Pick one:</p>${rows.join('')}`));
      }
      /* "Add a message for the TV" on the confirmation page: make the guest-message link only when it's wanted */
      if (u.pathname === '/done/message') {
        const ref = (u.searchParams.get('ref') || '').replace(/[^A-Z0-9]/g, ''), hb = book(env), h = ref ? await hb.get(ref) : null;
        if (!h || h.status !== 'paid' || !h.data.done || h.data.done.problem) return H(PAGE('<h1>Booking not found</h1>'));
        let tv = h.data.done.tv;
        if (!tv || !tv.code) {
          const q = h.data.q, start = Date.UTC(+q.date.slice(0, 4), +q.date.slice(5, 7) - 1, +q.date.slice(8, 10), +q.time.slice(0, 2), +q.time.slice(3, 5)) - 8 * 3600e3;
          const r = await fetch(env.GM_HOOK_URL || GM_HOOK, { method: 'POST', body: new URLSearchParams({ action: 'create', staff: env.GM_STAFF, room: GM_ROOM[q.unit], start, label: 'Online · ' + h.data.name.slice(0, 30) }) }).then((x) => x.json()).catch(() => ({}));
          if (!r.code) return H(PAGE('<h1>Couldn’t open the message page</h1><p>Please try again in a minute, or WhatsApp us on +65 9162 5767.</p>'));
          tv = { code: r.code }; await hb.setTv(ref, tv); await hb.gmDrop('__LIST__'); await hb.lSet(r.code, GM_ROOM[q.unit], start, start + 3 * 3600e3, h.data.done.bookingId).catch(() => null);
        }
        return Response.redirect('https://cue.round2.sg/' + tv.code, 302);
      }
      if (u.pathname === '/gm' && req.method === 'POST') return await gm(env, req);
      /* SimplyBook's callback (Custom features › API › callback URL) = /sb/notify/<SB_NOTIFY_KEY>. Passed on unchanged to
         Make's mirror-rooms scenario (secret MIRROR_HOOK_URL), then: cancelled → off "View your booking"; any change →
         guest messages follow at once. The key keeps strangers from triggering Make. */
      if (u.pathname.startsWith('/sb/notify/') && req.method === 'POST') {
        if (!env.SB_NOTIFY_KEY || u.pathname.slice(11) !== env.SB_NOTIFY_KEY) return J({ error: 'no' }, 404);
        const raw = await req.text(), ct = req.headers.get('content-type') || 'application/json';
        if (env.MIRROR_HOOK_URL) ctx.waitUntil(fetch(env.MIRROR_HOOK_URL, { method: 'POST', headers: { 'content-type': ct }, body: raw }).catch(() => null));
        let j = {}; try { j = JSON.parse(raw); } catch (e) { j = Object.fromEntries(new URLSearchParams(raw)); }
        const bid = String(j.booking_id || '').replace(/\D/g, ''), type = String(j.notification_type || '');
        if (bid) ctx.waitUntil(book(env).onSb(bid, type).catch(() => null));
        await book(env).gmDrop('__LIST__').catch(() => null);
        return J({ ok: true });
      }
      if (u.pathname === '/menu/checkout' && req.method === 'POST') return await menuCheckout(env, req, u.origin);
      if ((u.pathname === '/menu/hitpay' || u.pathname === '/menu/return') && req.method === 'POST') {
        const f = new URLSearchParams(await req.text()), ref = String(f.get('reference_number') || f.get('order') || '').replace(/[^A-Za-z0-9-]/g, '');
        return J(ref ? await menuPaid(env, ref) : { ok: false });
      }
      /* HitPay's per-payment webhook: never trusted – the payment is checked with HitPay before booking */
      if (u.pathname === '/booking/hitpay' && req.method === 'POST') {
        const ref = String(new URLSearchParams(await req.text()).get('reference_number') || '').replace(/[^A-Z0-9]/g, '');
        const h = ref ? await book(env).get(ref) : null; if (!h || !h.pr) return J({ ok: false });
        const pr = await hitpay(envFor(env, h.data.pay), 'GET', '/payment-requests/' + h.pr).catch(() => ({}));
        if (pr.status !== 'completed') return J({ ok: false, status: pr.status || '?' });
        const f = await finalize(env, ref, 'webhook'); return J({ ok: f.ok });
      }
      if (u.pathname === '/test') return !liveReady(env0) ? H(testForm()) : J({ error: 'test page is off while payments are live' }, 404);
      if (u.pathname === '/selftest') { const a = await admin(env); const units = await a('getUnitList', []); return J({ sbLogin: true, rooms: Object.values(units).map((x) => x.name), dryRun: env.DRY_RUN === '1' }); }
      return J({ ok: true, svc: 'round2-book' });
    } catch (e) { return J({ error: String(e.message || e) }, 400); }
  },
};
