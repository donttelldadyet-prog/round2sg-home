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

/* SimplyBook requests are counted (owner, 2 Nov: "is that too intensive?"): SimplyBook's shared servers allow about 5,000 API
   requests a day. Each part adds to sbCalls; it's written to the engine's kv as sbn:<day> after each request / tick / alarm. */
let sbCalls = 0;
async function sbFlush(env) { if (!sbCalls) return; const n = sbCalls; sbCalls = 0; await book(env).sbAdd(n); }
async function rpc(path, method, params, headers = {}) {
  sbCalls++;
  const r = await fetch(SB + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }) });
  const j = await r.json();
  if (j.error) throw new Error(method + ': ' + (j.error.message || JSON.stringify(j.error)));
  return j.result;
}
/* logins are kept 20 min (not one per read) and redone once if SimplyBook says the token is no good */
let pubTok = null, admTok = null;
const tokBad = (e) => /token|denied|auth|login|expired|signature/i.test(String(e && e.message || e));
async function pub(env) {
  const get = async () => { pubTok = { k: await rpc('/login', 'getToken', [env.SB_COMPANY, env.SB_PUBLIC_KEY]), t: Date.now() + 20 * 60e3 }; return pubTok.k; };
  let tok = pubTok && pubTok.t > Date.now() ? pubTok.k : await get();
  return async (m, p) => { try { return await rpc('', m, p, { 'X-Company-Login': env.SB_COMPANY, 'X-Token': tok }); } catch (e) { if (!tokBad(e)) throw e; tok = await get(); return rpc('', m, p, { 'X-Company-Login': env.SB_COMPANY, 'X-Token': tok }); } };
}
/* SimplyBook REST API v2 (calendar notes): token from /admin/auth, cached ~50 min */
const SB2 = 'https://user-api-v2.simplybook.asia';
let sb2tok = null;
async function sb2(env) {
  if (!sb2tok || sb2tok.t < Date.now()) {
    sbCalls++; const r = await fetch(SB2 + '/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: env.SB_COMPANY, login: env.SB_USER, password: env.SB_PASS }) });
    const j = await r.json(); if (!j.token) throw new Error('SimplyBook REST login: ' + JSON.stringify(j).slice(0, 120));
    sb2tok = { k: j.token, t: Date.now() + 50 * 60e3 };
  }
  return async (method, path, body) => {
    sbCalls++; const r = await fetch(SB2 + path, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Login': env.SB_COMPANY, 'X-Token': sb2tok.k }, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!r.ok) throw new Error('SimplyBook ' + method + ' ' + path.split('?')[0] + ' ' + r.status + ': ' + t.slice(0, 200));
    return j;
  };
}
async function admin(env, fresh) {
  const get = async () => { admTok = { k: await rpc('/login/', 'getUserToken', [env.SB_COMPANY, env.SB_USER, env.SB_PASS]), t: Date.now() + 20 * 60e3 }; return admTok.k; };
  let tok = !fresh && admTok && admTok.t > Date.now() ? admTok.k : await get();
  const h = () => ({ 'X-Company-Login': env.SB_COMPANY, 'X-User-Token': tok });
  return async (m, p) => { try { return await rpc('/admin', m, p, h()); } catch (e) { if (!tokBad(e)) throw e; tok = await get(); return rpc('/admin', m, p, h()); } };
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
  /* ===== Guest + Round2 TV messages, kept HERE (owner, 1 Nov: off Make) =====
     Same actions, checks and answers as Make's old [BACKEND] GUEST MESSAGE LINKS (scenario 8249444, data store 237603),
     so every page works unchanged: create / get / submit (guest) / list / cancel / move / now / push / r2.
     Records keep Make's shape ({key, data:{room,start,end,status,kind,title,text,from,to,ack,at,until,id,onTv,…}}) and
     codes (guest 8 chars, R2xxxxxx) so cue.round2.sg links keep working. "push" writes the record to the room's TV in
     Firebase. Switch: mode.msgLocal (true = here, false = still Make) – msgRoute picks. */
  msgInit() { if (this.msgReady) return; this.msgReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS msgs (key TEXT PRIMARY KEY, data TEXT, start INTEGER, endt INTEGER)`); }
  msgCount() { this.msgInit(); return this.rows(`SELECT COUNT(*) AS n FROM msgs`)[0].n; }
  msgGet(key) { this.msgInit(); const r = this.rows(`SELECT data FROM msgs WHERE key = ?`, key)[0]; return r ? JSON.parse(r.data) : null; }
  msgPut(key, d) { this.msgInit(); this.sql.exec(`INSERT OR REPLACE INTO msgs VALUES (?, ?, ?, ?)`, key, JSON.stringify(d), +d.start || 0, +d.end || 0); }
  msgImport(list) {   /* copy from Make: keeps whichever copy changed last */
    this.msgInit(); let n = 0;
    for (const x of list || []) { if (!x || !x.key || !x.data) continue; const cur = this.msgGet(x.key); if (cur && +cur.t > +x.data.t) continue; this.msgPut(x.key, x.data); n++; }
    return n;
  }
  async msgRoute(f) {
    if (this.getMode().msgLocal) return JSON.stringify(await this.msgAct(f));
    const r = await fetch(this.env.GM_HOOK_URL || GM_HOOK, { method: 'POST', body: new URLSearchParams(f) }).catch(() => null);
    return r ? r.text() : '{"error":"Make didn’t answer"}';
  }
  async msgAct(f) {
    this.msgInit();
    const env = this.env, now = Date.now(), act = String(f.action || '').trim().toLowerCase(), staffOk = !!env.GM_STAFF && f.staff === env.GM_STAFF;
    const room = String(f.room || '').trim().toLowerCase().replace('maximillion', 'max'), roomOk = ['vale', 'kaeden', 'scarlett', 'bella', 'kai', 'atlas', 'max'].includes(room);
    const start = +f.start || 0, at = +f.at || 0, code = String(f.code || '').trim().toUpperCase();
    const one = (x) => String(x == null ? '' : x).replace(/[\r\n]+/g, ' ').trim();
    const stamp = () => { const d = new Date(now + 8 * 3600e3).toISOString(); return d.slice(5, 7) + d.slice(8, 10) + d.slice(11, 13) + d.slice(14, 16) + d.slice(17, 19); };
    const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const life = (kind) => kind === 'timeup' ? 900e3 : kind === 'wrapup' ? 240e3 : 10800e3;
    const tv = env.TV_KEY ? FB_BASE + env.TV_KEY + '/' : null;
    const offTv = async (d) => {   /* it was sent: take it off the TV if it's still the one showing */
      if (!tv || d.onTv !== 'yes') return;
      const c = await fetch(tv + d.room + '/msg.json').then((x) => x.json()).catch(() => null);
      if (c && c.id === d.id) await fetch(tv + d.room + '/msg.json', { method: 'DELETE' }).catch(() => null);
    };
    if (act === 'create') {
      const err = !staffOk ? 'Wrong staff code.' : !roomOk ? 'Pick a room.' : start <= 0 ? 'Set the booking start.' : start + 10800e3 < now ? 'That booking has already finished.' : 'ok';
      if (err !== 'ok') return { error: err };
      let k; do { k = hex(4); } while (this.msgGet(k));
      this.msgPut(k, { t: now, id: 'g' + k.toLowerCase(), ack: true, end: start + 10800e3, kind: 'birthday', onTv: 'no', room, label: one(f.label).slice(0, 60), start, until: start + 10800e3, status: 'open', created: now });
      return { ok: true, code: k };
    }
    if (act === 'get' || act === 'submit') {
      const d = this.msgGet(code || 'NONE') || {};
      const guestErr = !d.room ? 'This link isn’t valid. Check you copied all of it, or message us.' : d.status === 'cancelled' ? 'This link was cancelled. Please message us.' : +d.end < now ? 'This booking has finished, so the link has closed.' : 'ok';
      if (act === 'get') return guestErr === 'ok' ? { ok: true, now, link: d } : { error: guestErr };
      const locked = d.status === 'approved' && now >= (+d.at || 0);
      const kind = String(f.kind || ''), title = one(f.title), text = one(f.text), to = one(f.to), from = one(f.from);
      const err = guestErr !== 'ok' ? guestErr : locked ? 'Your message is already on the TV. Message us if you need a change.'
        : !GM_KINDS.includes(kind) ? 'Pick an occasion.' : !title ? 'Add a headline.' : title.length > 80 ? 'Keep the headline under 80 characters.' : text.length > 600 ? 'Keep the message under 600 characters.'
        : to.length > 40 || from.length > 40 ? 'Keep the names short.' : at < +d.start || at > +d.start + 3600e3 ? 'Pick a time within the first hour of your booking.' : 'ok';
      if (err !== 'ok') return { error: err };
      this.msgPut(code, Object.assign(d, { t: now, at, id: 'g' + code.toLowerCase() + '-' + stamp(), to, from, kind, onTv: 'no', text, title, status: 'approved', approved: now, submitted: now }));
      this.qSet(code, d.room, at, +d.end || at + 10800e3);
      return { ok: true, at };
    }
    if (act === 'r2') {
      const kind = String(f.kind || ''), title = one(f.title), text = one(f.text);
      const err = !staffOk ? 'Wrong staff code.' : !roomOk ? 'Pick a room.' : !['birthday', 'anniversary', 'celebrate', 'note', 'volume', 'wrapup', 'timeup'].includes(kind) ? 'Pick an occasion.'
        : !title ? 'Add a headline.' : title.length > 80 ? 'Keep the headline under 80 characters.' : text.length > 600 ? 'Keep the message under 600 characters.' : at < now - 120e3 ? 'That time has already passed.' : 'ok';
      if (err !== 'ok') return { error: err };
      let k; do { k = 'R2' + hex(3); } while (this.msgGet(k));
      const end = at + life(kind);
      this.msgPut(k, { t: now, at, id: 'q' + k.toLowerCase() + '-' + stamp(), to: one(f.to), ack: f.ack !== 'no', end, from: one(f.from), kind, onTv: 'no', room, text, label: 'Round2', start: at, title, until: end, status: 'approved', created: now, approved: now, submitted: now });
      if (f.label === 'auto') { const d0 = this.msgGet(k); d0.label = 'Auto wrap-up'; this.msgPut(k, d0); }
      this.qSet(k, room, at, end);
      return { ok: true, code: k };
    }
    if (!staffOk) return { error: 'Wrong staff code.' };
    if (act === 'list') {
      this.msgInit();
      const links = this.rows(`SELECT key, data FROM msgs WHERE endt > ? ORDER BY start`, now - 172800e3).map((r) => ({ key: r.key, data: JSON.parse(r.data) }));
      return { ok: true, now, links };
    }
    if (!['cancel', 'move', 'now', 'push'].includes(act)) return { error: 'Unknown action.' };
    const d = this.msgGet(code || 'NONE');
    const err = !d || !d.room ? 'No such link.' : act === 'cancel' ? (d.status === 'cancelled' ? 'Already cancelled.' : 'ok') : d.status === 'cancelled' ? 'That link was cancelled.'
      : act === 'move' ? (start <= 0 ? 'Pick the new start time.' : start + 10800e3 < now ? 'That time has already passed.' : !roomOk ? 'Pick a room.' : 'ok')
      : d.status !== 'approved' ? 'The guest hasn’t sent a message yet.' : +d.end < now ? 'That booking has finished.' : 'ok';
    if (err !== 'ok') return { error: err };
    if (act === 'cancel') {
      await offTv(d); this.msgPut(code, Object.assign(d, { t: now, status: 'cancelled' })); this.qDel(code);
      return { ok: true };
    }
    if (act === 'move') {
      const newAt = (+d.at || 0) > 0 ? +d.at + start - +d.start : 0, L = life(d.kind);
      await offTv(d);
      this.msgPut(code, Object.assign(d, { t: now, at: newAt, id: (/^R2/.test(code) ? 'q' : 'g') + code.toLowerCase() + '-' + stamp(), end: start + L, onTv: 'no', room, start, until: start + L }));
      if (d.status === 'approved' && newAt) this.qSet(code, room, newAt, start + L); else this.qDel(code);
      return { ok: true };
    }
    if (act === 'now') {
      this.msgPut(code, Object.assign(d, { t: now, at: now, id: (/^R2/.test(code) ? 'q' : 'g') + code.toLowerCase() + '-' + stamp(), onTv: 'no' }));
      return this.msgPush(code);
    }
    return this.msgPush(code);
  }
  /* send one message to its room's TV. A message already on the TV with an earlier time goes first (answer "after":
     the queue tries again then); one with a later time is put back in the queue (it goes again at its own time). */
  async msgPush(code) {
    const env = this.env, now = Date.now(), d = this.msgGet(code); if (!d || !env.TV_KEY) return { error: 'No such link.' };
    const url = FB_BASE + env.TV_KEY + '/' + d.room + '/msg.json';
    const c = await fetch(url).then((x) => x.json()).catch(() => null);
    const wait = c && +c.until > now && c.id !== d.id && +c.at <= +d.at ? Math.max(+c.at + 60e3, +d.at - 60e3) - now : 0;
    if (wait > 0) return { ok: true, after: +c.at, retry: now + wait };
    const ok = await fetch(url, { method: 'PUT', body: JSON.stringify(d) }).then((x) => x.ok).catch(() => false);
    if (!ok) return { error: 'The TV database didn’t take it.' };
    this.msgPut(code, Object.assign(d, { onTv: 'yes', pushed: now }));
    if (c && +c.at > now && c.id !== d.id && /^[gq]/.test(String(c.id || ''))) {   /* a later message was waiting on the TV: back in the queue */
      const bk = String(c.id).slice(1, 9).toUpperCase(), b = this.msgGet(bk);   /* ids: g<code>-… / q<r2code>-… */
      if (b) this.msgPut(bk, Object.assign(b, { onTv: 'no' }));
    }
    return { ok: true };
  }
  /* staff phones signed up for push alerts (/push/*) */
  pushInit() { if (this.pushReady) return; this.pushReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS push (id TEXT PRIMARY KEY, sub TEXT, kinds TEXT, label TEXT, t INTEGER, last TEXT)`); }
  pushSet(id, sub, kinds, label) { this.pushInit(); this.sql.exec(`INSERT OR REPLACE INTO push VALUES (?, ?, ?, ?, ?, NULL)`, id, sub, kinds, label, Date.now()); }
  pushDel(id) { this.pushInit(); this.sql.exec(`DELETE FROM push WHERE id = ?`, id); }
  pushGet(id) { this.pushInit(); const r = this.rows(`SELECT * FROM push WHERE id = ?`, id)[0]; return r ? { id: r.id, sub: JSON.parse(r.sub), kinds: JSON.parse(r.kinds), label: r.label, last: r.last } : null; }
  pushList(kind) { this.pushInit(); return this.rows(`SELECT * FROM push`).map((r) => ({ id: r.id, sub: JSON.parse(r.sub), kinds: JSON.parse(r.kinds) })).filter((r) => !kind || r.kinds.includes(kind)); }
  pushResult(id, res) { this.pushInit(); if (res === 'gone') this.sql.exec(`DELETE FROM push WHERE id = ?`, id); else this.sql.exec(`UPDATE push SET last = ? WHERE id = ?`, JSON.stringify({ t: Date.now(), r: res }), id); }
  holdByBid(bid) { const r = this.rows(`SELECT data FROM holds WHERE status = 'paid' AND CAST(json_extract(data, '$.done.bookingId') AS TEXT) = ? LIMIT 1`, String(bid))[0]; if (!r) return null; const d = JSON.parse(r.data); return { total: d.q && d.q.total, pay: d.pay }; }
  soonMark(k) { this.pushInit(); this.sql.exec(`CREATE TABLE IF NOT EXISTS soon (k TEXT PRIMARY KEY, t INTEGER)`); this.sql.exec(`DELETE FROM soon WHERE t < ?`, Date.now() - 3 * 86400e3);
    if (this.rows(`SELECT 1 FROM soon WHERE k = ?`, k).length) return false; this.sql.exec(`INSERT INTO soon VALUES (?, ?)`, k, Date.now()); return true; }
  /* each booking's last alerted room + times, so "Booking changed" can say "was … now …" */
  bkInit() { if (this.bkReady) return; this.bkReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS bkseen (bid TEXT PRIMARY KEY, unit INTEGER, s INTEGER, e INTEGER, t INTEGER)`); }
  bkGet(bid) { this.bkInit(); const r = this.rows(`SELECT * FROM bkseen WHERE bid = ?`, bid)[0]; return r ? { unit: r.unit, s: r.s, e: r.e } : null; }
  bkPut(bid, x) { this.bkInit(); this.sql.exec(`DELETE FROM bkseen WHERE t < ?`, Date.now() - 200 * 86400e3); this.sql.exec(`INSERT OR REPLACE INTO bkseen VALUES (?, ?, ?, ?, ?)`, bid, x.unit, x.s, x.e, Date.now()); }
  bkDel(bid) { this.bkInit(); this.sql.exec(`DELETE FROM bkseen WHERE bid = ?`, bid); }
  /* auto wrap-up (no Make): the engine's own schedule of "About 10 minutes to go" / "That's a wrap!" per session,
     written straight to the room's TV (Firebase) by the alarm, like the 5-minute reminder */
  autoInit() { if (this.autoReady) return; this.autoReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS autoq (key TEXT, kind TEXT, room TEXT, day TEXT, at INTEGER, gend INTEGER, sent INTEGER DEFAULT 0, PRIMARY KEY (key, kind))`);
    try { this.sql.exec(`ALTER TABLE autoq ADD COLUMN code TEXT`); } catch (e) {} }
  /* since 2 Nov (owner: "where can we see they acknowledge"): each auto message is a Round2 message (R2… code, label
     "Auto wrap-up") sent by the normal message timer, so Round2 messages shows it coming up / on screen / OK'd / history.
     sent = 3 marks those rows (the old direct-to-TV path below only sends sent = 0 rows). */
  autoPut(key, kind, room, day, at, gend, code) { this.autoInit(); this.sql.exec(`INSERT OR REPLACE INTO autoq (key, kind, room, day, at, gend, sent, code) VALUES (?, ?, ?, ?, ?, ?, 3, ?)`, key, kind, room, day, at, gend, code); this.arm(); }
  async autoUndo(where, ...args) {   /* cancel its Round2 messages still to come, then forget them */
    this.autoInit(); const now = Date.now();
    for (const r of this.rows(`SELECT * FROM autoq WHERE ` + where + ` AND code IS NOT NULL AND at > ?`, ...args, now)) await this.msgRoute({ staff: this.env.GM_STAFF, action: 'cancel', code: r.code }).catch(() => null);
    this.sql.exec(`DELETE FROM autoq WHERE ` + where + ` AND (sent = 0 OR (code IS NOT NULL AND at > ?))`, ...args, now);
    this.gmDrop('__LIST__'); this.arm();
  }
  autoAll() { this.autoInit(); this.sql.exec(`DELETE FROM autoq WHERE gend < ?`, Date.now() - 2 * 86400e3); return this.rows(`SELECT * FROM autoq`); }
  autoSet(key, kind, room, day, at, gend) { this.autoInit(); this.sql.exec(`INSERT INTO autoq VALUES (?, ?, ?, ?, ?, ?, 0) ON CONFLICT (key, kind) DO UPDATE SET room = excluded.room, day = excluded.day, at = excluded.at, gend = excluded.gend, sent = CASE WHEN autoq.at = excluded.at THEN autoq.sent ELSE 0 END`, key, kind, room, day, at, gend); this.arm(); }
  async autoDel(key) { await this.autoUndo('key = ?', key); }
  async autoClear() { await this.autoUndo('1 = 1'); }   /* switch off: everything it scheduled goes */
  async autoSend() {
    this.autoInit(); const env = this.env, now = Date.now(); if (!env.TV_KEY) return;
    for (const r of this.rows(`SELECT * FROM autoq WHERE sent = 0 AND at <= ?`, now + 5000)) {
      if (now - r.at > 10 * 60e3) { this.sql.exec(`UPDATE autoq SET sent = 2 WHERE key = ? AND kind = ?`, r.key, r.kind); continue; }   /* far too late (engine asleep): skip */
      const base = FB_BASE + env.TV_KEY + '/' + r.room;
      const [c, k] = await Promise.all([fetch(base + '/msg.json').then((x) => x.json()).catch(() => null), fetch(base + '/msgAck.json').then((x) => x.json()).catch(() => null)]);
      /* never push a guest's message off the TV before they've pressed OK: wait, checked every minute */
      if (c && /^g/.test(String(c.id || '')) && c.ack !== false && +c.until > now && +c.at <= now + 60e3 && !(k && k.id === c.id)) { this.sql.exec(`UPDATE autoq SET at = ? WHERE key = ? AND kind = ?`, now + 60e3, r.key, r.kind); continue; }
      const T = R2_TXT[r.kind], m = { id: 'A' + r.kind[0] + now.toString(36), kind: r.kind, title: T.title, text: T.text, from: 'The Round2 team', to: '', ack: true, at: now,
        until: r.kind === 'wrapup' ? now + 4 * 60e3 : r.gend + 15 * 60e3, t: { '.sv': 'timestamp' } };
      const ok = await fetch(base + '/msg.json', { method: 'PUT', body: JSON.stringify(m) }).then((x) => x.ok).catch(() => false);
      this.sql.exec(`UPDATE autoq SET sent = ? WHERE key = ? AND kind = ?`, ok ? 1 : 0, r.key, r.kind);
      if (!ok) this.sql.exec(`UPDATE autoq SET at = ? WHERE key = ? AND kind = ?`, now + 60e3, r.key, r.kind);
      else if (r.kind === 'wrapup') this.nudgeAdd(r.room, now);   /* the 5-minute reminder if nobody presses OK */
      this.fLog({ a: ok ? 'auto ' + r.kind : 'auto ' + r.kind + ' failed', room: r.room });
    }
  }
  autoLock(on) { this.qInit(); const now = Date.now(), r = this.rows(`SELECT v FROM kv WHERE k = 'autoLock'`)[0]; if (on) { if (r && now - +JSON.parse(r.v) < 90e3) return false; this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('autoLock', ?)`, String(now)); return true; } this.sql.exec(`DELETE FROM kv WHERE k = 'autoLock'`); return true; }
  sbAdd(n) { this.qInit(); const k = 'sbn:' + new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); this.kvSet(k, (this.kvGet(k) || 0) + n); }
  kvGet(k) { this.qInit(); const r = this.rows(`SELECT v FROM kv WHERE k = ?`, k)[0]; return r ? JSON.parse(r.v) : null; }
  kvSet(k, v) { this.qInit(); this.sql.exec(`INSERT OR REPLACE INTO kv VALUES (?, ?)`, k, JSON.stringify(v)); }
  pushCount() { this.pushInit(); return this.rows(`SELECT COUNT(*) AS n FROM push`)[0].n; }
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
  /* "Show again at…" (staff page): at that time the engine asks Make to send the message to the TV again ("now") */
  laterInit() { this.qInit(); if (this.laterReady) return; this.laterReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS later (code TEXT PRIMARY KEY, at INTEGER)`); }
  laterSet(code, at) { this.laterInit(); this.sql.exec(`INSERT OR REPLACE INTO later VALUES (?, ?)`, code, +at); this.arm(); }
  laterDel(code) { this.laterInit(); this.sql.exec(`DELETE FROM later WHERE code = ?`, code); }
  laterList() { this.laterInit(); return this.rows(`SELECT * FROM later ORDER BY at`); }
  /* ---- messages follow their booking (docs/guest-messages.md "Follows the booking"): every open guest link with its room
     and start, and the SimplyBook booking it belongs to (bid = the booking in that room starting at exactly that time).
     Every 10 min, and just before a message goes to its TV, the engine looks at SimplyBook: booking moved (time or room)
     → the link moves with it; booking cancelled → the link is cancelled (or, if the same guest has exactly one other
     upcoming booking, i.e. cancel-and-rebook, it moves there). Staff moving a link by hand unbinds it, so the engine
     never fights a manual change; it binds again only if a booking starts exactly at the new room + time. */
  lInit() {
    this.qInit(); if (this.lReady) return; this.lReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS gml (code TEXT PRIMARY KEY, room TEXT, start INTEGER, endt INTEGER, bid TEXT, cid TEXT)`);
    try { this.sql.exec(`ALTER TABLE gml ADD COLUMN cr INTEGER`); } catch (e) {}   /* when the link was made */
    /* paired at creation (owner, 2 Nov): nid = the SimplyBook NOTE it belongs to (WhatsApp / late-session guests), pin = 1 →
       never guessed from old cancelled bookings, miss = when its note was first found gone (cancelled on the 2nd look) */
    for (const c of ['nid TEXT', 'pin INTEGER', 'miss INTEGER', 'warn INTEGER']) { try { this.sql.exec(`ALTER TABLE gml ADD COLUMN ` + c); } catch (e) {} }
    if (!this.rows(`SELECT 1 FROM kv WHERE k = 'fv2'`).length) { this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('fv2', '1')`); this.fSoon(); }
  }
  /* run the follow check about a minute from now (new link learned) */
  fSoon() { this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('followed', ?)`, String(Date.now() - FOLLOW_MS + 60e3)); }
  lSet(code, room, start, endt, bid) { this.lInit(); if (!this.rows(`SELECT 1 FROM gml WHERE code = ?`, code).length) this.sql.exec(`INSERT INTO gml (code, room, start, endt, bid, cid, cr, pin) VALUES (?, ?, ?, ?, ?, NULL, ?, 1)`, code, room || '', +start, +endt, bid ? String(bid) : null, Date.now()); this.arm(); }
  /* Make a guest link: tie it to the booking or note staff picked (or nothing yet: it waits for one at that room + time) */
  lPair(code, room, start, endt, p) {
    this.lInit(); this.sql.exec(`INSERT OR REPLACE INTO gml (code, room, start, endt, bid, cid, cr, nid, pin, miss) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
      code, room || '', +start, +endt, p.bid || null, p.cid || null, Date.now(), p.nid || null); this.arm();
  }
  lGet(code) { this.lInit(); return this.rows(`SELECT * FROM gml WHERE code = ?`, code)[0] || null; }
  /* Late session made a note: a waiting link for exactly that room + arrival is tied to it on the spot (no 10-min wait) */
  lTieWaiting(room, start, nid) {
    this.lInit(); const w = `room = ? AND start = ? AND bid IS NULL AND nid IS NULL AND pin = 1`;
    const n = this.rows(`SELECT COUNT(*) AS n FROM gml WHERE ` + w, room, +start)[0].n;
    if (n) { this.sql.exec(`UPDATE gml SET nid = ?, miss = NULL WHERE ` + w, String(nid), room, +start); this.fLog({ a: 'tied to note', nid: String(nid), room, start: +start, by: 'Late session' }); }
    return n;
  }
  /* heads-up (owner, 2 Nov): still waiting 3 h before its start, made over 20 min ago, not warned yet → warn once */
  lWarnDue() {
    this.lInit(); const now = Date.now();
    const R = this.rows(`SELECT * FROM gml WHERE bid IS NULL AND nid IS NULL AND pin = 1 AND warn IS NULL AND start > ? AND start <= ? AND cr <= ?`, now, now + 3 * 3600e3, now - 20 * 60e3);
    for (const r of R) this.sql.exec(`UPDATE gml SET warn = ? WHERE code = ?`, now, r.code);
    return R;
  }
  /* our own systems swapped a note for a new one (Late session › Change): its links go with it */
  lRenote(oldId, newId) { this.lInit(); this.sql.exec(`UPDATE gml SET nid = ?, miss = NULL WHERE nid = ?`, String(newId), String(oldId)); }
  /* every 10 min (cron): notes don't tell the engine when they change, so links tied to a note (or waiting) get looked at */
  async fNotes() {
    this.lInit(); const now = Date.now();
    if (!this.rows(`SELECT 1 FROM gml WHERE endt > ? AND start > ? AND (nid IS NOT NULL OR (bid IS NULL AND pin = 1))`, now, now - 30 * 60e3).length) return { links: 0 };
    return this.follow(false).catch((e) => this.fLog({ a: 'error', why: String(e.message || e).slice(0, 80) }));
  }
  lSync(links) {
    this.lInit(); const now = Date.now(), keep = new Set();
    for (const x of links || []) {
      const d = x.data || {};
      if (!x.key || /^R2/.test(x.key) || d.status === 'cancelled' || !(+d.end > now) || !(+d.start)) continue;
      keep.add(x.key);
      const o = this.rows(`SELECT * FROM gml WHERE code = ?`, x.key)[0];
      if (!o) { this.sql.exec(`INSERT INTO gml (code, room, start, endt, bid, cid, cr) VALUES (?, ?, ?, ?, NULL, NULL, ?)`, x.key, d.room || '', +d.start, +d.end, +d.created || Date.now()); this.fSoon(); }
      else if (o.room !== (d.room || '') || +o.start !== +d.start) this.sql.exec(`UPDATE gml SET room = ?, start = ?, endt = ?, bid = NULL, cid = NULL, nid = NULL, miss = NULL WHERE code = ?`, d.room || '', +d.start, +d.end, x.key);
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
    /* SimplyBook notes (paired by their id, which stays the same when a note is edited, stretched or dragged) */
    let s2 = null; const nCache = new Map();
    const nMap = (n) => ({ id: String(n.id), unit: +n.provider_id, s: sgMs(n.start_date_time), e: sgMs(n.end_date_time), tb: !!n.time_blocked, txt: String(n.note || '') });
    const notesFor = async (d) => {
      if (!nCache.has(d)) { s2 = s2 || await sb2(env); const nt = await s2('GET', '/admin/calendar-notes?filter[date_from]=' + addDays(d, -1) + '&filter[date_to]=' + addDays(d, 1) + '&on_page=200'); nCache.set(d, ((nt && nt.data) || []).map(nMap)); }
      return nCache.get(d);
    };
    const noteById = async (id, d) => {   /* the note, null = gone, 'unknown' = couldn't tell (leave the link alone) */
      const n = (await notesFor(d)).find((x) => x.id === id); if (n) return n;
      try { const j = await s2('GET', '/admin/calendar-notes/' + id); const x = j && (j.data && j.data.id ? j.data : j); if (x && x.id) return nMap(x); }
      catch (e) { if (/ 404:/.test(String(e.message || e))) return null; }
      for (let p = 1; p <= 6; p++) {   /* moved to another date: look further ahead */
        const nt = await s2('GET', '/admin/calendar-notes?filter[date_from]=' + addDays(day, -1) + '&filter[date_to]=' + addDays(day, 120) + '&on_page=200&page=' + p);
        const P = (nt && nt.data) || [], f = P.find((x) => String(x.id) === id); if (f) return nMap(f);
        if (P.length < 200) return null;
      }
      return 'unknown';
    };
    const slotNotes = async (l) => (await notesFor(sgDay(+l.start))).filter((n) => n.tb && n.unit === UNIT[l.room] && n.s === +l.start && !SYS_RE.test(n.txt) && !EXT_RE.test(n.txt) && n.e - n.s <= 12 * 3600e3);
    let gone = null; const acts = [], bound = new Set(L.map((l) => l.bid).filter(Boolean));
    for (const l of L) {
      if (l.nid) {   /* tied to a note: follow it; deleted → cancelled, but only when it's still gone on a second look */
        let n; try { n = await noteById(l.nid, sgDay(+l.start)); } catch (e) { n = 'unknown'; }
        if (n === 'unknown') { acts.push({ code: l.code, a: 'lost', nid: l.nid }); continue; }
        if (!n) {
          if (!l.miss) acts.push({ code: l.code, a: 'miss', nid: l.nid });
          else if (now - l.miss >= 45e3) acts.push({ code: l.code, a: 'cancel', why: 'its note was deleted', nid: l.nid, room: l.room, from: +l.start });
          continue;
        }
        if (l.miss) acts.push({ code: l.code, a: 'found', nid: l.nid });
        if (!GM_ROOM[n.unit]) { acts.push({ code: l.code, a: 'skip', why: 'room ' + n.unit }); continue; }
        if (n.unit !== UNIT[l.room] || n.s !== +l.start) acts.push({ code: l.code, a: 'nmove', nid: n.id, room: GM_ROOM[n.unit], start: n.s, fromRoom: l.room, from: +l.start });
        continue;
      }
      if (!l.bid) {
        const m = live.filter((b) => b.unit === UNIT[l.room] && b.start === +l.start);
        /* waiting (made with nothing in that slot): ties to whatever lands exactly there – a booking, else a note; never cancelled */
        if (l.pin) {
          if (m.length === 1) { acts.push({ code: l.code, a: 'bind', bid: m[0].id }); if (!dry) this.sql.exec(`UPDATE gml SET bid = ?, cid = ? WHERE code = ?`, m[0].id, m[0].cid, l.code); bound.add(m[0].id); }
          else if (!m.length) { const ns = await slotNotes(l).catch(() => []); if (ns.length === 1) acts.push({ code: l.code, a: 'nbind', nid: ns[0].id }); }
          continue;
        }
        /* older links: a guest on a note in that slot wins over an old cancelled booking (the WhatsApp catch, 2 Nov) */
        if (!m.length) { const ns = await slotNotes(l).catch(() => null); if (ns && ns.length === 1) { acts.push({ code: l.code, a: 'nbind', nid: ns[0].id }); continue; } if (!ns) continue; }
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
    const call = (body) => this.msgRoute(body).catch((e) => 'error ' + e);
    let changed = false;
    for (const x of acts) {
      if (x.a === 'nbind') { this.sql.exec(`UPDATE gml SET nid = ?, miss = NULL, pin = 1 WHERE code = ?`, x.nid, x.code); this.fLog({ code: x.code, a: 'tied to note', nid: x.nid }); continue; }
      if (x.a === 'miss') { this.sql.exec(`UPDATE gml SET miss = ? WHERE code = ?`, now, x.code); this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('followed', ?)`, String(now - FOLLOW_MS + 60e3)); this.fLog({ code: x.code, a: 'note not found (looks again in a minute)', nid: x.nid }); continue; }
      if (x.a === 'found') { this.sql.exec(`UPDATE gml SET miss = NULL WHERE code = ?`, x.code); continue; }
      if (x.a === 'nmove') {
        this.sql.exec(`UPDATE gml SET room = ?, start = ?, endt = ?, nid = ? WHERE code = ?`, x.room, x.start, x.start + 3 * 3600e3, x.nid, x.code);
        const r = await call({ action: 'move', staff: env.GM_STAFF, code: x.code, start: x.start, room: x.room });
        this.fLog({ code: x.code, a: 'move', with: 'note', room: x.room, start: x.start, fromRoom: x.fromRoom, from: x.from, r: String(r).slice(0, 60) }); changed = true; continue;
      }
      if (x.a === 'move' || x.a === 'rebooked') {
        this.sql.exec(`UPDATE gml SET room = ?, start = ?, endt = ?, bid = ?, cid = ? WHERE code = ?`, x.room, x.start, x.start + 3 * 3600e3, x.bid, x.cid, x.code);
        const r = await call({ action: 'move', staff: env.GM_STAFF, code: x.code, start: x.start, room: x.room });
        this.fLog({ code: x.code, a: x.a, room: x.room, start: x.start, fromRoom: x.fromRoom, from: x.from, r: String(r).slice(0, 60) }); changed = true;
      } else if (x.a === 'cancel') {
        this.sql.exec(`DELETE FROM gml WHERE code = ?`, x.code); this.sql.exec(`DELETE FROM gmq WHERE code = ?`, x.code);
        const r = await call({ action: 'cancel', staff: env.GM_STAFF, code: x.code });
        this.fLog({ code: x.code, a: 'cancel', why: x.why, room: x.room, from: x.from, r: String(r).slice(0, 60) }); changed = true;
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
  /* add fields to a hold's data (the SimplyBook contact made before payment) */
  patch(ref, obj) { const h = this.get(ref); if (!h) return; Object.assign(h.data, obj); this.sql.exec(`UPDATE holds SET data = ? WHERE ref = ?`, JSON.stringify(h.data), ref); }
  /* online bookings that need a human (owner, 3 Nov – Denzel paid, no booking): paid but not booked, a fallback used,
     or stuck mid-booking for over 10 minutes */
  problems(since) {
    return this.rows(`SELECT ref, date, unit, s, status, data, created FROM holds WHERE created > ? AND (status = 'booking' OR (status = 'paid' AND (json_extract(data, '$.done.problem') IS NOT NULL OR json_extract(data, '$.done.fallback') IS NOT NULL)))`, since)
      .map((r) => ({ ...r, data: JSON.parse(r.data || '{}') })).filter((r) => r.status !== 'booking' || Date.now() - r.created > 10 * 60e3);
  }
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
  /* "About 5 minutes to go" (owner, 31 Oct): 5 min after "About 10 minutes to go" shows, if nobody pressed OK on it
     (watching a film, on the PlayStation) and it is still the TV's message, the TV gets a 5-minute reminder (needs OK,
     gone before "That's a wrap!"). OK'd the 10-minute one → no 5-minute one. Every Round2 push leaves a check here; the
     check only acts when the TV's message is that reminder. */
  nudgeInit() { this.qInit(); if (this.nudgeReady) return; this.nudgeReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS nudge (room TEXT, base INTEGER, at INTEGER, PRIMARY KEY (room, base))`); }
  nudgeAdd(room, base) { this.nudgeInit(); this.sql.exec(`INSERT OR REPLACE INTO nudge VALUES (?, ?, ?)`, room || '', +base, +base + 5 * 60e3); }
  async nudgeRun() {
    this.nudgeInit(); const env = this.env, now = Date.now();
    for (const r of this.rows(`SELECT * FROM nudge WHERE at <= ?`, now)) {
      this.sql.exec(`DELETE FROM nudge WHERE room = ? AND base = ?`, r.room, r.base);
      if (!env.TV_KEY || now - r.at > 3 * 60e3) continue;   /* too late (engine was asleep): skip */
      const base = FB_BASE + env.TV_KEY + '/' + r.room;
      const [c, k] = await Promise.all([fetch(base + '/msg.json').then((x) => x.json()).catch(() => null), fetch(base + '/msgAck.json').then((x) => x.json()).catch(() => null)]);
      if (!c || c.kind !== 'wrapup' || Math.abs(+c.at - r.base) > 90e3 || (k && k.id === c.id) || /^w5/.test(String(c.id))) continue;
      const m = { id: 'w5' + now.toString(36), kind: 'wrapup', title: 'About 5 minutes to go', from: c.from || 'The Round2 team', to: '',
        text: 'Just a heads-up: about 5 minutes left in this session. A good time to save your game and gather your things. Thanks for playing with us!',
        ack: true, at: now, until: r.base + 9.5 * 60e3, t: { '.sv': 'timestamp' } };
      const ok = await fetch(base + '/msg.json', { method: 'PUT', body: JSON.stringify(m) }).then((x) => x.ok).catch(() => false);
      this.fLog({ a: ok ? '5-minute reminder' : '5-minute reminder failed', why: '10-minute one not OK’d', room: r.room });
    }
  }
  /* credit banners waiting in line behind a message that hasn't been OK'd (sessBanner) */
  bqInit() { this.qInit(); if (this.bqReady) return; this.bqReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS bq (id TEXT PRIMARY KEY, room TEXT, t INTEGER, data TEXT)`); }
  bqAdd(id, room, d) { this.bqInit(); this.sql.exec(`DELETE FROM bq WHERE room = ?`, room); this.sql.exec(`INSERT INTO bq VALUES (?, ?, ?, ?)`, id, room, Date.now(), JSON.stringify(d)); this.arm(); }
  bqDel(id) { this.bqInit(); this.sql.exec(`DELETE FROM bq WHERE id = ?`, id); }
  async bqRun() {
    this.bqInit(); const env = this.env, now = Date.now();
    this.sql.exec(`DELETE FROM bq WHERE t < ?`, now - BANNER_WAIT_MS);
    for (const r of this.rows(`SELECT * FROM bq`)) {
      if (!env.TV_KEY) break;
      const base = FB_BASE + env.TV_KEY + '/' + r.room;
      const [c, k] = await Promise.all([fetch(base + '/msg.json').then((x) => x.json()).catch(() => null), fetch(base + '/msgAck.json').then((x) => x.json()).catch(() => null)]);
      if (tvBusy(c, k, Date.now())) continue;
      const d = JSON.parse(r.data), res = await sessBannerPut(env, r.room, d.b, d.test);
      if (res.shown) { this.sql.exec(`DELETE FROM bq WHERE id = ?`, r.id); this.fLog({ a: 'credit banner shown', why: 'after waiting in line', room: r.room }); }
    }
  }
  /* "In session" extensions (control centre): what each +N hours did, so it can be undone for a while */
  extInit() { this.qInit(); if (this.extReady) return; this.extReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS ext (id TEXT PRIMARY KEY, t INTEGER, data TEXT)`); }
  extPut(id, d) { this.extInit(); this.sql.exec(`DELETE FROM ext WHERE t < ?`, Date.now() - 15 * 86400e3);   /* History keeps 14 nights (owner, 2 Nov) */ this.sql.exec(`INSERT OR REPLACE INTO ext VALUES (?, ?, ?)`, id, Date.now(), JSON.stringify(d)); }
  extGet(id) { this.extInit(); const r = this.rows(`SELECT * FROM ext WHERE id = ?`, id)[0]; return r ? Object.assign(JSON.parse(r.data), { t: r.t }) : null; }
  extList() { this.extInit(); return this.rows(`SELECT * FROM ext WHERE t > ? ORDER BY t DESC LIMIT 200`, Date.now() - 15 * 86400e3).map((r) => Object.assign(JSON.parse(r.data), { id: r.id, t: r.t })); }
  /* In session › Clear finished: off tonight's list (kept in History), only once the session's end has passed */
  extClear(ids) { this.extInit(); const now = Date.now(); let n = 0;
    for (const id of ids) { const d = this.extGet(id); if (!d || d.cleared || !(d.undone || +d.guestEnd < now)) continue; d.cleared = now; delete d.t; this.sql.exec(`UPDATE ext SET data = ? WHERE id = ?`, JSON.stringify(d), id); n++; }
    return n; }
  extDone(id, undone) { const d = this.extGet(id); if (!d) return; d.undone = undone; delete d.t; this.sql.exec(`UPDATE ext SET data = ? WHERE id = ?`, JSON.stringify(d), id); }
  arm() {
    this.qInit();
    const n = this.rows(`SELECT MIN(exp) AS t FROM holds WHERE status = 'pending'`)[0];
    const q = this.rows(`SELECT MIN(at) AS t FROM gmq WHERE pushed = 0`)[0];
    const syn = +((this.rows(`SELECT v FROM kv WHERE k = 'synced'`)[0] || {}).v || 0);
    this.lInit(); this.laterInit();
    const lt = this.rows(`SELECT MIN(at) AS t FROM later`)[0];
    const fl = this.rows(`SELECT COUNT(*) AS n FROM gml WHERE endt > ?`, Date.now())[0].n, fol = +((this.rows(`SELECT v FROM kv WHERE k = 'followed'`)[0] || {}).v || 0);
    const lsy = this.rows(`SELECT 1 FROM kv WHERE k = 'lsynced'`).length;
    this.bqInit(); const bqn = this.rows(`SELECT COUNT(*) AS n FROM bq`)[0].n;
    this.nudgeInit(); const nd = this.rows(`SELECT MIN(at) AS t FROM nudge`)[0];
    this.autoInit(); const au = this.rows(`SELECT MIN(at) AS t FROM autoq WHERE sent = 0`)[0];
    const ts = [bqn ? Date.now() + 30e3 : 0, nd && nd.t ? nd.t : 0, n && n.t ? n.t + 1000 : 0, q && q.t ? q.t - 60e3 : 0, syn ? syn + 86400e3 : 0, fl ? fol + FOLLOW_MS : 0, lsy ? 0 : Date.now() + 2000, lt && lt.t ? lt.t : 0, au && au.t ? au.t : 0].filter((t) => t > 0);
    if (ts.length) this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, Math.min(...ts)));
  }
  /* timer ran out → release the hold and kill its HitPay link */
  async alarm() { try { await this.alarm0(); } finally { if (sbCalls) { this.sbAdd(sbCalls); sbCalls = 0; } } }
  async alarm0() {
    const due = this.rows(`SELECT ref, pr, data FROM holds WHERE status = 'pending' AND exp <= ?`, Date.now());
    for (const d of due) { this.sql.exec(`UPDATE holds SET status = 'released' WHERE ref = ?`, d.ref); let pay = ''; try { pay = JSON.parse(d.data || '{}').pay; } catch (e) {} await cancelLink(envFor(this.env, pay), d.pr); }
    this.sql.exec(`DELETE FROM holds WHERE status = 'released' AND created < ?`, Date.now() - 7 * 86400e3);
    try { await this.qRun(); } catch (e) {}
    try { await this.bqRun(); } catch (e) {}
    try { await this.nudgeRun(); } catch (e) {}
    try { await this.autoSend(); } catch (e) {}
    this.arm();
  }
  async qRun() {
    this.qInit(); const now = Date.now(), env = this.env;
    if (!env.GM_STAFF) return;
    const call = (body) => this.msgRoute(body).catch(() => '');
    /* once a day: rebuild the queue from Make (anything queued another way still goes out) */
    const syn = +((this.rows(`SELECT v FROM kv WHERE k = 'synced'`)[0] || {}).v || 0);
    const lsy = this.rows(`SELECT 1 FROM kv WHERE k = 'lsynced'`).length;   /* first run of "follows the booking": learn every open link once */
    if (!lsy) this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('lsynced', '1')`);   // only ever once, even if Make doesn't answer
    if (now - syn > 86400e3 || !lsy) { try { const j = JSON.parse(await call({ action: 'list', staff: env.GM_STAFF })); if (j.links) this.qSync(j.links); } catch (e) { this.sql.exec(`INSERT OR REPLACE INTO kv VALUES ('synced', ?)`, String(now - 86400e3 + 3600e3)); } }
    this.sql.exec(`DELETE FROM gmq WHERE endt < ?`, now);
    this.laterInit();
    for (const r of this.rows(`SELECT * FROM later WHERE at <= ?`, now + 5000)) {
      this.sql.exec(`DELETE FROM later WHERE code = ?`, r.code);
      const t = await call({ action: 'now', staff: env.GM_STAFF, code: r.code });
      this.fLog({ a: 'shown again', why: String(t).slice(0, 60) });
      this.gmDrop('__LIST__');
    }
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
      let pj = null; try { pj = JSON.parse(t); } catch (e) {}
      if (pj && pj.retry) { this.sql.exec(`UPDATE gmq SET at = ? WHERE code = ?`, pj.retry + 60e3, m.code); continue; }   /* an earlier message is still on the TV: go right after it */
      if (/^R2/.test(m.code)) this.nudgeAdd(m.room, m.at);   /* a 10-minute reminder nobody OK'd gets a 5-minute one */
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
  { const fx = mailFix(email); if (fx) throw new Error('Please check your email – did you mean ' + fx + '?'); }
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
  /* the SimplyBook contact is made BEFORE payment (owner, 3 Nov: "reject payment and booking is safer"): if SimplyBook won't
     take these details, the guest is told now and pays nothing */
  if (env.DRY_RUN !== '1') {
    let c = null; const errs = []; try { c = await sbContact(await admin(env), name, email, phone, errs); } catch (e) { errs.push(String(e.message || e).slice(0, 140)); }
    if (!c) { await hb.release(ref); console.log('[checkout] contact refused: ' + errs.join(' | ')); throw new Error('We couldn’t save your details for the booking – please check your name, email and mobile number. Still stuck? WhatsApp us on +65 9162 5767.'); }
    await hb.patch(ref, { cid: c.cid, cidLate: c.late });
  }
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

/* the email typos guests make most (owner, 3 Nov: Denzel typed gmail.con, SimplyBook refused the contact, he paid and got
   no booking). Asked on the booking page before paying; also used to retry after payment. */
const MAIL_FIX = { 'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmail.coom': 'gmail.com',
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.cpm': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'outlook.con': 'outlook.com', 'outlok.com': 'outlook.com', 'icloud.con': 'icloud.com', 'iclould.com': 'icloud.com', 'iclod.com': 'icloud.com', 'live.con': 'live.com' };
function mailFix(em) {
  const i = String(em).lastIndexOf('@'); if (i < 1) return null;
  const u = em.slice(0, i), dm = em.slice(i + 1).toLowerCase(), f = MAIL_FIX[dm] || (/\.con$/.test(dm) ? dm.replace(/\.con$/, '.com') : null);
  return f ? u + '@' + f : null;
}
/* a SimplyBook contact for this guest: without the email first (so only the confirmation email reaches them), else with it */
async function sbContact(a, name, email, phone, errs) {
  const why = (e) => { if (errs) errs.push(String(e.message || e).slice(0, 140)); return null; };
  let cid = await a('addClient', [{ name, phone }]).catch(why);
  if (cid) return { cid, late: true };
  cid = await a('addClient', [{ name, email, phone }]).catch(why);
  return cid ? { cid, late: false } : null;
}
/* last-but-one resort: one shared "Round2 online guest" contact (the booking note carries the guest's real details) */
async function sbGeneric(env, a) {
  const hb = book(env), k = await hb.kvGet('sbGenericCid'); if (k) return k;
  const f = Object.values((await a('getClientList', ['Round2 online guest', 1]).catch(() => null)) || {})[0];
  const cid = f ? f.id : await a('addClient', [{ name: 'Round2 online guest', email: 'online-guest@round2.sg', phone: '+6591625767' }]).catch(() => null);
  if (cid) await hb.kvSet('sbGenericCid', cid);
  return cid || null;
}
/* the very last resort (owner, 3 Nov: "always make a note booking with phone number and details"): SimplyBook refused the
   booking itself, so the room is blocked with a calendar note carrying everything staff need to reach the guest. Our own
   screens treat it as a session (name first, like Late session notes); the twin room is blocked too. */
async function noteBooking(env, d, q, ref) {
  const s2 = await sb2(env), s = sgMs0(q.date + ' ' + q.time), end = s + (q.hours * 60 + BUF) * 60e3, tw = MIRROR[q.unit], ids = [];
  const nm = String(d.name || 'Guest').replace(/\s+/g, ' ').trim().slice(0, 30);
  const text = `${nm} ${d.pax} pax · ONLINE BOOKING, PAID $${q.total.toFixed(2)} · ref ${ref} · ${d.phone} · ${d.email} · ` +
    `SimplyBook refused a normal booking, so this note holds the room – please turn it into a booking`;
  const body = (u, txt) => ({ provider_id: u, service_id: null, start_date_time: sgStr(s), end_date_time: sgStr(end), note_type_id: 1, note: txt, mode: 'provider', time_blocked: true });
  const r = await s2('POST', '/admin/calendar-notes', body(q.unit, text)); ids.push(String(r.id));
  if (tw) { const r2 = await s2('POST', '/admin/calendar-notes', body(tw, 'SYSTEM BLOCK · ' + ROOMS[q.unit][0] + ' online booking ' + nm + ' till ' + clock12(end - BUF * 60e3))).catch(() => null); if (r2 && r2.id) ids.push(String(r2.id)); }
  return { note: true, noteIds: ids };
}
/* "needs a human" (owner, 3 Nov): every phone with alerts on, a red line in the control centre, and Telegram if set up */
async function humanAlert(env, ref, title, body) {
  const hb = book(env), L = (await hb.kvGet('human')) || [];
  if (!L.some((x) => x.ref === ref && x.title === title)) { L.unshift({ id: Date.now().toString(36), ref, title, body, t: Date.now(), sorted: 0 }); await hb.kvSet('human', L.slice(0, 40)); }
  if (env.VAPID_JWK) {
    const subs = await hb.pushList();
    await Promise.all(subs.map(async (x) => hb.pushResult(x.id, await pushOne(env, x.sub, { kind: 'booking', title, body, tag: 'human-' + ref, url: '/?tab=home' }))));
  }
  await staffAlert(env, title + '\n' + body).catch(() => null);
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
  if (!(await hb.claim(ref))) {   /* the other caller (webhook / redirect) has it: only "booked" if it really is (owner, 3 Nov) */
    h = await hb.get(ref); const dn = h.data.done;
    if (!dn) return { ok: false, pending: true, h: h.data };
    return dn.problem ? { ok: false, err: dn.problem, h: h.data } : { ok: true, already: true, h: h.data };
  }
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
      /* the contact: made before payment (since 3 Nov), else now; then the typo-fixed email, an existing contact, the shared
         "Round2 online guest" contact. Each fallback is noted and staff are told. */
      const how = [];
      let cid = d.cid || null, late = !!d.cidLate;
      const cErr = [];
      if (!cid) { const c = await sbContact(a, d.name, d.email, d.phone, cErr).catch(() => null); if (c) { cid = c.cid; late = c.late; } }
      if (cErr.length) how.push('SimplyBook said: ' + cErr.join(' | '));
      if (!cid) { const fx = mailFix(d.email); if (fx) { cid = await a('addClient', [{ name: d.name, email: fx, phone: d.phone }]).catch(() => null); if (cid) { late = false; how.push('email fixed to ' + fx); } } }
      if (!cid) {
        const p8 = String(d.phone || '').replace(/\D/g, '').slice(-8);
        const found = Object.values((await a('getClientList', [d.email, 1]).catch(() => null)) || {})[0] || Object.values((await a('getClientList', [p8, 1]).catch(() => null)) || {})[0];
        if (found) { cid = found.id; late = false; how.push('their existing SimplyBook contact'); }
      }
      if (!cid) { cid = await sbGeneric(env, a).catch(() => null); if (cid) { late = false; how.push('the shared "Round2 online guest" contact – the guest gets no email'); } }
      /* SimplyBook's own bookings end 15 min after the session (its "buffer after" = cleaning time, e.g. 11:00–14:15 for 3 h),
         so ours do too – the calendar then blocks the cleaning time and nobody can book into it */
      const eB = mins(q.time) + q.hours * 60 + BUF, endDate = eB >= 1440 ? addDays(q.date, 1) : q.date;
      let bk = null, bErr = cid ? '' : 'no contact';
      for (let i = 0; cid && i < 2 && !(bk && bk.bookings && bk.bookings[0]); i++)
        bk = await a('book', [q.eventId, q.unit, cid, q.date, q.time + ':00', endDate, hhmm(eB) + ':00', 0, { [PAX_FIELD]: String(d.pax) }]).catch((e) => { bErr = String(e.message || e).slice(0, 100); return null; });
      const b0 = bk && bk.bookings && bk.bookings[0];
      if (!b0 || !b0.id) {   /* the very last resort: a note holds the room with the guest's phone and details */
        result = await noteBooking(env, d, q, ref);
        how.push('a calendar note holds the room (SimplyBook refused the booking: ' + (bErr || 'no answer') + ')');
      } else result = { bookingId: b0.id, code: b0.code };
      if (how.length) result.fallback = how;
      if (late && result.bookingId) result.email = await a('editClient', [cid, { name: d.name, email: d.email, phone: d.phone }]).then(() => 'ok').catch((e) => 'no: ' + String(e.message || e).slice(0, 60));
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
  await hb.done(ref, result);   /* first, so the guest's page shows the outcome straight away */
  /* paid but not in SimplyBook (slot gone, SimplyBook down…): tell staff straight away so they can call / refund */
  const who = `${q.unit === 11 ? 'Maximillion' : q.room} · ${q.date} ${q.time}–${q.end} (${q.hours}h) · paid $${q.total.toFixed(2)}\n${d.name} · ${d.phone} · ${d.email} · ref ${ref}`;
  if (result.problem) await humanAlert(env, ref, '⚠️ Paid online – NOT booked', result.problem + '\n' + who).catch(() => null);
  else if (result.fallback) await humanAlert(env, ref, result.note ? '⚠️ Paid online – held by a NOTE only' : '⚠️ Online booking – check it', 'Booked using ' + result.fallback.join('; ') + '\n' + who).catch(() => null);
  else if (result.email && result.email !== 'ok') await humanAlert(env, ref, '⚠️ Online booking – no email reached the guest', 'SimplyBook refused the email (' + result.email + '). Booked fine – WhatsApp them the details.\n' + who).catch(() => null);
  if (!result.problem && !result.dryRun) await staffAlert(env, `🎮 NEW ONLINE BOOKING\n${q.unit === 11 ? 'Maximillion' : q.room} · ${q.date} ${q.time}–${q.end} (${q.hours}h)\n${d.name} · ${d.pax} guests · ${d.phone}\nPaid $${q.total.toFixed(2)}${d.pay === 'test' ? ' (TEST – sandbox, cancel it)' : ''} · ref ${ref}${d.msg ? '\nTV message: ' + d.msg.kind : ''}`).catch(() => null);
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
    const t = await gmFwd(env, body); let j; try { j = JSON.parse(t); } catch (e) { throw new Error('Messages: ' + String(t).slice(0, 60)); }
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

/* ---------- In session (control centre tab "In session"): today's sessions per room, and +1/+2/+3 hour extensions ----------
   An extension is ALWAYS recorded the way staff do it by hand (docs/booking-times.md "Extensions as calendar notes"):
   stacked 1-hour time-blocked SimplyBook notes tagged EXT, starting at the session's SimplyBook end (each hour already
   holds the 15-min cleaning). Vale and Atlas are one space: the twin room gets the same notes (tagged SYSTEM BLOCK), the
   same way the Make mirror blocks the twin with a SYSTEM BLOCK booking. Mirror blocks are never shown as sessions.
   Then "About 10 minutes to go" and "That's a wrap!" move to the new end (or are made if there were none), and the TV
   shows "+N CREDITS ADDED" (no OK needed unless staff tick it). Undo puts everything back. */
const SYS_CLIENTS = ['2472', '2476'];          /* Make mirror's SYSTEM BLOCK clients (in Atlas for a Vale booking, in Vale for an Atlas one) */
const SYS_RE = /SYSTEM\s*BLOCK/i, EXT_RE = /\bEXT\b/i, LATE_RE = /late till [0-9:]+[ap]m/i;
const sgMs0 = (t) => { const m = String(t || '').match(/(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - 8 * 3600e3 : 0; };
const sgStr = (ms) => new Date(ms + 8 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
const sgDay = (ms) => new Date(ms + 8 * 3600e3).toISOString().slice(0, 10);
const FB_BASE = 'https://round2-tv-default-rtdb.asia-southeast1.firebasedatabase.app/r2/';
const R2_TXT = {
  wrapup: { title: 'About 10 minutes to go', text: 'Just a heads-up: this session wraps up in about 10 minutes. A good time to save your game and gather your things. Thanks for playing with us!' },
  timeup: { title: 'That’s a wrap!', text: 'This session has come to an end. We hope you had a great time! Please save your game and gather your things, so we can get the room ready for the next guests. See you again soon!' },
};
/* one timer tick reads each day from SimplyBook once, shared by the 1-hour reminder, Auto wrap-up and the clean-up
   (env.__tick is only set on the timer's own env, so screens and buttons always read fresh) */
function sessDay(env, day) {
  const M = env.__tick; if (!M) return sessDay0(env, day);
  if (!M.has(day)) M.set(day, sessDay0(env, day).catch((e) => { M.delete(day); throw e; }));
  return M.get(day);
}
async function sessDay0(env, day) {
  const a = await admin(env), s2 = await sb2(env);
  const [bk, nt] = await Promise.all([
    a('getBookings', [{ booking_type: 'non_cancelled', date_from: addDays(day, -1), date_to: day }]),
    s2('GET', '/admin/calendar-notes?filter[date_from]=' + addDays(day, -1) + '&filter[date_to]=' + day + '&on_page=200'),
  ]);
  const d0 = sgMs0(day + ' 00:00'), d1 = d0 + 86400e3 + 6 * 3600e3, items = [];
  for (const b of Object.values(bk || {})) {
    const s = sgMs0(b.start_date || b.start_date_time), e = sgMs0(b.end_date || b.end_date_time);
    if (!s || !e || e <= d0 || s >= d1 || !ROOMS[+b.unit_id]) continue;
    const name = String(b.client || b.client_name || ''), cid = String(b.client_id || '');
    items.push({ k: 'b', id: String(b.id), unit: +b.unit_id, s, e, name, cid, phone: String(b.client_phone || ''), sys: SYS_CLIENTS.includes(cid) || SYS_RE.test(name), code: String(b.code || '') });
  }
  for (const n of ((nt && nt.data) || [])) {
    const s = sgMs0(n.start_date_time), e = sgMs0(n.end_date_time), unit = +n.provider_id;
    if (!n.time_blocked || !s || !e || e <= d0 || s >= d1 || !ROOMS[unit]) continue;
    const txt = String(n.note || '');
    items.push({ k: 'n', id: String(n.id), unit, s, e, name: txt, sys: SYS_RE.test(txt), ext: EXT_RE.test(txt), blk: e - s > 12 * 3600e3 });
  }
  /* sessions = a booking (or a WhatsApp note) + the EXT notes stacked straight after it */
  const out = [];
  for (const u of Object.keys(ROOMS).map(Number)) {
    const its = items.filter((x) => x.unit === u && !x.blk).sort((x, y) => x.s - y.s), used = new Set();
    for (const it of its) {
      if (used.has(it) || (it.k === 'n' && it.ext)) continue;
      used.add(it); const S = { key: it.k + it.id, unit: u, room: GM_ROOM[u], name: it.name, k: it.k, sys: it.sys, phone: it.phone || '', s: it.s, e0: it.e, end: it.e, ext: [] };
      for (;;) { const nx = its.find((x) => !used.has(x) && x.k === 'n' && x.ext && Math.abs(x.s - S.end) <= 5 * 60e3); if (!nx) break; used.add(nx); S.ext.push({ id: nx.id, s: nx.s, e: nx.e, note: nx.name }); S.end = Math.max(S.end, nx.e); }
      out.push(S);
    }
    for (const it of its) if (!used.has(it)) out.push({ key: 'n' + it.id, unit: u, room: GM_ROOM[u], name: it.name, k: 'n', sys: it.sys, orphanExt: true, s: it.s, e0: it.e, end: it.e, ext: [] });
  }
  for (const S of out) S.guestEnd = S.end - BUF * 60e3;
  return { items, sessions: out.filter((S) => S.end > d0 && S.s < d0 + 86400e3) };
}
/* everything that would stand in the way of [from, to) in this room (and its twin), other than the session itself */
function sessClash(day, S, from, to) {
  const tw = MIRROR[S.unit], mine = new Set([S.key, ...S.ext.map((x) => 'n' + x.id)]), out = [];
  const twinSame = (x) => x.unit === tw && Math.abs(x.s - S.s) <= 5 * 60e3;   /* the twin's copy of this session (mirror block) */
  const twinChain = new Set(); if (tw) for (const T of day.sessions.filter((T) => twinSame(T))) { twinChain.add(T.key); T.ext.forEach((x) => twinChain.add('n' + x.id)); }
  for (const x of day.items) {
    if (x.unit !== S.unit && x.unit !== tw) continue;
    const key = x.k + x.id; if (mine.has(key) || twinChain.has(key)) continue;
    if (x.s < to && x.e > from) out.push({ room: ROOMS[x.unit][0], what: x.k === 'b' ? (x.sys ? 'twin room booking' : 'booking: ' + (x.name || 'guest')) : (x.blk ? 'room blocked: ' : 'note: ') + (x.name || '').slice(0, 40), s: x.s, e: x.e });
  }
  /* closing = 11:15pm of the shop night the session belongs to (12am–11am starts count as the night before), checked on
     the GUEST end like the booking page (a guest may end exactly at 11:15pm; the cleaning after it is fine) – time check 2 Nov */
  const closeT = sgMs0(sgDay(S.s - SHADOW_TILL * 60e3) + ' ' + hhmm(CLOSE));
  if (to - BUF * 60e3 > closeT + 60e3) out.push({ room: ROOMS[S.unit][0], what: 'past closing time (11:15pm)', s: closeT, e: to });
  return out;
}
/* the Round2 end-of-session messages for this room around a guest end time */
function sessMsgs(links, room, guestEnd) {
  const L = (links || []).filter((x) => /^R2/.test(x.key) && x.data && x.data.room === room && x.data.status === 'approved');
  const pick = (kind, at) => L.filter((x) => x.data.kind === kind && Math.abs(+x.data.at - at) <= 20 * 60e3).sort((a, b) => Math.abs(+a.data.at - at) - Math.abs(+b.data.at - at))[0] || null;
  const w = pick('wrapup', guestEnd - 10 * 60e3), t = pick('timeup', guestEnd);
  const one = (x) => x && { code: x.key, at: +x.data.at, kind: x.data.kind, onTv: x.data.onTv === 'yes' };
  return { wrapup: one(w), timeup: one(t) };
}
async function makeLinks(env, hb) {
  const L = (await hb.getMode()).msgLocal ? null : await hb.gmGet('__LIST__');
  let raw = L && L.exp > Date.now() && L.link && L.link.raw;
  if (!raw) raw = await gmList(env, hb);
  try { return JSON.parse(raw).links || []; } catch (e) { return []; }
}
async function insess(env, hb, f) {
  const now = Date.now(), day = /^\d{4}-\d\d-\d\d$/.test(f.day || '') ? f.day : sgDay(now - SHADOW_TILL * 60e3);
  const [D, links] = await Promise.all([sessDay(env, day), makeLinks(env, hb)]);
  /* the shop night (owner, 2 Nov): the list is one night – from 7am to 7am – so tonight's after-midnight sessions are on it
     all evening, and it only switches to the next day at 7am. Sessions before 7am of this date belong to last night
     (shown only while still running). */
  { const d0 = sgMs0(day + ' 00:00'); D.sessions = D.sessions.filter((S) => S.s >= d0 + SHADOW_TILL * 60e3 || S.guestEnd > now);
    const D2 = await sessDay(env, addDays(day, 1)), n0 = sgMs0(addDays(day, 1) + ' 00:00');
    for (const S of D2.sessions) if (S.s >= n0 && S.s < n0 + SHADOW_TILL * 60e3 && !D.sessions.some((x) => x.key === S.key)) D.sessions.push(S);
    for (const it of D2.items) if (!D.items.some((x) => x.k === it.k && x.id === it.id)) D.items.push(it); }
  const rooms = {};
  for (const u of Object.keys(ROOMS)) rooms[GM_ROOM[u]] = { unit: +u, name: ROOMS[u][0], twin: MIRROR[u] ? GM_ROOM[MIRROR[u]] : null, sessions: [] };
  for (const S of D.sessions) {
    if (S.sys) continue;                        /* mirror blocks (SYSTEM BLOCK) aren't sessions: the booking shows in its own room */
    const st = now < S.s ? 'next' : now < S.guestEnd ? 'now' : now < S.end ? 'cleaning' : 'done';
    const after = D.items.filter((x) => (x.unit === S.unit || x.unit === MIRROR[S.unit]) && x.s >= S.end - 5 * 60e3 && !(x.k === 'n' && x.ext && x.unit === S.unit) && !(x.unit === MIRROR[S.unit] && x.sys)).sort((a, b) => a.s - b.s)[0];
    rooms[S.room].sessions.push({ key: S.key, k: S.k, name: S.name, phone: S.phone, start: S.s, bookedEnd: S.e0 - BUF * 60e3, guestEnd: S.guestEnd, sbEnd: S.end, ext: S.ext, orphanExt: !!S.orphanExt, st, nextAt: after ? after.s : null, msgs: sessMsgs(links, S.room, S.guestEnd) });
  }
  return { ok: true, day, now, rooms, recent: (await hb.extList()).filter((r) => !/^ZZTEST/.test(r.name || '')).slice(0, 60) };   /* tonight + History; System check tests left out */
}
/* 12-hour clock for note text: 12am, 11:30pm */
function clock12(ms) { const d = new Date(ms + 8 * 3600e3), H = d.getUTCHours(), M = d.getUTCMinutes(); return ((H % 12) || 12) + (M ? ':' + String(M).padStart(2, '0') : '') + (H < 12 ? 'am' : 'pm'); }
/* which note an extension stretches: the session's last EXT note (else a new one); in the twin, the EXT/SYSTEM BLOCK note
   that ends where the session ends now (else a new one) */
function extNotePlan(D, S, to) {
  const last = S.ext.length ? S.ext[S.ext.length - 1] : null, tw = MIRROR[S.unit];
  /* a Late session note (owner, 1 Nov): no EXT note – the note itself is stretched and its text rewritten
     ("karen 2 pax · late till 1am"), so the part SimplyBook shows before 12am tells the new end. Bookings and
     ordinary notes keep the EXT note. Same for its Vale/Atlas twin ("SYSTEM BLOCK · Vale late till …"). */
  if (S.k === 'n' && !last && LATE_RE.test(S.name)) {
    const main = { unit: S.unit, late: true, edit: { id: S.key.slice(1), s: S.s, e: S.e0, note: S.name } };
    let twin = null;
    if (tw) {
      const t = D.items.filter((x) => x.unit === tw && x.k === 'n' && x.sys && LATE_RE.test(x.name) && Math.abs(x.s - S.s) <= 5 * 60e3 && Math.abs(x.e - S.end) <= 5 * 60e3)[0];
      twin = t ? { unit: tw, twin: true, late: true, edit: { id: t.id, s: t.s, e: t.e, note: t.name } } : { unit: tw, twin: true, edit: null };
    }
    return { main, twin };
  }
  const main = { unit: S.unit, edit: last ? { id: String(last.id), s: last.s, e: last.e, note: last.note } : null };
  let twin = null;
  if (tw) {
    const t = D.items.filter((x) => x.unit === tw && x.k === 'n' && !x.blk && x.ext && Math.abs(x.e - S.end) <= 5 * 60e3).sort((a, b) => b.e - a.e)[0];
    twin = { unit: tw, twin: true, edit: t ? { id: t.id, s: t.s, e: t.e, note: t.name } : null };
  }
  return { main, twin };
}
/* put SimplyBook notes back: delete the ones made, restore the ones stretched */
async function extRevert(s2, list) {
  const probs = [];
  for (const n of (list || []).slice().reverse()) {
    try {
      if (n.made || !n.was) await s2('DELETE', '/admin/calendar-notes/' + n.id);
      else await s2('PUT', '/admin/calendar-notes/' + n.id, { provider_id: n.unit, service_id: null, start_date_time: sgStr(n.was.s), end_date_time: sgStr(n.was.e), note_type_id: 1, note: n.was.note, mode: 'provider', time_blocked: true });
    } catch (e) { probs.push('note ' + n.id + ': ' + String(e.message || e).slice(0, 60)); }
  }
  return probs;
}
async function extend(env, hb, f) {
  const now = Date.now(), test = !!f.test, day = /^\d{4}-\d\d-\d\d$/.test(f.day || '') ? f.day : sgDay(now - SHADOW_TILL * 60e3), today = day === sgDay(now - SHADOW_TILL * 60e3);
  const h = +f.hours, ack = f.ack === 'yes';
  if (![1, 2, 3].includes(h)) return { error: 'Pick +1, +2 or +3 hours.' };
  /* the tab's Test button: just the banner, on the TV staff picked (use an empty room) – nothing else changes */
  if (test && !f.key) {
    const room = String(f.room || ''); if (!Object.values(GM_ROOM).includes(room)) return { error: 'Pick a room for the test.' };
    const banner = { title: '+' + h + ' CREDIT' + (h > 1 ? 'S' : '') + ' ADDED', text: 'Your session has been extended by ' + h + ' hour' + (h > 1 ? 's' : '') + '.', ack };
    return { ok: true, test: true, banner: await sessBanner(env, room, banner, true, hb) };
  }
  let D = await sessDay(env, day), S = D.sessions.find((x) => x.key === String(f.key || ''));
  if (!S) { const D2 = await sessDay(env, addDays(day, 1)), S2 = D2.sessions.find((x) => x.key === String(f.key || '')); if (S2) { D = D2; S = S2; } }   /* tonight's after-midnight session */
  if (!S || S.sys) return { error: 'That session isn’t in SimplyBook any more. Refresh.' };
  if (f.end && +f.end !== S.end) return { error: 'This session changed since you looked (someone already extended it?). Refresh and check.' };
  { const nd = sgDay(S.end + h * 3600e3); if (nd !== sgDay(S.s)) { const Dx = await sessDay(env, nd); for (const it of Dx.items) if (!D.items.some((x) => x.k === it.k && x.id === it.id)) D.items.push(it); } }   /* an extension past midnight sees the next day's notes/bookings too */
  const from = S.end, to = S.end + h * 3600e3, newGuest = to - BUF * 60e3, tw = MIRROR[S.unit];
  const clash = sessClash(D, S, from, to);
  const links = today ? await makeLinks(env, hb) : [];
  const old = sessMsgs(links, S.room, S.guestEnd);
  const plan = { room: ROOMS[S.unit][0], twin: tw ? ROOMS[tw][0] : null, name: S.name, hours: h, guestEndWas: S.guestEnd, guestEnd: newGuest, sbEnd: to,
    notes: [{ s: from, e: to }], note: extNotePlan(D, S, to),
    wrapup: { at: newGuest - 10 * 60e3, was: old.wrapup && old.wrapup.at, make: !old.wrapup }, timeup: { at: newGuest, was: old.timeup && old.timeup.at, make: !old.timeup },
    banner: { title: '+' + h + ' CREDIT' + (h > 1 ? 'S' : '') + ' ADDED', text: 'Your session has been extended by ' + h + ' hour' + (h > 1 ? 's' : '') + '.', ack }, clash };
  if (test) {   /* test: nothing in SimplyBook or the message queue changes; only this room's TV shows the banner (marked TEST) */
    const b = await sessBanner(env, S.room, plan.banner, true, hb);
    return { ok: true, test: true, plan, banner: b };
  }
  if (f.dry) return { ok: true, dry: true, plan };
  if (clash.length && f.force !== 'yes') return { ok: false, clash: true, plan };
  /* ONE note per room (owner, 31 Oct: easy to read on the phone): the session's EXT note is stretched to the new end and
     its text rewritten ("EXT till 12am · Amanda"); only if there's none yet is one made. Same for the Vale/Atlas twin. */
  const s2 = await sb2(env), done = [], who = (S.name || 'guest').replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 14);
  const body = (unit, st, en, text) => ({ provider_id: unit, service_id: null, start_date_time: sgStr(st), end_date_time: sgStr(en), note_type_id: 1, note: text, mode: 'provider', time_blocked: true });
  try {
    for (const N of [plan.note.main, plan.note.twin].filter(Boolean)) {
      const text = N.late ? String(N.edit.note).replace(LATE_RE, 'late till ' + clock12(N.twin ? to : newGuest))
        : N.twin ? 'SYSTEM BLOCK · EXT ' + ROOMS[S.unit][0] + ' till ' + clock12(to) : 'EXT till ' + clock12(newGuest) + ' · ' + who;
      if (N.edit) {
        await s2('PUT', '/admin/calendar-notes/' + N.edit.id, body(N.unit, N.edit.s, to, text));
        done.push({ unit: N.unit, id: N.edit.id, was: { s: N.edit.s, e: N.edit.e, note: N.edit.note } });
      } else {
        const r = await s2('POST', '/admin/calendar-notes', body(N.unit, from, to, text));
        done.push({ unit: N.unit, id: String(r.id), made: true });
      }
    }
  } catch (e) {
    await extRevert(s2, done);
    return { error: 'SimplyBook didn’t take the extension, nothing was changed: ' + String(e.message || e).slice(0, 120) };
  }
  const made = done;
  const rec = { room: S.room, unit: S.unit, key: S.key, name: S.name, hours: h, notes: made, guestEndWas: S.guestEnd, guestEnd: newGuest, moved: [], created: [], problems: [] };
  if (today) {
    const md = await hb.getMode(), autoOn = !!md.autoEnd && !(md.autoOff || []).includes(S.key);
    const call = async (body) => { const t = await gmFwd(env, Object.assign({ staff: env.GM_STAFF }, body)); let j = null; try { j = JSON.parse(t); } catch (e) {} if (!j || j.error) throw new Error((j && j.error) || 'Make didn’t answer'); return j; };
    for (const kind of ['wrapup', 'timeup']) {
      const at = plan[kind].at, cur = old[kind];
      try {
        if (cur) { await call({ action: 'move', code: cur.code, start: at, room: S.room }); rec.moved.push({ code: cur.code, from: cur.at, to: at }); }
        else if (f.msgs === 'no' || autoOn) continue;   /* toggle off, or Auto wrap-up handles it (no Make): don't add new ones – existing ones still move */
        else { const j = await call({ action: 'r2', room: S.room, kind, to: '', from: 'The Round2 team', title: R2_TXT[kind].title, text: R2_TXT[kind].text, ack: 'yes', at }); rec.created.push({ code: j.code || j.key || '', at, kind }); }
      } catch (e) { rec.problems.push(kind + ': ' + String(e.message || e).slice(0, 80)); }
    }
    await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null);
    rec.banner = await sessBanner(env, S.room, plan.banner, false, hb);
  }
  const id = 'x' + now.toString(36);
  await hb.extPut(id, rec);
  await autoRun(env, 'extended').catch(() => null);   /* Auto wrap-up follows the new end straight away */
  await shadowSync(env, [sgDay(S.s - SHADOW_TILL * 60e3)]).catch(() => null);   /* the 11:30pm label shows the new end */
  return { ok: true, id, plan, done: rec };
}
/* In session › "+ Late session" (owner, 1 Nov): a WhatsApp / walk-in session keyed in by staff, including ones running
   past midnight (SimplyBook's own calendar closes at midnight; its API takes notes past it). The engine writes ONE
   calendar note from arrival to guest end + 15 min cleaning, text "<name> <pax> pax · late till 1am · control centre",
   so In session, the 1-hour reminder, +1h and "That's a wrap!" read it like any session. Vale/Atlas: the twin gets a
   SYSTEM BLOCK note too. dry=1 → the plan and any clash, nothing written. */
/* ===== Auto end-of-session messages (owner, 1 Nov) =====
   Switch (TV messages › Auto end messages, staff code): when on, every session today – SimplyBook bookings and calendar
   notes, late sessions too – gets "About 10 minutes to go" (guest end − 10 min) and "That's a wrap!" (guest end) as
   soon as the engine sees it, and they're kept in sync every 10 minutes and on every SimplyBook change:
   new session → added; moved / extended → moved; gone (cancelled, note deleted) → cancelled.
   NO MAKE (owner, 1 Nov: Make credits): the engine keeps its own schedule (Durable Object table autoq) and its alarm
   writes the message straight to the room's TV in Firebase, like the 5-minute reminder; a guest message not OK'd yet
   goes first. Messages someone already set (+1h, Late session, Round2 messages) are left alone, never doubled; while the
   switch is on, +1h and Late session don't add new ones themselves. A session can be set to "off". Skips SYSTEM BLOCKs
   and stray EXT notes. More than 4 sessions gone at once → nothing cancelled, logged. */
async function autoRun(env, why) {
  const hb = book(env), mode = await hb.getMode();
  if (!mode.autoEnd || !env.GM_STAFF) return { off: true };
  if (!(await hb.autoLock(true))) return { busy: true };   /* one run at a time (cron + SimplyBook ping together) */
  try { return await autoRun2(env, hb, mode, why); } finally { await hb.autoLock(false); }
}
async function autoRun2(env, hb, mode, why) {
  const now = Date.now(), sg = new Date(now + 8 * 3600e3), hm = sg.getUTCHours() * 60 + sg.getUTCMinutes(), today = sgDay(now);
  /* the shop night (owner, 2 Nov): tonight = this date from 7am + tomorrow's sessions before 7am; switches at 7am */
  const N = sgDay(now - SHADOW_TILL * 60e3), days = [N];
  const sess = [];
  for (const S of (await sessDay(env, N)).sessions) if (!S.sys && !S.orphanExt && ROOMS[S.unit] && !sess.some((x) => x.key === S.key)) sess.push(S);
  const tm = addDays(N, 1), m0 = sgMs0(tm + ' 00:00'), allTm = new Set();
  for (const S of (await sessDay(env, tm)).sessions) { allTm.add(S.key); if (S.s >= m0 && S.s < m0 + SHADOW_TILL * 60e3 && !S.sys && !S.orphanExt && ROOMS[S.unit] && !sess.some((x) => x.key === S.key)) sess.push(S); }
  days.push(tm);
  const off = new Set(mode.autoOff || []), rows = await hb.autoAll(), q = await hb.qList(), log = { t: now, why, made: 0, moved: 0, cancelled: 0, adopted: 0, problems: [] };
  const own = new Set(rows.filter((r) => r.code).map((r) => r.code)), pending = (r) => !r.sent || (r.code && r.at > now);
  const call = async (body) => { const t = await gmFwd(env, Object.assign({ staff: env.GM_STAFF }, body)); let j = null; try { j = JSON.parse(t); } catch (e) {} if (!j || j.error) throw new Error((j && j.error) || 'no answer'); return j; };
  for (const S of sess) {
    if (S.guestEnd <= now + 60e3) continue;
    const mine = rows.filter((r) => r.key === S.key);
    if (off.has(S.key)) { if (mine.some(pending)) { await hb.autoDel(S.key); log.cancelled++; } continue; }
    /* someone already set Round2 messages for this end (+1h, Late session, Round2 messages): leave it to those */
    const byHand = q.filter((m) => /^R2/.test(m.code) && !own.has(m.code) && m.room === S.room && (Math.abs(m.at - S.guestEnd) <= 5 * 60e3 || Math.abs(m.at - (S.guestEnd - 10 * 60e3)) <= 5 * 60e3));
    if (byHand.length && !mine.length) { log.adopted++; continue; }
    for (const kind of ['wrapup', 'timeup']) {
      const at = kind === 'wrapup' ? S.guestEnd - 10 * 60e3 : S.guestEnd, r = mine.find((x) => x.kind === kind);
      if (r && r.code && r.at === at && r.room === S.room) continue;
      if (r && (r.code ? r.at <= now : r.sent === 1) ) continue;   /* already on the TV */
      if (at <= now) continue;
      try {
        if (r && r.code) { await call({ action: 'move', code: r.code, start: at, room: S.room }); await hb.autoPut(S.key, kind, S.room, sgDay(S.s), at, S.guestEnd, r.code); log.moved++; }
        else {
          const j = await call({ action: 'r2', room: S.room, kind, to: '', from: 'The Round2 team', title: R2_TXT[kind].title, text: R2_TXT[kind].text, ack: 'yes', at, label: 'auto' });
          await hb.autoPut(S.key, kind, S.room, sgDay(S.s), at, S.guestEnd, j.code); log.made++;
        }
      } catch (e) { log.problems.push(S.room + ' ' + kind + ': ' + String(e.message || e).slice(0, 60)); }
    }
  }
  /* sessions that are gone (cancelled / deleted) – only for the days just read */
  const keys = [...new Set(rows.filter((r) => days.includes(r.day) && pending(r) && r.gend > now && !sess.some((S) => S.key === r.key) && !(r.day === tm && allTm.has(r.key))).map((r) => r.key))];   /* tomorrow's daytime sessions aren't "gone", just not tonight */
  if (keys.length > 4) log.problems.push(keys.length + ' sessions vanished at once – nothing cancelled, check SimplyBook');
  else for (const k of keys) { await hb.autoDel(k); log.cancelled++; }
  if (log.made || log.moved || log.cancelled) { await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null); }
  if (log.made || log.moved || log.cancelled || log.problems.length || why !== 'cron') await hb.kvSet('autoLast', log);
  return log;
}
/* the Auto end messages page: the switch, and today's sessions with their two messages */
async function autoApi(env, hb, f) {
  const mode = await hb.getMode();
  if (f.set === 'on' || f.set === 'off') { mode.autoEnd = f.set === 'on'; mode.autoBy = String(f.by || '').slice(0, 30); mode.autoT = Date.now(); await hb.setMode(mode); if (mode.autoEnd) await autoRun(env, 'switched on'); else await hb.autoClear(); }
  if (f.key && (f.sess === 'on' || f.sess === 'off')) { const s2 = new Set(mode.autoOff || []); if (f.sess === 'off') s2.add(String(f.key)); else s2.delete(String(f.key)); mode.autoOff = [...s2].slice(-200); await hb.setMode(mode); if (f.sess === 'off') await hb.autoDel(String(f.key)); if (mode.autoEnd && f.sess === 'on') await autoRun(env, 'session on'); }
  if (f.run) await autoRun(env, 'run now');
  const now = Date.now(), N = sgDay(now - SHADOW_TILL * 60e3), days = [N], m2 = await hb.getMode();   /* the shop night (7am to 7am) */
  const recs = await hb.autoAll(), off = new Set(m2.autoOff || []), list = [];
  const tm = addDays(N, 1), m0 = sgMs0(tm + ' 00:00'); days.push(tm);   /* tonight's after-midnight sessions too */
  for (const d of days) for (const S of (await sessDay(env, d)).sessions) {
    if (S.sys || S.orphanExt || !ROOMS[S.unit] || list.some((x) => x.key === S.key)) continue;
    if (d === tm && !(S.s >= m0 && S.s < m0 + SHADOW_TILL * 60e3)) continue;
    const mine = recs.filter((x) => x.key === S.key), w = mine.find((x) => x.kind === 'wrapup'), t = mine.find((x) => x.kind === 'timeup');
    list.push({ key: S.key, room: S.room, unit: S.unit, name: String(S.name || '').slice(0, 40), k: S.k, s: S.s, guestEnd: S.guestEnd, done: S.guestEnd <= now, off: off.has(S.key),
      msgs: mine.length ? { w: !!w, t: !!t, wAt: w && w.at, tAt: t && t.at, wSent: !!w && (w.code ? w.at <= now : w.sent === 1), tSent: !!t && (t.code ? t.at <= now : t.sent === 1), wCode: w && w.code, tCode: t && t.code, own: true, synced: !!t && t.gend === S.guestEnd } : null });
  }
  const q = await hb.qList(), own = new Set(recs.filter((r) => r.code).map((r) => r.code));
  for (const x of list) if (!x.msgs && q.some((m) => /^R2/.test(m.code) && !own.has(m.code) && m.room === x.room && (Math.abs(m.at - x.guestEnd) <= 5 * 60e3 || Math.abs(m.at - (x.guestEnd - 10 * 60e3)) <= 5 * 60e3))) x.msgs = { w: true, t: true, own: false, synced: true };
  return { ok: true, on: !!m2.autoEnd, by: m2.autoBy || '', t: m2.autoT || 0, now, last: await hb.kvGet('autoLast'), cronLast: await hb.kvGet('cronLast'), cronPrev: await hb.kvGet('cronPrev'), sbToday: await hb.kvGet('sbn:' + sgDay(now)), sbYesterday: await hb.kvGet('sbn:' + addDays(sgDay(now), -1)), orphanLast: await hb.kvGet('orphanLast'), sessions: list.sort((a, b) => a.guestEnd - b.guestEnd) };
}
const sgDayName = (ms) => new Date(ms + 8 * 3600e3).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/,/g, '');
async function late(env, hb, f) {
  const unit = +f.unit, day = String(f.day || ''), st = String(f.start || ''), en = String(f.end || '');
  if (!ROOMS[unit]) return { error: 'Pick a room.' };
  if (!/^\d{4}-\d\d-\d\d$/.test(day) || !/^\d\d:\d\d$/.test(st) || !/^\d\d:\d\d$/.test(en)) return { error: 'Pick the date, arrival time and end time.' };
  if (+st.slice(3) % 15 || +en.slice(3) % 15) return { error: 'Times go in 15-minute steps (like bookings).' };
  const name = String(f.name || '').replace(/\s+/g, ' ').trim().slice(0, 40), pax = Math.max(0, Math.min(20, parseInt(f.pax, 10) || 0));
  if (!name) return { error: 'Type the guest’s name.' };
  if (!pax) return { error: 'Type how many pax (it decides the room set-up and controllers).' };
  const s = sgMs0(day + ' ' + st); let guestEnd = sgMs0(day + ' ' + en); if (guestEnd <= s) guestEnd += 86400e3;   /* end after midnight */
  const blockEnd = guestEnd + BUF * 60e3, hrs = (guestEnd - s) / 3600e3;
  if (hrs < 0.5 || hrs > 12) return { error: 'That’s ' + (Math.round(hrs * 10) / 10) + ' hours – check the times.' };
  if (s < Date.now() - 12 * 3600e3 || s > Date.now() + 120 * 86400e3) return { error: 'That date is too far back or ahead.' };
  /* clash: anything already in this room (or its twin) between arrival and the end of cleaning */
  const days = [day]; if (sgDay(blockEnd - 1) !== day) days.push(sgDay(blockEnd - 1));
  const items = []; for (const d of days) for (const it of (await sessDay(env, d)).items) if (!items.some((x) => x.k === it.k && x.id === it.id)) items.push(it);
  const tw = MIRROR[unit], room = ROOMS[unit][0];
  /* change an existing session (Upcoming late sessions › Change): its own notes don't count as a clash, and they're
     replaced by the new one (put back if SimplyBook refuses the new one) */
  const old = f.replace ? await lateFind(env, String(f.replace), String(f.oldDay || '')) : null;
  if (f.replace && !old) return { error: 'That session isn’t in SimplyBook any more. Refresh the list.' };
  const skip = new Set(old ? old.notes.map((n) => n.id) : []);
  const clash = items.filter((it) => (it.unit === unit || it.unit === tw) && it.s < blockEnd && it.e > s && !(it.k === 'n' && skip.has(it.id)))
    .map((it) => ({ room: ROOMS[it.unit][0], what: it.k === 'b' ? 'booking' : it.blk ? 'room blocked' : 'note', name: String(it.name || '').slice(0, 40), from: clock12(it.s), to: clock12(it.e) }));
  /* the room must also be open in SimplyBook (day off, break, closed): the booking page asks SimplyBook the same thing
     (system check 2 Nov: Kaeden had no free slots online but Late session saw nothing). Only the part inside opening
     hours can be checked; past closing is staff's call. Not for Change (its own old note would count). */
  if (!f.replace && !clash.some((c) => c.room === room)) {
    const d0 = sgMs0(day + ' 00:00'), sM = (s - d0) / 60e3, eM = Math.min((blockEnd - d0) / 60e3, CLOSE);
    if (sM >= 11 * 60 && sM < CLOSE && eM > sM) {
      try {
        const ph = await holidays(), dow = new Date(day + 'T00:00:00Z').getUTCDay(), dt = dow === 0 || dow === 5 || dow === 6 || ph.has(day) ? 'peak' : 'off';
        const gaps = await gapsFor(await pub(env), day, unit, dt);
        if (!gaps.some(([a, b]) => a <= sM && b >= eM)) clash.push({ room, what: 'SimplyBook', name: 'shows ' + room + ' closed or unavailable then (day off, break or block)', from: clock12(s), to: clock12(d0 + eM * 60e3) });
      } catch (e) {}
    }
  }
  const text = name + ' ' + pax + ' pax · late till ' + clock12(guestEnd) + ' · control centre';
  /* "About 10 minutes to go" + "That's a wrap!" on the TV (toggle, default on): only for sessions starting within 24 h,
     so a session cancelled days later doesn't leave messages behind on an empty room's TV */
  const autoOn = !!(await hb.getMode()).autoEnd;
  const wantMsgs = f.msgs !== 'no' && !autoOn, soonEnough = s - Date.now() < 24 * 3600e3 && guestEnd > Date.now() + 10 * 60e3;
  const plan = { room, twin: tw ? ROOMS[tw][0] : null, name, pax, arrives: clock12(s), guestEnd: clock12(guestEnd), blockEnd: clock12(blockEnd), hours: Math.round(hrs * 100) / 100,
    nextDay: sgDay(guestEnd) !== day, arrivesDay: sgDayName(s), leavesDay: sgDayName(guestEnd), text, clash, msgs: f.msgs === 'no' ? 'off' : autoOn ? 'auto' : wantMsgs ? (soonEnough ? { wrapup: clock12(guestEnd - 10 * 60e3), timeup: clock12(guestEnd) } : 'later') : 'off' };
  if (f.dry) return { ok: true, dry: true, plan };
  if (clash.length && f.force !== 'yes') return { ok: false, clash: true, plan };
  const s2 = await sb2(env), done = [];
  const body = (u, txt) => ({ provider_id: u, service_id: null, start_date_time: sgStr(s), end_date_time: sgStr(blockEnd), note_type_id: 1, note: txt, mode: 'provider', time_blocked: true });
  if (old) {
    const pr = await lateDel(s2, old.notes);
    if (pr.length) { await lateRestore(s2, old.notes.filter((n) => !pr.some((x) => x.startsWith('note ' + n.id + ':'))), hb).catch(() => null); return { error: 'SimplyBook didn’t let go of the old note, nothing was changed: ' + pr.join('; ').slice(0, 120) }; }
    await lateMsgsCancel(env, hb, old.S).catch(() => null);
  }
  try {
    const r = await s2('POST', '/admin/calendar-notes', body(unit, text)); done.push({ unit, id: String(r.id), made: true });
    if (tw) { const r2 = await s2('POST', '/admin/calendar-notes', body(tw, 'SYSTEM BLOCK · ' + room + ' late till ' + clock12(blockEnd))); done.push({ unit: tw, id: String(r2.id), made: true }); }
  } catch (e) {
    await extRevert(s2, done);
    if (old) await lateRestore(s2, old.notes, hb).catch(() => null);
    return { error: 'SimplyBook didn’t take the note, nothing was changed: ' + String(e.message || e).slice(0, 120) + (old ? ' (the old session was put back; its TV messages were cancelled – re-add them in Round2 messages if needed)' : '') };
  }
  if (old && done[0]) await hb.lRenote(old.S.key.slice(1), done[0].id).catch(() => null);   /* guest links follow the new note */
  const tied = done[0] ? await hb.lTieWaiting(GM_ROOM[unit], s, done[0].id).catch(() => 0) : 0;   /* a guest link made first, waiting for this time */
  /* box unticked = no wrap-up messages for this session at all: Auto wrap-up (now or if switched on later) skips it */
  if (f.msgs === 'no' && done[0]) { const m = await hb.getMode(), o = new Set(m.autoOff || []); o.add('n' + done[0].id); m.autoOff = [...o].slice(-200); await hb.setMode(m); }
  const msgs = [];
  if (wantMsgs && soonEnough) {
    for (const kind of ['wrapup', 'timeup']) {
      const at = kind === 'wrapup' ? guestEnd - 10 * 60e3 : guestEnd;
      try {
        const t = await gmFwd(env, { staff: env.GM_STAFF, action: 'r2', room: GM_ROOM[unit], kind, to: '', from: 'The Round2 team', title: R2_TXT[kind].title, text: R2_TXT[kind].text, ack: 'yes', at });
        let j = null; try { j = JSON.parse(t); } catch (e) {}
        msgs.push(j && !j.error ? { kind, at, ok: true } : { kind, at, problem: (j && j.error) || 'Make didn’t answer' });
      } catch (e) { msgs.push({ kind, at, problem: String(e.message || e).slice(0, 80) }); }
    }
    await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null);
  }
  await autoRun(env, 'late session').catch(() => null);
  const nights = new Set(); for (const t of [s, old && old.S.s].filter(Boolean)) nights.add(sgDay(t - SHADOW_TILL * 60e3));   /* AFTER 12AM and TILL labels */
  await shadowSync(env, [...nights]).catch(() => null);
  return { ok: true, plan, notes: done, msgs, replaced: !!old, tied };
}
/* ===== Upcoming late sessions (owner, 1 Nov): list / change / cancel from the Late session page =====
   A session starting after midnight is hidden in SimplyBook's calendar, so staff can't move or delete it there (the
   "↓ AFTER 12AM" marker is only a label). Listed: control-centre late notes, and any time-blocked note that starts
   12am–11am or runs past midnight, for the next 45 days. Only NOTES are ever touched, never bookings. */
async function lateFind(env, id, day) {
  if (!/^\d+$/.test(id) || !/^\d{4}-\d\d-\d\d$/.test(day)) return null;
  const D = await sessDay(env, day), S = D.sessions.find((x) => x.key === 'n' + id && x.k === 'n' && !x.sys);
  if (!S) return null;
  const tw = MIRROR[S.unit], ids = new Set([id, ...S.ext.map((x) => x.id)]);
  const notes = D.items.filter((x) => x.k === 'n' && (ids.has(x.id) || (tw && x.unit === tw && x.sys && x.s >= S.s - 5 * 60e3 && x.s < S.end)))
    .map((x) => ({ id: x.id, unit: x.unit, s: x.s, e: x.e, note: x.name }));
  return { S, notes };
}
async function lateDel(s2, notes) {
  const probs = [];
  for (const n of notes) { try { await s2('DELETE', '/admin/calendar-notes/' + n.id); } catch (e) { probs.push('note ' + n.id + ': ' + String(e.message || e).slice(0, 60)); } }
  return probs;
}
async function lateRestore(s2, notes, hb) {   /* put back = new note ids: guest links tied to the old ones go with them */
  for (const n of notes) {
    const r = await s2('POST', '/admin/calendar-notes', { provider_id: n.unit, service_id: null, start_date_time: sgStr(n.s), end_date_time: sgStr(n.e), note_type_id: 1, note: n.note, mode: 'provider', time_blocked: true });
    if (hb && r && r.id) await hb.lRenote(n.id, r.id).catch(() => null);
  }
}
/* the session's own "About 10 minutes to go" / "That's a wrap!" (Round2 messages at its end), still to come */
async function lateMsgsCancel(env, hb, S) {
  const now = Date.now(), room = GM_ROOM[S.unit]; let n = 0;
  for (const m of await hb.qList()) {
    if (!/^R2/.test(m.code) || m.room !== room || m.at <= now) continue;
    if (Math.abs(m.at - S.guestEnd) > 5 * 60e3 && Math.abs(m.at - (S.guestEnd - 10 * 60e3)) > 5 * 60e3) continue;
    try { await gmFwd(env, { staff: env.GM_STAFF, action: 'cancel', code: m.code }); n++; } catch (e) {}
  }
  if (n) { await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null); }
  return n;
}
async function latelist(env, hb) {
  const s2 = await sb2(env), now = Date.now(), today = sgDay(now);
  const nt = await s2('GET', '/admin/calendar-notes?filter[date_from]=' + addDays(today, -1) + '&filter[date_to]=' + addDays(today, 45) + '&on_page=200');
  const its = [];
  for (const n of ((nt && nt.data) || [])) {
    const s = sgMs0(n.start_date_time), e = sgMs0(n.end_date_time), unit = +n.provider_id, txt = String(n.note || '');
    if (!n.time_blocked || !s || !e || !ROOMS[unit] || SYS_RE.test(txt) || e - s > 12 * 3600e3) continue;
    its.push({ id: String(n.id), unit, s, e, txt, ext: EXT_RE.test(txt) });
  }
  its.sort((a, b) => a.s - b.s);
  const out = [];
  for (const it of its) {
    if (it.ext) continue;
    let end = it.e, nExt = 0;
    for (;;) { const nx = its.find((x) => x.ext && x.unit === it.unit && Math.abs(x.s - end) <= 5 * 60e3); if (!nx) break; end = nx.e; nExt++; }
    const guestEnd = end - BUF * 60e3, sgH = new Date(it.s + 8 * 3600e3).getUTCHours();
    if (guestEnd <= now) continue;
    if (!(/late till/i.test(it.txt) || sgH * 60 < SHADOW_TILL || sgDay(guestEnd - 1) !== sgDay(it.s))) continue;
    const pm = it.txt.match(/(\d+)\s*(?:pax|ppl|pp)\b/i);
    out.push({ id: it.id, unit: it.unit, room: ROOMS[it.unit][0], text: it.txt.slice(0, 80), name: it.txt.split(' · ')[0].replace(/\s*\d+\s*(?:pax|ppl|pp)\b.*$/i, '').trim().slice(0, 40), pax: pm ? +pm[1] : 0,
      s: it.s, guestEnd, day: sgDay(it.s), night: sgDay(it.s - SHADOW_TILL * 60e3), ext: nExt, live: it.s <= now });
  }
  return { ok: true, now, sessions: out };
}
/* ===== Wrap-up messages with no session left (owner, 2 Nov) =====
   A booking cancelled or a note deleted straight in SimplyBook leaves its "About 10 minutes to go" / "That's a wrap!"
   behind. Every 10 min and on every SimplyBook change: each such Round2 message due in the next 24 h needs a session in
   that room ending then (wrapup = end − 10 min, ±5 min); none → cancelled. Left alone: messages under 15 min old (still
   being set up), and everything if SimplyBook answers with an empty day or more than 4 would go at once (logged). */
async function msgOrphans(env, why, dry) {
  if (!env.GM_STAFF) return { off: true };
  const hb = book(env), now = Date.now(), want = [];
  for (const m of await hb.qList()) {
    if (!/^R2/.test(m.code) || m.at <= now + 60e3 || m.at > now + 24 * 3600e3) continue;
    const d = await hb.msgGet(m.code);
    if (!d || d.status !== 'approved' || !['wrapup', 'timeup'].includes(d.kind) || now - (+d.created || 0) < 15 * 60e3) continue;
    want.push({ code: m.code, room: m.room, kind: d.kind, at: m.at, end: d.kind === 'wrapup' ? m.at + 10 * 60e3 : m.at });
  }
  const log = { t: now, why, checked: want.length, cancelled: [], problems: [] };
  if (!want.length) return log;
  const sess = [];
  for (const day of [...new Set(want.map((w) => sgDay(w.end - 1)))]) {
    const D = await sessDay(env, day);
    if (!D.items.length) { log.problems.push('SimplyBook gave an empty ' + day + ' – nothing cancelled'); return log; }
    for (const S of D.sessions) if (!S.sys) sess.push(S);
  }
  const gone = want.filter((w) => !sess.some((S) => GM_ROOM[S.unit] === w.room && Math.abs(S.guestEnd - w.end) <= 5 * 60e3));
  log.gone = gone.map((w) => ({ code: w.code, room: w.room, kind: w.kind, at: w.at }));
  if (dry) return log;
  if (gone.length > 4) log.problems.push(gone.length + ' at once – nothing cancelled, check SimplyBook');
  else for (const w of gone) { try { await gmFwd(env, { staff: env.GM_STAFF, action: 'cancel', code: w.code }); log.cancelled.push(w.code); } catch (e) { log.problems.push(w.code + ': ' + String(e.message || e).slice(0, 60)); } }
  if (log.cancelled.length) { await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null); }
  if (log.cancelled.length || log.problems.length) await hb.kvSet('orphanLast', log);
  return log;
}
async function latecancel(env, hb, f) {
  const old = await lateFind(env, String(f.id || ''), String(f.day || ''));
  if (!old) return { error: 'That session isn’t in SimplyBook any more. Refresh the list.' };
  const s2 = await sb2(env), probs = await lateDel(s2, old.notes);
  const msgs = await lateMsgsCancel(env, hb, old.S).catch(() => 0);
  await autoRun(env, 'late cancelled').catch(() => null);
  await shadowSync(env, [sgDay(old.S.s - SHADOW_TILL * 60e3)]).catch(() => null);
  return probs.length ? { error: 'Some notes didn’t delete: ' + probs.join('; ').slice(0, 160) } : { ok: true, removed: old.notes.length, msgs };
}
/* ===== After-midnight markers (owner, 1 Nov) =====
   SimplyBook's calendar only shows 11am–12am, so a session STARTING after midnight (Late session, WhatsApp note) sits
   off-screen on the next day's calendar. For each one the engine keeps a NON-blocking note at 11:30pm–11:45pm the night
   before (on SimplyBook's 15-min grid: ending AT 12am spills down the whole next day, 11:59pm isn't drawn at all), same room: "↓ AFTER 12AM · karen 2 pax · 12:15am–3am Mon 2 Nov". It blocks nothing and the engine
   never reads it as a session (only time-blocked notes are sessions), so +1h, EXT notes, reminders and wrap-up messages
   keep using the real note. Kept in sync after Late session / +1h, and every 30 min for tonight and tomorrow night
   (moved, extended, deleted → marker follows). Only notes starting "↓ AFTER 12AM" / "↓ TILL" are ever touched.
   Also (owner, 1 Nov): a session that starts before midnight and runs past it (extended, late note) gets
   "↓ TILL 1:15AM · Amanda" there, since SimplyBook's bar stops at 12am. */
/* THE SHOP NIGHT (owner, 2 Nov): a session starting before 7am belongs to the night before, and every screen switches to
   the new day at 7am (staff wake ~10am and want today's list on the way in). One constant for every module. */
const SHADOW_RE = /^↓ (AFTER 12AM|TILL \d)/, SHADOW_TILL = 7 * 60;
async function shadowSync(env, nights) {
  const s2 = await sb2(env), log = { made: 0, gone: 0, kept: 0, nights: nights.length };
  for (const N of nights) {
    const D = addDays(N, 1), d0 = sgMs0(D + ' 00:00'), want = [];
    for (const S of (await sessDay(env, D)).sessions) {
      if (S.sys || S.orphanExt || !ROOMS[S.unit] || S.s < d0 || S.s >= d0 + SHADOW_TILL * 60e3) continue;
      const who = String(S.name || 'guest').split(' · ')[0].replace(/\s+/g, ' ').trim().slice(0, 30);
      want.push({ unit: S.unit, text: '↓ AFTER 12AM · ' + who + ' · ' + clock12(S.s) + '–' + clock12(S.guestEnd) + ' ' + sgDayName(S.s).replace(/ \d{4}$/, '') });
    }
    for (const S of (await sessDay(env, N)).sessions) {   /* started tonight, runs past midnight */
      if (S.sys || S.orphanExt || !ROOMS[S.unit] || S.s >= d0 || S.guestEnd <= d0) continue;
      const who = String(S.name || 'guest').split(' · ')[0].replace(/\s+/g, ' ').trim().slice(0, 30);
      want.push({ unit: S.unit, text: '↓ TILL ' + clock12(S.guestEnd).toUpperCase() + ' · ' + who });
    }
    const nt = await s2('GET', '/admin/calendar-notes?filter[date_from]=' + N + '&filter[date_to]=' + N + '&on_page=200');
    const have = ((nt && nt.data) || []).filter((n) => SHADOW_RE.test(String(n.note || '')) && sgDay(sgMs0(n.start_date_time)) === N);
    for (const n of have) {
      const i = want.findIndex((w) => w.unit === +n.provider_id && w.text === String(n.note) && /23:45/.test(String(n.end_date_time)));   /* older markers (other times) get replaced */
      if (i >= 0) { want.splice(i, 1); log.kept++; } else { await s2('DELETE', '/admin/calendar-notes/' + n.id); log.gone++; }
    }
    for (const w of want) {
      await s2('POST', '/admin/calendar-notes', { provider_id: w.unit, service_id: null, start_date_time: N + ' 23:30:00', end_date_time: N + ' 23:45:00', note_type_id: 1, note: w.text, mode: 'provider', time_blocked: false });
      log.made++;
    }
  }
  return log;
}
/* the "+N CREDITS ADDED" banner on the room's TV (kind 'extend': coin-into-slot animation). Last in line (owner, 31 Oct):
   while another message is on the TV and not OK'd yet (a guest's message, or a Round2 one), the banner waits and goes up
   right after that OK (the engine checks every 30 s, for up to an hour). It does replace "About 10 minutes to go" /
   "That's a wrap!" (the extension has just moved those) and an older credit banner. No OK needed unless staff ticked it. */
const BANNER_WAIT_MS = 3600e3;
function tvBusy(c, k, now) {
  return !!(c && c.id && c.ack !== false && +c.until > now && +c.at <= now + 60e3 && !(k && k.id === c.id) && !/^(wrapup|timeup|extend)$/.test(String(c.kind || '')));
}
async function sessBannerPut(env, room, b, test) {
  const base = FB_BASE + env.TV_KEY + '/' + room, now = Date.now(), id = 'e' + now.toString(36);
  const m = { id, kind: 'extend', n: +String(b.title).replace(/\D/g, '') || 1, title: b.title, text: b.text + (test ? ' (TEST)' : ''), from: 'The Round2 team', ack: !!b.ack, at: now, until: now + (b.ack ? 20 : 5) * 60e3, t: { '.sv': 'timestamp' } };
  const r = await fetch(base + '/msg.json', { method: 'PUT', body: JSON.stringify(m) }).catch(() => null);
  return r && r.ok ? { shown: true, id } : { shown: false, why: 'the TV database didn’t take it' };
}
async function sessBanner(env, room, b, test, hb) {
  if (!env.TV_KEY) return { shown: false, why: 'no TV key in the engine' };
  const base = FB_BASE + env.TV_KEY + '/' + room, now = Date.now();
  const [c, k] = await Promise.all([fetch(base + '/msg.json').then((r) => r.json()).catch(() => null), fetch(base + '/msgAck.json').then((r) => r.json()).catch(() => null)]);
  if (tvBusy(c, k, now)) {
    if (!hb) return { shown: false, why: 'another message is on the TV and not OK’d yet' };
    const qid = 'b' + now.toString(36);
    await hb.bqAdd(qid, room, { b, test: !!test });
    return { shown: false, queued: true, qid, why: 'waiting in line: “' + String(c.title || 'a message').slice(0, 40) + '” is on the TV and not OK’d yet' };
  }
  return sessBannerPut(env, room, b, test);
}
async function extUndo(env, hb, f) {
  const d = await hb.extGet(String(f.id || ''));
  if (!d) return { error: 'Nothing to undo.' };
  if (d.undone) return { error: 'Already undone.' };
  if (Date.now() - d.t > 30 * 60e3) return { error: 'It’s been over 30 minutes. Change it in SimplyBook and the message calendar instead.' };
  const s2 = await sb2(env), probs = [];
  probs.push(...await extRevert(s2, d.notes));
  for (const m of d.moved || []) { const t = await gmFwd(env, { action: 'move', staff: env.GM_STAFF, code: m.code, start: m.from, room: d.room }); if (/"error"/.test(t)) probs.push('move back ' + m.code); }
  for (const m of d.created || []) if (m.code) { const t = await gmFwd(env, { action: 'cancel', staff: env.GM_STAFF, code: m.code }); if (/"error"/.test(t)) probs.push('cancel ' + m.code); }
  if (d.banner && d.banner.qid) await hb.bqDel(d.banner.qid);
  if (d.banner && d.banner.id && env.TV_KEY) {
    const u = FB_BASE + env.TV_KEY + '/' + d.room + '/msg.json', c = await fetch(u).then((r) => r.json()).catch(() => null);
    if (c && c.id === d.banner.id) await fetch(u, { method: 'DELETE' }).catch(() => null);
  }
  await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null);
  await hb.extDone(String(f.id), Date.now());
  await shadowSync(env, [sgDay((+d.guestEndWas || Date.now()) - SHADOW_TILL * 60e3)]).catch(() => null);   /* the 11:30pm label follows */
  return { ok: true, problems: probs };
}

/* ---------- guest messages front door: POST /gm (same form fields as the Make webhook) ----------
   The cue page (round2-tv-launcher manager/msg/), the staff page and the control centre call this instead of Make, so the
   Make webhook address isn't in any public page. It only passes on what Make would accept: real codes, real changes,
   the right staff code; it caches each link for a minute (page reloads cost nothing), caps guest edits, and limits how
   often one visitor can call. Saves Make operations (10,000 a month shared) – docs/guest-messages.md "Front door". */
const GM_GUEST_EDITS = 8, GM_STAFF_ACTIONS = ['create', 'list', 'move', 'now', 'cancel', 'r2', 'push'];
async function gmFwd(env, fields) { return book(env).msgRoute(fields); }   /* the engine's own store, or Make while mode.msgLocal is off */
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
/* Make a guest link (owner, 2 Nov): what's in this room at this start time, so staff pick the guest the link is for.
   exact = starts exactly then (a booking, or a note = WhatsApp / late-session guest); others = the rest of that day there. */
async function gmSlot(env, room, start) {
  room = String(room || '').trim().toLowerCase().replace('maximillion', 'max');
  const unit = +(Object.keys(GM_ROOM).find((u) => GM_ROOM[u] === room) || 0);
  if (!unit || !(start > 0)) return { error: 'Pick the room and start time.' };
  const D = await sessDay(env, sgDay(start));
  const its = D.sessions.filter((S) => S.unit === unit && !S.sys && !S.orphanExt).sort((a, b) => a.s - b.s).map((S) => {
    const it = D.items.find((x) => x.k + x.id === S.key) || {};
    return { key: S.key, kind: S.k === 'b' ? 'booking' : 'note', name: String(S.name || '').replace(/\s+/g, ' ').trim().slice(0, 60), s: S.s, guestEnd: S.guestEnd, cid: it.cid || '', exact: S.s === start };
  });
  return { ok: true, room, start, exact: its.filter((x) => x.exact), others: its.filter((x) => !x.exact) };
}
/* Guest messages › Pair: everything in every room that day (the link's own day), to pick the guest a waiting link is for */
async function gmDay(env, day) {
  if (!/^\d{4}-\d\d-\d\d$/.test(day || '')) return { error: 'Pick the day.' };
  const D = await sessDay(env, day);
  const its = D.sessions.filter((S) => !S.sys && !S.orphanExt && GM_ROOM[S.unit]).sort((a, b) => a.s - b.s).map((S) => {
    const it = D.items.find((x) => x.k + x.id === S.key) || {};
    return { key: S.key, kind: S.k === 'b' ? 'booking' : 'note', room: GM_ROOM[S.unit], name: String(S.name || '').replace(/\s+/g, ' ').trim().slice(0, 60), s: S.s, guestEnd: S.guestEnd, cid: it.cid || '' };
  });
  return { ok: true, day, sessions: its };
}
async function linkPairTo(env, hb, f) {
  const code = String(f.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), key = String(f.key || ''), day = String(f.day || '');
  if (!code || !/^[bn]\d+$/.test(key)) return { error: 'Pick the booking or note.' };
  const D = await gmDay(env, day); if (D.error) return D;
  const S = D.sessions.find((x) => x.key === key); if (!S) return { error: 'That booking or note isn’t in SimplyBook any more. Refresh.' };
  const L = JSON.parse(await gmFwd(env, { action: 'list', staff: env.GM_STAFF }) || '{}').links || [], x = L.find((y) => y.key === code);
  if (!x || !x.data || x.data.status === 'cancelled') return { error: 'That link was cancelled or isn’t there any more.' };
  let moved = false;
  if (x.data.room !== S.room || +x.data.start !== S.s) {
    const j = JSON.parse(await gmFwd(env, { action: 'move', staff: env.GM_STAFF, code, start: S.s, room: S.room }) || '{}');
    if (j.error) return { error: j.error }; moved = true;
  }
  await hb.lPair(code, S.room, S.s, S.s + 3 * 3600e3, S.kind === 'booking' ? { bid: key.slice(1), cid: S.cid } : { nid: key.slice(1) });
  await hb.fLog({ code, a: 'tied by hand', to: key, room: S.room, start: S.s, moved });
  await hb.gmDrop('__LIST__'); await hb.gmDrop(code); await gmList(env, hb).catch(() => null);
  return { ok: true, paired: S.kind, moved, room: S.room, start: S.s };
}
/* every 10 min: notes and waiting links checked, then a heads-up for any link still not tied 3 h before its start */
async function waitWarn(env) {
  const hb = book(env); await hb.fNotes().catch(() => null);
  const R = await hb.lWarnDue(); if (!R.length || !env.VAPID_JWK) return { warned: R.length };
  const subs = (await hb.pushList()).filter((x) => x.kinds.includes('soon') || x.kinds.includes('booking'));
  for (const r of R) {
    const unit = +(Object.keys(GM_ROOM).find((u) => GM_ROOM[u] === r.room) || 0);
    const msg = { kind: 'soon', title: '⏳ ' + roomTitle(unit) + ' · guest link not tied yet', body: 'Starts ' + clock12(+r.start) + ' ' + sgDayName(+r.start) + ', but nothing in SimplyBook starts then. Check the note or booking time, or tap Pair in Guest messages.', tag: 'wait' + r.code, url: '/?tab=guestmsgs' };
    await Promise.all(subs.map(async (s) => hb.pushResult(s.id, await pushOne(env, s.sub, msg))));
  }
  return { warned: R.length, phones: subs.length };
}
/* tie a new link to what staff picked (pair = b<id> / n<id>), or to the one thing starting exactly then; 'none' = wait */
async function linkPair(env, hb, code, room, start, pair) {
  let sl = null; try { sl = await gmSlot(env, room, start); } catch (e) {}
  const ex = (sl && sl.exact) || [], want = String(pair || '');
  const pick = want === 'none' ? null : /^[bn]\d+$/.test(want) ? ex.find((x) => x.key === want) : ex.length === 1 ? ex[0] : null;
  const p = !pick ? {} : pick.kind === 'booking' ? { bid: pick.key.slice(1), cid: pick.cid } : { nid: pick.key.slice(1) };
  await hb.lPair(code, String(room || '').toLowerCase().replace('maximillion', 'max'), start, start + 3 * 3600e3, p);
  return pick ? pick.kind : 'waiting';
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
  if (act === 'later') {   /* staff: "Show again at…" – list, set (at) or clear (at=0) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const code = String(f.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), at = +f.at || 0, now = Date.now();
    if (code && f.at !== undefined) {
      if (at && (at < now + 30e3 || at > now + 6 * 3600e3)) return gmJ({ error: 'Pick a time later today.' });
      if (at) await hb.laterSet(code, at); else await hb.laterDel(code);
    }
    return gmJ({ ok: true, later: await hb.laterList() });
  }
  if (act === 'orphans') {   /* staff: wrap-up messages whose session is gone (dry=1: just list them) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(Object.assign({ ok: true }, await msgOrphans(env, 'by hand', !!f.dry), { last: await hb.kvGet('orphanLast') })); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'shadow') {   /* staff: re-check the after-midnight markers for nights from..from+n (max 20) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const from = /^\d{4}-\d\d-\d\d$/.test(f.from || '') ? f.from : sgDay(Date.now()), n = Math.max(1, Math.min(20, +f.n || 1));
    try { return gmJ(Object.assign({ ok: true }, await shadowSync(env, Array.from({ length: n }, (_, i) => addDays(from, i))))); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'auto') {   /* staff: TV messages › Auto end messages */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await autoApi(env, hb, f)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'insess' || act === 'extend' || act === 'extundo' || act === 'late' || act === 'latelist' || act === 'latecancel') {   /* staff: "In session" tab */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await (act === 'insess' ? insess : act === 'extend' ? extend : act === 'late' ? late : act === 'latelist' ? latelist : act === 'latecancel' ? latecancel : extUndo)(env, hb, f)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'msgimport' || act === 'msgmode' || act === 'msgtest') {   /* staff: move the message store off Make (copy records in; switch where messages live) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (f.direct) return gmJ(await hb.msgAct(Object.assign({}, f, { action: f.direct })));   /* test the engine's store while Make is still live */
    if (act === 'msgimport') { let L = []; try { L = JSON.parse(f.records || '[]'); } catch (e) { return gmJ({ error: 'records must be JSON' }); } return gmJ({ ok: true, imported: await hb.msgImport(L) }); }
    const m = await hb.getMode(); if (f.set === 'on' || f.set === 'off') { m.msgLocal = f.set === 'on'; m.msgT = Date.now(); await hb.setMode(m); await hb.gmDrop('__LIST__'); if (m.msgLocal) await gmList(env, hb).catch(() => null); }
    return gmJ({ ok: true, local: !!m.msgLocal, count: await hb.msgCount() });
  }
  if (act === 'human') {   /* staff: control centre › "needs a human" list (owner, 3 Nov); sorted=<id> ticks one off */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    let L = (await hb.kvGet('human')) || [];
    if (f.sorted) { L = L.map((x) => x.id === f.sorted ? Object.assign(x, { sorted: Date.now() }) : x); await hb.kvSet('human', L); }
    return gmJ({ ok: true, list: L.filter((x) => !x.sorted || Date.now() - x.sorted < 86400e3) });
  }
  if (act === 'holdproblems') {   /* staff: online bookings in the last N days (max 60) that were paid but not booked, used a fallback, or got stuck */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const days = Math.max(1, Math.min(60, +f.days || 30));
    return gmJ({ ok: true, list: (await hb.problems(Date.now() - days * 86400e3)).map((r) => ({ ref: r.ref, date: r.date, room: r.data.q && r.data.q.room, time: r.data.q && r.data.q.time, status: r.status, pay: r.data.pay, total: r.data.q && r.data.q.total, name: r.data.name, phone: r.data.phone, done: r.data.done || null })) });
  }
  if (act === 'sbdiag') {   /* staff: why SimplyBook refused a contact (3 Nov, Denzel) – recent online bookings, and (try=1) a real retry */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const recent = (await hb.rows(`SELECT ref, date, status, created, data FROM holds WHERE status IN ('paid','booking') ORDER BY created DESC LIMIT 20`)).map((r) => {
      const d = JSON.parse(r.data || '{}'), dn = d.done || {};
      return { ref: r.ref, made: sgStr(r.created).slice(0, 16), date: r.date, pay: d.pay, emailDomain: String(d.email || '').split('@')[1], phone: String(d.phone || '').replace(/\d(?=\d{3})/g, '•'), cid: d.cid || null,
        contactWithoutEmail: 'email' in dn, emailStep: dn.email, booked: !!dn.bookingId, problem: dn.problem || null, fallback: dn.fallback || null };
    });
    const out = { recent };
    if (f.try === '1' && f.ref) {
      const h = await hb.get(String(f.ref).replace(/[^A-Z0-9]/g, '')); if (!h) return gmJ({ error: 'No such ref.' });
      const d = h.data, a = await admin(env), t = async (label, c) => { try { const id = await a('addClient', [c]); return { label, ok: true, id }; } catch (e) { return { label, ok: false, err: String(e.message || e).slice(0, 200) }; } };
      out.tries = [await t('name + phone (no email)', { name: d.name, phone: d.phone })];
      if (!out.tries[0].ok) out.tries.push(await t('name + email + phone (as typed)', { name: d.name, email: d.email, phone: d.phone }));
      if (!out.tries.some((x) => x.ok) && mailFix(d.email)) out.tries.push(await t('name + fixed email + phone', { name: d.name, email: mailFix(d.email), phone: d.phone }));
      if (!out.tries.some((x) => x.ok)) out.tries.push(await t('name + phone without +65', { name: d.name, phone: String(d.phone).replace(/^\+65/, '') }));
    }
    return gmJ({ ok: true, ...out });
  }
  if (act === 'holdinfo') {   /* staff: what happened to an online booking (ref from the guest's confirmation) – read only */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const h = await hb.get(String(f.ref || '').replace(/[^A-Z0-9]/g, '')); if (!h) return gmJ({ error: 'No such ref.' });
    const d = h.data || {}, out = { status: h.status, date: h.date, unit: h.unit, s: h.s, e: h.e, exp: h.exp, q: d.q, pay: d.pay, pr: h.pr, done: d.done || null, name: d.name, agreed: d.agreed };
    const bid = d.done && d.done.bookingId;
    if (bid) out.sb = await (await admin(env))('getBookingDetails', [bid]).then((b) => ({ id: b.id, code: b.code, start: b.start_date_time || b.start_date, end: b.end_date_time || b.end_date, unit: b.unit_id, event: b.event_id, confirm: b.is_confirm, status: b.status, record: b.record_date, client: b.client_name })).catch((e) => ({ err: String(e.message || e).slice(0, 120) }));
    if (f.clients === '1') {   /* which SimplyBook contacts match this guest's phone / email (why a contact couldn't be made) */
      const a = await admin(env), p8 = String(d.phone || '').replace(/\D/g, '').slice(-8), em = String(d.email || '');
      const pick = (r) => Object.values(r || {}).slice(0, 5).map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }));
      out.byPhone = await a('getClientList', [p8, 5]).then(pick).catch((e) => String(e.message || e).slice(0, 120));
      out.byEmail = await a('getClientList', [em.split('@')[0], 5]).then(pick).catch((e) => String(e.message || e).slice(0, 120));
      out.typed = { phone: d.phone, email: em };
    }
    return gmJ({ ok: true, hold: out });
  }
  if (act === 'tvupdate') {   /* staff: Round2 messages › On the TVs now › Update now */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await tvUpdate(env, f)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'keyexp') {   /* staff: Keys › expiry dates */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await keyApi(env, f)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'extclear') {   /* staff: In session › Clear finished */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    return gmJ({ ok: true, cleared: await hb.extClear(String(f.ids || '').split(',').filter(Boolean).slice(0, 50)) });
  }
  if (act === 'pairs' || act === 'slotday' || act === 'pair') {   /* staff: Guest messages › tied / waiting, and Pair */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(act === 'pairs' ? { ok: true, links: (await hb.lList()).map((r) => ({ code: r.code, bid: r.bid, nid: r.nid, pin: r.pin, warn: r.warn })) } : act === 'slotday' ? await gmDay(env, f.day) : await linkPairTo(env, hb, f)); }
    catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'slot') {   /* staff: Make a guest link › who's in that slot */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await gmSlot(env, f.room, +f.start)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
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
      const L = (await hb.getMode()).msgLocal ? null : await hb.gmGet('__LIST__');   /* messages kept here: always fresh, nothing to save */
      if (L && L.exp > Date.now() && L.link && L.link.raw) return new Response(L.link.raw, { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
      return new Response(await gmList(env, hb), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }
    const t = await gmFwd(env, f);
    if (act === 'create') {   /* paired now, before the list sync could learn it as an unpaired link */
      let j = null; try { j = JSON.parse(t); } catch (e) {}
      if (j && j.code && !j.error) { const pd = await linkPair(env, hb, j.code, f.room, +f.start, f.pair).catch(() => null); if (pd) { j.paired = pd; await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null); return gmJ(j); } }
    }
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

/* ---------- push alerts to staff phones (control centre at staff.round2.sg, saved to the home screen) ----------
   Web Push, sent by the engine itself: RFC 8291 encryption (aes128gcm) + RFC 8292 VAPID signature, all WebCrypto.
   Secret VAPID_JWK = the engine's private signing key (P-256 JWK); the public half is served at GET /push/key.
   Phones sign up with the staff code (POST /push/sub); each phone picks its alert types. A phone the push service
   says is gone (404/410) is dropped. docs: round2-tv-launcher docs/staff-alerts.md */
const PUSH_KINDS = ['booking', 'soon'];
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const cat = (...a) => { const n = a.reduce((m, x) => m + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const utf8 = (s) => new TextEncoder().encode(s);
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
function vapidPublic(env) { const j = JSON.parse(env.VAPID_JWK); return b64u(cat(new Uint8Array([4]), unb64u(j.x), unb64u(j.y))); }
async function vapidAuth(env, endpoint) {
  const j = JSON.parse(env.VAPID_JWK), aud = new URL(endpoint).origin;
  const head = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(utf8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:hello@round2.sg' })));
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: j.x, y: j.y, d: j.d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(head + '.' + body));   /* raw r||s, as JWT wants */
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + vapidPublic(env);
}
async function pushEncrypt(sub, payload) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const ua = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, as.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(utf8('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(utf8(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   /* record size 4096 */
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
/* one phone → 'ok' | 'gone' (drop it) | 'failed …' */
async function pushOne(env, sub, msg) {
  try {
    const r = await fetch(sub.endpoint, { method: 'POST', body: await pushEncrypt(sub, JSON.stringify(msg)),
      headers: { Authorization: await vapidAuth(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' } });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'failed ' + r.status + ' ' + (await r.text()).slice(0, 80);
  } catch (e) { return 'failed ' + String(e.message || e).slice(0, 80); }
}
/* every phone that wants this kind of alert. msg = { title, body, tag, url } */
async function pushAll(env, kind, msg) {
  if (!env.VAPID_JWK) return { sent: 0, why: 'no VAPID_JWK' };
  const hb = book(env), subs = await hb.pushList(kind); let sent = 0;
  await Promise.all(subs.map(async (s) => {
    const r = await pushOne(env, s.sub, Object.assign({ kind }, msg));
    if (r === 'ok') sent++;
    await hb.pushResult(s.id, r);
  }));
  return { sent, phones: subs.length };
}
async function pushId(endpoint) { return b64u(await crypto.subtle.digest('SHA-256', utf8(String(endpoint)))).slice(0, 22); }
/* /push/* – the control centre's "Alerts on this phone". Body is JSON sent as text (no CORS preflight). */
async function pushApi(env, req, path) {
  if (path === '/push/key') return J(env.VAPID_JWK ? { key: vapidPublic(env), kinds: PUSH_KINDS } : { error: 'Alerts aren’t set up in Cloudflare yet' });
  if (req.method !== 'POST') return J({ error: 'POST' }, 405);
  const f = await req.json().catch(() => ({})), hb = book(env);
  if (!env.GM_STAFF || f.staff !== env.GM_STAFF) {
    await hb.gmRate('pushbad:' + (req.headers.get('cf-connecting-ip') || '?'), 1000);
    return J({ error: 'Wrong staff code.' }, 403);
  }
  if (path === '/push/seed') {   /* staff: remember every upcoming booking's room + times now, so a later move can say "was … now …" */
    const a2 = await admin(env), day = sgDay(Date.now()); let n = 0;
    const l = Object.values((await a2('getBookings', [{ booking_type: 'non_cancelled', date_from: day, date_to: addDays(day, 180) }])) || {});
    for (const x of l) { const st = sgMs0(x.start_date || x.start_date_time), en = sgMs0(x.end_date || x.end_date_time); if (!st || !ROOMS[+x.unit_id]) continue; await hb.bkPut(String(x.id), { unit: +x.unit_id, s: st, e: en - (+(x.event_buffertime_after ?? BUF) || 0) * 60e3 }); n++; }
    return J({ ok: true, remembered: n });
  }
  if (path === '/push/preview') {   /* staff: what the booking alert would say (latest upcoming booking, or bid) – sends nothing */
    let bid = String(f.bid || '').replace(/\D/g, '');
    if (f.kind === 'soon' && f.key && /^\d{4}-\d\d-\d\d$/.test(f.day || '')) {   /* System check: the 1-hour reminder for one session, as it would read 1 h before */
      const all = (await sessDay(env, f.day)).sessions.filter((S) => !S.sys && !S.orphanExt && ROOMS[S.unit]), S = all.find((x) => x.key === String(f.key));
      return J(S ? { msg: soonMsg(S, S.s - 60 * 60e3, await soonPax(env, S), await soonExtra(env, S, all, S.s - 60 * 60e3)) } : { error: 'No such session' });
    }
    if (f.kind === 'soon' || f.kind === 'soonnote') return J({ msg: await soonSample(env, f.kind === 'soonnote' ? 'n' : 'b') });
    if (!bid) { const a = await admin(env), day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); const l = Object.values((await a('getBookings', [{ booking_type: 'non_cancelled', date_from: day, date_to: addDays(day, 14) }])) || {}); bid = String((l.find((x) => !SYS_CLIENTS.includes(String(x.client_id))) || {}).id || ''); }
    const r = bid ? await bookingAlert(env, bid, f.type || 'create') : null;
    return J(r ? { bid, msg: r.msg, skipped: r.skipped, fields: f.fields ? r.b : Object.keys(r.b || {}) } : { error: 'No booking found' });
  }
  if (!env.VAPID_JWK) return J({ error: 'Alerts aren’t set up in Cloudflare yet' });
  const sub = f.sub || {}, endpoint = String(sub.endpoint || f.endpoint || '');
  if (!/^https:\/\/[a-z0-9.-]+\//i.test(endpoint)) return J({ error: 'No phone subscription sent' }, 400);
  const id = await pushId(endpoint);
  if (path === '/push/sub') {
    if (!sub.keys || !sub.keys.p256dh || !sub.keys.auth) return J({ error: 'Incomplete phone subscription' }, 400);
    const kinds = (Array.isArray(f.kinds) ? f.kinds : PUSH_KINDS).filter((k) => PUSH_KINDS.includes(k));
    await hb.pushSet(id, JSON.stringify({ endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }), JSON.stringify(kinds), String(f.label || '').slice(0, 40));
    return J({ ok: true, id, kinds });
  }
  if (path === '/push/state') { const s = await hb.pushGet(id); return J(s ? { ok: true, on: true, kinds: s.kinds, label: s.label, last: s.last } : { ok: true, on: false }); }
  if (path === '/push/unsub') { await hb.pushDel(id); return J({ ok: true }); }
  if (path === '/push/test') {
    const s = await hb.pushGet(id); if (!s) return J({ error: 'This phone isn’t signed up for alerts' });
    let m = { kind: 'test', title: 'Round2 alerts work ✓', body: 'This phone will get the alerts you switched on.', tag: 'test', url: '/' };
    if (f.kind === 'booking') { const p = await bookingSample(env); if (!p) return J({ error: 'No upcoming booking to show as a sample' }); m = Object.assign(p, { title: 'TEST · ' + p.title, tag: 'test-bk' }); }
    if (f.kind === 'soon' || f.kind === 'soonnote') { const p = await soonSample(env, f.kind === 'soonnote' ? 'n' : 'b'); if (!p) return J({ error: f.kind === 'soonnote' ? 'No calendar note in the next 7 days to show as a sample' : 'No booking in the next 7 days to show as a sample' }); m = Object.assign(p, { title: 'TEST · ' + p.title, tag: 'test-' + f.kind }); }
    const r = await pushOne(env, s.sub, m);
    await hb.pushResult(id, r);
    return J(r === 'ok' ? { ok: true } : { error: r === 'gone' ? 'The phone’s subscription expired. Turn alerts off and on again.' : r });
  }
  return J({ error: 'unknown' }, 404);
}
/* SimplyBook callback → "New booking / Booking changed / Booking cancelled" on staff phones (owner's layout, 1 Nov):
     🩷 VALE · New booking
     Amanda Tan · Sat 2 Nov, 4–7pm (3h)
     Peak · S$69 paid online · 3 pax · Vale
   iPhone always shows the app icon, so the room colour is the heart at the start. Money: our own booking page's record
   ("paid online"), else SimplyBook's invoice ("paid" / "NOT PAID"), else the room's price for that day and length ("price"). Skips the Make mirror's
   SYSTEM BLOCK bookings (the twin room) so one booking gives one alert. */
async function bookingSample(env) {
  const a = await admin(env), day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const l = Object.values((await a('getBookings', [{ booking_type: 'non_cancelled', date_from: day, date_to: addDays(day, 14) }])) || {});
  const b = l.find((x) => !SYS_CLIENTS.includes(String(x.client_id)) && !SYS_RE.test(String(x.client || x.client_name || '')));
  const r = b ? await bookingAlert(env, String(b.id), 'create') : null;
  return r && r.msg;
}
/* "In 1 hour" – every 10 minutes (cron, 9:45am–2am) the engine reads today's sessions the same way In session does: SimplyBook
   bookings AND calendar notes that block time (WhatsApp / walk-in sessions). Skipped: the twin room's SYSTEM BLOCKs and
   EXT notes (an extension isn't a new arrival). Each session is sent once, exactly 1 hour before (5-min tick, owner 2 Nov). Anything
   added later than that gets no reminder: a note was keyed in by staff themselves, and a booking's "New booking"
   alert already says "starts in N min" (owner, 1 Nov). */
/* owner's layout (1 Nov): what staff need to set up the room – who, when they arrive, how long, how many (pax decides
   the room set-up and how many controllers). Bold = icon ROOM · name · in 1 hour; below = arrives · length · pax. */
/* compact (owner, 2 Nov: little space in the banner): line 1 "7pm–10pm · 3h · 2 pax"; line 2, only when there's something
   to do: "🧹 Last group leaves 6:45pm" (room not free yet), "🎂 Message 7:15pm" / "🔗 Message not written yet" */
function soonMsg(S, now, pax, extra) {
  const mins = Math.round((S.s - now) / 60e3), unit = S.unit, inT = ' · in ' + (mins >= 55 && mins <= 65 ? '1 hour' : mins + ' min');
  const len = Math.round((S.guestEnd - S.s) / 360e3) / 10, when = [clock12(S.s) + '–' + clock12(S.guestEnd), len + 'h', (pax || '?') + ' pax'].join(' · ') + (extra && extra.length ? '\n' + extra.join(' · ') : '');
  if (S.k === 'b') return { title: roomTitle(unit) + ' · ' + (S.name || 'No name') + inT, body: when, tag: 'soon' + S.key, url: '/?tab=insession' };
  /* a calendar note: the whole note under the times, so nothing staff wrote is lost (owner, 1 Nov) */
  const note = String(S.name || '').replace(/\s+/g, ' ').trim();
  return { title: roomTitle(unit) + ' · Note' + inT, body: when + '\n' + (note ? '“' + note.slice(0, 200) + '”' : '(empty note)'), tag: 'soon' + S.key, url: '/?tab=insession' };
}
/* what staff need to do before this group arrives (owner, 2 Nov): previous group still in (this room or its twin), and the
   guest's own TV message (a link made for this room + start) */
const KIND_ICON = { birthday: '🎂', anniversary: '💞', celebrate: '🎉', note: '💬' };
async function soonExtra(env, S, all, now) {
  const out = [], tw = MIRROR[S.unit];
  const prev = all.filter((x) => x.key !== S.key && (x.unit === S.unit || x.unit === tw) && x.s < S.s && x.guestEnd > now).sort((a, b) => b.guestEnd - a.guestEnd)[0];
  if (prev) out.push('🧹 Last group leaves ' + clock12(prev.guestEnd));
  try {
    const L = (JSON.parse(await gmFwd(env, { action: 'list', staff: env.GM_STAFF }) || '{}').links || [])
      .filter((x) => !/^R2/.test(x.key) && x.data && x.data.status !== 'cancelled' && x.data.room === GM_ROOM[S.unit] && +x.data.start === S.s);
    const done = L.find((x) => x.data.status === 'approved' && +x.data.at);
    if (done) out.push((KIND_ICON[done.data.kind] || '💬') + ' Message ' + clock12(+done.data.at)); else if (L.length) out.push('🔗 Message not written yet');
  } catch (e) {}
  return out;
}
/* pax: a booking's own field; a note's text ("4 pax") */
async function soonPax(env, S) {
  if (S.k !== 'b') return notePax(S.name);
  const b = await (await admin(env))('getBookingDetails', [S.id]).catch(() => null); let pax = '';
  for (const x of [].concat((b && b.additional_fields) || [])) if (x && (x.field_name === PAX_FIELD || /pax|guest|people/i.test(String(x.field_title || x.title || '')))) pax = String(x.value || '').replace(/\D/g, '');
  return pax;
}
async function soonSessions(env, days) {
  const now = Date.now(), out = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(new Date(now + 8 * 3600e3).toISOString().slice(0, 10), i);
    for (const S of (await sessDay(env, day)).sessions) if (!S.sys && !S.orphanExt && ROOMS[S.unit] && !out.some((x) => x.key === S.key)) out.push(S);
  }
  return out.sort((a, b) => a.s - b.s);
}
/* sample for the Alerts page: the next booking (k='b') or the next calendar note (k='n') in the coming week */
async function soonSample(env, k) { const now = Date.now(), all = await soonSessions(env, 7), S = all.find((x) => x.s > now && (!k || x.k === k)); return S ? soonMsg(S, S.s - 60 * 60e3, await soonPax(env, S), await soonExtra(env, S, all, S.s - 60 * 60e3)) : null; }
async function soonRun(env) {
  if (!env.VAPID_JWK) return null;
  /* lean (owner, 1 Nov): cron every 10 min, but SimplyBook isn't asked between 7am (the shop night ends) and 9:45am –
     until 7am late guests (up to a 6:45am arrival) still get their 1-hour reminder (owner, 2 Nov) */
  const now = Date.now(), sg = new Date(now + 8 * 3600e3), hm = sg.getUTCHours() * 60 + sg.getUTCMinutes();
  if (hm >= SHADOW_TILL && hm < 9 * 60 + 45) return { asleep: true };
  const hb = book(env); if (!(await hb.pushList('soon')).length) return { phones: 0 };
  const sent = [], sgDay = (t) => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
  /* only the day the 55–61 min window falls on (today; tomorrow only around midnight) – one SimplyBook read each */
  const days = sgDay(now + 61 * 60e3) === sgDay(now) ? 1 : 2;   /* window 50–61 min: a quarter-hour start is hit on its exact tick; an odd-time note at most 5 min late */
  const all = await soonSessions(env, days);
  for (const S of all) {
    const m = S.s - now; if (m <= 50 * 60e3 || m > 61 * 60e3) continue;   /* exactly 1 h before on the 5-min tick (owner, 2 Nov); keyed in within the hour → none */
    if (!(await hb.soonMark(S.key + ':' + S.s))) continue;
    sent.push(Object.assign({ key: S.key }, await pushAll(env, 'soon', soonMsg(S, now, await soonPax(env, S), await soonExtra(env, S, all, now)))));
  }
  return { sent };
}
const SB_ALERT = { create: 'New booking', change: 'Booking changed', cancel: 'Booking cancelled' };
/* each character's icon, like the booking page (cat, leaf, Saturn, mountain, book, sailboat, car), in the room's colour
   where an emoji in that colour exists (owner, 1 Nov) */
const ROOM_DOT = { 5: '🎀', 7: '🍃', 8: '🪐', 9: '🏔️', 10: '🔮', 12: '⛵', 11: '🏎️' };
const roomTitle = (unit) => (ROOM_DOT[unit] ? ROOM_DOT[unit] + ' ' : '') + (unit === 11 ? 'MAX' : ROOMS[unit] ? ROOMS[unit][0].toUpperCase() : 'ROOM');
/* pax from a note's text: "4 pax", "4pax", "4 ppl", "4 people", "4 guests", "4p" (not "4pm"/"4 p.m."), "pax: 4", "pax 4" */
const notePax = (t) => { t = String(t || ''); const m = t.match(/(\d{1,2})\s*(pax|ppl|people|persons?|guests?|pp|p(?![.\s]*m\b))\b/i) || t.match(/\b(?:pax|ppl|people|guests?)\s*[:=-]?\s*(\d{1,2})\b/i); return m ? m[1] : ''; };
async function bookingAlert(env, bid, type, prev) {
  const a = await admin(env), b = await a('getBookingDetails', [bid]).catch(() => null);
  if (!b) return null;
  const cid = String(b.client_id || ''), name = String(b.client_name || b.client || '').trim();
  if (SYS_CLIENTS.includes(cid) || SYS_RE.test(name)) return { skipped: 'mirror', b };
  const unit = +b.unit_id, room = ROOMS[unit] ? (unit === 11 ? 'Maximillion' : ROOMS[unit][0]) : String(b.unit_name || 'Room');
  const s = sgMs0(b.start_date_time || b.start_date), buf = +(b.event_buffertime_after ?? BUF) || 0, e = sgMs0(b.end_date_time || b.end_date) - buf * 60e3;
  const date = new Date(s + 8 * 3600e3).toISOString().slice(0, 10), hours = Math.round((e - s) / 360e3) / 10;
  const day = new Date(s + 8 * 3600e3).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  let pax = '';
  for (const x of [].concat(b.additional_fields || [])) if (x && (x.field_name === PAX_FIELD || /pax|guest|people/i.test(String(x.field_title || x.title || '')))) pax = String(x.value || '').replace(/\D/g, '');
  /* peak / off-peak / Early Bird from the service; Early Bird is its own service */
  const type2 = ROOMS[unit] && ROOMS[unit][1], ids = SVC[type2] || {}, ev = +b.event_id;
  const dow = new Date(date + 'T00:00:00Z').getUTCDay(), peakDay = dow === 0 || dow === 5 || dow === 6 || (await holidays().catch(() => new Set())).has(date);
  let rate = ev === ids.eb ? 'Early Bird (' + (peakDay ? 'peak' : 'off-peak') + ' day)' : ev === ids.peak ? 'Peak' : ev === ids.off ? 'Off-peak' : '';
  if (!rate && type2) rate = peakDay ? 'Peak' : 'Off-peak';
  /* money: what was paid on our own booking page, else the price for this room/day/length */
  let money = '';
  const own = await book(env).holdByBid(String(bid)).catch(() => null);
  const inv = b.invoice && typeof b.invoice === 'object' ? b.invoice : null, sgd = (v) => 'S$' + r2(+v).toFixed(2).replace(/\.00$/, '');
  if (own && own.total) money = sgd(own.total) + ' paid' + (own.pay === 'test' ? ' (TEST)' : '');
  else if (inv && +inv.amount > 0) money = sgd(inv.amount) + (inv.status === 'paid' || inv.payment_received === '1' ? ' paid' : ' NOT PAID');   /* SimplyBook's own page (HitPay invoice) */
  else if (type2 && hours >= 3 && hours <= 6 && hours % 1 === 0) {
    const P = PRICES[type2], dt = peakDay ? 'peak' : 'off', x = hours - 3;
    const v = ev === ids.eb ? P.eb.base + (x ? P.eb.ext[dt][x - 1] : 0) : P[dt].base + (x ? P[dt].ext[x - 1] : 0);
    money = 'S$' + r2(v).toFixed(2).replace(/\.00$/, '') + ' price';
  }
  /* owner's layout (1 Nov): bold = room icon, ROOM, guest name (+ CHANGED / CANCELLED / in N min);
     below = date and time · length · amount (EB / Peak / Off-peak / EB+peak) · pax */
  const short = ev === ids.eb ? (peakDay ? 'EB+peak' : 'EB') : rate;
  /* the status goes on its own line under the name (owner, 1 Nov: beside the name it got cut off) */
  const soonMin = Math.round((s - Date.now()) / 60e3), soonTxt = type !== 'cancel' && soonMin > 0 && soonMin <= 60 ? '⏰ Starts in ' + soonMin + ' min' : '';
  const span = (u, a, b2) => (u !== unit ? (ROOMS[u] ? (u === 11 ? 'Max' : ROOMS[u][0]) + ' ' : '') : '') + new Date(a + 8 * 3600e3).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/,/g, '') + ', ' + clock12(a) + '–' + clock12(b2);
  const details = [day.replace(/,/g, '') + ', ' + clock12(s) + '–' + clock12(e), hours + 'h', (money || '') + (short ? (money ? ' (' + short + ')' : short) : ''), (pax || '?') + ' pax'].filter(Boolean).join(' · ');
  let body;
  if (type === 'cancel') body = '❌ CANCELLED\n' + day.replace(/,/g, '') + ', ' + clock12(s) + '–' + clock12(e);   /* just what was freed up */
  else if (type === 'change') {
    const moved = prev && (prev.s !== s || prev.e !== e || prev.unit !== unit);
    body = moved ? '🔁 MOVED\nwas ' + span(prev.unit, prev.s, prev.e) + '\nnow ' + span(unit, s, e).replace(/^/, prev.unit !== unit ? (unit === 11 ? 'Max' : ROOMS[unit] ? ROOMS[unit][0] : '') + ' ' : '') + ' · ' + hours + 'h · ' + (pax || '?') + ' pax'
      : '✏️ CHANGED\n' + details;   /* times the same (or not known from before): new details */
  } else {
    /* how far ahead (owner, 2 Nov), compact at the end: "⚡ in 3h" same day, "9d ahead" otherwise */
    const lead = s - Date.now(), lt = soonTxt || lead <= 0 ? '' : lead < 24 * 3600e3 ? '⚡ in ' + (lead < 3600e3 ? Math.round(lead / 60e3) + 'm' : Math.round(lead / 3600e3) + 'h') : Math.round(lead / 86400e3) + 'd ahead';
    body = (soonTxt ? soonTxt + '\n' : '') + details + (lt ? ' · ' + lt : '');
  }
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10) === date;
  return { msg: { title: roomTitle(unit) + ' · ' + (name || 'No name'), body, tag: 'bk' + bid, url: today ? '/?tab=insession' : '/' }, b, now: { unit, s, e } };
}
async function bookingPush(env, bid, type) {
  if (!SB_ALERT[type] || !env.VAPID_JWK) return null;
  const hb = book(env), prev = await hb.bkGet(String(bid)).catch(() => null);
  const r = await bookingAlert(env, bid, type, prev);
  if (r && r.now) await (type === 'cancel' ? hb.bkDel(String(bid)) : hb.bkPut(String(bid), r.now)).catch(() => null);
  return r && r.msg ? pushAll(env, 'booking', r.msg) : r;
}

/* ===== GitHub through the engine (owner, 2 Nov) =====
   TV setup (Events, Rooms, Sounds, TV settings) and the menu editor used a personal GitHub key on each phone. Now they
   send the staff code here and the engine uses ONE GitHub key kept in Cloudflare (secret GH_TOKEN: fine-grained, only
   round2-tv-launcher + round2sg-home, Contents read & write). Locked down: staff code, rate limit, only these two
   projects, only files (contents), releases and build runs, only GET / PUT / DELETE. */
const GH_OK = /^\/repos\/donttelldadyet-prog\/(round2-tv-launcher|round2sg-home)(\/(contents(\/[^?#]*)?|releases(\/[^?#]*)?|actions\/runs))?(\?[^#]*)?$/;
async function ghProxy(env, req) {
  let b = null; try { b = await req.json(); } catch (e) {}
  if (!b) return J({ message: 'Bad request.' }, 400);
  const who = req.headers.get('cf-connecting-ip') || 'x';
  if (!(await book(env).gmRate(who + ':gh', 300))) return J({ message: 'Too many tries. Wait a few minutes and try again.' }, 429);
  if (!env.GM_STAFF || b.staff !== env.GM_STAFF) return J({ message: 'Wrong staff code.' }, 401);
  if (!env.GH_TOKEN) return J({ message: 'The GitHub key isn’t in Cloudflare yet (GH_TOKEN).', noKey: true }, 503);
  const m = String(b.method || 'GET').toUpperCase(), path = String(b.path || '');
  if (!['GET', 'PUT', 'DELETE'].includes(m) || !GH_OK.test(path) || /\.\./.test(path)) return J({ message: 'Not allowed.' }, 403);
  if (m !== 'GET' && !/\/contents\//.test(path)) return J({ message: 'Not allowed.' }, 403);   /* only files can be changed; releases and runs are read-only */
  const h = { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'round2-book' };
  if (b.body) h['Content-Type'] = 'application/json';
  const r = await fetch('https://api.github.com' + path, { method: m, headers: h, body: b.body ? JSON.stringify(b.body) : undefined });
  await ghSeen(env, r).catch(() => null);
  return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
}

/* ===== Remote TV updates (owner, 2 Nov) =====
   Update now from the control centre: only when the TV is on (checked in within 12 min), its Staff tools allow it, and
   its room has no session now or starting within 10 minutes (bookings and notes, the twin room's too). Then
   /r2/<TV_KEY>/<room>/cmd = {id, do:'update', at}; the TV reports progress in /update. Nothing is queued for a TV that's
   off. LG installs (Homebrew); Android only checks and shows "ready" – staff press Install in Staff tools. */
async function tvUpdate(env, f) {
  const room = String(f.room || '').toLowerCase().replace('maximillion', 'max'), unit = +(Object.keys(GM_ROOM).find((u) => GM_ROOM[u] === room) || 0);
  if (!unit || !env.TV_KEY) return { error: 'Pick a room.' };
  const base = FB_BASE + env.TV_KEY + '/' + room, now = Date.now();
  const hb = await fetch(base + '/helper.json').then((r) => r.json()).catch(() => null);
  if (!hb || !hb.t || now - hb.t > 12 * 60e3) return { error: 'The TV is off – switch it on first.', off: true };
  if (hb.ru === false) return { error: 'Locked on the TV (Staff tools › Updates from the control centre: not allowed).', locked: true };
  const night = sgDay(now - SHADOW_TILL * 60e3), tw = MIRROR[unit], busy = [];
  for (const d of [night, addDays(night, 1)]) for (const S of (await sessDay(env, d)).sessions) {
    if ((S.unit === unit || S.unit === tw) && S.s - 10 * 60e3 <= now && now < S.guestEnd) busy.push(S);
  }
  if (busy.length) { const S = busy[0]; return { error: (S.unit !== unit ? ROOMS[S.unit][0] + ' (its twin) ' : '') + 'has a session ' + (S.s > now ? 'starting at ' : 'until ') + clock12(S.s > now ? S.s : S.guestEnd) + ' – try after that.', busy: true }; }
  const cmd = { id: 'u' + now.toString(36), do: 'update', at: now, by: String(f.by || 'control centre').slice(0, 40) };
  const ok = await fetch(base + '/cmd.json', { method: 'PUT', body: JSON.stringify(cmd) }).then((r) => r.ok).catch(() => false);
  if (!ok) return { error: 'Couldn’t reach the TV database.' };
  await fetch(base + '/update.json', { method: 'PUT', body: JSON.stringify({ state: 'sent', v: hb.v || '', t: { '.sv': 'timestamp' } }) }).catch(() => null);
  return { ok: true, tv: hb.tv, from: hb.v };
}
/* ===== Key expiry (owner, 2 Nov: "warning if keys are about to expire … a 2 week warning") =====
   kv keyExp = { NAME: { label, date: 'YYYY-MM-DD' (typed by the owner), auto: 'YYYY-MM-DD' (GitHub says), ok, checked } }.
   GitHub tells its own key's expiry on every answer (header github-authentication-token-expiration), so GH_TOKEN fills in
   by itself; a date the owner types wins. Once a day (after 10:30am) the engine checks GH_TOKEN still works and warns the
   phones (booking / 1-hour alerts) 14, 7, 3 and 1 days before, on the day, and every 3 days after. */
const KEY_WARN = [14, 7, 3, 1, 0];
const keyDays = (date) => Math.round((Date.parse(date + 'T00:00:00+08:00') - Date.parse(sgDay(Date.now()) + 'T00:00:00+08:00')) / 86400e3);
async function ghSeen(env, r) {
  const x = r.headers.get('github-authentication-token-expiration'), hb = book(env), all = (await hb.kvGet('keyExp')) || {};
  const k = all.GH_TOKEN || { label: 'GitHub key (in Cloudflare)' }, t = x ? Date.parse(x.replace(' UTC', 'Z').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2').replace(' ', 'T')) : 0;
  const auto = t ? sgDay(t) : (x === null ? k.auto || null : null), ok = r.status !== 401;
  if (k.auto === auto && k.ok === ok && Date.now() - (k.checked || 0) < 3600e3) return;
  all.GH_TOKEN = Object.assign(k, { auto, ok, checked: Date.now() }); await hb.kvSet('keyExp', all);
}
async function ghCheck(env) {
  if (!env.GH_TOKEN) return { noKey: true };
  const r = await fetch('https://api.github.com/repos/donttelldadyet-prog/round2-tv-launcher', { headers: { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'round2-book' } });
  await ghSeen(env, r); const j = await r.json().catch(() => ({}));
  return { status: r.status, push: !!(j.permissions && j.permissions.push) };
}
async function keyList(env) {
  const all = (await book(env).kvGet('keyExp')) || {};
  if (env.GH_TOKEN && !all.GH_TOKEN) all.GH_TOKEN = { label: 'GitHub key (in Cloudflare)' };
  return Object.keys(all).map((name) => { const k = all[name], date = k.date || k.auto || null; return { name, label: k.label || name, date, typed: !!k.date, auto: k.auto || null, ok: k.ok !== false, days: date ? keyDays(date) : null, checked: k.checked || 0 }; })
    .sort((a, b) => (a.days == null ? 1e9 : a.days) - (b.days == null ? 1e9 : b.days));
}
async function keyApi(env, f) {
  const hb = book(env), all = (await hb.kvGet('keyExp')) || {}, name = String(f.name || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 40);
  if (f.do === 'set') {
    if (!name) return { error: 'Give the key a name.' };
    if (f.date && !/^\d{4}-\d\d-\d\d$/.test(f.date)) return { error: 'Pick the expiry date.' };
    all[name] = Object.assign(all[name] || {}, { label: String(f.label || all[name] && all[name].label || name).slice(0, 60), date: f.date || null }); await hb.kvSet('keyExp', all);
  } else if (f.do === 'del') { if (name === 'GH_TOKEN') { if (all.GH_TOKEN) all.GH_TOKEN.date = null; } else delete all[name]; await hb.kvSet('keyExp', all); }
  else if (f.do === 'check') await ghCheck(env).catch(() => null);
  return { ok: true, keys: await keyList(env), today: sgDay(Date.now()) };
}
async function keyDaily(env) {
  const hb = book(env), now = Date.now(), sg = new Date(now + 8 * 3600e3), hm = sg.getUTCHours() * 60 + sg.getUTCMinutes(), today = sgDay(now);
  if (hm < 10 * 60 + 30 || (await hb.kvGet('keyDay')) === today) return null;
  await hb.kvSet('keyDay', today);
  const gh = await ghCheck(env).catch(() => null), sent = [];
  const tell = async (title, body, tag) => { if (!env.VAPID_JWK) return; const subs = (await hb.pushList()).filter((x) => x.kinds.includes('booking') || x.kinds.includes('soon')); for (const s of subs) await hb.pushResult(s.id, await pushOne(env, s.sub, { kind: 'booking', title, body, tag, url: '/?tab=keys' })); sent.push(title); };
  if (gh && gh.status === 401) await tell('🔑 GitHub key stopped working', 'TV setup and the menu editor can’t save. Make a new GitHub key and put it in Cloudflare (GH_TOKEN) – Keys page in the control centre.', 'key-gh-bad');
  for (const k of await keyList(env)) {
    if (k.days == null) continue;
    if (KEY_WARN.includes(k.days) || (k.days < 0 && -k.days % 3 === 0)) {
      const when = new Date(Date.parse(k.date + 'T12:00:00+08:00')).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' }).replace(/,/g, '');
      await tell('🔑 ' + k.label + (k.days > 1 ? ' expires in ' + k.days + ' days' : k.days === 1 ? ' expires tomorrow' : k.days === 0 ? ' expires today' : ' has expired'), (k.days >= 0 ? 'Expiry: ' + when + '. Make a new one and swap it in before then' : 'Expired ' + when + '. Make a new one and swap it in now') + ' – Keys page in the control centre.', 'key-' + k.name);
    }
  }
  return { sent };
}
const HANDLER = {
  /* every 10 minutes (Cloudflare cron trigger, every-10-minutes schedule): staff "in 1 hour" alerts */
  /* every 5 minutes (Cloudflare cron every 5 min, since 2 Nov): the "in 1 hour" reminder goes exactly 1 hour before a
     booking (bookings start on the quarter hour, so a 5-minute tick always lands on it), at the same time as SimplyBook's
     own 1-hour reminder email (owner, 2 Nov). Everything else still runs every 10 minutes. */
  async scheduled(ev, env0, ctx) {
    const base = envFor(env0, 'live'), env = Object.assign(Object.create(base), base, { __tick: new Map() }), hb = book(env);
    const mm = new Date(ev.scheduledTime || Date.now()).getUTCMinutes(), ten = mm % 10 < 5, quarter = mm % 15 < 5, jobs = [];
    const go = (p) => { const q = p.catch(() => null); jobs.push(q); ctx.waitUntil(q); };
    go((async () => { const prev = await hb.kvGet('cronLast'); await hb.kvSet('cronPrev', prev || 0); await hb.kvSet('cronLast', Date.now()); })());
    /* the reminder only needs the 10-min ticks plus :15 and :45 (bookings start on the quarter hour) */
    if (ten || quarter) go(soonRun(env));
    if (ten) {
      go(autoRun(env, 'cron')); go(msgOrphans(env, 'cron')); go(waitWarn(env)); go(keyDaily(env));
      if (mm < 10 || (mm >= 30 && mm < 40)) { const t = sgDay(Date.now() - SHADOW_TILL * 60e3); go(shadowSync(env, [t, addDays(t, 1)])); }
    }
    ctx.waitUntil(Promise.all(jobs).then(() => sbFlush(env)).catch(() => null));
  },
  async fetch(req, env0, ctx) { try { return await HANDLER.fetch0(req, env0, ctx); } finally { ctx.waitUntil(sbFlush(rawEnv(env0)).catch(() => null)); } },
  async fetch0(req, env0, ctx) {
    const u = new URL(req.url);
    const env = envFor(env0, 'live');   /* default for anything not tied to a hold/order: live once the live key is in */
    try {
      if (req.method === 'OPTIONS') return J({});
      if (u.pathname === '/ph') return J([...(await holidays())].sort());
      /* one clock for everything (owner, 2 Nov): every TV and page sets its time from here, not from its own clock */
      if (u.pathname === '/time') { const t = Date.now(); return J({ t, sg: sgStr(t), today: sgDay(t), night: sgDay(t - SHADOW_TILL * 60e3) }); }
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
          menuSheet: !!env.MENU_MAKE_K, tvKey: !!env.TV_KEY, pushAlerts: !!env.VAPID_JWK, liveKeys: liveReady(env0), switchSet: !!env0.SWITCH_PASS && !/paste/.test(env0.SWITCH_PASS + env0.SWITCH_PIN), booking: (await book(env).getMode()).booking, t: Date.now() };
        if (u.searchParams.get('deep')) {
          st.sbLogin = await admin(env, true).then(() => 'ok').catch((e) => 'failed: ' + String(e.message || e).slice(0, 80));
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
          : f.pending ? `<h1>Confirming your booking…</h1><p>Your payment came through. We’re putting the booking into our calendar – this page refreshes by itself.</p><meta http-equiv="refresh" content="4">`
          : `<h1>Payment received</h1><p>We couldn’t confirm your booking automatically, so our team has been alerted and will WhatsApp you on <b>${esc(f.h.phone || '')}</b> shortly to sort it out.</p><p>Please keep this reference: <b>${esc(ref)}</b>. Questions? <a href="https://wa.me/6591625767">WhatsApp us</a>.</p>`));
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
          const r = await gmFwd(env, { action: 'create', staff: env.GM_STAFF, room: GM_ROOM[q.unit], start, label: 'Online · ' + h.data.name.slice(0, 30) }).then((x) => JSON.parse(x)).catch(() => ({}));
          if (!r.code) return H(PAGE('<h1>Couldn’t open the message page</h1><p>Please try again in a minute, or WhatsApp us on +65 9162 5767.</p>'));
          tv = { code: r.code }; await hb.setTv(ref, tv); await hb.gmDrop('__LIST__'); await hb.lSet(r.code, GM_ROOM[q.unit], start, start + 3 * 3600e3, h.data.done.bookingId).catch(() => null);
        }
        return Response.redirect('https://cue.round2.sg/' + tv.code, 302);
      }
      if (u.pathname === '/gm' && req.method === 'POST') return await gm(env, req);
      if (u.pathname === '/gh' && req.method === 'POST') return await ghProxy(env, req);
      if (u.pathname.startsWith('/push/')) return await pushApi(env, req, u.pathname);
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
        if (bid) ctx.waitUntil(bookingPush(env, bid, type).catch(() => null));   /* staff phones: New booking / changed / cancelled */
        ctx.waitUntil(autoRun(env, 'simplybook ' + type).catch(() => null));   /* auto end messages follow straight away */
        ctx.waitUntil(msgOrphans(env, 'simplybook ' + type).catch(() => null));   /* a cancelled booking's wrap-up messages go */
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
      if (u.pathname === '/selftest') { const a = await admin(env, true); const units = await a('getUnitList', []); return J({ sbLogin: true, rooms: Object.values(units).map((x) => x.name), dryRun: env.DRY_RUN === '1' }); }
      return J({ ok: true, svc: 'round2-book' });
    } catch (e) { return J({ error: String(e.message || e) }, 400); }
  },
};
export default HANDLER;
