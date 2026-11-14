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
const BUF = 15, HOLD_SEC = 600, EB_START = 660, PAGE_GRACE = 0, HOLD_CAP_EXTRA = 5 * 60e3;   /* owner, 5 Nov: one number – the guest's 10-minute counter, the block and the payment page end together (real guests pay in ~50 s, slowest 2 min) */
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
const H = (html) => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });   /* guest pages are always fresh: never an old copy from the phone's cache */
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const r2 = (x) => Math.round(x * 100) / 100;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* SimplyBook requests are counted (owner, 2 Nov: "is that too intensive?"): SimplyBook's shared servers allow about 5,000 API
   requests a day. Each part adds to sbCalls; it's written to the engine's kv as sbn:<day> after each request / tick / alarm. */
let sbCalls = 0, sbBy = {}, sbWho = '?';
/* which kind of request, and roughly who asked (owner, 5 Nov: 7,901 requests on 4 Nov – over the limit; find out what) */
/* OUTSIDE REQUESTS (14 Nov): one run of the engine may make only 50 requests to the outside world on the free plan
   (SimplyBook, Firebase, HitPay, Apple … – not KV or the store). At 10am the 5-minute timer's run went over and two
   reminders couldn't be sent. Every outside request is counted here, and one refused for that reason is noted, so the
   timer can record how close each run gets (store kv `cronNet`, read with gm `cronnet`). The count is per copy of the
   engine: a page request served during the timer's run is counted with it, so read it as "at most". */
const NET = { n: 0, by: {}, fails: [] };
{ const f0 = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    let host = '?';
    try { host = new URL(typeof input === 'string' ? input : input.url).host; NET.n++; NET.by[host] = (NET.by[host] || 0) + 1; } catch (e) {}
    let p; try { p = f0.call(globalThis, input, init); } catch (e) { p = Promise.reject(e); }
    return p.catch((e) => { try { if (/Too many subrequests/i.test(String(e && e.message)) && NET.fails.length < 40) NET.fails.push({ t: Date.now(), host, who: sbWho }); } catch (x) {} throw e; });
  }; }
function sbHit(k) { sbCalls++; const kk = sbWho + ' › ' + k; sbBy[kk] = (sbBy[kk] || 0) + 1; }
async function sbFlush(env) { if (!sbCalls) return; const n = sbCalls, by = sbBy; sbCalls = 0; sbBy = {}; await book(env).sbAdd(n, by); }
async function rpc(path, method, params, headers = {}) {
  sbHit(method);
  const r = await fetch(SB + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }) });
  const j = await r.json();
  if (j.error) throw new Error(method + ': ' + (j.error.message || JSON.stringify(j.error)));
  return j.result;
}
/* logins are kept 20 min (not one per read) and redone once if SimplyBook says the token is no good */
let pubTok = null, admTok = null;
const tokBad = (e) => /token|denied|auth|login|expired|signature/i.test(String(e && e.message || e));
async function pub(env) {
  /* 12 Nov: the booking board's public login is shared through the engine's storage too (it was ~1,200 logins a day) */
  const get = async () => { pubTok = { k: await rpc('/login', 'getToken', [env.SB_COMPANY, env.SB_PUBLIC_KEY]), t: Date.now() + 20 * 60e3 }; await tokPut(env, 'tokPub', pubTok); return pubTok.k; };
  if (!(pubTok && pubTok.t > Date.now())) pubTok = (await tokGet(env, 'tokPub')) || pubTok;
  let tok = pubTok && pubTok.t > Date.now() ? pubTok.k : await get();
  return async (m, p) => { try { return await rpc('', m, p, { 'X-Company-Login': env.SB_COMPANY, 'X-Token': tok }); } catch (e) { if (!tokBad(e)) throw e; tok = await get(); return rpc('', m, p, { 'X-Company-Login': env.SB_COMPANY, 'X-Token': tok }); } };
}
/* SimplyBook REST API v2 (calendar notes): token from /admin/auth, cached ~50 min */
const SB2 = 'https://user-api-v2.simplybook.asia';
let sb2tok = null;
/* SimplyBook logins shared through the engine's own storage (overnight review 5 Nov: every 5-minute background run logged
   in again – ~30% of all requests). If the store doesn't answer within 2 s, it just logs in as before. */
async function tokGet(env, k) { try { const v = await Promise.race([book(env).kvGet(k), new Promise((r) => setTimeout(() => r(null), 2000))]); return v && v.t > Date.now() + 30e3 ? v : null; } catch (e) { return null; } }
async function tokPut(env, k, v) { try { await book(env).kvSet(k, v); } catch (e) {} }
async function sb2(env) {
  if (!sb2tok || sb2tok.t < Date.now()) sb2tok = await tokGet(env, 'tokRest');
  if (!sb2tok || sb2tok.t < Date.now()) {
    sbHit('REST login'); const r = await fetch(SB2 + '/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: env.SB_COMPANY, login: env.SB_USER, password: env.SB_PASS }) });
    const j = await r.json(); if (!j.token) throw new Error('SimplyBook REST login: ' + JSON.stringify(j).slice(0, 120));
    sb2tok = { k: j.token, t: Date.now() + 50 * 60e3 }; await tokPut(env, 'tokRest', sb2tok);
  }
  const go = async (method, path, body, again) => {
    sbHit(method + ' ' + path.split('?')[0].replace(/\/\d+/g, '/#')); const r = await fetch(SB2 + path, { method, headers: { 'Content-Type': 'application/json', 'X-Company-Login': env.SB_COMPANY, 'X-Token': sb2tok.k }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401 && !again) { sb2tok = { k: '', t: 0 }; await tokPut(env, 'tokRest', null); await sb2(env); return go(method, path, body, true); }   /* a shared login gone stale: log in once more */
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!r.ok) throw new Error('SimplyBook ' + method + ' ' + path.split('?')[0] + ' ' + r.status + ': ' + t.slice(0, 200));
    if (method !== 'GET' && /calendar-notes/.test(path)) { await book(env).kvSet('gcal', null).catch(() => null); await book(env).kvSet('gapc', {}).catch(() => null); }   /* BOTH inside the if: 12–14 Nov the board's memory was wiped on every notes READ too (7,110 requests on 13 Nov) */   /* a note changed (late session, block, extension): the booking board asks again */
    return j;
  };
  return (method, path, body) => go(method, path, body);
}
async function admin(env, fresh) {
  const get = async () => { admTok = { k: await rpc('/login/', 'getUserToken', [env.SB_COMPANY, env.SB_USER, env.SB_PASS]), t: Date.now() + 20 * 60e3 }; await tokPut(env, 'tokAdm', admTok); return admTok.k; };
  if (!fresh && !(admTok && admTok.t > Date.now())) admTok = (await tokGet(env, 'tokAdm')) || admTok;
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
  const units = Object.keys(ROOMS), hb = book(env);
  /* SimplyBook's free times are remembered for 60 s, shared by every visitor (5 Nov: the board was ~2/3 of all SimplyBook
     requests – 14 per day looked at – and SimplyBook allows ~5,000 a day). Our own holds are always fresh (below), checkout
     always asks SimplyBook again, and any SimplyBook change (/sb/notify) clears the memory at once. */
  const ck = date + ':' + dt, C = (await hb.kvGet('gapc').catch(() => null)) || {};
  /* 12 Nov: 60 s → 10 min for later days, 2 min for today (the board was ~75% of all SimplyBook requests). Safe because every
     SimplyBook change (/sb/notify), our own bookings and staff moves clear this memory at once, and checkout asks again. */
  const ttl = date === today ? 2 * 60e3 : 10 * 60e3;
  let gaps = C[ck] && Date.now() - C[ck].t < ttl ? C[ck].g : null;
  if (!gaps) {
    const p = await pub(env);
    gaps = await Promise.all(units.map((u) => gapsFor(p, date, u, dt).catch(() => null)));
    if (!gaps.some((g) => g === null)) { const n = {}; for (const k in C) if (Date.now() - C[k].t < 10 * 60e3) n[k] = C[k]; n[ck] = { t: Date.now(), g: gaps }; await hb.kvSet('gapc', n).catch(() => null); }
  }
  const holds = await hb.list(date);
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
        : to.length > 40 || from.length > 40 ? 'Keep the names short.' : (d.retimed && at === +d.at ? false : at < +d.start || at > +d.start + 3600e3) ? 'Pick a time within the first hour of your booking.' : 'ok';
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
    if (!['cancel', 'move', 'now', 'push', 'retime'].includes(act)) return { error: 'Unknown action.' };
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
    if (act === 'retime') {   /* staff (owner, 9 Nov): change only when the message pops up – the booking stays as it is */
      const e2 = at <= 0 ? 'Pick the new pop-up time.' : at < now - 120e3 ? 'That time has already passed.' : at >= +d.end ? 'That’s after the booking ends.' : 'ok';
      if (e2 !== 'ok') return { error: e2 };
      await offTv(d);
      this.msgPut(code, Object.assign(d, { t: now, at, id: (/^R2/.test(code) ? 'q' : 'g') + code.toLowerCase() + '-' + stamp(), onTv: 'no', retimed: now }));
      this.qSet(code, d.room, Math.max(at, now), +d.end);   /* the message timer sends it then (a time now = within the minute) */
      return { ok: true, at };
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
  holdByBid(bid) { const r = this.rows(`SELECT ref, data FROM holds WHERE status = 'paid' AND CAST(json_extract(data, '$.done.bookingId') AS TEXT) = ? LIMIT 1`, String(bid))[0]; if (!r) return null; const d = JSON.parse(r.data); return { total: d.q && d.q.total, pay: d.pay, ref: r.ref || '', email: d.email || '', msg: d.msg ? { kind: d.msg.kind, title: d.msg.title } : null }; }
  soonMark(k) { this.pushInit(); this.sql.exec(`CREATE TABLE IF NOT EXISTS soon (k TEXT PRIMARY KEY, t INTEGER)`); this.sql.exec(`DELETE FROM soon WHERE t < ?`, Date.now() - 3 * 86400e3);
    if (this.rows(`SELECT 1 FROM soon WHERE k = ?`, k).length) return false; this.sql.exec(`INSERT INTO soon VALUES (?, ?)`, k, Date.now()); return true; }
  /* each booking's last alerted room + times, so "Booking changed" can say "was … now …" */
  bkInit() { if (this.bkReady) return; this.bkReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS bkseen (bid TEXT PRIMARY KEY, unit INTEGER, s INTEGER, e INTEGER, t INTEGER)`); }
  bkGet(bid) { this.bkInit(); const r = this.rows(`SELECT * FROM bkseen WHERE bid = ?`, bid)[0]; return r ? { unit: r.unit, s: r.s, e: r.e } : null; }
  bkPut(bid, x) { this.bkInit(); this.sql.exec(`DELETE FROM bkseen WHERE t < ?`, Date.now() - 200 * 86400e3); this.sql.exec(`INSERT OR REPLACE INTO bkseen VALUES (?, ?, ?, ?, ?)`, bid, x.unit, x.s, x.e, Date.now()); }
  bkDel(bid) { this.bkInit(); this.sql.exec(`DELETE FROM bkseen WHERE bid = ?`, bid); }
  /* every real booking's guest (last 8 digits of the phone, email) – first-timer or returning (owner, 6 Nov). Online bookings
     make a new SimplyBook contact each time, so the contact can't tell; phone or email can. */
  vInit() { if (this.vReady) return; this.vReady = true; this.sql.exec(`CREATE TABLE IF NOT EXISTS visits (bid TEXT PRIMARY KEY, s INTEGER, p TEXT, e TEXT)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS visits_p ON visits(p)`); this.sql.exec(`CREATE INDEX IF NOT EXISTS visits_e ON visits(e)`); }
  vPut(rows) { this.vInit(); for (const r of rows) this.sql.exec(`INSERT OR REPLACE INTO visits VALUES (?, ?, ?, ?)`, String(r.bid), +r.s, r.p || '', r.e || ''); return rows.length; }
  vDel(bid) { this.vInit(); this.sql.exec(`DELETE FROM visits WHERE bid = ?`, String(bid)); }
  /* earlier visits = other bookings by the same phone or email on an earlier day (two rooms one night = one visit) */
  vBefore(bid, s, p, e) {
    this.vInit(); const day = Math.floor((s + 8 * 3600e3) / 86400e3);
    const r = this.rows(`SELECT COUNT(DISTINCT (s + 28800000) / 86400000) AS n, MAX(s) AS last FROM visits WHERE bid != ? AND (s + 28800000) / 86400000 < ? AND ((? != '' AND p = ?) OR (? != '' AND e = ?))`, String(bid), day, p, p, e, e)[0];
    return { n: r.n || 0, last: r.last || 0, all: this.rows(`SELECT COUNT(*) AS n FROM visits`)[0].n };
  }
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
      this.ackNote(r.room, k);
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
  sbAdd(n, by) { this.qInit(); const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10), k = 'sbn:' + day; this.kvSet(k, (this.kvGet(k) || 0) + n);   /* day-ok: SimplyBook's limit is per calendar day */
    if (by) { const kb = 'sbb:' + day, m = this.kvGet(kb) || {}; for (const x in by) if (m[x] || Object.keys(m).length < 120) m[x] = (m[x] || 0) + by[x]; this.kvSet(kb, m);
      const old = 'sbb:' + new Date(Date.now() + 8 * 3600e3 - 3 * 86400e3).toISOString().slice(0, 10); this.sql.exec(`DELETE FROM kv WHERE k = ?`, old); } }
  /* recent moves (owner, 13 Nov 2am: a paid guest move never ran and nobody knew) – for the sweep and staff */
  /* MOVE HOLDS (owner, 14 Nov): while a guest pays for a move, the new slot is held like a new booking's – 10 min, in kv
     `mvholds` [{ref, bid, date, unit, units, s, e, exp, notes}]. clash()/list() count them, so nobody can book or move into
     it; the guest's own booking never conflicts (it isn't a hold). One hold per booking: a new try drops the old one. */
  mvHoldsAll() { return this.kvGet('mvholds') || []; }
  mvHoldAdd(h) {
    const all = this.mvHoldsAll().filter((x) => x.exp > Date.now() - 6 * 3600e3), old = all.filter((x) => x.bid === h.bid);
    this.kvSet('mvholds', all.filter((x) => x.bid !== h.bid));
    if (this.clash(h.date, h.units, h.s, h.e)) return { ok: false, old };
    this.kvSet('mvholds', this.mvHoldsAll().concat([h])); this.arm(); return { ok: true, old };   /* the hold timer lifts it at exactly 10 min */
  }
  mvHoldNotes(ref, ids) { this.kvSet('mvholds', this.mvHoldsAll().map((x) => x.ref === ref ? Object.assign(x, { notes: ids }) : x)); }
  mvHoldDrop(ref) { this.kvSet('mvholds', this.mvHoldsAll().filter((x) => x.ref !== ref)); }
  mvRecent(since) { this.qInit(); return this.rows(`SELECT k, v FROM kv WHERE k LIKE 'mv:MV%'`).map((r) => JSON.parse(r.v)).filter((m) => m && m.t >= since).sort((a, b) => b.t - a.t).slice(0, 60); }
  kvGet(k) { this.qInit(); const r = this.rows(`SELECT v FROM kv WHERE k = ?`, k)[0]; return r ? JSON.parse(r.v) : null; }
  kvSet(k, v) { this.qInit(); this.sql.exec(`INSERT OR REPLACE INTO kv VALUES (?, ?)`, k, JSON.stringify(v)); }
  /* one worker at a time on a key (no await between the look and the write, so two SimplyBook callbacks can't both win) */
  /* a short lock in kv (was also called claim() – the holds claim(ref) further down silently replaced it, so every lock said
     "busy": moves and Vale/Atlas blocks never ran. Found 13 Nov 2am.) */
  lock(k, ms) { this.qInit(); const r = this.rows(`SELECT v FROM kv WHERE k = ?`, k)[0], now = Date.now(); if (r && JSON.parse(r.v) > now) return false; this.sql.exec(`INSERT OR REPLACE INTO kv VALUES (?, ?)`, k, JSON.stringify(now + ms)); return true; }
  /* every phone alert, with what it was about (owner, 5 Nov: tapping an alert opens its own page in the control centre).
     The control centre lists the last 24 hours; kept 3 days so a notification tapped late still opens. Newest first, at most 400. */
  alogAdd(e) { const L = (this.kvGet('alog') || []).filter((x) => x.t > Date.now() - 3 * 86400e3); L.unshift(e); this.kvSet('alog', L.slice(0, 400)); }
  alogList() { return this.kvGet('alog') || []; }
  /* when to look again at alerts no phone has reported showing (pushRetry) – the earliest asked time wins */
  pushChk(t) { const c = +this.kvGet('pushchk') || 0; if (!c || t < c) this.kvSet('pushchk', +t); this.arm(); }
  /* alerts are sent from in here, so each has its own allowance of outside requests (see pushAll) */
  async pushRun(kind, msg) { return pushAllHere(this.env, kind, msg, this); }
  async pushRetryRun() { return pushRetry(this.env, this); }
  /* every OK a TV reports, kept per message (owner, 4 Nov): each TV only holds its LATEST OK (/msgAck), so a later OK
     made the control centre show an earlier message as "ended without OK" (Niv's birthday message, OK'd 7:28pm) */
  ackNote(room, k) {
    if (!k || !k.id || !k.t) return;
    const m = this.kvGet('acks') || {}; if (m[k.id] && m[k.id].t === k.t) return;
    m[k.id] = { t: k.t, room }; const ids = Object.keys(m); if (ids.length > 400) ids.sort((a, b) => m[a].t - m[b].t).slice(0, ids.length - 400).forEach((x) => delete m[x]);
    this.kvSet('acks', m);
  }
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
    return this.rows(`SELECT ref, unit, s, e FROM holds WHERE date = ? AND ((status = 'pending' AND exp > ?) OR (status = 'booking' AND created > ?)) AND ref != ?`, date, now, now - 3 * 3600e3, ignore)   /* 'booking': being put into SimplyBook right now (review 5 Nov) */
      .some((h) => units.includes(h.unit) && s < h.e + BUF && h.s < e + BUF)
      || this.mvHoldsAll().some((h) => h.ref !== ignore && h.date === date && h.exp > now && h.units.some((u) => units.includes(u)) && s < h.e + BUF && h.s < e + BUF);   /* a guest paying for a move */
  }
  /* atomic: drop this guest's earlier unpaid holds, then hold the slot if nobody else has it */
  hold(h) {
    const released = [];
    if (this.clash(h.date, h.units, h.s, h.e)) return { ok: false, released };
    this.sql.exec(`INSERT INTO holds VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, h.ref, h.date, h.unit, h.s, h.e, Date.now() + HOLD_SEC * 1000,
      '', h.phone, h.email, 'pending', JSON.stringify(h.data), Date.now());
    this.arm();
    return { ok: true, released };
  }
  list(date) { return this.rows(`SELECT unit, s, e FROM holds WHERE date = ? AND ((status = 'pending' AND exp > ?) OR (status = 'booking' AND created > ?))`, date, Date.now(), Date.now() - 3 * 3600e3).concat(this.mvHoldsAll().filter((h) => h.date === date && h.exp > Date.now()).map((h) => ({ unit: h.unit, s: h.s, e: h.e }))); }
  setPr(ref, pr) { this.sql.exec(`UPDATE holds SET pr = ? WHERE ref = ?`, pr, ref); }
  /* this guest's unpaid holds (same phone or email) – let go before they pick again */
  pendingFor(phone, email) { return this.rows(`SELECT ref, pr, data FROM holds WHERE status = 'pending' AND (phone = ? OR email = ?)`, phone, email); }
  /* SimplyBook hold notes still up although their hold is over (paid, released, expired) – the 10-min sweep removes them */
  holdNotesDue() {
    return this.rows(`SELECT ref, status, exp, data FROM holds WHERE created > ? AND json_extract(data, '$.holdNotes') IS NOT NULL AND json_extract(data, '$.holdNotesDone') IS NULL`, Date.now() - 3 * 86400e3)
      .map((r) => ({ ...r, data: JSON.parse(r.data || '{}') })).filter((r) => r.status !== 'pending' && r.status !== 'booking').map((r) => ({ ref: r.ref, ids: r.data.holdNotes, status: r.status }));   /* pending: its own timer lifts them (review 5 Nov) */
  }
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
  /* why (owner, 5 Nov: sort "left before paying" in Booking page stats): payback = went to HitPay, came back unpaid ·
     cancel = changed their mind before paying · timeout = 10 minutes ran out · again = picked another time ·
     gaveway = made way for their own paid booking · error = checkout failed */
  release(ref, why) {
    const r = this.rows(`SELECT pr FROM holds WHERE ref = ? AND status = 'pending'`, ref)[0];
    if (!r) return null;
    this.sql.exec(`UPDATE holds SET status = 'released', data = json_set(COALESCE(data, '{}'), '$.relWhy', ?) WHERE ref = ?`, String(why || 'left').slice(0, 12), ref);
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
  /* the online booking behind a SimplyBook booking id: what the guest paid for */
  holdOfBid(bid) { const r = this.rows(`SELECT ref, data FROM holds WHERE status = 'paid' AND CAST(json_extract(data, '$.done.bookingId') AS TEXT) = ? LIMIT 1`, String(bid))[0]; return r ? { ref: r.ref, data: JSON.parse(r.data) } : null; }
  holdMove(bid, q, rec) {   /* staff moved this booking: its booking page shows the new room and time (what was paid stays) */
    const r = this.holdOfBid(bid); if (!r) return false; const d = r.data;
    d.qWas = d.qWas || d.q; d.paid = (d.paid != null ? +d.paid : +d.q.total) + (+rec.diff || 0); d.moves = (d.moves || []).concat([rec]); d.q = Object.assign({}, q, { total: d.q.total });
    this.sql.exec(`UPDATE holds SET data = ?, date = ?, unit = ? WHERE ref = ?`, JSON.stringify(d), q.date, q.unit, r.ref); return true;
  }
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
  /* bookings staff made with Add a session (owner, 12 Nov: a list to re-send a lost booking link) */
  staffBookings(from) { return this.rows(`SELECT ref, date, unit, data FROM holds WHERE status = 'paid' AND date >= ? AND json_extract(data, '$.pay') = 'staff' ORDER BY date, s LIMIT 60`, from).map((r) => ({ ref: r.ref, d: JSON.parse(r.data) })); }
  /* SimplyBook booking id → its booking-page code, for the bookings that have a booking page (online + Add a session) */
  codesFor(bids) { const L = (bids || []).map(String).slice(0, 80); if (!L.length) return {}; const out = {}; for (const r of this.rows(`SELECT CAST(json_extract(data, '$.done.bookingId') AS TEXT) AS bid, json_extract(data, '$.done.code') AS code FROM holds WHERE status = 'paid' AND CAST(json_extract(data, '$.done.bookingId') AS TEXT) IN (${L.map(() => '?').join(',')})`, ...L)) if (r.code) out[r.bid] = r.code; return out; }
  addPaid(h) { this.sql.exec(`INSERT INTO holds VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, h.ref, h.date, h.unit, h.s, h.e, 0, '', h.phone, h.email, 'paid', JSON.stringify(h.data), Date.now()); return true; }
  byCode(code) { return this.rows(`SELECT ref FROM holds WHERE status IN ('paid', 'cancelled') AND json_extract(data, '$.done.code') = ? ORDER BY status = 'paid' DESC LIMIT 1`, code)[0] || null; }   /* cancelled too, so its /done page says it was cancelled */
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
    const mvh = this.mvHoldsAll().filter((x) => !x.lifted).map((x) => x.exp);
    const pchk = +this.kvGet('pushchk') || 0;
    const ts = [pchk, mvh.length ? Math.min(...mvh) + 1000 : 0, bqn ? Date.now() + 30e3 : 0, nd && nd.t ? nd.t : 0, n && n.t ? n.t + 1000 : 0, q && q.t ? q.t - 60e3 : 0, syn ? syn + 86400e3 : 0, fl ? fol + FOLLOW_MS : 0, lsy ? 0 : Date.now() + 2000, lt && lt.t ? lt.t : 0, au && au.t ? au.t : 0].filter((t) => t > 0);
    if (ts.length) this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, Math.min(...ts)));
  }
  /* timer ran out → release the hold and kill its HitPay link */
  async alarm() { sbWho = 'hold timer'; try { await this.alarm0(); } finally { if (sbCalls) { this.sbAdd(sbCalls, sbBy); sbCalls = 0; sbBy = {}; } } }
  async alarm0() {
    /* alerts a phone hasn't shown: re-send (see pushRetry). The time is cleared FIRST, so a failure can never make this alarm loop. */
    try { const pc = +this.kvGet('pushchk') || 0;
      if (pc && pc <= Date.now()) { this.kvSet('pushchk', 0); const pr = await pushRetry(this.env, this); if (pr && pr.more) this.kvSet('pushchk', Date.now() + 60e3); } } catch (e) {}
    /* a move's hold ends at exactly its 10 minutes (owner, 14 Nov: no extra buffer): its SimplyBook notes come off now; the
       5-min sweep then only closes the move's record (or finishes it if the money did arrive) */
    try { const mh = this.mvHoldsAll(), over = mh.filter((x) => x.exp <= Date.now() && !x.lifted);
      for (const x of over) { try { await holdNotesDel(this.env, x.notes || []); } catch (e) {} }
      if (over.length) { this.kvSet('mvholds', mh.filter((x) => x.exp > Date.now())); this.kvSet('gapc', {}); this.kvSet('gcal', null); } } catch (e) {}
    const due = this.rows(`SELECT ref, pr, data, created FROM holds WHERE status = 'pending' AND exp <= ?`, Date.now());
    for (const d of due) {
      /* paid at HitPay but nobody has booked it yet (webhook late, guest closed the page): keep it – the sweep books it */
      try { const hd0 = JSON.parse(d.data || '{}'); const pp = await hpPaid(this.env, { pr: d.pr, data: hd0 }); /* the time limit comes first (owner, 5 Nov): whatever HitPay says, an unpaid hold never lives past 10 + 5 minutes. A payment
         still "going through" then, or HitPay not answering, lets the time go; if money does arrive later, the webhook or the
         5-minute sweep books it (time still free) or flags a refund (needs a human). Only a PAID hold is kept, for the sweep. */
      const capped = Date.now() - (+d.created || 0) >= HOLD_SEC * 1000 + HOLD_CAP_EXTRA;
      if (pp.paid || (!capped && (pp.inflight || pp.open || (pp.err && !pp.none)))) { this.sql.exec(`UPDATE holds SET exp = ? WHERE ref = ? AND status = 'pending'`, pp.paid ? Date.now() + 5 * 60e3 : Math.min(pp.open && !pp.inflight ? pp.open + 30e3 : Date.now() + 60e3, (+d.created || 0) + HOLD_SEC * 1000 + HOLD_CAP_EXTRA), d.ref); continue; }   /* page still payable: hold until it closes */ } catch (e) {}
      try { const hd = JSON.parse(d.data || '{}'); if (hd.holdNotes && !hd.holdNotesDone) { await holdNotesDel(this.env, hd.holdNotes); this.patch(d.ref, { holdNotesDone: Date.now() }); } } catch (e) {}
      this.sql.exec(`UPDATE holds SET status = 'released', data = json_set(COALESCE(data, '{}'), '$.relWhy', 'timeout') WHERE ref = ? AND status = 'pending'`, d.ref); }   /* only if still unpaid: the webhook may have claimed it while HitPay was asked (review 5 Nov) */   /* payment page kept (see safeRelease) */
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
      if (env.TV_KEY) this.ackNote(m.room, await fetch(FB_BASE + env.TV_KEY + '/' + m.room + '/msgAck.json').then((r) => r.json()).catch(() => null));   /* keep the last OK before a new message can replace it */
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
  if (!name) throw new Error('Please fill in your name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Please check your email address – it looks incomplete (it should look like name@gmail.com)');
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
  const hb0 = book(env);
  for (const o of await hb0.pendingFor(phone.slice(-8), email)) {   /* the same guest picking again: their old hold (and its block) goes first – unless it's paid */
    const r = await safeRelease(env, o.ref, 'again');
    if (r.paid) throw new Error('Your earlier payment went through' + (r.booked ? ' and you’re booked – check your email for the confirmation.' : '. We’re confirming that booking now – please don’t pay again; we’ll WhatsApp you.'));
    if (r.unknown) throw new Error('We’re still checking your earlier payment. Please wait a minute before trying again – don’t pay twice.');
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
    if (!c) { await hb.release(ref, 'error'); console.log('[checkout] contact refused: ' + errs.join(' | ')); throw new Error('We couldn’t save your details for the booking – please check your name, email and mobile number. Still stuck? WhatsApp us on +65 9162 5767.'); }
    await hb.patch(ref, { cid: c.cid, cidLate: c.late });
    /* block the time in SimplyBook while they pay (if SimplyBook won't take the note, the hold on our page still stands) */
    const hn = await holdNotesMake(env, ref, q, pax).catch((e) => { console.log('[checkout] hold note: ' + String(e.message || e).slice(0, 120)); return []; });
    if (hn.length) await hb.patch(ref, { holdNotes: hn });
  }
  const when = new Date(q.date + 'T00:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  let pr;
  try {
    pr = await hitpay(env, 'POST', '/payment-requests', {
      amount: q.total.toFixed(2), currency: 'SGD', name, email, phone,
      purpose: (pay === 'test' ? 'TEST · ' : '') + `Round2 ${q.room} · ${when} ${q.time}–${q.end} (${q.hours}h)`,
      reference_number: ref, redirect_url: `${PUBLIC_BOOK}/done?ref=${ref}`, webhook: `${origin}/booking/hitpay`,
      /* the payment page closes itself when the guest's 10 minutes run out (owner, 5 Nov: "keep it airtight") – nobody
         can pay an old tab later; the timer keeps the time held until the page has closed (HitPay: SGT, tested in sandbox) */
      expiry_date: new Date(Date.now() + HOLD_SEC * 1000 + PAGE_GRACE + 8 * 3600e3).toISOString().slice(0, 19).replace('T', ' '),
    });
  } catch (err) { await hb.release(ref, 'error'); await holdNotesClear(env, ref).catch(() => null); throw err; }
  await hb.setPr(ref, pr.id);
  return { ref, url: pr.url, total: q.total, room: q.room, date: q.date, time: q.time, end: q.end, holdUntil: Date.now() + HOLD_SEC * 1000, now: Date.now(), test: pay === 'test' || undefined };
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
/* The 10-minute gap (owner, 3 Nov: "close the 10 min gap completely"): while a guest pays, the room (and its twin) is blocked
   in SimplyBook too, with a time-blocked note "SYSTEM BLOCK · ONLINE HOLD …". So staff keying in a WhatsApp booking, Late
   session and SimplyBook's own page all see the time as taken. The note goes the moment the guest pays (just before the real
   booking is made), lets go, or the hold runs out; a sweep every 10 minutes removes any left behind. Because it says SYSTEM
   BLOCK, every screen that skips mirror blocks (In session, Tonight, Auto wrap-up, the 1-hour alert, guest links, Late session
   list, after-midnight markers) skips it; clash checks show it as "an online guest is paying". */
const holdText = (ref, room) => `SYSTEM BLOCK · ONLINE HOLD · a guest is paying for ${room} right now · ref ${ref} · removed automatically`;
async function holdNotesMake(env, ref, q, pax) {
  const s2 = await sb2(env), s = sgMs0(q.date + ' ' + q.time), end = s + (q.hours * 60 + BUF) * 60e3, ids = [], room = q.unit === 11 ? 'Maximillion' : q.room;
  const body = (u) => ({ provider_id: u, service_id: null, start_date_time: sgStr(s), end_date_time: sgStr(end), note_type_id: 1, note: holdText(ref, room), mode: 'provider', time_blocked: true });
  /* a group of 4+ in Max/Atlas/Bella also holds the noise room while paying (noise rule, owner 8 Nov); a clash there never stops the payment */
  for (const u of [q.unit, MIRROR[q.unit]].filter(Boolean)) { const r = await s2('POST', '/admin/calendar-notes', body(u)); if (r && r.id) ids.push(String(r.id)); }
  if (+pax >= NOISE_PAX && NOISE[q.unit]) { const r = await s2('POST', '/admin/calendar-notes', body(NOISE[q.unit])).catch(() => null); if (r && r.id) ids.push(String(r.id)); }
  return ids;
}
async function holdNotesDel(env, ids) {
  if (!ids || !ids.length) return;
  const s2 = await sb2(env);
  for (const id of ids) await s2('DELETE', '/admin/calendar-notes/' + id).catch((e) => { if (!/ 404:/.test(String(e.message || e))) throw e; });
}
async function holdNotesClear(env, ref) {
  const hb = book(env), h = await hb.get(ref); if (!h || !h.data.holdNotes || h.data.holdNotesDone) return;
  await holdNotesDel(env, h.data.holdNotes); await hb.patch(ref, { holdNotesDone: Date.now() });
}
/* ---------- HitPay is the truth (5 Nov, Malia paid by PayNow at 2:24am; our page asked HitPay a moment too early, was told
   "not paid yet", released her hold and sent her back – the money arrived, the booking didn't). Rules since then:
   a hold is never released without asking HitPay first; a paid hold is always booked, whichever path finds it
   (redirect, webhook, back button, the same guest picking again, the 10-minute timer, or the 5-minute sweep). ---------- */
async function hpPaid(env, h) {
  if (!h || !h.pr) return { paid: false, none: true };
  let pr = null;
  try { pr = await hitpay(envFor(env, h.data && h.data.pay), 'GET', '/payment-requests/' + h.pr); }
  catch (e) { const m = String(e.message || e).slice(0, 160); return /HitPay 404/.test(m) ? { paid: false, gone: true, err: m, none: true } : { paid: false, err: m }; }   /* 404 = that payment page was deleted */
  const want = Math.round(+(((h.data || {}).q || {}).total || 0) * 100);
  const good = (x) => /^(succeeded|completed|paid)$/i.test(String(x.status || '')) && (!want || Math.round(+x.amount * 100) === want);
  const pays = pr.payments || [];
  /* a payment still going through (not failed or cancelled): not paid YET – never release it (we used to delete the payment
     page here, and once it's deleted HitPay can't even tell us about the money any more: Malia, 5 Nov) */
  const inflight = !pays.some(good) && pays.some((x) => !/fail|cancel|void|refund|expire|requires_payment_method/i.test(String(x.status || '')));   /* requires_payment_method = card form opened, nothing sent yet (sandbox test 5 Nov) */
  /* the page can still be paid until its expiry (SGT): "open" until then */
  const expMs = pr.expiry_date ? Date.parse(String(pr.expiry_date).replace(' ', 'T').slice(0, 19) + '+08:00') : 0;
  const open = pr.status === 'pending' && expMs > Date.now() ? expMs : 0;
  return { paid: pr.status === 'completed' || pays.some(good), inflight, open, status: pr.status, payments: pays.map((x) => ({ id: x.id, status: x.status, amount: x.amount })) };
}
/* release a pending hold only if HitPay says it isn't paid; a paid one is booked instead */
async function safeRelease(env, ref, why) {
  const hb = book(env), h = await hb.get(ref);
  if (!h || h.status !== 'pending') return { released: false, status: h && h.status };
  const p = await hpPaid(env, h);
  if (p.paid) { const f = await finalize(env, ref, 'paid-' + why); return { released: false, paid: true, booked: !!f.ok }; }
  if ((p.err && !p.none) || p.inflight) return { released: false, unknown: true };   /* HitPay didn't answer, or a payment is going through: keep the hold */
  const r = await hb.release(ref, why);
  /* the payment page is NOT deleted any more: once deleted, HitPay can't tell us about money that arrives late (Malia).
     A late payment on a released hold is booked by the webhook or the sweep if the time is still free, else flagged for a refund. */
  if (r) await holdNotesClear(env, ref).catch(() => null);
  return { released: !!r };
}
/* every 5 minutes: holds from the last 6 hours that were released or are still waiting – paid at HitPay? book them now */
async function paidSweep(env) {
  const hb = book(env), out = [];
  const rows = await hb.rows(`SELECT ref FROM holds WHERE created > ? AND (status = 'released' OR (status = 'pending' AND created < ?)) AND pr != '' AND json_extract(data, '$.hpFinal') IS NULL ORDER BY created DESC LIMIT 40`, Date.now() - 6 * 3600e3, Date.now() - 3 * 60e3);
  /* a booking cut off half-way (page closed mid-booking): never rebooked by itself – a human looks (review 5 Nov) */
  for (const r of await hb.rows(`SELECT ref FROM holds WHERE status = 'booking' AND created > ? AND created < ? AND json_extract(data, '$.stuckAlert') IS NULL`, Date.now() - 86400e3, Date.now() - 10 * 60e3)) {
    await hb.patch(r.ref, { stuckAlert: Date.now() });
    await humanAlert(env, r.ref, '⚠️ Online booking stuck half-way', 'Paid online, but putting it into SimplyBook stopped half-way over 10 minutes ago. Check SimplyBook for ref ' + r.ref + ' and book it by hand if it is not there.').catch(() => null);
  }
  for (const r of rows) {
    const h = await hb.get(r.ref); if (!h) continue;
    const p = await hpPaid(env, h);
    /* HitPay has closed the page for good and nothing was paid: stop asking about it (keeps the sweep short on busy nights) */
    if (!p.paid && !p.inflight && !p.err && /^(expired|canceled|cancelled)$/i.test(String(p.status || '')) && !(p.payments || []).length && Date.now() - h.created > 20 * 60e3) { await hb.patch(r.ref, { hpFinal: p.status }); continue; }
    if (p.paid) { const f = await finalize(env, r.ref, 'sweep').catch((e) => ({ ok: false, err: String(e.message || e) })); out.push({ ref: r.ref, booked: !!f.ok, err: f.err || null }); }
  }
  if (out.length) await hb.kvSet('paidSweepLast', { t: Date.now(), out });
  return out;
}
async function holdSweep(env) {
  const hb = book(env), due = await hb.holdNotesDue(), out = [];
  for (const r of due) { try { await holdNotesDel(env, r.ids); await hb.patch(r.ref, { holdNotesDone: Date.now() }); out.push(r.ref); } catch (e) {} }
  return { cleared: out };
}
/* "needs a human" (owner, 3 Nov): every phone with alerts on, a red line in the control centre, and Telegram if set up */
async function humanAlert(env, ref, title, body) {
  const hb = book(env), L = (await hb.kvGet('human')) || [];
  let hid = (L.find((x) => x.ref === ref && x.title === title) || {}).id;
  if (!hid) { hid = Date.now().toString(36); L.unshift({ id: hid, ref, title, body, t: Date.now(), sorted: 0 }); await hb.kvSet('human', L.slice(0, 40)); }
  const h = ref ? await hb.get(ref).catch(() => null) : null, q = (h && h.data && h.data.q) || {};
  const at = q.date && q.time ? Date.parse(q.date + 'T' + q.time + ':00+08:00') : 0;
  const m = await logAlert(env, 'human', { title, body }, { type: 'human', hid, ref, unit: q.unit, room: q.room, s: at, e: at ? at + (q.hours || 0) * 3600e3 : 0, name: h && h.data.name, phone: h && h.data.phone, email: h && h.data.email, total: q.total, hours: q.hours, pay: h && h.data.pay });
  if (env.VAPID_JWK) {
    const subs = await hb.pushList();
    await Promise.all(subs.map(async (x) => hb.pushResult(x.id, await pushOne(env, x.sub, { kind: 'booking', title, body, tag: 'human-' + ref, url: m.url }))));
  }
  await staffAlert(env, title + '\n' + body).catch(() => null);
}

/* ---------- after payment: put the booking into SimplyBook (exactly once) ---------- */
/* Telegram is ONLY for the food workflow between Madd Pizza and Round2 (kitchen slip, pickup button – KITCHEN_CHAT below).
   Owner, 14 Nov 2026: no Telegram messages about bookings – Madd Pizza doesn't need to know them. This used to post booking
   alerts to a staff group (secret STAFF_CHAT, never set, so nothing was ever sent); it now never sends, whatever is set.
   Booking alerts go to the staff phones (control centre push) only. */
async function staffAlert(env, text) { return; }
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
    if (h.status === 'released' && !(await isFree(env, q, ref))) {
      /* the same guest picked again after paying (Malia, 5 Nov): their newer UNPAID hold gives way to the paid one */
      for (const o of await hb.pendingFor(String(h.phone || ''), String(h.email || ''))) {
        if (o.ref === ref) continue;
        const oh = await hb.get(o.ref); if (!oh || (await hpPaid(env, oh)).paid) continue;
        if (await hb.release(o.ref, 'gaveway')) await holdNotesClear(env, o.ref).catch(() => null);
      }
      if (!(await isFree(env, q, ref))) throw new Error('slot was released and re-taken – refund needed');
    }
    if (env.DRY_RUN === '1') {
      await holdNotesClear(env, ref).catch(() => null);
      result = { dryRun: true, would: ['book', q.eventId, q.unit, 'client(' + d.email + ')', q.date, q.time + ':00', '(end + 15 min cleaning)', 0, { [PAX_FIELD]: String(d.pax) }] };
    } else {
      if (d.holdNotes && !d.holdNotesDone) await holdNotesClear(env, ref).catch(() => null);   /* our own block off, then book */
      const a0 = await admin(env), F = d.pay === 'test' && Array.isArray(env.__fail) ? env.__fail : [];
      /* test bench only (gm testbook, sandbox holds): SimplyBook "refuses" on purpose, to walk every fallback */
      const a = !F.length ? a0 : (m, p) => (F.includes(m) && !(m === 'addClient' && p && p[0] && p[0].name === 'Round2 online guest') ? Promise.reject(new Error(m + ': TEST – refused on purpose')) : a0(m, p));
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
        if (F.includes('note')) throw new Error('TEST – the calendar note was refused on purpose too');
        result = await noteBooking(env, d, q, ref);
        how.push('a calendar note holds the room (SimplyBook refused the booking: ' + (bErr || 'no answer') + ')');
      } else result = { bookingId: b0.id, code: b0.code };
      if (how.length) result.fallback = how;
      if (late && result.bookingId) result.email = await a('editClient', [cid, { name: d.name, email: d.email, phone: d.phone }]).then(() => 'ok').catch((e) => 'no: ' + String(e.message || e).slice(0, 60));
      /* SimplyBook's own guest bookings are confirmed; ours come in unconfirmed. Confirming sends the guest's one email. */
      /* (no confirm step: SimplyBook has no confirmBooking for our account – bookings made here are confirmed already; tested 3 Nov) */
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
  /* noise rule for online bookings straight away, not only when SimplyBook's callback comes (owner, 10 Nov: Anisah, 6 pax in
     Max on 11 Dec, booked online, didn't block Bella) */
  if (result.bookingId && !result.dryRun && +d.pax >= NOISE_PAX && NOISE[q.unit]) await noiseSync(env, [q.date], 'online booking').catch((e) => console.log('[noise] online ' + String(e.message || e).slice(0, 120)));
  await hb.done(ref, result);   /* first, so the guest's page shows the outcome straight away */
  await hb.kvSet('gapc', {}).catch(() => null); await hb.kvSet('gcal', null).catch(() => null);   /* the booking board asks SimplyBook afresh (its 2–10 min memory) */
  /* paid but not in SimplyBook (slot gone, SimplyBook down…): tell staff straight away so they can call / refund */
  const T = d.pay === 'test' ? 'TEST · ' : '';
  const who = `${q.unit === 11 ? 'Maximillion' : q.room} · ${q.date} ${q.time}–${q.end} (${q.hours}h) · paid $${q.total.toFixed(2)}\n${d.name} · ${d.phone} · ${d.email} · ref ${ref}`;
  if (result.problem) await humanAlert(env, ref, T + '⚠️ Paid online – NOT booked', result.problem + '\n' + who).catch(() => null);
  else if (result.fallback) await humanAlert(env, ref, T + (result.note ? '⚠️ Paid online – held by a NOTE only' : '⚠️ Online booking – check it'), 'Booked using ' + result.fallback.join('; ') + '\n' + who).catch(() => null);
  else if (result.email && result.email !== 'ok') await humanAlert(env, ref, T + '⚠️ Online booking – no email reached the guest', 'SimplyBook refused the email (' + result.email + '). Booked fine – WhatsApp them the details.\n' + who).catch(() => null);
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
const SYS_RE = /SYSTEM\s*BLOCK/i, HOLD_RE = /ONLINE\s*HOLD/i, EXT_RE = /\bEXT\b/i, LATE_RE = /(?:\blate|·|BLOCK · \w+) till [0-9:]+[ap]m/i;   /* a control-centre session note: "· late till 1am" (late by its times) or "· till 7pm" (owner, 5 Nov: a 4–7pm session keyed in here isn't late); twin "SYSTEM BLOCK · Vale (late) till …". Not EXT notes. */
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
    a('getBookings', [{ booking_type: 'non_cancelled', date_from: addDays(day, -1), date_to: addDays(day, 1) }]),   /* through the next morning: +1h past midnight (overnight review 5 Nov) */
    s2('GET', '/admin/calendar-notes?filter[date_from]=' + addDays(day, -1) + '&filter[date_to]=' + addDays(day, 1) + '&on_page=200'),
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
    if (x.s < to && x.e > from) out.push({ room: ROOMS[x.unit][0], what: x.k === 'b' ? (x.sys ? 'twin room booking' : 'booking: ' + (x.name || 'guest')) : (HOLD_RE.test(x.name || '') ? 'an online guest is paying for this time (held ~10 min)' : (x.blk ? 'room blocked: ' : 'note: ') + (x.name || '').slice(0, 40)), s: x.s, e: x.e });
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
      const text = N.late ? String(N.edit.note).replace(LATE_RE, (m) => { const x = m.replace(/till [0-9:]+[ap]m/i, 'till ' + clock12(N.twin ? to : newGuest)); return lateSess(S.s, newGuest) && !/\blate till/i.test(x) ? x.replace(/till /i, 'late till ') : x; })
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
  return { ok: true, on: !!m2.autoEnd, by: m2.autoBy || '', t: m2.autoT || 0, now, last: await hb.kvGet('autoLast'), cronLast: await hb.kvGet('cronLast'), cronPrev: await hb.kvGet('cronPrev'), sbToday: await hb.kvGet('sbn:' + sgDay(now)), sbBy: await hb.kvGet('sbb:' + sgDay(now)), sbYesterday: await hb.kvGet('sbn:' + addDays(sgDay(now), -1)), orphanLast: await hb.kvGet('orphanLast'), sessions: list.sort((a, b) => a.guestEnd - b.guestEnd) };
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
    .map((it) => ({ room: ROOMS[it.unit][0], what: it.k === 'b' ? 'booking' : HOLD_RE.test(it.name || '') ? 'online guest paying (held ~10 min)' : it.blk ? 'room blocked' : 'note', name: String(it.name || '').slice(0, 40), from: clock12(it.s), to: clock12(it.e) }));
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
  const lateW = lateSess(s, guestEnd) ? 'late till ' : 'till ';   /* "late" only when the times are late (owner, 5 Nov) */
  const text = name + ' ' + pax + ' pax · ' + lateW + clock12(guestEnd) + ' · control centre';
  /* "About 10 minutes to go" + "That's a wrap!" on the TV (toggle, default on): only for sessions starting within 24 h,
     so a session cancelled days later doesn't leave messages behind on an empty room's TV */
  const autoOn = !!(await hb.getMode()).autoEnd;
  const wantMsgs = f.msgs !== 'no' && !autoOn, soonEnough = s - Date.now() < 24 * 3600e3 && guestEnd > Date.now() + 10 * 60e3;
  const plan = { room, twin: tw ? ROOMS[tw][0] : null, name, pax, arrives: clock12(s), guestEnd: clock12(guestEnd), blockEnd: clock12(blockEnd), hours: Math.round(hrs * 100) / 100,
    nextDay: sgDay(guestEnd) !== day, arrivesDay: sgDayName(s), leavesDay: sgDayName(guestEnd), text, clash, msgs: f.msgs === 'no' ? 'off' : autoOn ? 'auto' : wantMsgs ? (soonEnough ? { wrapup: clock12(guestEnd - 10 * 60e3), timeup: clock12(guestEnd) } : 'later') : 'off' };
  /* REAL BOOKING FIRST (owner, 12 Nov): inside opening hours (start 11am–8:15pm, guest leaves by 11:15pm the same day), 3–6 whole
     hours, nothing in the way and the guest's mobile typed → a proper SimplyBook booking: it gets a booking code, the guest's
     booking page (/b/<code>: TV message, receipt, rescheduling) and – with an email – SimplyBook's confirmation email.
     Anything else (late, odd lengths, clashes, Change) stays a note, exactly as before. */
  const phone = String(f.phone || '').replace(/[^\d+]/g, ''), email = String(f.email || '').trim().slice(0, 80), p8 = phone.replace(/\D/g, '').slice(-8);
  const stM = (s - sgMs0(day + ' 00:00')) / 60e3, geM = (guestEnd - sgMs0(day + ' 00:00')) / 60e3;
  const noteWhy = f.replace ? 'change of a session' : f.kind === 'note' ? 'staff chose a note' : p8.length < 8 ? 'no mobile number' : ![3, 4, 5, 6].includes(hrs) ? 'not 3–6 whole hours' : stM < 660 || stM > 1215 || geM > CLOSE ? 'outside opening hours (late)' : clash.length ? 'something in the way' : email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? 'email doesn’t look right' : '';
  plan.as = noteWhy ? 'note' : 'booking'; plan.whyNote = noteWhy;
  if (!noteWhy) { try { const q0 = await quote(env, { unit, date: day, time: st, hours: hrs }); plan.price = q0.total; } catch (e) { plan.as = 'note'; plan.whyNote = String(e.message || e).slice(0, 60); } }
  if (f.dry) return { ok: true, dry: true, plan };
  if (clash.length && f.force !== 'yes') return { ok: false, clash: true, plan };
  if (plan.as === 'booking') {
    const r = await lateBooking(env, hb, { unit, day, st, hrs, name, pax, phone, email, by: String(f.by || '').slice(0, 30), msgs: f.msgs }).catch((e) => ({ error: String(e.message || e).slice(0, 160) }));
    if (r.ok) {
      const msgs = [];
      if (wantMsgs && soonEnough) {
        for (const kind of ['wrapup', 'timeup']) {
          const at = kind === 'wrapup' ? guestEnd - 10 * 60e3 : guestEnd;
          try { const t = await gmFwd(env, { staff: env.GM_STAFF, action: 'r2', room: GM_ROOM[unit], kind, to: '', from: 'The Round2 team', title: R2_TXT[kind].title, text: R2_TXT[kind].text, ack: 'yes', at }); let j = null; try { j = JSON.parse(t); } catch (e) {} msgs.push(j && !j.error ? { kind, at, ok: true } : { kind, at, problem: (j && j.error) || 'Make didn’t answer' }); } catch (e) { msgs.push({ kind, at, problem: String(e.message || e).slice(0, 80) }); }
        }
        await hb.gmDrop('__LIST__'); await gmList(env, hb).catch(() => null);
      }
      return { ok: true, plan, booking: r, msgs, notes: [] };
    }
    plan.as = 'note'; plan.whyNote = 'SimplyBook refused the booking (' + (r.error || 'no answer') + ') – saved as a note instead';
  }

  const s2 = await sb2(env), done = [];
  const body = (u, txt) => ({ provider_id: u, service_id: null, start_date_time: sgStr(s), end_date_time: sgStr(blockEnd), note_type_id: 1, note: txt, mode: 'provider', time_blocked: true });
  if (old) {
    const pr = await lateDel(s2, old.notes);
    if (pr.length) { await lateRestore(s2, old.notes.filter((n) => !pr.some((x) => x.startsWith('note ' + n.id + ':'))), hb).catch(() => null); return { error: 'SimplyBook didn’t let go of the old note, nothing was changed: ' + pr.join('; ').slice(0, 120) }; }
    await lateMsgsCancel(env, hb, old.S).catch(() => null);
  }
  try {
    const r = await s2('POST', '/admin/calendar-notes', body(unit, text)); done.push({ unit, id: String(r.id), made: true });
    if (tw) { const r2 = await s2('POST', '/admin/calendar-notes', body(tw, 'SYSTEM BLOCK · ' + room + ' ' + lateW + clock12(blockEnd))); done.push({ unit: tw, id: String(r2.id), made: true }); }
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
/* Add a session as a real SimplyBook booking (see late): its own contact (the name typed – never an old contact's name), booked
   like an online booking (end + 15 min cleaning, pax), then a booking record so /b/<code> and /done work and the guest can
   reschedule online. Returns the link for staff to copy and send on WhatsApp. */
async function lateBooking(env, hb, x) {
  const q = await quote(env, { unit: x.unit, date: x.day, time: x.st, hours: x.hrs }), a = await admin(env), how = [];
  let cid = null, late = false;
  const c = await sbContact(a, x.name, x.email || undefined, x.phone, []).catch(() => null); if (c) { cid = c.cid; late = c.late; }
  if (!cid) { const p8 = x.phone.replace(/\D/g, '').slice(-8); const found = Object.values((await a('getClientList', [p8, 1]).catch(() => null)) || {})[0]; if (found) { cid = found.id; how.push('their existing SimplyBook contact'); } }
  if (!cid) { cid = await sbGeneric(env, a).catch(() => null); if (cid) how.push('the shared "Round2 online guest" contact'); }
  if (!cid) throw new Error('SimplyBook wouldn’t make a contact');
  const eB = mins(q.time) + q.hours * 60 + BUF, endDate = eB >= 1440 ? addDays(q.date, 1) : q.date;
  let bErr = ''; const bk = await a('book', [q.eventId, q.unit, cid, q.date, q.time + ':00', endDate, hhmm(eB % 1440) + ':00', 0, { [PAX_FIELD]: String(x.pax) }]).catch((e) => { bErr = String(e.message || e).slice(0, 100); return null; });
  const b0 = bk && bk.bookings && bk.bookings[0]; if (!b0 || !b0.id) throw new Error(bErr || 'no booking id');
  if (late && x.email) await a('editClient', [cid, { name: x.name, email: x.email, phone: x.phone }]).catch(() => null);
  const ref = 'R2B' + crypto.randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase();
  await a('setBookingComment', [b0.id, `Booked by staff (control centre › Add a session${x.by ? ', ' + x.by : ''}) · ref ${ref}\nBooked as: ${x.name} · ${x.phone}${x.email ? ' · ' + x.email : ''} · ${x.pax} pax\nBooking page: ${PUBLIC_BOOK}/b/${b0.code}` + (how.length ? '\nContact: ' + how.join(', ') : '')]).catch(() => null);
  const s = mins(q.time), e = s + q.hours * 60;
  await hb.addPaid({ ref, date: q.date, unit: q.unit, s, e, phone: x.phone.replace(/\D/g, '').slice(-8), email: (x.email || '').toLowerCase(), data: { q, name: x.name, email: x.email || '', phone: x.phone, pax: x.pax, pay: 'staff', by: x.by || '', done: { bookingId: String(b0.id), code: String(b0.code || ''), at: Date.now(), source: 'Add a session' } } });
  await hb.kvSet('gapc', {}).catch(() => null); await hb.kvSet('gcal', null).catch(() => null);
  if ((await hb.getMode()).mirror === 'engine') await mirrorOnSb(env, String(b0.id), 'create').catch(() => null);   /* Vale/Atlas: the twin blocked straight away (SimplyBook's callback would too; the lock stops doubles) */
  await hb.onSb(String(b0.id), 'create').catch(() => null);
  if (+x.pax >= NOISE_PAX && NOISE[q.unit]) await noiseSync(env, [q.date], 'Add a session').catch(() => null);
  if (x.msgs === 'no') { const m = await hb.getMode(), o = new Set(m.autoOff || []); o.add('b' + b0.id); m.autoOff = [...o].slice(-200); await hb.setMode(m); }
  await autoRun(env, 'late session').catch(() => null);
  return { ok: true, bid: String(b0.id), code: String(b0.code || ''), ref, link: PUBLIC_BOOK + '/b/' + b0.code, price: q.total, emailed: !!x.email, how };
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
  const notes = D.items.filter((x) => x.k === 'n' && (ids.has(x.id) || (tw && x.unit === tw && x.sys && !HOLD_RE.test(x.name) && x.s >= S.s - 5 * 60e3 && x.s < S.end)))
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
    if (!(LATE_RE.test(it.txt) || sgH * 60 < SHADOW_TILL || sgDay(guestEnd - 1) !== sgDay(it.s))) continue;
    const pm = it.txt.match(/(\d+)\s*(?:pax|ppl|pp)\b/i);
    out.push({ id: it.id, unit: it.unit, room: ROOMS[it.unit][0], text: it.txt.slice(0, 80), name: it.txt.split(' · ')[0].replace(/\s*\d+\s*(?:pax|ppl|pp)\b.*$/i, '').trim().slice(0, 40), pax: pm ? +pm[1] : 0,
      s: it.s, guestEnd, day: sgDay(it.s), night: sgDay(it.s - SHADOW_TILL * 60e3), ext: nExt, live: it.s <= now });
  }
  /* real bookings made here (owner, 12 Nov): listed with their booking link to copy / WhatsApp again; changed with Move a booking */
  for (const x of await hb.staffBookings(addDays(today, -1))) {
    const q = x.d.q, dn = x.d.done || {}, s = sgMs0(q.date + ' ' + q.time), guestEnd = s + q.hours * 3600e3;
    if (guestEnd <= now || !dn.code) continue;
    out.push({ kind: 'booking', id: 'b' + dn.bookingId, ref: x.ref, code: dn.code, link: PUBLIC_BOOK + '/b/' + dn.code, unit: q.unit, room: ROOMS[q.unit][0], name: x.d.name || '', pax: +x.d.pax || 0, phone: x.d.phone || '',
      text: x.d.name || '', s, guestEnd, day: q.date, night: sgDay(s - SHADOW_TILL * 60e3), ext: 0, live: s <= now, moved: (x.d.moves || []).length });
  }
  out.sort((a, b) => a.s - b.s);
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
  const s2 = await sb2(env), tw = old.notes.filter((n) => +n.unit !== +old.S.unit);
  const p0 = await lateDel(s2, tw); if (p0.length) return { error: 'SimplyBook didn’t remove the twin room’s block, so nothing else was changed: ' + p0.join('; ').slice(0, 160) };   /* overnight review 5 Nov */
  const probs = await lateDel(s2, old.notes.filter((n) => +n.unit === +old.S.unit));
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
  /* a later +1h on the same session would be wiped too (overnight review 5 Nov): undo that one first */
  if ((await hb.extList()).some((x) => x.key && x.key === d.key && x.t > d.t && !x.undone && x.id !== String(f.id))) return { error: 'This session was extended again after this. Undo the later +1h first.' };
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
  await autoRun(env, 'undo').catch(() => null);   /* Auto wrap-up follows the old end again */
  return { ok: true, problems: probs };
}

/* ---------- guest messages front door: POST /gm (same form fields as the Make webhook) ----------
   The cue page (round2-tv-launcher manager/msg/), the staff page and the control centre call this instead of Make, so the
   Make webhook address isn't in any public page. It only passes on what Make would accept: real codes, real changes,
   the right staff code; it caches each link for a minute (page reloads cost nothing), caps guest edits, and limits how
   often one visitor can call. Saves Make operations (10,000 a month shared) – docs/guest-messages.md "Front door". */
const GM_GUEST_EDITS = 8, GM_STAFF_ACTIONS = ['create', 'list', 'move', 'now', 'cancel', 'r2', 'push', 'retime'];
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
    const m2 = await logAlert(env, 'soon', msg, { type: 'wait', code: r.code, unit, room: GM_ROOM[unit] || r.room, s: +r.start });
    await Promise.all(subs.map(async (s) => hb.pushResult(s.id, await pushOne(env, s.sub, m2))));
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
/* ===== Move a booking (owner, 12 Nov): staff move a guest's booking to another room / day / time from the control centre.
   The fee is the same demand-based fee guests will see online (rescheduling plan, docs/rescheduling-plan.md): it depends on
   how likely someone else would have booked the NEW slot (room × day × time × hours before × how full that room already is),
   minus how likely the freed slot sells again, minus any price difference the guest pays. Levels: Upgrade $5 / $15 / $25 / $35;
   the Vale/Atlas twin back-to-back in the same room goes one level up (owner: lets the used room be cleaned last).
   Staff may lower or waive the fee (logged). Payment: PayNow QR shown in the control centre, a normal HitPay link to send on
   WhatsApp, or "paid in shop" (Tap to Pay). The move itself = SimplyBook editBook, then the usual chain (Vale/Atlas block,
   guest messages, Auto wrap-up) runs at once. Figures measured 12 Nov from bookings 1 Aug–10 Nov. */
const MV_GRP = { 5: 'busy', 8: 'busy', 9: 'busy', 10: 'quiet', 11: 'quiet', 12: 'quiet', 7: 'quiet' };
const MV_RF = { 5: 58 / 52.7, 8: 58 / 52.7, 9: 42 / 52.7, 10: 32 / 23.7, 11: 27 / 23.7, 12: 12 / 23.7, 7: 1 };
const MV_RFEB = { 5: 15 / 35, 8: 33 / 35, 9: 57 / 35, 10: 38 / 51, 11: 74 / 51, 12: 41 / 51, 7: 1 };
const MV_PT = { busy: { eb: [3, 6, 18, 35], mid: [10, 13, 31, 49], aft: [26, 29, 42, 52], eve: [32, 38, 48, 56] }, quiet: { eb: [5, 12, 22, 38], mid: [8, 12, 26, 41], aft: [12, 12, 16, 20], eve: [10, 11, 15, 17] } };
const MV_AVGD = { 5: 1.36, 8: 1.54, 9: 1.14, 10: 0.83, 11: 0.98, 12: 0.57, 7: 0.9 };
/* (fee levels replaced 12 Nov by move + popular time – see mvQuote) */
function mvBand(m) { return m === EB_START ? 'eb' : m < 855 ? 'mid' : m < 1035 ? 'aft' : 'eve'; }
function mvShareBy(h) { const P = [[0, 1], [12, 0.7], [24, 0.56], [72, 0.31], [168, 0.15]]; if (h >= 168) return 0.15; for (let k = 0; k < 4; k++) if (h <= P[k + 1][0]) return P[k][1] + (P[k + 1][1] - P[k][1]) * (h - P[k][0]) / (P[k + 1][0] - P[k][0]); return 0.15; }
/* how many guest bookings a room already has that day vs normal by now → ×1.25 (filling fast) / ×0.8 (quiet day) */
function mvPace(D, unit, date, peak, now) {
  const ld = (sgMs0(date + ' 11:00') - now) / 3600e3; if (ld > 7 * 24) return [1, ''];
  const tw = unit === 5 || unit === 12, n = D.sessions.filter((S) => S.k === 'b' && !S.sys && (tw ? S.unit === 5 || S.unit === 12 : S.unit === unit)).length;
  const exp = (tw ? MV_AVGD[5] + MV_AVGD[12] : MV_AVGD[unit]) * (peak ? 1.2 : 0.9) * mvShareBy(Math.max(0, ld)), r = (n + 0.5) / (exp + 0.5);
  return n >= 1 && r >= 1.8 ? [1.25, ROOMS[unit][0] + ' filling fast'] : r <= 0.4 ? [0.8, 'quiet day for ' + ROOMS[unit][0]] : [1, ''];
}
function mvSell(unit, m, leadH, peak, pace, bd) {
  const a = MV_PT[MV_GRP[unit]][bd || mvBand(m)], x = [6, 12, 24, 72]; let p;
  if (leadH <= 6) p = a[0] * Math.max(0.5, leadH / 6); else if (leadH >= 72) p = a[3] * Math.min(1.19, 1 + 0.19 * (leadH - 72) / 96);
  else for (let k = 0; k < 3; k++) if (leadH <= x[k + 1]) { p = a[k] + (a[k + 1] - a[k]) * (leadH - x[k]) / (x[k + 1] - x[k]); break; }
  return Math.min(0.95, p / 100 * ((bd || mvBand(m)) === 'eb' ? MV_RFEB[unit] : MV_RF[unit]) * (peak ? 1.06 : 0.97) * pace);
}
const mvPrice3 = (type, peak, m) => { const P = PRICES[type]; return m === EB_START ? P.eb.base : P[peak ? 'peak' : 'off'].base; };
/* expected value of a sale in that slot (11am = early bird; 11:15am–2pm part early bird, part afternoon; Vale+Atlas = one space) */
function mvExpV1(unit, m, leadH, peak, pace) {
  const t = ROOMS[unit][1], b = mvBand(m), eb = mvPrice3(t, peak, EB_START), full = mvPrice3(t, peak, Math.max(m, 855));
  if (b === 'eb') { const q = mvSell(unit, m, leadH, peak, pace, 'eb'); return [q * eb, q]; }
  if (b === 'mid') { const w = (m - 675) / (840 - 675), q1 = mvSell(unit, m, leadH, peak, pace, 'eb'), q2 = mvSell(unit, m, leadH, peak, pace, 'aft'); return [(1 - w) * q1 * eb + w * q2 * full, (1 - w) * q1 + w * q2]; }
  const q = mvSell(unit, m, leadH, peak, pace); return [q * mvPrice3(t, peak, m), q];
}
function mvExpV(unit, m, leadH, peak, pace) { if (unit === 5 || unit === 12) { const v = mvExpV1(5, m, leadH, peak, pace), a = mvExpV1(12, m, leadH, peak, pace); return v[0] + (1 - v[1]) * a[0]; } return mvExpV1(unit, m, leadH, peak, pace)[0]; }
/* the Vale/Atlas session just before or after the new one: in the same twin room (rushed turnaround) or the other one */
function mvTwin(D, unit, s, e, skipKeys) {
  if (unit !== 5 && unit !== 12) return '';
  let same = false, other = false;
  for (const x of D.items) {
    if (x.k !== 'b' || x.sys || (x.unit !== 5 && x.unit !== 12) || skipKeys.has('b' + x.id)) continue;
    const before = x.e <= s && s - x.e <= 30 * 60e3, after = x.s >= e && x.s - e <= 30 * 60e3;
    if (before || after) { if (x.unit === unit) same = true; else other = true; }
  }
  return same ? 'same' : other ? 'other' : '';
}
async function mvBooking(env, bid) {
  const b = await (await admin(env))('getBookingDetails', [String(bid)]).catch((e) => ({ err: String(e.message || e).slice(0, 120) }));
  if (!b || b.err || !b.unit_id) throw new Error('Couldn’t read that booking from SimplyBook' + (b && b.err ? ': ' + b.err : '.'));
  const st = String(b.start_date_time || ''), en = String(b.end_date_time || '');
  if (String(b.is_confirm) === '0' && /cancel/i.test(String(b.status || ''))) throw new Error('That booking is cancelled.');
  if (SYS_CLIENTS.includes(String(b.client_id))) throw new Error('That’s a Vale/Atlas SYSTEM BLOCK, not a guest booking.');
  const s = sgMs0(st), e = sgMs0(en), hours = Math.round((e - s - BUF * 60e3) / 3600e3);
  const fields = {}; for (const x of [].concat(b.additional_fields || [])) if (x && x.field_name) fields[x.field_name] = String(x.value != null ? x.value : '');
  return { bid: String(b.id), code: String(b.code || ''), unit: +b.unit_id, cid: String(b.client_id), name: String(b.client_name || ''), event: String(b.event_id), date: st.slice(0, 10), time: st.slice(11, 16), s, e, hours, fields };
}
/* the booking's +h (EXT) notes: owner, 12 Nov – they move with the booking (made in In session; one per room + its twin) */
function mvExtOf(D, B) {
  const S = D.sessions.find((x) => x.key === 'b' + B.bid); if (!S || !S.ext.length) return { min: 0, main: [], twin: [] };
  const tw = MIRROR[B.unit], a = S.ext[0].s, z = S.end;
  const twin = tw ? D.items.filter((x) => x.unit === tw && x.k === 'n' && !x.blk && x.ext && x.s >= a - 5 * 60e3 && x.e <= z + 5 * 60e3) : [];
  return { min: Math.round((S.end - S.e0) / 60e3), main: S.ext.map((x) => ({ id: String(x.id), s: x.s, e: x.e })), twin: twin.map((x) => ({ id: String(x.id), s: x.s, e: x.e })) };
}
async function mvQuote(env, f) {
  const hb = book(env), now = Date.now(), B = await mvBooking(env, f.bid);
  if (B.s < now - 15 * 60e3) throw new Error('That session has already started.');
  const hours = +f.hours || B.hours, unit = +f.unit || B.unit, date = /^\d{4}-\d\d-\d\d$/.test(f.date || '') ? f.date : B.date, time = /^\d\d:\d\d$/.test(f.time || '') ? f.time : B.time;
  const q = await quote(env, { unit, date, time, hours });
  const s = sgMs0(date + ' ' + time), eB0 = s + hours * 3600e3 + BUF * 60e3;
  if (s < now) throw new Error('That time has passed.');
  if (unit === B.unit && date === B.date && time === B.time && hours === B.hours) throw new Error('That’s the booking as it is now.');
  const D0 = await sessDay(env, sgDay(B.s - SHADOW_TILL * 60e3)), D1 = await sessDay(env, sgDay(s - SHADOW_TILL * 60e3));
  const X = mvExtOf(D0, B);   /* its +h moves with it, so the new time must be free for the extra time too */
  /* anything in the way at the new time, apart from this booking and its own Vale/Atlas block */
  const e = eB0 + X.min * 60e3;
  const mir = await hb.kvGet('mir:' + B.bid), skip = new Set(['b' + B.bid].concat(mir && mir.blk ? ['b' + mir.blk] : []).concat(X.main.concat(X.twin).map((n) => 'n' + n.id)));
  const twinBlk = (x) => x.k === 'b' && x.sys && (x.unit === 5 || x.unit === 12) && D0.items.concat(D1.items).some((y) => y.k === 'b' && y.id === B.bid && Math.abs(y.s - x.s) <= 5 * 60e3);
  const tw = MIRROR[unit], clash = [];
  for (const x of D1.items) {
    if (x.unit !== unit && x.unit !== tw) continue;
    if (skip.has(x.k + x.id) || twinBlk(x)) continue;
    if (f.holdRef && x.k === 'n' && String(x.name || '').includes('ref ' + f.holdRef)) continue;   /* this move's own ONLINE HOLD note (a remembered day may still list it) */
    if (x.s < e && x.e > s) clash.push(ROOMS[x.unit][0] + ': ' + (x.k === 'b' ? (x.sys ? 'twin room booking' : 'booking ' + (x.name || 'guest')) : HOLD_RE.test(x.name || '') ? 'an online guest is paying for this time' : (x.blk ? 'room blocked' : 'note: ' + String(x.name || '').slice(0, 40))) + ' ' + clock12(x.s) + '–' + clock12(x.e));
  }
  const closeT = sgMs0(sgDay(s - SHADOW_TILL * 60e3) + ' ' + hhmm(CLOSE)); if (e - BUF * 60e3 > closeT + 60e3) clash.push('past closing time (11:15pm)');
  /* the fee */
  const ph = await holidays(), pk = (d) => { const w = new Date(d + 'T00:00:00Z').getUTCDay(); return w === 0 || w === 5 || w === 6 || ph.has(d); };
  const oPeak = pk(B.date), held = await hb.holdOfBid(B.bid), oq = await quote(env, { unit: B.unit, date: B.date, time: B.time, hours: Math.min(6, Math.max(3, B.hours)) }).catch(() => null);
  const paid = held && held.data && held.data.q ? +held.data.q.total : oq ? oq.total : 0;
  const pN = mvPace(D1, unit, date, q.peak, now)[0], why = mvPace(D1, unit, date, q.peak, now)[1], pO = mvPace(D0, B.unit, B.date, oPeak, now)[0];
  const lN = (s - now) / 3600e3, lO = (B.s - now) / 3600e3, m = mins(time), mO = mins(B.time);
  const v3N = mvPrice3(ROOMS[unit][1], q.peak, m), v3O = mvPrice3(ROOMS[B.unit][1], oPeak, mO);
  const money = mvExpV(unit, m, lN, q.peak, pN) - mvExpV(B.unit, mO, lO, oPeak, pO) - Math.max(0, v3N - v3O);
  const twin = mvTwin(D1, unit, s, e, skip), eb = mO === EB_START;
  /* the fee in two parts (owner, 12 Nov): the move – upgrade $5 (bigger room) / peak time $5 (same kind of room) / move $15 –
     plus "popular time" +$10/+$20 for what the move part doesn't cover; Vale/Atlas straight after a session in the same twin
     room +$10, the other twin room −$10 where that still covers the cost. Early-bird bookings: always move $15. */
  /* same rule as the guest page's gLogic.feeOf (owner, 14 Nov): add hours = no fee; $5 only for a bigger kind of room or the same kind at a dearer rate */
  const RK = { netflix: 1, deluxe: 2, vip: 3 }, rN = RK[ROOMS[unit][1]], rO = RK[ROOMS[B.unit][1]], addOnly = unit === B.unit && date === B.date && time === B.time && hours > B.hours;
  let dearer = false; try { dearer = (await quote(env, { unit, date, time, hours: 3 })).total > (await quote(env, { unit: B.unit, date: B.date, time: B.time, hours: 3 })).total + 0.004; } catch (e) {}
  const up = !eb && q.total > paid + 0.004 && (rN > rO || (rN === rO && dearer)), base = addOnly ? 0 : up ? 5 : 15, name = addOnly ? 'add hours' : up ? (rN > rO ? 'upgrade' : 'peak time') : 'move';
  const xs = money - base; let add = addOnly || xs <= 5 ? 0 : Math.min(20, Math.ceil((xs - 5) / 5) * 5);   /* $5 steps, same as the guest page (owner, 12 Nov) */
  if (addOnly) add = 0; else if (twin === 'same') add = Math.min(20, add + 10); else if (twin === 'other' && add && base + add - 10 >= money - 5) add -= 10;
  const diff = Math.max(0, Math.round((q.total - paid) * 100) / 100), fee = base + add;
  return { ok: !clash.length, clash, ext: X.min, from: { bid: B.bid, code: B.code, room: ROOMS[B.unit][0], unit: B.unit, date: B.date, time: B.time, hours: B.hours, name: B.name, paid, online: !!held },
    to: { room: q.room, unit, date, time, hours, end: q.end, price: q.total, peak: q.peak, earlyBird: q.earlyBird },
    level: name, base, add, fee, diff, total: Math.round((fee + diff) * 100) / 100, reason: [why, twin === 'same' ? 'same Vale/Atlas room straight after another session' : twin === 'other' ? 'other Vale/Atlas room – easy turnaround' : ''].filter(Boolean).join(' · '),
    lostSales: Math.round(money * 100) / 100 };
}
/* do the move in SimplyBook (after payment, or waived / paid in shop) */
async function mvExecute(env, mv, how) {
  const hb = book(env);
  if (!(await hb.lock('mvlock:' + mv.from.bid, 120e3))) return { error: 'Someone is moving this booking right now.' };
  try {
    if (mv.hold || mv.holdNotes) { if (mv.holdNotes && !mv.holdNotesDone) { await holdNotesDel(env, mv.holdNotes).catch(() => null); mv.holdNotesDone = Date.now(); } await hb.mvHoldDrop(mv.ref).catch(() => null); }   /* our own hold off, then the fresh check and the move */
    const Q = await mvQuote(env, { bid: mv.from.bid, unit: mv.to.unit, date: mv.to.date, time: mv.to.time, hours: mv.to.hours, holdRef: mv.ref });
    if (!Q.ok) return { error: 'That time isn’t free any more: ' + Q.clash.join('; '), clash: Q.clash };
    const B = await mvBooking(env, mv.from.bid), q = await quote(env, { unit: mv.to.unit, date: mv.to.date, time: mv.to.time, hours: mv.to.hours });
    const X0 = mvExtOf(await sessDay(env, sgDay(B.s - SHADOW_TILL * 60e3)), B);
    const a = await admin(env), eB = mins(q.time) + q.hours * 60 + BUF;
    /* its own Vale/Atlas block goes first (else SimplyBook sees the twin room busy); put back if the move fails */
    const mir = await hb.kvGet('mir:' + B.bid);
    if (mir && mir.blk) { await a('cancelBooking', [mir.blk]).catch(() => null); await hb.kvSet('mir:' + B.bid, null); await hb.kvSet('mirb:' + mir.blk, null); }
    await hb.kvSet('mvpush:' + B.bid, Date.now() + 10 * 60e3).catch(() => null);   /* set BEFORE SimplyBook hears of it: its own 'changed' alert is skipped, ours (with who + what was paid) goes instead */
    const ed = await a('editBook', [B.bid, q.eventId, q.unit, B.cid, q.date, q.time + ':00', eB >= 1440 ? addDays(q.date, 1) : q.date, hhmm(eB % 1440) + ':00', 0, B.fields]).then(() => true).catch((e) => String(e.message || e).slice(0, 160));
    await mirrorOnSb(env, B.bid, 'change').catch(() => null);   /* new block in the other twin (or the old one put back) */
    if (ed !== true) { await hb.kvSet('mvpush:' + B.bid, 0).catch(() => null); return { error: 'SimplyBook didn’t take the move – the booking is unchanged: ' + ed }; }
    /* its +h (EXT) notes follow: same length after the new end, new room, text rewritten; the Vale/Atlas twin note is redone */
    let extProb = '';
    if (X0.min) {
      try {
        const s2 = await sb2(env), d = sgMs0(q.date + ' ' + q.time) - B.s, ns = B.e + d, ne = ns + X0.min * 60e3, who = (B.name || 'guest').replace(/\s+/g, ' ').trim().split(' ')[0].slice(0, 14);
        const body = (unit, st, en, text) => ({ provider_id: unit, service_id: null, start_date_time: sgStr(st), end_date_time: sgStr(en), note_type_id: 1, note: text, mode: 'provider', time_blocked: true });
        const [first, ...rest] = X0.main;
        await s2('PUT', '/admin/calendar-notes/' + first.id, body(q.unit, ns, ne, 'EXT till ' + clock12(ne - BUF * 60e3) + ' · ' + who));
        for (const n of rest) await s2('DELETE', '/admin/calendar-notes/' + n.id).catch(() => null);
        for (const n of X0.twin) await s2('DELETE', '/admin/calendar-notes/' + n.id).catch(() => null);
        if (MIRROR[q.unit]) await s2('POST', '/admin/calendar-notes', body(MIRROR[q.unit], ns, ne, 'SYSTEM BLOCK · EXT ' + ROOMS[q.unit][0] + ' till ' + clock12(ne)));
      } catch (e) { extProb = String(e.message || e).slice(0, 120); await humanAlert(env, 'mvext-' + B.bid, 'Moved booking: its +h note didn’t follow', `${B.name || 'Guest'} moved to ${q.room} ${q.date} ${q.time}, but the extra-hours (EXT) note didn’t move: ${extProb}. Fix it in SimplyBook (or In session).`).catch(() => null); }
    }
    const rec = { t: Date.now(), bid: B.bid, name: B.name, ext: X0.min, extProb, from: mv.from, to: { room: q.room, unit: q.unit, date: q.date, time: q.time, hours: q.hours }, level: mv.level, feeWas: mv.feeWas, fee: mv.fee, diff: mv.diff, total: mv.total, how, by: mv.by || '', why: mv.why || '', ref: mv.ref || '', guest: !!mv.guest, addHours: !!mv.addHours, moveNo: mv.moveNo || 0, add: mv.add || 0, snug: !!mv.snug, cost: mv.cost != null ? Math.round(mv.cost * 100) / 100 : null };
    await hb.holdMove(B.bid, q, rec).catch(() => null);   /* the guest's booking page shows the new room and time */
    await hb.kvSet('gapc', {}).catch(() => null); await hb.kvSet('gcal', null).catch(() => null);
    await hb.onSb(B.bid, 'change').catch(() => null);   /* guest TV messages follow */
    /* its noise block (4+ guests: Max/Atlas → Bella, Bella → Atlas) follows now – old day and new day – instead of waiting for
       SimplyBook's notice or the next sweep (review 14 Nov: up to an hour, or two days for far-off dates) */
    await noiseSync(env, [sgDay(B.s), q.date], 'moved').catch((e) => console.log('[noise] moved ' + String(e.message || e).slice(0, 120)));
    await autoRun(env, 'moved').catch(() => null);
    const L = (await hb.kvGet('mvlog')) || []; L.unshift(rec); await hb.kvSet('mvlog', L.slice(0, 300));
    await mvStats(env, true).catch(() => null);   /* trip-wires: a push alert when one turns red */
    /* staff phones (owner, 12 Nov): who moved it and what was paid – same tag as the booking's own alert, so it replaces "MOVED" */
    if (env.VAPID_JWK) {
      const sp = (x) => (x.room === 'Max' || +x.unit === 11 ? 'Max' : x.room) + ' ' + new Date(x.date + 'T12:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/,/g, '') + ', ' + clock12(sgMs0(x.date + ' ' + x.time));
      const paid = +mv.total > 0 ? 'paid $' + (+mv.total).toFixed(2).replace(/\.00$/, '') + ' (fee $' + (+mv.fee) + (+mv.diff > 0 ? ' + $' + (+mv.diff).toFixed(2).replace(/\.00$/, '') + ' difference' : '') + ')' : 'no charge' + (mv.grace ? ' (free 15 min)' : '');
      await pushAll(env, 'booking', { title: roomTitle(q.unit) + ' · ' + (B.name || 'Guest'), body: '🔁 RESCHEDULED ' + (mv.guest ? 'online by the guest' + (mv.moveNo === 2 ? ' (2nd move)' : '') : 'by ' + (mv.by || 'staff')) + '\nwas ' + sp(mv.from) + '\nnow ' + sp({ room: q.room, unit: q.unit, date: q.date, time: q.time }) + ' · ' + q.hours + 'h\n' + paid, tag: 'bk' + B.bid, url: '/?tab=resched' }).catch(() => null);
    }
    return { ok: true, moved: rec };
  } finally { await hb.kvSet('mvlock:' + mv.from.bid, 0); }
}
async function mvPayStatus(env, mv) {
  for (const p of mv.prs || []) {
    const pr = await hitpay(envFor(env, p.env || 'live'), 'GET', '/payment-requests/' + p.id).catch(() => null);
    const pays = (pr && pr.payments) || [], want = Math.round(mv.total * 100);
    if (pr && (pr.status === 'completed' || pays.some((x) => /^(succeeded|completed|paid)$/i.test(String(x.status || '')) && Math.round(+x.amount * 100) === want))) return { paid: true, via: p.kind };
  }
  return { paid: false };
}
/* let go of a move's hold: its SimplyBook ONLINE HOLD notes, the kv entry and (when closing it unpaid) its payment link */
async function mvHoldRelease(env, mv, status) {
  const hb = book(env);
  if (mv.holdNotes && mv.holdNotes.length && !mv.holdNotesDone) { await holdNotesDel(env, mv.holdNotes).catch(() => null); mv.holdNotesDone = Date.now(); }
  await hb.mvHoldDrop(mv.ref).catch(() => null);
  if (status) { for (const p of mv.prs || []) await cancelLink(envFor(env, p.env || 'live'), p.id); mv.status = status; }
  await hb.kvSet('mv:' + mv.ref, mv);
}
async function mvComplete(env, ref, source) {
  const hb = book(env), mv = await hb.kvGet('mv:' + ref);
  if (!mv) return { error: 'unknown move' };
  if (mv.status === 'done') return { ok: true, already: true, moved: mv.result };
  if (mv.status === 'expired' || mv.status === 'released') { const st0 = await mvPayStatus(env, mv).catch(() => ({})); if (!st0.paid) return { paid: false, closed: mv.status }; }   /* money that still arrived is honoured below */
  if (!(await hb.lock('mvdone:' + ref, 120e3))) return { busy: true };
  const st = await mvPayStatus(env, mv); if (!st.paid) { await hb.kvSet('mvdone:' + ref, 0); return { paid: false }; }
  const r = await mvExecute(env, mv, 'paid ' + (st.via || 'HitPay'));
  mv.status = r.ok ? 'done' : 'failed'; mv.result = r.moved || null; mv.err = r.error || ''; await hb.kvSet('mv:' + ref, mv);
  if (!r.ok) await humanAlert(env, 'move-' + ref, 'Paid move didn’t go through', `${mv.from.name || 'Guest'} paid $${mv.total.toFixed(2)} to move ${mv.from.room} ${mv.from.date} ${mv.from.time} → ${mv.to.room} ${mv.to.date} ${mv.to.time}, but: ${r.error}. Move it by hand or refund (HitPay). Ref ${ref}.`).catch(() => null);
  return r;
}
/* ===== Guest rescheduling – the rules and the fee (owner, 12 Nov; docs/rescheduling-plan.md). ONE copy of the logic: the
   engine runs it to charge, and serves the very same function to the guest page (/move/logic.js) to show prices, so the
   price on the card is always the price charged. Plain JS on purpose (it runs in browsers too) – no engine helpers inside.
   C = { now: minutes since midnight of day 0 (SG), days: [{date, peak}], cal: [{Room: [[start, end(+cleaning), physRoom]]}],
         bk: {room, day, t, h, paid}, moves: guest moves used, grace: first 15 min after booking / the last move } */
function gLogic(C) {
  var ROOMS = { Vale: ['#E8436A', 'netflix'], Kaeden: ['#4DB848', 'netflix'], Scarlett: ['#F2C21B', 'netflix'], Kai: ['#24B49A', 'deluxe'], Bella: ['#7A5BE0', 'deluxe'], Atlas: ['#E9E7EF', 'deluxe'], Maximillion: ['#E0402F', 'vip'] };
  var PR = { netflix: { off: [49, 16.30, 28.58, 39.20], peak: [69, 23, 40.25, 55.20], eb: { off: [16.33, 32.67, 49], peak: [23, 46, 69] } }, deluxe: { off: [79, 26.30, 39.50, 47.40], peak: [99, 33, 49.50, 59.40], eb: { off: [26.33, 52.67, 79], peak: [33, 66, 99] } }, vip: { off: [109, 36.30, 54.50, 65.40], peak: [129, 43, 64.50, 77.40], eb: { off: [36.33, 72.67, 109], peak: [43, 86, 129] } } };
  var OPEN = 660, LAST = 1215, CLOSE = 1395, BUF = 15, LOCK = 855, NOW = C.now, ND = C.days.length;
  function peak(i) { return !!(C.days[i] && C.days[i].peak); }
  function rate(i, t) { return t === OPEN ? 'eb' : peak(i) ? 'peak' : 'off'; }
  function price(room, i, t, h) { var T = ROOMS[room][1], r = rate(i, t), P = PR[T]; if (r === 'eb') { var pk = peak(i) ? 'peak' : 'off'; return 35 + (h > 3 ? P.eb[pk][h - 4] : 0); } return P[r][0] + (h > 3 ? P[r][h - 3] : 0); }
  function O() { var b = C.bk; return { room: b.room, day: b.day, t: b.t, h: b.h, paid: b.paid, eb: b.t === OPEN }; }
  function leadH() { var o = O(); return (o.day * 1440 + o.t - NOW) / 60; }
  function stage() { var L = leadH(); return L < 3 ? 'closed' : L < 24 ? 'day' : L < 72 ? 'late' : 'early'; }
  /* what's taken in a room on a day (bookings + cleaning, blocks, notes, people paying online); new times start 3h+ from now */
  function taken(i, room) {
    if (i < 0 || i >= ND || !C.cal[i]) return [[0, 2000]];
    var out = (C.cal[i][room] || []).map(function (x) { return x.slice(); }), o = O();
    if (room === o.room && i === o.day) out = out.filter(function (x) { return !(x[0] < o.t + o.h * 60 + BUF && x[1] > o.t); });
    var cut = NOW + 180 - i * 1440; if (cut > OPEN) out.push([OPEN, Math.min(cut, CLOSE + BUF)]);
    return out.sort(function (a, b) { return a[0] - b[0]; });
  }
  function fits(i, room, t, h) { var e = t + h * 60; if (e > CLOSE) return 'past'; var bz = taken(i, room); for (var k = 0; k < bz.length; k++) { if (t < bz[k][1] && e + BUF > bz[k][0]) return bz[k][0]; } return true; }
  /* never leave fewer sellable 3h sessions in that free stretch than it could hold before */
  function deadGap(i, room, t, h) { var bz = taken(i, room), e = t + h * 60 + BUF, pe = OPEN, ns = CLOSE + BUF, U = 180 + BUF; bz.forEach(function (x) { if (x[1] <= t && x[1] > pe) pe = x[1]; if (x[0] >= e && x[0] < ns) ns = x[0]; }); var before = Math.floor((ns - pe) / U), after = 1 + Math.floor((t - pe) / U) + Math.floor((ns - e) / U); return after < before; }
  /* the rules: '' = allowed, else why not */
  function why(i, room, t, h) {
    var o = O(), st = stage();
    if (st === 'closed') return 'closed';
    if (!ROOMS[room] || [3, 4, 5, 6].indexOf(h) < 0 || t % 15 || t < OPEN || t > LAST) return 'taken';
    if (fits(i, room, t, h) !== true) return 'taken';
    if (i === o.day && room === o.room && t === o.t && h === o.h) return 'same';
    if (i * 1440 + t - NOW < 180) return 'soon';
    if (st === 'day') { if (i !== o.day) return 'sameday'; if (price(room, i, t, h) < price(o.room, o.day, o.t, o.h) || (t < o.t && room === o.room && h <= o.h)) return 'upgrade'; }
    if (st === 'late' && t < LOCK) return 'lock';
    if (deadGap(i, room, t, h)) return 'gap';
    return '';
  }
  function okStart(i, room, t) { var o = O(); if (i === o.day && room === o.room && t === o.t) return true; return [3, 4, 5, 6].some(function (h) { return why(i, room, t, h) === ''; }); }
  function starts(i, room) { var a = []; for (var t = OPEN; t <= LAST; t += 15) if (okStart(i, room, t)) a.push(t); return a; }
  function locked(i, room) { if (stage() !== 'late') return []; var a = []; for (var t = OPEN; t < LOCK; t += 15) if (fits(i, room, t, 3) === true && i * 1440 + t - NOW >= 180) a.push(t); return a; }
  function dayFull(i) { return Object.keys(ROOMS).every(function (r) { return !starts(i, r).length; }); }
  /* DEMAND: how likely a free slot still sells, by room group × time band × hours before (measured 1 Aug–10 Nov) */
  var GRP = { Vale: 'busy', Scarlett: 'busy', Kai: 'busy', Bella: 'quiet', Maximillion: 'quiet', Atlas: 'quiet', Kaeden: 'quiet' };
  var RF = { Vale: 58 / 52.7, Scarlett: 58 / 52.7, Kai: 42 / 52.7, Bella: 32 / 23.7, Maximillion: 27 / 23.7, Atlas: 12 / 23.7, Kaeden: 1 };
  var RFEB = { Vale: 15 / 35, Scarlett: 33 / 35, Kai: 57 / 35, Bella: 38 / 51, Maximillion: 74 / 51, Atlas: 41 / 51, Kaeden: 1 };
  var PT = { busy: { eb: [3, 6, 18, 35], mid: [10, 13, 31, 49], aft: [26, 29, 42, 52], eve: [32, 38, 48, 56] }, quiet: { eb: [5, 12, 22, 38], mid: [8, 12, 26, 41], aft: [12, 12, 16, 20], eve: [10, 11, 15, 17] } };
  var AVGD = { Vale: 1.36, Scarlett: 1.54, Kai: 1.14, Bella: .83, Maximillion: .98, Atlas: .57, Kaeden: .9 };
  function band(t) { return t === OPEN ? 'eb' : t < 855 ? 'mid' : t < 1035 ? 'aft' : 'eve'; }
  function shareBy(h) { var P = [[0, 1], [12, .7], [24, .56], [72, .31], [168, .15]]; if (h >= 168) return .15; for (var k = 0; k < 4; k++) if (h <= P[k + 1][0]) return P[k][1] + (P[k + 1][1] - P[k][1]) * (h - P[k][0]) / (P[k + 1][0] - P[k][0]); return .15; }
  /* how that room's bookings that day compare with normal by now (Vale + Atlas counted together) */
  function pace(i, room) {
    if (!room || !C.cal[i]) return [1, '']; var ld = (i * 1440 + OPEN - NOW) / 60; if (ld > 7 * 24) return [1, ''];
    var tw = room === 'Vale' || room === 'Atlas', bz = 0;
    (C.cal[i][room] || []).forEach(function (x) { if (x[1] - x[0] > 720) return; bz += Math.max(0, Math.min(x[1], CLOSE + BUF) - Math.max(x[0], OPEN)); });
    var n = Math.round(bz / 195), exp = (tw ? AVGD.Vale + AVGD.Atlas : AVGD[room]) * (peak(i) ? 1.2 : .9) * shareBy(Math.max(0, ld)), r = (n + .5) / (exp + .5);
    var nm = room === 'Maximillion' ? 'Max' : room; return n >= 1 && r >= 1.8 ? [1.25, nm + ' filling fast'] : r <= .4 ? [.8, 'quiet day for ' + nm] : [1, ''];
  }
  function sellP(room, i, t, lh, bd) {
    var a = PT[GRP[room]][bd || band(t)], x = [6, 12, 24, 72], p;
    if (lh <= 6) p = a[0] * Math.max(.5, lh / 6); else if (lh >= 72) p = a[3] * Math.min(1.19, 1 + .19 * (lh - 72) / 96);
    else { for (var k = 0; k < 3; k++) if (lh <= x[k + 1]) { p = a[k] + (a[k + 1] - a[k]) * (lh - x[k]) / (x[k + 1] - x[k]); break; } }
    return Math.min(.95, p / 100 * ((bd || band(t)) === 'eb' ? RFEB[room] : RF[room]) * (peak(i) ? 1.06 : .97) * pace(i, room)[0]);
  }
  /* expected value of a sale in a slot: 11am = early bird; 11:15am–2pm part early bird, part afternoon; Vale + Atlas = one space */
  function expV0(room, i, t, ld) { var b = band(t), eb = price(room, i, OPEN, 3), full = price(room, i, Math.max(t, 855), 3); if (b === 'eb') { var q = sellP(room, i, t, ld, 'eb'); return [q * eb, q]; } if (b === 'mid') { var w = (t - 675) / (840 - 675), q1 = sellP(room, i, t, ld, 'eb'), q2 = sellP(room, i, t, ld, 'aft'); return [(1 - w) * q1 * eb + w * q2 * full, (1 - w) * q1 + w * q2]; } var q3 = sellP(room, i, t, ld); return [q3 * price(room, i, t, 3), q3]; }
  function expV(room, i, t, ld) { if (room === 'Vale' || room === 'Atlas') { var pv = expV0('Vale', i, t, ld), pa = expV0('Atlas', i, t, ld); return pv[0] + (1 - pv[1]) * pa[0]; } return expV0(room, i, t, ld)[0]; }
  /* Vale/Atlas turnaround: the session just before/after in the SAME twin room (rushed) or the OTHER one (cleaned calmly) */
  function load(i, room, t, h) {
    var r = { same: false, other: false }; if (room !== 'Vale' && room !== 'Atlas') return r; var E = t + (h || 3) * 60;
    ['Vale', 'Atlas'].forEach(function (src) { taken(i, src).forEach(function (x) { var before = x[1] <= t && t - x[1] <= 30 && x[0] > OPEN - 1 && x[1] - x[0] <= 420, after = x[0] >= E + BUF && x[0] - (E + BUF) <= 30 && x[1] - x[0] <= 420; if (!before && !after) return; var phys = x[2] || src; if (phys === room) r.same = true; else r.other = true; }); });
    return r;
  }
  function demand(i, room, t, h) { var o = O(), lN = (i * 1440 + t - NOW) / 60, lO = leadH(), vN = price(room, i, t, 3), vO = price(o.room, o.day, o.t, 3); var cost = expV(room, i, t, lN) - expV(o.room, o.day, o.t, lO) - Math.max(0, vN - vO); return { cost: cost, money: cost, load: load(i, room, t, h || o.h), p: sellP(room, i, t, lN), why: pace(i, room)[1] }; }
  function snug(i, room, t, h) { var e = t + (h || O().h) * 60 + BUF; return taken(i, room).some(function (x) { return (x[1] === t && x[0] > OPEN - 1 && !(i === 0 && x[0] === OPEN && x[1] === NOW + 180)) || x[0] === e; }); }
  /* THE FEE: MOVE $15 / UPGRADE $5 (bigger room) / PEAK TIME $5 (same kind of room) – plus the price difference – plus POPULAR
     +$5…+$20 in $5 steps; Vale/Atlas same twin back-to-back +$10, other twin −$10 where still covered; "$5 OFF" a popular slot
     that fits snugly next to another booking (guests aren't told why). Early-bird bookings: always MOVE $15. */
  function feeOf(i, room, t, h) {
    /* owner, 14 Nov: ADD HOURS (same day, room and start, just longer) = no change fee, only the extra hours' price, and it
       doesn't use up a move. $5 only for a real upgrade: a bigger kind of room (UPGRADE), or the same kind at a dearer rate
       (PEAK TIME) – longer hours alone no longer make a move "$5 peak time"; a smaller room is never an upgrade. */
    var o = O(), hh = h || o.h, d = demand(i, room, t, hh);
    if (i === o.day && room === o.room && t === o.t && hh > o.h) return { base: 0, name: 'ADD HOURS', add: 0, total: 0, d: d, snug: false, addOnly: true };
    var RK = { netflix: 1, deluxe: 2, vip: 3 }, rN = RK[ROOMS[room][1]], rO = RK[ROOMS[o.room][1]], dearer = price(room, i, t, 3) > price(o.room, o.day, o.t, 3) + .004;
    var up = !o.eb && price(room, i, t, hh) > o.paid + .004 && (rN > rO || (rN === rO && dearer)), base = up ? 5 : 15, name = up ? (rN > rO ? 'UPGRADE' : 'PEAK TIME') : 'MOVE';
    var x = d.money - base, add = x <= 5 ? 0 : Math.min(20, Math.ceil((x - 5) / 5) * 5);
    if (d.load.same) add = Math.min(20, add + 10); else if (d.load.other && add && base + add - 10 >= d.money - 5) add -= 10;
    var sn = !o.eb && !d.load.same && add > 0 && snug(i, room, t, hh) && base + add - 5 >= d.money - 5; if (sn) add -= 5;
    return { base: base, name: name, add: add, total: base + add, d: d, snug: sn };
  }
  /* what the guest pays in change fee for this slot: free in the grace minutes; the 2nd move +$10 */
  function fee(i, room, t, h) { if (C.grace) return 0; var F = feeOf(i, room, t, h); if (F.addOnly) return 0; return F.total + (C.moves === 1 ? 10 : 0); }
  function diff(i, room, t, h) { return Math.max(0, Math.round((price(room, i, t, h) - O().paid) * 100) / 100); }
  function total(i, room, t, h) { return Math.round((fee(i, room, t, h) + diff(i, room, t, h)) * 100) / 100; }
  return { ROOMS: ROOMS, OPEN: OPEN, LAST: LAST, CLOSE: CLOSE, BUF: BUF, LOCK: LOCK, O: O, peak: peak, rate: rate, price: price, leadH: leadH, stage: stage, taken: taken, fits: fits, why: why, starts: starts, locked: locked, dayFull: dayFull, pace: pace, sellP: sellP, feeOf: feeOf, fee: fee, diff: diff, total: total, snug: snug };
}
/* ===== Guest rescheduling online (owner, 12 Nov: "launch all") – book.round2.sg/move?ref=… from the booking page.
   The calendar for the guest page comes from ONE SimplyBook bookings read + ONE notes read for the next month, kept 3 min and
   wiped on every change (same moments as the booking board's memory) – never the per-room free-time calls (SimplyBook limit).
   The move itself is the staff move (mvExecute): after payment, re-checked fresh, then SimplyBook editBook + the usual chain. */
const G_NAME = (u) => (+u === 11 ? 'Maximillion' : ROOMS[u][0]);
const G_DAYS = 31, G_TTL = 3 * 60e3;
async function gCalItems(env, from, to, fresh) {
  const hb = book(env), C = fresh ? null : await hb.kvGet('gcal').catch(() => null);
  if (C && C.from === from && C.to >= to && Date.now() - C.t < G_TTL) return C.items;
  const a = await admin(env), s2 = await sb2(env);
  const [bk, nt] = await Promise.all([
    a('getBookings', [{ booking_type: 'non_cancelled', date_from: from, date_to: to }]),
    s2('GET', '/admin/calendar-notes?filter[date_from]=' + from + '&filter[date_to]=' + to + '&on_page=500'),
  ]);
  const items = [];
  for (const b of Object.values(bk || {})) {
    const s = sgMs0(b.start_date || b.start_date_time), e = sgMs0(b.end_date || b.end_date_time), unit = +b.unit_id;
    if (!s || !e || !ROOMS[unit]) continue;
    const cid = String(b.client_id || ''), name = String(b.client || b.client_name || '');
    items.push({ k: 'b', id: String(b.id), unit, s, e, sys: SYS_CLIENTS.includes(cid) || SYS_RE.test(name) });
  }
  for (const n of ((nt && nt.data) || [])) {
    const s = sgMs0(n.start_date_time), e = sgMs0(n.end_date_time), unit = +n.provider_id;
    if (!n.time_blocked || !s || !e || !ROOMS[unit]) continue;
    const txt = String(n.note || '');
    items.push({ k: 'n', id: String(n.id), unit, s, e, sys: SYS_RE.test(txt), ext: EXT_RE.test(txt) });
  }
  await hb.kvSet('gcal', { t: Date.now(), from, to, items }).catch(() => null);
  return items;
}
/* everything the rules need for one booking (C for gLogic), or { stop: why } */
async function gCtx(env, ref, fresh) {
  const hb = book(env), h = await hb.get(String(ref || '').replace(/[^A-Z0-9]/g, ''));
  if (!h || !h.data || !h.data.q) return { stop: 'notfound' };
  if (h.status === 'cancelled') return { stop: 'cancelled' };
  const d = h.data, bid = d.done && d.done.bookingId ? String(d.done.bookingId) : '';
  const dry = !!(d.done && d.done.dryRun);   /* a test run that never went into SimplyBook: same page, can't really be moved */
  if (h.status !== 'paid' || (!bid && !dry)) return { stop: 'notbooked' };
  const now = Date.now(), today = sgDay(now), d0 = sgMs0(today + ' 00:00');
  const q = d.q, bS = sgMs0(q.date + ' ' + q.time), bDay = Math.round((sgMs0(q.date + ' 00:00') - d0) / 86400e3);
  const ND = Math.min(70, Math.max(G_DAYS, bDay + 8)), to = addDays(today, ND);
  const items = await gCalItems(env, addDays(today, -1), to, fresh);
  /* the booking as SimplyBook has it now (staff may have changed it there) */
  const me = dry ? { k: 'b', id: 'dry', unit: q.unit, s: bS, e: bS + (q.hours * 60 + BUF) * 60e3 } : items.find((x) => x.k === 'b' && x.id === bid);
  if (!me || (dry && bS < now)) return { stop: bS < now ? 'past' : 'gone' };
  const mir = await hb.kvGet('mir:' + bid), skip = new Set(['b' + bid].concat(mir && mir.blk ? ['b' + mir.blk] : []));
  const mvH = await hb.mvHoldsAll(); for (const x of mvH) if (x.bid === bid) for (const id of x.notes || []) skip.add('n' + id);   /* this guest's own unpaid move hold never blocks them */
  /* its +h (EXT) notes and the twin's copy of them: an extended booking is moved by staff (WhatsApp) */
  let ext = 0, end = me.e; for (;;) { const nx = items.find((x) => x.k === 'n' && x.ext && x.unit === me.unit && Math.abs(x.s - end) <= 5 * 60e3 && !skip.has('n' + x.id)); if (!nx) break; skip.add('n' + nx.id); ext += nx.e - nx.s; end = nx.e; }
  if (MIRROR[me.unit]) for (const x of items) if (x.k === 'n' && x.sys && x.unit === MIRROR[me.unit] && x.s >= me.s - 5 * 60e3 && x.e <= end + 5 * 60e3) skip.add('n' + x.id);
  for (const x of items) if (x.k === 'b' && x.sys && (x.unit === 5 || x.unit === 12) && Math.abs(x.s - me.s) <= 5 * 60e3 && Math.abs(x.e - me.e) <= 5 * 60e3 && x.unit !== me.unit) skip.add('b' + x.id);
  const ph = await holidays(), days = [], cal = [];
  for (let i = 0; i < ND; i++) { const date = addDays(today, i), w = new Date(date + 'T00:00:00Z').getUTCDay(); days.push({ date, peak: w === 0 || w === 5 || w === 6 || ph.has(date) }); const o = {}; for (const u of Object.keys(ROOMS)) o[G_NAME(u)] = []; cal.push(o); }
  const put = (unit, s, e, phys) => {
    for (let i = Math.max(0, Math.floor((s - d0) / 86400e3) - 1); i < ND && i <= Math.floor((e - d0) / 86400e3); i++) {
      const ds = d0 + i * 86400e3, a = Math.round((s - ds) / 60e3), b = Math.round((e - ds) / 60e3);
      if (b <= 0 || a >= 2000) continue;
      cal[i][G_NAME(unit)].push([Math.max(0, a), Math.min(2000, b), phys]);
    }
  };
  for (const x of items) {
    if (skip.has(x.k + x.id)) continue;
    /* which Vale/Atlas room a session is really in: a SYSTEM BLOCK is the other twin's guests */
    const phys = (x.unit === 5 || x.unit === 12) && x.sys ? G_NAME(MIRROR[x.unit]) : G_NAME(x.unit);
    put(x.unit, x.s, x.e, phys);
  }
  /* people paying online right now (the board's holds) */
  for (const r of await hb.rows(`SELECT unit, s, e, date FROM holds WHERE date >= ? AND ((status = 'pending' AND exp > ?) OR (status = 'booking' AND created > ?))`, today, now, now - 3 * 3600e3)) {
    const dS = sgMs0(r.date + ' 00:00'); for (const u of [r.unit, MIRROR[r.unit]].filter(Boolean)) put(u, dS + r.s * 60e3, dS + (r.e + BUF) * 60e3, G_NAME(r.unit));
  }
  for (const x of mvH) if (x.bid !== bid && x.exp > now) { const dS = sgMs0(x.date + ' 00:00'); for (const u of x.units) put(u, dS + x.s * 60e3, dS + (x.e + BUF) * 60e3, G_NAME(x.unit)); }   /* another guest is paying for a move into it */
  const moves = (d.moves || []).filter((m) => m.guest && !m.addHours), last = Math.max((d.done && d.done.at) || h.created || 0, ...moves.map((m) => m.t || 0));
  const hours = Math.round((me.e - me.s - BUF * 60e3) / 3600e3), t = Math.round((me.s - (d0 + bDay * 86400e3)) / 60e3);
  const paid = d.paid != null ? +d.paid : +q.total;
  const C = { now: Math.floor((now - d0) / 60e3), days, cal, bk: { room: G_NAME(me.unit), day: Math.round((sgMs0(sgDay(me.s) + ' 00:00') - d0) / 86400e3), t: sgMins(me.s), h: hours, paid }, moves: moves.length, grace: now - last < 15 * 60e3 };
  return { h, d, bid, C, ext, today, graceEnd: last + 15 * 60e3, moves, dry };
}
function sgMins(ms) { const x = new Date(ms + 8 * 3600e3); return x.getUTCHours() * 60 + x.getUTCMinutes(); }
async function gApi(env, f, origin) {
  const hb = book(env), ref = String(f.ref || '').replace(/[^A-Z0-9]/g, '');
  const beta = await hb.getMode();
  if (beta.gResched === false) return { stop: 'off' };
  if (f.mv) {   /* after paying: did it go through? */
    const mref = String(f.mv).replace(/[^A-Z0-9]/g, ''), mv = await hb.kvGet('mv:' + mref);
    if (!mv || mv.guestRef !== ref) return { error: 'Unknown move.' };
    if (mv.status === 'pending') await mvComplete(env, mref, 'guest page').catch(() => null);
    if (f.back === '1') { const m1 = await hb.kvGet('mv:' + mref); if (m1 && m1.status === 'pending' && m1.guest && !(await mvPayStatus(env, m1).catch(() => ({ paid: true }))).paid) await mvHoldRelease(env, m1, 'released').catch(() => null); }   /* came back without paying → the slot is free again now */
    const m2 = await hb.kvGet('mv:' + mref); return { ok: true, status: m2.status, moved: m2.result || null, err: m2.err ? 'not moved' : '' };
  }
  const X = await gCtx(env, ref, f.act === 'pay');
  if (X.stop) return { stop: X.stop };
  const info = { name: X.d.name || '', room: X.C.bk.room, code: (X.d.done && X.d.done.code) || '', ext: X.ext ? Math.round(X.ext / 60e3) : 0, graceEnd: X.graceEnd, made: (X.d.done && X.d.done.at) || X.h.created, paid0: +(X.d.qWas || X.d.q).total,
    staff: X.d.pay === 'staff', test: X.d.pay === 'test' || !!X.dry, dry: !!X.dry, pax: X.d.pax || '', tv: (X.d.done && X.d.done.tv && X.d.done.tv.code) || '', msg: X.d.msg ? { title: String(X.d.msg.title || '').slice(0, 60), after: +X.d.msg.after || 0 } : null, moves: (X.d.moves || []).map((m) => ({ t: m.t, guest: !!m.guest, from: m.from, to: m.to, fee: m.fee, diff: m.diff, total: m.total, ref: m.ref || '', how: m.how })) };
  if (f.act !== 'pay') return { ok: true, C: X.C, info };
  /* PAY: the same rules and fee on fresh data */
  if (X.dry) return { error: 'This is a test booking that was never put in our calendar, so it can’t really be moved. Everything up to here works the same as a real booking.' };
  if (X.ext) return { error: 'This booking has extra time added – WhatsApp us to move it.' };
  const L = gLogic(X.C), room = String(f.room || ''), i = X.C.days.findIndex((x) => x.date === f.date), t = +f.t, hrs = +f.h;
  if (i < 0 || !L.ROOMS[room]) return { error: 'Pick a day and room again.' };
  const w = L.why(i, room, t, hrs);
  if (w) return { error: { taken: 'That time was just taken – pick another.', soon: 'New times must be at least 3 hours from now.', closed: 'No rescheduling within 3 hours of your session.', sameday: 'Under 24 hours before: same-day changes only.', upgrade: 'Under 24 hours before: upgrades only.', lock: 'Under 3 days before: new times from 2:15pm only.', gap: 'That time isn’t available.', same: 'That’s your booking as it is.' }[w] || 'That time isn’t available.', why: w, C: X.C };
  const F = L.feeOf(i, room, t, hrs), fee = L.fee(i, room, t, hrs), diff = L.diff(i, room, t, hrs), total = L.total(i, room, t, hrs);
  if (X.C.moves >= 2 && !F.addOnly) return { error: 'You’ve used both moves for this booking – WhatsApp us.' };
  if (f.total != null && Math.abs(+f.total - total) > 0.004) return { changed: true, total, fee, diff, C: X.C };
  const unit = +Object.keys(ROOMS).find((u) => G_NAME(u) === room), time = hhmm(t);
  /* the staff move's own fresh check (SimplyBook read now, its +h, the twin) */
  const Q = await mvQuote(env, { bid: X.bid, unit, date: f.date, time, hours: hrs });
  if (!Q.ok) return { error: 'That time was just taken – pick another.', C: X.C };
  const mref = 'MV' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const mv = { ref: mref, status: 'pending', t: Date.now(), from: Q.from, to: Q.to, level: F.name.toLowerCase(), feeWas: fee, fee, diff, total, add: F.add, snug: F.snug, cost: F.d.money, by: 'guest online', why: '', prs: [], guest: true, guestRef: ref, addHours: !!F.addOnly, moveNo: F.addOnly ? 0 : X.C.moves + 1, grace: !!X.C.grace };
  if (total < 0.01) {
    await hb.kvSet('mv:' + mref, mv);
    const r = await mvExecute(env, mv, 'guest · nothing to pay');
    mv.status = r.ok ? 'done' : 'failed'; mv.result = r.moved || null; mv.err = r.error || ''; await hb.kvSet('mv:' + mref, mv);
    return r.ok ? { ok: true, done: true, mv: mref } : { error: 'That time was just taken – pick another.', C: X.C };
  }
  /* HOLD the new slot while they pay – the booking page's rules (owner, 14 Nov): 10 minutes, the room and its twin, a SimplyBook
     ONLINE HOLD note so staff see it, the payment page ends with the hold. A new try by the same booking drops its old hold. */
  const hs = t, he = t + hrs * 60, exp = Date.now() + HOLD_SEC * 1000;
  const H = await hb.mvHoldAdd({ ref: mref, bid: X.bid, date: f.date, unit, units: [unit, MIRROR[unit]].filter(Boolean), s: hs, e: he, exp, notes: [] });
  for (const o of H.old || []) { const om = await hb.kvGet('mv:' + o.ref); if (om && om.status === 'pending' && !(await mvPayStatus(env, om).catch(() => ({}))).paid) await mvHoldRelease(env, om, 'released').catch(() => null); }
  if (!H.ok) return { error: 'Someone is paying for that time right now – pick another, or try again in 10 minutes.', C: X.C };
  mv.hold = { exp }; await hb.kvSet('mv:' + mref, mv);
  mv.holdNotes = await holdNotesMake(env, mref, { date: f.date, time, hours: hrs, unit, room }, X.d.pax || 0).catch(() => []);
  if (mv.holdNotes.length) await hb.mvHoldNotes(mref, mv.holdNotes);
  await hb.kvSet('mv:' + mref, mv);
  const when = new Date(f.date + 'T00:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const e = envFor(env, X.d.pay === 'test' ? 'test' : 'live');
  const form = { amount: total.toFixed(2), currency: 'SGD', purpose: `Round2 reschedule → ${room === 'Maximillion' ? 'Max' : room} · ${when} ${clock12(sgMs0(f.date + ' ' + time))} (change fee $${fee}${diff ? ' + $' + diff.toFixed(2) + ' price difference' : ''})`,
    reference_number: mref + 'G', webhook: `${origin}/move/hitpay`, redirect_url: `${PUBLIC_BOOK}/move?ref=${ref}&mv=${mref}`, name: X.d.name || 'Round2 guest',
    expiry_date: new Date(exp + PAGE_GRACE + 8 * 3600e3).toISOString().slice(0, 19).replace('T', ' ') };   /* the payment page ends with the hold */
  if (X.d.email && /@/.test(X.d.email)) form.email = X.d.email;
  let pr; try { pr = await hitpay(e, 'POST', '/payment-requests', form); } catch (err) { await mvHoldRelease(env, mv, 'released').catch(() => null); throw err; }
  mv.prs.push({ id: pr.id, kind: 'online', env: X.d.pay === 'test' ? 'test' : 'live' }); await hb.kvSet('mv:' + mref, mv);
  return { ok: true, url: pr.url, mv: mref, total, holdUntil: exp };
}
/* ===== Rescheduling beta: stats and trip-wires (owner, 12 Nov – the demo's owner view, live). Last 28 days of moves.
   Red → one push alert a day per trip-wire ("we review the rules"). Moves before 12 Nov have no lost-sale estimate. */
const MV_WIRES = [
  { k: 'moved', name: 'of online bookings moved', lim: 15, bad: (v) => v > 15, limTxt: 'limit 15%' },
  { k: 'short', name: 'of moves were under 3 days before', lim: 50, bad: (v) => v > 50, limTxt: 'limit 50%' },
  { k: 'peak', name: 'of moves went into Fri–Sun evenings', lim: 33, bad: (v) => v > 33, limTxt: 'limit 33%' },
  { k: 'rebook', name: 'of freed slots were booked again', lim: 15, bad: (v) => v < 15, limTxt: 'at least 15%' },
  { k: 'profit', name: 'average gain per move (fee + difference − estimated lost sale)', lim: 0, bad: (v) => v < 0, limTxt: 'above $0', money: true },
];
async function mvStats(env, alert) {
  const hb = book(env), now = Date.now(), since = now - 28 * 86400e3, L = ((await hb.kvGet('mvlog')) || []).filter((m) => m.t >= since);
  const booked = (await hb.rows(`SELECT COUNT(*) AS n FROM holds WHERE status IN ('paid', 'cancelled') AND created >= ? AND json_extract(data, '$.done.bookingId') IS NOT NULL`, since))[0].n;
  const G = L.filter((m) => m.guest), lead = (m) => (sgMs0(m.from.date + ' ' + m.from.time) - m.t) / 3600e3;
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0), dow = (d) => new Date(d + 'T00:00:00Z').getUTCDay();
  /* freed slots booked again: one SimplyBook read over the moved-from dates */
  let rebooked = 0, freedPast = 0;
  if (L.length) {
    try {
      const ds = L.map((m) => m.from.date).sort(), a = await admin(env);
      const bk = Object.values((await a('getBookings', [{ booking_type: 'non_cancelled', date_from: ds[0], date_to: ds[ds.length - 1] }])) || {});
      for (const m of L) {
        const s = sgMs0(m.from.date + ' ' + m.from.time), e = s + (m.from.hours || 3) * 3600e3, tw = MIRROR[m.from.unit];
        freedPast++;
        if (bk.some((b) => { const u = +b.unit_id, bs = sgMs0(b.start_date || b.start_date_time), be = sgMs0(b.end_date || b.end_date_time); return (u === m.from.unit || (tw && u === tw && !SYS_CLIENTS.includes(String(b.client_id)))) && String(b.id) !== String(m.bid) && bs < e && be > s; })) rebooked++;
      }
    } catch (e) { freedPast = 0; }
  }
  const withCost = L.filter((m) => m.cost != null);
  const v = {
    moved: pct(G.length, booked), short: pct(L.filter((m) => lead(m) < 72).length, L.length),
    peak: pct(L.filter((m) => [0, 5, 6].includes(dow(m.to.date)) && mins(m.to.time) >= 1035).length, L.length),
    rebook: pct(rebooked, freedPast), profit: withCost.length ? Math.round(withCost.reduce((a, m) => a + (+m.fee || 0) + (+m.diff || 0) - (+m.cost || 0), 0) / withCost.length * 100) / 100 : 0,
  };
  const wires = MV_WIRES.map((w) => ({ k: w.k, name: w.name, value: v[w.k], money: !!w.money, lim: w.limTxt, red: L.length >= 5 && w.bad(v[w.k]), n: w.k === 'profit' ? withCost.length : w.k === 'rebook' ? freedPast : w.k === 'moved' ? booked : L.length }));
  const out = { ok: true, since, moves: L.length, guest: G.length, staff: L.length - G.length, free: L.filter((m) => !(+m.total > 0)).length, booked,
    fees: L.reduce((a, m) => a + (+m.fee || 0), 0), diffs: L.reduce((a, m) => a + (+m.diff || 0), 0), lowered: L.reduce((a, m) => a + Math.max(0, (+m.feeWas || 0) - (+m.fee || 0)), 0),
    second: G.filter((m) => m.moveNo === 2).length, wires, note: L.length < 5 ? 'Trip-wires only turn red after 5 moves (too few to judge).' : '' };
  if (alert) for (const w of wires.filter((x) => x.red)) {
    const k = 'mvwire:' + w.k + ':' + sgDay(now); if (await hb.kvGet(k)) continue; await hb.kvSet(k, 1);
    await humanAlert(env, 'mvwire-' + w.k, 'Rescheduling trip-wire: ' + w.name, `${w.money ? '$' + w.value : w.value + '%'} ${w.name} in the last 4 weeks (${w.lim}). Time to review the reschedule rules – control centre › Bookings › Rescheduling.`).catch(() => null);
  }
  return out;
}
async function mvApi(env, hb, f, origin) {
  const act = f.action;
  if (act === 'mvday') {   /* the guest bookings on a day (shop night) */
    const day = /^\d{4}-\d\d-\d\d$/.test(f.day || '') ? f.day : sgDay(Date.now() - SHADOW_TILL * 60e3), D = await sessDay(env, day);
    const L0 = D.sessions.filter((S) => S.k === 'b' && !S.sys), codes = await hb.codesFor(L0.map((S) => S.key.slice(1)));   /* each booking's guest link (online / Add a session bookings) */
    return { ok: true, day, list: L0.sort((a, b) => a.s - b.s).map((S) => ({ link: codes[S.key.slice(1)] ? PUBLIC_BOOK + '/b/' + codes[S.key.slice(1)] : '', bid: S.key.slice(1), room: ROOMS[S.unit][0], unit: S.unit, name: S.name, s: S.s, guestEnd: S.guestEnd, hours: Math.round((S.e0 - S.s - BUF * 60e3) / 3600e3), ext: Math.round((S.end - S.e0) / 60e3), started: S.s < Date.now() })) };
  }
  if (act === 'mvquote') return Object.assign({ ok: true }, await mvQuote(env, f));
  if (act === 'mvfree') {   /* the free start times on a day for this booking (no extra SimplyBook calls: the day's notes + bookings) */
    const B = await mvBooking(env, f.bid), hours = +f.hours || B.hours, date = f.date, D = await sessDay(env, date), mir = await hb.kvGet('mir:' + B.bid), out = {};
    const X = mvExtOf(await sessDay(env, sgDay(B.s - SHADOW_TILL * 60e3)), B);
    const skip = new Set(['b' + B.bid].concat(mir && mir.blk ? ['b' + mir.blk] : []).concat(X.main.concat(X.twin).map((n) => 'n' + n.id))), now = Date.now();
    for (const u of Object.keys(ROOMS).map(Number)) {
      const tw = MIRROR[u], L = [];
      for (let m = 660; m <= 1215; m += 15) {
        const s = sgMs0(date + ' ' + hhmm(m)), e = s + hours * 3600e3 + BUF * 60e3 + X.min * 60e3; if (s < now + 15 * 60e3) continue;
        if (m + hours * 60 + X.min > CLOSE) continue;
        if (D.items.some((x) => (x.unit === u || x.unit === tw) && !skip.has(x.k + x.id) && !(x.k === 'b' && x.sys && D.items.some((y) => y.id === B.bid && Math.abs(y.s - x.s) <= 5 * 60e3)) && x.s < e && x.e > s)) continue;
        L.push(m);
      }
      out[ROOMS[u][0]] = L;
    }
    return { ok: true, date, hours, ext: X.min, free: out };
  }
  if (act === 'mvpay' || act === 'mvlink') {   /* PayNow QR (mvpay) or a normal payment link for WhatsApp (mvlink) */
    const Q = await mvQuote(env, f); if (!Q.ok) return { error: 'Not free: ' + Q.clash.join('; ') };
    const fee = f.fee != null && f.fee !== '' ? Math.max(0, Math.min(Q.fee, Math.round(+f.fee))) : Q.fee, total = Math.round((fee + Q.diff) * 100) / 100;
    if (total < 1) return { error: 'Nothing to pay – use “Move now”.' };
    let ref = String(f.ref || '').replace(/[^A-Z0-9]/g, ''), mv = ref ? await hb.kvGet('mv:' + ref) : null;
    if (!mv || mv.status !== 'pending' || mv.total !== total || mv.to.unit !== Q.to.unit || mv.to.date !== Q.to.date || mv.to.time !== Q.to.time) {
      ref = 'MV' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
      mv = { ref, status: 'pending', t: Date.now(), from: Q.from, to: Q.to, level: Q.level, feeWas: Q.fee, fee, diff: Q.diff, total, cost: Q.lostSales, by: String(f.by || '').slice(0, 30), why: String(f.why || '').slice(0, 120), prs: [] };
    }
    const e = envFor(env, 'live'), when = new Date(Q.to.date + 'T00:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const form = { amount: total.toFixed(2), currency: 'SGD', purpose: `Round2 move → ${Q.to.room} · ${when} ${Q.to.time} (fee $${fee}${Q.diff ? ' + $' + Q.diff.toFixed(2) + ' difference' : ''})`, reference_number: ref + (act === 'mvpay' ? 'Q' : 'L'), webhook: `${origin}/move/hitpay`, name: Q.from.name || 'Round2 guest' };
    if (act === 'mvpay') { form['payment_methods[]'] = 'paynow_online'; form.generate_qr = 'true'; }
    const pr = await hitpay(e, 'POST', '/payment-requests', form);
    mv.prs.push({ id: pr.id, kind: act === 'mvpay' ? 'PayNow QR' : 'link' }); await hb.kvSet('mv:' + ref, mv);
    return { ok: true, ref, total, fee, diff: Q.diff, url: pr.url, qr: act === 'mvpay' ? (pr.qr_code_data && pr.qr_code_data.qr_code) || null : null };
  }
  if (act === 'mvstatus') {   /* the control centre asks every few seconds while the QR is up */
    const ref = String(f.ref || '').replace(/[^A-Z0-9]/g, ''), mv = await hb.kvGet('mv:' + ref); if (!mv) return { error: 'Unknown move.' };
    if (mv.status === 'pending') { const r = await mvComplete(env, ref, 'poll'); const m2 = await hb.kvGet('mv:' + ref); return { ok: true, status: m2.status, moved: m2.result, err: m2.err || r.error || '' }; }
    return { ok: true, status: mv.status, moved: mv.result, err: mv.err || '' };
  }
  if (act === 'mvnow') {   /* waived, nothing to pay, or paid in shop (Tap to Pay) */
    const Q = await mvQuote(env, f); if (!Q.ok) return { error: 'Not free: ' + Q.clash.join('; ') };
    const fee = f.fee != null && f.fee !== '' ? Math.max(0, Math.min(Q.fee, Math.round(+f.fee))) : Q.fee, total = Math.round((fee + Q.diff) * 100) / 100;
    const how = f.how === 'shop' ? 'paid in shop' : total < 0.01 ? (Q.fee && !fee ? 'waived' : 'nothing to pay') : '';
    if (!how) return { error: 'There’s $' + total.toFixed(2) + ' to pay – show the QR, send a link, or tick “Paid in shop”.' };
    if (f.how !== 'shop' && fee < Q.fee && !String(f.why || '').trim()) return { error: 'Say why the fee is waived (one line).' };
    return mvExecute(env, { from: Q.from, to: Q.to, level: Q.level, feeWas: Q.fee, fee, diff: Q.diff, total, cost: Q.lostSales, by: String(f.by || '').slice(0, 30), why: String(f.why || '').slice(0, 120) }, how);
  }
  if (act === 'mvlog') return { ok: true, list: ((await hb.kvGet('mvlog')) || []).slice(0, Math.min(300, +f.n || 100)) };
  if (act === 'mvstats') return await mvStats(env, false);
  if (act === 'mvselftest') {   /* System check: the kv lock really locks (13 Nov: a same-named method had broken it) + every Vale/Atlas booking has its twin block */
    const k = 'selftest:' + crypto.randomUUID().slice(0, 8), a1 = await hb.lock(k, 30e3), a2 = await hb.lock(k, 30e3); await hb.kvSet(k, 0);
    const mir = await mirAdopt(env, false).catch((e) => ({ error: String(e.message || e) }));
    /* a move hold really blocks the slot (and a second mover), and lets go */
    const hd = addDays(sgDay(Date.now()), 300), hh = { ref: 'MVSELFTEST', bid: 'selftest', date: hd, unit: 9, units: [9], s: 900, e: 1080, exp: Date.now() + 60e3, notes: [] };
    const h1 = await hb.mvHoldAdd(hh), h2 = await hb.clash(hd, [9], 960, 1140), h3 = await hb.mvHoldAdd(Object.assign({}, hh, { ref: 'MVSELFTEST2', bid: 'selftest2' }));
    await hb.mvHoldDrop('MVSELFTEST'); await hb.mvHoldDrop('MVSELFTEST2'); const h4 = await hb.clash(hd, [9], 960, 1140);
    return { ok: true, holdWorks: h1.ok === true && h2 === true && h3.ok === false && h4 === false, lockFirst: a1, lockSecond: a2, mirMissing: (mir.missing || []).map((x) => x.room + ' ' + x.when + ' ' + x.name), mirErr: mir.error || '', pending: (await hb.mvRecent(Date.now() - 48 * 3600e3)).filter((m) => !['done', 'expired', 'released'].includes(m.status) && Date.now() - m.t > 20 * 60e3).map((m) => m.ref + ' ' + m.status) };
  }
  if (act === 'mvfinish') {   /* staff: finish a paid move that got stuck, step by step (owner, 13 Nov 2am) */
    const ref = String(f.ref || '').replace(/[^A-Z0-9]/g, ''), mv = await hb.kvGet('mv:' + ref); if (!mv) return { error: 'Unknown move.' };
    if (mv.status === 'done') return { ok: true, already: true, moved: mv.result };
    const st = await mvPayStatus(env, mv); if (!st.paid) return { error: 'HitPay doesn’t show it paid yet.', st };
    const lk0 = await hb.kvGet('mvlock:' + mv.from.bid);
    await hb.kvSet('mvdone:' + ref, Date.now() + 120e3); await hb.kvSet('mvlock:' + mv.from.bid, 0);
    const lk1 = await hb.kvGet('mvlock:' + mv.from.bid), now0 = Date.now();
    let r; try { r = await mvExecute(env, mv, 'paid ' + (st.via || 'HitPay') + ' (finished by staff)'); } catch (e) { r = { error: 'threw: ' + String(e && e.stack || e).slice(0, 600) }; }
    mv.status = r.ok ? 'done' : 'failed'; mv.result = r.moved || null; mv.err = r.error || ''; await hb.kvSet('mv:' + ref, mv);
    return Object.assign({ step: 'executed', lk0, lk1, now0, bid: mv.from.bid, lk2: await hb.kvGet('mvlock:' + mv.from.bid) }, r);
  }
  if (act === 'mvpaycheck') {   /* what HitPay says about a move's payment (staff diagnosis) */
    const mv = await hb.kvGet('mv:' + String(f.ref || '').replace(/[^A-Z0-9]/g, '')); if (!mv) return { error: 'Unknown move.' };
    const out = []; for (const p of mv.prs || []) { let pr = null, err = ''; try { pr = await hitpay(envFor(env, p.env || 'live'), 'GET', '/payment-requests/' + p.id); } catch (e) { err = String(e.message || e).slice(0, 200); }
      out.push({ id: p.id, env: p.env || 'live', err, status: pr && pr.status, amount: pr && pr.amount, payments: pr && (pr.payments || []).map((x) => ({ status: x.status, amount: x.amount })) }); }
    return { ok: true, total: mv.total, status: mv.status, claim: await hb.kvGet('mvdone:' + mv.ref), prs: out };
  }
  if (act === 'mvrecent') return { ok: true, list: (await hb.mvRecent(Date.now() - (+f.h || 48) * 3600e3)).map((m) => ({ ref: m.ref, t: m.t, status: m.status, guest: !!m.guest, guestRef: m.guestRef || '', total: m.total, fee: m.fee, diff: m.diff, from: m.from, to: m.to, err: m.err || '', prs: (m.prs || []).map((x) => x.kind + ':' + (x.env || 'live')) })) };
  return null;
}
async function gm(env, req) {
  const f = Object.fromEntries(new URLSearchParams(await req.text()));
  const act = String(f.action || ''), who = req.headers.get('cf-connecting-ip') || 'x', hb = book(env); sbWho = 'gm ' + act.slice(0, 16);
  const guest = act === 'get' || act === 'submit';
  /* wrong staff codes are counted for every staff action (overnight review 5 Nov: only some were). The right code is never
     slowed down, so a phone with an old code can't lock anyone else out on the shop wifi. */
  if (!guest && (!env.GM_STAFF || f.staff !== env.GM_STAFF) && !(await hb.gmRate('gmbad:' + who, 60))) return gmJ({ error: 'Too many wrong staff codes from here. Wait 10 minutes.' });
  if (/^mv(day|quote|free|pay|link|status|now|log|stats|recent|paycheck|finish|selftest)$/.test(act)) {   /* staff: Move a booking (control centre › Bookings) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await mvApi(env, hb, f, new URL(req.url).origin)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (/^ps4(list|map|discs|names|clean|update|look|lookres|rel|prof|saves)$/.test(act)) {   /* staff: control centre › PS4s (13 Nov) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await ps4Gm(env, hb, f)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
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
  if (act === 'noise') {   /* staff / System check: the noise-rule blocks on a day (sync=1: bring them up to date first) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const day = /^\d{4}-\d\d-\d\d$/.test(f.day || '') ? f.day : sgDay(Date.now() - SHADOW_TILL * 60e3);
    try { const sync = f.sync ? await noiseSync(env, [day], 'by hand') : null, D = await sessDay0(env, day); return gmJ({ ok: true, day, sync, notes: D.items.filter((x) => x.k === 'n' && NOISE_RE.test(x.name)).map((x) => ({ id: x.id, unit: x.unit, s: x.s, e: x.e, text: x.name })) }); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'auto') {   /* staff: TV messages › Auto end messages */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await autoApi(env, hb, f)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'insess' || act === 'extend' || act === 'extundo' || act === 'late' || act === 'latelist' || act === 'latecancel') {   /* staff: "In session" tab */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try {
      const r = await (act === 'insess' ? insess : act === 'extend' ? extend : act === 'late' ? late : act === 'latelist' ? latelist : act === 'latecancel' ? latecancel : extUndo)(env, hb, f);
      if (act !== 'insess' && act !== 'latelist' && r && !r.error) { const t = sgDay(Date.now() - SHADOW_TILL * 60e3); await noiseSync(env, [t, addDays(t, 1), f.day, f.date].filter(Boolean), act).catch(() => null); }   /* noise rule follows extensions and keyed-in sessions */
      return gmJ(r);
    } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'msgimport' || act === 'msgmode' || act === 'msgtest') {   /* staff: move the message store off Make (copy records in; switch where messages live) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (f.direct) return gmJ(await hb.msgAct(Object.assign({}, f, { action: f.direct })));   /* test the engine's store while Make is still live */
    if (act === 'msgimport') { let L = []; try { L = JSON.parse(f.records || '[]'); } catch (e) { return gmJ({ error: 'records must be JSON' }); } return gmJ({ ok: true, imported: await hb.msgImport(L) }); }
    const m = await hb.getMode(); if (f.set === 'on' || f.set === 'off') { m.msgLocal = f.set === 'on'; m.msgT = Date.now(); await hb.setMode(m); await hb.gmDrop('__LIST__'); if (m.msgLocal) await gmList(env, hb).catch(() => null); }
    return gmJ({ ok: true, local: !!m.msgLocal, count: await hb.msgCount() });
  }
  if (act === 'mirror') {   /* staff: Vale ↔ Atlas mirror – do=status | adopt (fix=1 blocks the missing) | on | off | run&bid=… */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const m = await hb.getMode(), d = String(f.do || 'status');
    if (d === 'adopt') return gmJ(Object.assign({ ok: true }, await mirAdopt(env, f.fix === '1')));
    if (d === 'run' && f.bid) return gmJ(await mirrorOnSb(env, String(f.bid).replace(/\D/g, ''), String(f.type || 'change')));
    if (d === 'on' || d === 'off') { m.mirror = d === 'on' ? 'engine' : 'make'; m.mirT = Date.now(); await hb.setMode(m); }
    return gmJ({ ok: true, mirror: m.mirror || 'make', since: m.mirT || 0, log: ((await hb.kvGet('mirlog')) || []).slice(0, 20) });
  }
  if (act === 'human') {   /* staff: control centre › "needs a human" list (owner, 3 Nov); sorted=<id> ticks one off */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    let L = (await hb.kvGet('human')) || [];
    if (f.sorted) { L = L.map((x) => x.id === f.sorted ? Object.assign(x, { sorted: Date.now() }) : x); await hb.kvSet('human', L); }
    return gmJ({ ok: true, list: L });   /* sorted ones stay (last 40) – the control centre shows them under History */
  }
  if (act === 'payout') {   /* staff, SANDBOX ONLY (3 Nov, trying HitPay's Payout API for paying Madd Pizza): no real money can move here.
       do=bens (list recipients) · do=ben (make the made-up "Madd Pizza (TEST)" bank recipient) · do=send&ref=<food order> (pay Madd's
       share of that order, min $1) · do=get&path=/… (look at any sandbox page, e.g. /transfers) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const e0 = rawEnv(env);
    if (!isSandbox(e0) || !e0.HITPAY_KEY) return gmJ({ error: 'The HitPay sandbox isn’t set up.' });
    const hp = async (method, path, body) => { const r = await fetch(e0.HITPAY_API + path, { method, headers: { 'X-BUSINESS-API-KEY': e0.HITPAY_KEY, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch (x) { j = { text: t.slice(0, 300) }; } return { status: r.status, body: j }; };
    const dd = String(f.do || '');
    if (dd === 'bens') return gmJ(await hp('GET', '/beneficiaries'));
    if (dd === 'get') return gmJ(await hp('GET', '/' + String(f.path || '').replace(/^\/+/, '').replace(/[^\w\/?=&.-]/g, '')));
    if (dd === 'ben') {
      const r = await hp('POST', '/beneficiaries', { country: 'sg', transfer_method: 'bank_transfer', transfer_type: 'local', currency: 'sgd', holder_type: f.htype || 'individual',
        holder_name: 'Madd Pizza (TEST)', bank_swift_code: f.swift || 'DBSSSGSGXXX', account_number: f.acct || '0123456789', nickname: 'Madd Pizza sandbox test' });
      if (r.body && r.body.id) await hb.kvSet('payBenTest', r.body.id);
      return gmJ(r);
    }
    if (dd === 'send') {
      const rec = await hb.menuGet(String(f.ref || '')); if (!rec) return gmJ({ error: 'No such food order.' });
      if (rec.pay !== 'test') return gmJ({ error: 'Only sandbox test orders here.' });
      const ben = f.ben || (await hb.kvGet('payBenTest')); if (!ben) return gmJ({ error: 'Make the test recipient first (do=ben).' });
      const amt = Math.max(100, rec.mb || 0) / 100;
      const r = await hp('POST', '/transfers', { beneficiary_id: ben, source_currency: 'sgd', source_amount: amt, reference: 'MADD ' + rec.orderNo, remark: 'TEST payout for ' + f.ref,
        remitter: { entity_type: 'company', company_name: 'Round2 (TEST)', full_name: 'Round2 test', contact_number: '+6500000000', email: 'hello@round2.sg', nationality: 'sg',
          address: { street_address: '1 Test Road', city: 'Singapore', state: 'Singapore', postal_code: '000000', country: 'sg' } } });
      return gmJ({ amount: amt, maddShare: (rec.mb || 0) / 100, ...r });
    }
    return gmJ({ error: 'do=bens|ben|send|get' });
  }
  if (act === 'acks') {   /* staff: every OK the TVs reported, per message id ({ id: { t, room } }) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (f.add && /^[A-Za-z0-9_-]{4,40}$/.test(f.add) && +f.t > 0) await hb.ackNote(String(f.room || ''), { id: f.add, t: +f.t });   /* fill in one from a TV's log */
    return gmJ({ ok: true, acks: (await hb.kvGet('acks')) || {} });
  }
  if (act === 'tvlog') {   /* staff (4 Nov): ask an LG for its helper log (ask=1 sends the request; it arrives within ~20 s), then read it */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const room = String(f.room || '').toLowerCase(); if (!['vale', 'kaeden', 'scarlett', 'bella', 'kai', 'atlas', 'max'].includes(room) || !env.TV_KEY) return gmJ({ error: 'Pick a room.' });
    const base = FB_BASE + env.TV_KEY + '/' + room, now = Date.now();
    if (f.test) { const ok = await fetch(base + '/cmd.json', { method: 'PUT', body: JSON.stringify({ id: 't' + now.toString(36), do: 'alerttest', app: String(f.test).replace(/[^a-z0-9.]/g, ''), raise: f.raise === '1' ? '1' : '', at: now }) }).then((r) => r.ok).catch(() => false); return gmJ({ ok, asked: now }); }   /* LG Netflix experiment (4 Nov) */
    if (f.ask === '1') { const ok = await fetch(base + '/cmd.json', { method: 'PUT', body: JSON.stringify({ id: 'l' + now.toString(36), do: 'log', at: now }) }).then((r) => r.ok).catch(() => false); return gmJ({ ok, asked: now }); }
    return gmJ({ ok: true, diag: await fetch(base + '/diag.json').then((r) => r.json()).catch(() => null) });
  }
  if (act === 'tvmsgs') {   /* staff, read-only (4 Nov): each room's message on the TV, when it first showed, and the last OK */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (!env.TV_KEY) return gmJ({ error: 'no TV key' });
    const out = {};
    for (const r of ['vale', 'kaeden', 'scarlett', 'bella', 'kai', 'atlas', 'max']) {
      const base = FB_BASE + env.TV_KEY + '/' + r, get = (n) => fetch(base + '/' + n + '.json').then((x) => x.json()).catch(() => null);
      const [m, k, sh, h, sd] = await Promise.all([get('msg'), get('msgAck'), get('msgShown'), get('helper'), get('soundDiag')]);
      out[r] = { msg: m && { id: m.id, kind: m.kind, title: m.title, at: m.at, until: m.until, ack: m.ack }, ack: k, shown: sh, tv: h && { tv: h.tv, v: h.v, t: h.t, front: h.front, frontAt: h.frontAt, pw: h.pw }, sound: sd };
    }
    return gmJ({ ok: true, rooms: out, now: Date.now() });
  }
  if (act === 'pushsubs') {   /* staff, read-only (6 Nov): the phones signed up for alerts and how the last send went */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const seen = (await hb.kvGet('pseen')) || {}, al = (await hb.alogList()).slice(0, 40);
    return gmJ({ ok: true, now: Date.now(), alerts: al.map((x) => ({ id: x.id, t: x.t, title: x.title, seen: seen[x.id] || {} })), phones: (await hb.rows(`SELECT id, kinds, label, t, last, sub FROM push`)).map((r) => { let host = ''; try { host = new URL(JSON.parse(r.sub).endpoint).host; } catch (e) {} return { id: String(r.id).slice(0, 6), label: r.label, kinds: JSON.parse(r.kinds || '[]'), since: r.t, last: r.last ? JSON.parse(r.last) : null, host }; }) });
  }
  if (act === 'pushtest') {   /* staff (6 Nov): a test alert to ONE phone (id = its first letters) and when that phone showed it */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (f.a) { const m = (await hb.kvGet('pseen')) || {}; return gmJ({ ok: true, seen: m[String(f.a)] || {} }); }
    const p = String(f.id || '').replace(/[^A-Za-z0-9_-]/g, ''); if (p.length < 4) return gmJ({ error: 'id?' });
    const r = (await hb.rows(`SELECT id, sub FROM push WHERE substr(id, 1, ?) = ?`, p.length, p))[0]; if (!r) return gmJ({ error: 'No such phone.' });
    const a = 't' + Date.now().toString(36), t = Date.now();
    /* alert=<id>: send that logged alert again, as it was, to this one phone (owner, 6 Nov: one his phone never showed) */
    const old = f.alert ? (await hb.alogList()).find((x) => x.id === String(f.alert)) : null; if (f.alert && !old) return gmJ({ error: 'No such alert.' });
    const res = await pushOne(env, JSON.parse(r.sub), old ? { kind: old.kind, title: old.title, body: old.body, tag: 'again' + old.id, url: '/?alert=' + old.id }
      : { kind: 'booking', title: '🧪 Delivery test', body: 'Sent ' + new Date(t + 8 * 3600e3).toISOString().slice(11, 19) + ' – nothing to do', tag: a, url: '/?alert=' + a });
    return gmJ({ ok: true, a, t, res });
  }
  if (act === 'cronnet') {   /* staff, read-only (14 Nov): outside requests per timer run – last, biggest in 24 h, refused ones */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    return gmJ(Object.assign({ ok: true, now: Date.now() }, (await hb.kvGet('cronNet')) || {}));
  }
  if (act === 'paxof') {   /* staff, read-only (10 Nov): the guest count the noise rule reads for one SimplyBook booking */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const b = await (await admin(env))('getBookingDetails', [String(f.bid || '')]).catch((e) => ({ err: String(e.message || e).slice(0, 120) }));
    return gmJ({ ok: true, pax: await soonPax(env, { k: 'b', id: String(f.bid || '') }).catch(() => ''), start: b && b.start_date_time, unit: b && b.unit_id, fields: (b && b.additional_fields) || null, err: b && b.err, cached: await hb.kvGet('npax:b' + f.bid) });
  }
  if (act === 'guestlook') {   /* staff, read-only (6 Nov: "is ruby really a first-timer?"): one guest across our booking page's
       attempts, HitPay's payment requests (newest pages) and the first-visit list. q = phone (last 8 digits) or email */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const q = String(f.q || '').trim().toLowerCase(), p8 = q.replace(/\D/g, '').slice(-8), em = q.includes('@') ? q : '';
    if (!p8 && !em) return gmJ({ error: 'q = phone or email' });
    const own = (await hb.rows(`SELECT ref, date, unit, status, created, phone, email, data FROM holds ORDER BY created DESC LIMIT 3000`)).map((r) => ({ r, d: JSON.parse(r.data || '{}') }))
      .filter(({ r, d }) => (p8 && String(r.phone || d.phone || '').replace(/\D/g, '').endsWith(p8)) || (em && String(r.email || d.email || '').toLowerCase() === em))
      .map(({ r, d }) => ({ ref: r.ref, made: sgStr(r.created).slice(0, 16), status: r.status, date: r.date, room: GM_ROOM[r.unit] || r.unit, total: d.q && d.q.total, pay: d.pay, name: d.name, email: d.email }));
    const hp = [], st = { seen: 0, email: 0, phone: 0, name: 0, first: '', last: '' }; let pages = 0, hpErr = '';
    try {
      /* HitPay lists oldest first (100 a page): read every page, newest first, at most 45 */
      let last = 1;
      for (let pg = 1, n = 0; pg >= 1 && n < 45; n++) {
        const j = await hitpay(envFor(env, 'live'), 'GET', '/payment-requests?page=' + pg + '&per_page=100'); pages++;
        if (n === 0) { last = +(j.meta && j.meta.last_page) || 1; if (last > 1) { pg = last; continue; } }
        const L = Array.isArray(j) ? j : j.data || [];
        for (const x of L) { const ph = String(x.phone || '').replace(/\D/g, ''), xe = String(x.email || '').toLowerCase(), xn = String(x.name || '').toLowerCase();
          st.seen++; if (xe) st.email++; if (ph) st.phone++; if (xn) st.name++; if (!st.first || x.created_at < st.first) st.first = x.created_at; if (x.created_at > st.last) st.last = x.created_at;
          if (f.ref && String(x.reference_number || '') === String(f.ref)) hp.push({ byRef: true, when: x.created_at, name: x.name, email: x.email, phone: x.phone, purpose: x.purpose });
          if ((p8 && ph.endsWith(p8)) || (em && xe === em) || (f.name && xn && xn === String(f.name).toLowerCase())) hp.push({ when: x.created_at, status: x.status, amount: x.amount, ref: x.reference_number, name: x.name, email: x.email, phone: x.phone, purpose: String(x.purpose || '').slice(0, 60) }); }
        pg = pg === 1 ? 0 : pg - 1;
      }
    } catch (e) { hpErr = String(e.message || e).slice(0, 160); }
    const vis = await hb.rows(`SELECT bid, s FROM visits WHERE (? != '' AND p = ?) OR (? != '' AND e = ?) ORDER BY s`, p8, p8, em, em).catch(() => []);
    return gmJ({ ok: true, own, hitpay: hp, hitpayPages: pages, hitpayErr: hpErr, hitpayStats: st, simplybook: vis.map((v) => ({ bid: v.bid, when: sgStr(v.s).slice(0, 16) })) });
  }
  if (act === 'visitsync') {   /* staff (6 Nov): fill the first-visit / returning guest list from SimplyBook, a few months per call */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    try { return gmJ(await visitSync(env, f.from, f.months)); } catch (e) { return gmJ({ error: String(e.message || e).slice(0, 200) }); }
  }
  if (act === 'holdproblems') {   /* staff: online bookings in the last N days (max 60) that were paid but not booked, used a fallback, or got stuck */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const days = Math.max(1, Math.min(60, +f.days || 30));
    return gmJ({ ok: true, list: (await hb.problems(Date.now() - days * 86400e3)).map((r) => ({ ref: r.ref, date: r.date, room: r.data.q && r.data.q.room, time: r.data.q && r.data.q.time, status: r.status, pay: r.data.pay, total: r.data.q && r.data.q.total, name: r.data.name, phone: r.data.phone, done: r.data.done || null })) });
  }
  if (act === 'testbook') {   /* staff, sandbox holds only: run the after-payment steps without paying (fail=addClient,book,note to
                                 force fallbacks), or clean up (do=cleanup: cancel the test booking / delete its notes) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const ref = String(f.ref || '').replace(/[^A-Z0-9]/g, ''), h = await hb.get(ref);
    if (!h || h.data.pay !== 'test') return gmJ({ error: 'Only sandbox test holds.' });
    if (f.do === 'cleanup') {
      const dn = h.data.done || {}, out = {};
      if (dn.bookingId) out.cancel = await (await admin(env))('cancelBooking', [dn.bookingId]).then(() => 'ok').catch((e) => String(e.message || e).slice(0, 100));
      if (dn.noteIds) { const s2 = await sb2(env); out.notes = []; for (const id of dn.noteIds) out.notes.push(await s2('DELETE', '/admin/calendar-notes/' + id).then(() => 'deleted ' + id).catch((e) => String(e.message || e).slice(0, 80))); }
      return gmJ({ ok: true, ...out });
    }
    if (f.do === 'length') {   /* test: set the test booking's SimplyBook length (hours=3 to cut it short, or the paid hours), then run the check */
      const dn = h.data.done || {}, q = h.data.q; if (!dn.bookingId) return gmJ({ error: 'Not booked.' });
      const a = await admin(env), hrs = Math.max(1, Math.min(8, +f.hours || q.hours)), eB = mins(q.time) + hrs * 60 + BUF;
      const ed = await a('editBook', [dn.bookingId, q.eventId, q.unit, h.data.cid, q.date, q.time + ':00', eB >= 1440 ? addDays(q.date, 1) : q.date, hhmm(eB) + ':00', 0, { [PAX_FIELD]: String(h.data.pax || 2) }]).then(() => 'ok').catch((e) => String(e.message || e).slice(0, 140));
      return gmJ({ ok: true, edit: ed, check: await paidLengthCheck(env, dn.bookingId, 'change') });
    }
    const e2 = Object.assign(Object.create(env), env, { __fail: String(f.fail || '').split(',').filter(Boolean) });
    const r = await finalize(e2, ref, 'testbench');
    return gmJ({ ok: r.ok, err: r.err || null, pending: !!r.pending, done: r.h && r.h.done });
  }
  if (act === 'alerts') {   /* staff: the alert log (owner, 5 Nov) – list, or one alert with what's known about it now (id=) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const L = await hb.alogList(), H = (await hb.kvGet('human')) || [];
    const sortedOf = (x) => { const h = x.ctx && x.ctx.hid ? H.find((y) => y.id === x.ctx.hid) : null; return h ? (h.sorted || 0) : null; };
    if (f.id) {
      const x = L.find((y) => y.id === f.id); if (!x) return gmJ({ error: 'That alert is more than 3 days old, so its page has been cleared. The booking itself is in In session / the calendar.' });
      const c = x.ctx || {}; let hold = null;
      const ref = c.ref || (c.bid ? ((await hb.holdByBid(c.bid).catch(() => null)) || {}).ref : '');
      if (ref) { const h = await hb.get(ref).catch(() => null); if (h) hold = { ref, status: h.status, name: h.data.name, phone: h.data.phone, email: h.data.email, total: h.data.q && h.data.q.total, done: h.data.done || null, made: h.created, pay: h.data.pay, msg: h.data.msg ? { kind: h.data.msg.kind, title: h.data.msg.title } : null }; }
      return gmJ({ ok: true, alert: Object.assign({}, x, { sorted: sortedOf(x) }), hold, now: Date.now() });
    }
    return gmJ({ ok: true, list: L.map((x) => ({ id: x.id, t: x.t, kind: x.kind, title: x.title, body: x.body, late: x.late, type: x.ctx && x.ctx.type, s: x.ctx && x.ctx.s, room: x.ctx && x.ctx.room, preview: !!(x.ctx && x.ctx.preview), sorted: sortedOf(x) })), now: Date.now() });
  }
  if (act === 'alogseed' || act === 'alogclear') {   /* staff (5 Nov): PREVIEW entries in the alert history for one shop night, to see the format (nothing is sent to phones); alogclear removes them */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    if (act === 'alogclear') { const L = (await hb.alogList()).filter((x) => !(x.ctx && x.ctx.preview)); await hb.kvSet('alog', L); return gmJ({ ok: true, left: L.length }); }
    const day = /^\d{4}-\d\d-\d\d$/.test(f.day || '') ? f.day : sgDay(Date.now() - SHADOW_TILL * 60e3), now = Date.now(), made = [];
    const all = (await sessDay(env, day)).sessions.filter((S) => !S.sys && !S.orphanExt && ROOMS[S.unit]);
    for (const S of all) {
      if (S.k === 'b') { const r = await bookingAlert(env, S.id || String(S.key).slice(1), 'new', null).catch(() => null); if (r && r.msg) { r.msg.ctx.preview = true; await logAlert(env, 'booking', r.msg, r.msg.ctx); made.push('booking ' + S.key); } }
      const m = soonMsg(S, S.s - 60 * 60e3, await soonPax(env, S).catch(() => ''), await soonExtra(env, S, all, S.s - 60 * 60e3).catch(() => [])); m.ctx.preview = true;
      await logAlert(env, 'soon', m, m.ctx); made.push('soon ' + S.key);
    }
    return gmJ({ ok: true, day, made });
  }
  if (act === 'paytimes') {   /* staff, read-only (5 Nov): how long real guests took from pressing Pay to the booking, and how many walked away */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const days = Math.max(1, Math.min(90, +f.days || 60));
    const rows = await hb.rows(`SELECT status, created, data FROM holds WHERE created > ? ORDER BY created DESC LIMIT 3000`, Date.now() - days * 86400e3);
    const paid = [], other = {}, list = [];
    for (const r of rows) { const d = JSON.parse(r.data || '{}'); if (d.pay !== 'live') continue;
      const q = d.q || {}, secs = r.status === 'paid' && d.done && d.done.at && !d.forcedAt ? Math.round((d.done.at - r.created) / 1000) : null;
      if (secs !== null) paid.push(secs); else other[d.forcedAt ? 'forced' : r.status] = (other[d.forcedAt ? 'forced' : r.status] || 0) + 1;
      list.push({ t: r.created, st: d.forcedAt ? 'forced' : r.status, why: r.status === 'released' ? d.relWhy || '' : '', secs, room: q.room || '', date: q.date || '', time: q.time || '', hours: q.hours || 0, total: q.total || 0, eb: !!q.earlyBird }); }
    paid.sort((x, y) => x - y);
    return gmJ({ ok: true, days, holdSec: HOLD_SEC, paidSecs: paid, others: other, list: list.slice(0, 400) });
  }
  if (act === 'forcebook') {   /* OWNER only, after checking HitPay himself: book a paid online hold whose payment page is gone (Malia, 5 Nov) */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const ref = String(f.ref || '').replace(/[^A-Z0-9]/g, ''), h = await hb.get(ref); if (!h) return gmJ({ error: 'No such ref.' });
    if (h.status === 'paid' || h.status === 'booking') return gmJ({ error: 'Already ' + h.status + '.' });
    await hb.patch(ref, { forcedBy: String(f.by || 'staff').slice(0, 40), forcedAt: Date.now() });
    const r = await finalize(env, ref, 'staff-confirmed');
    return gmJ({ ok: !!r.ok, err: r.err || null, done: r.h && r.h.done });
  }
  if (act === 'prinfo') {   /* staff, read-only: what HitPay says about an online hold's payment */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const h = await hb.get(String(f.ref || '').replace(/[^A-Z0-9]/g, '')); if (!h) return gmJ({ error: 'No such ref.' });
    return gmJ({ ok: true, status: h.status, hp: await hpPaid(env, h), sweep: await hb.kvGet('paidSweepLast') });
  }
  if (act === 'holdsday') {   /* staff, read-only (5 Nov): every online hold for one date or made in the last N hours, any status */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const since = Date.now() - Math.min(72, +f.hours || 12) * 3600e3, rows = /^\d{4}-\d\d-\d\d$/.test(f.date || '') ? await hb.rows(`SELECT ref, date, unit, s, status, created, data FROM holds WHERE date = ? ORDER BY created DESC LIMIT 30`, f.date) : await hb.rows(`SELECT ref, date, unit, s, status, created, data FROM holds WHERE created > ? ORDER BY created DESC LIMIT 30`, since);
    return gmJ({ ok: true, list: rows.map((r) => { const d = JSON.parse(r.data || '{}'); return { ref: r.ref, date: r.date, unit: r.unit, s: r.s, status: r.status, why: d.relWhy || '', made: sgStr(r.created).slice(0, 16), pay: d.pay, name: d.name, room: d.q && d.q.room, time: d.q && d.q.time, hours: d.q && d.q.hours, total: d.q && d.q.total, done: d.done || null, pr: d.pr || r.pr || null }; }) });
  }
  if (act === 'bookstats') {   /* staff, read-only (owner, 11 Nov: reschedule maths): bookings in a date range with when each was made, compact */
    if (!env.GM_STAFF || f.staff !== env.GM_STAFF) return gmJ({ error: 'Wrong staff code.' });
    const from = /^\d{4}-\d\d-\d\d$/.test(f.from || '') ? f.from : addDays(sgDay(Date.now()), -60), to = /^\d{4}-\d\d-\d\d$/.test(f.to || '') ? f.to : addDays(from, 30);
    const a = await admin(env), L = Object.values((await a('getBookings', [{ booking_type: f.type === 'cancelled' ? 'cancelled' : 'non_cancelled', date_from: from, date_to: to }])) || {});
    return gmJ({ ok: true, from, to, n: L.length, keys: L[0] ? Object.keys(L[0]) : [], rows: L.map((x) => [x.id, +x.unit_id, String(x.start_date || x.start_date_time || ''), String(x.end_date || x.end_date_time || ''), String(x.record_date || x.created || ''), SYS_CLIENTS.includes(String(x.client_id)) ? 1 : 0, +x.event_id]) });
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
    const d = h.data || {}, out = { status: h.status, date: h.date, unit: h.unit, s: h.s, e: h.e, exp: h.exp, q: d.q, pay: d.pay, pr: h.pr, done: d.done || null, name: d.name, agreed: d.agreed, holdNotes: d.holdNotes || null, holdNotesDone: d.holdNotesDone || null };
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
  const L = c.link || {}, at = L.retimed && +L.at ? +L.at : +f.at, start = +L.start;   /* staff set the pop-up time (Change pop-up time): a guest edit keeps it */
  const t = (x, n) => String(x || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const m = { kind: String(f.kind || ''), to: t(f.to, 40), from: t(f.from, 40), title: t(f.title, 120), text: String(f.text || '').trim() };
  if (L.status === 'cancelled') return gmJ({ error: 'This link was cancelled. Message Round2 if that’s wrong.' });
  if (!GM_KINDS.includes(m.kind)) return gmJ({ error: 'Pick an occasion.' });
  if (!m.title) return gmJ({ error: 'Add a headline.' });
  if (m.text.length > 600) return gmJ({ error: 'Keep the message under 600 characters.' });
  if (!L.retimed && !(at >= start && at <= start + 3600e3 && (at - start) % 900e3 === 0)) return gmJ({ error: 'Pick when it pops up: at the start or up to an hour after.' });
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
const MAPS_URL = 'https://maps.app.goo.gl/FzoA4QdF45th5iMu7';   // Round2 on Google Maps (same link as the homepage's Find us)
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
  await hb.menuPut(ref, { pay, gst, sub, base: pay === 'test' ? 0 : base, mb: base, note: String(o.note || '').slice(0, 500), room, lines: lines.join('\n'), total, status: 'pending', orderNo, createdAt: new Date().toISOString(), requestId: pr.id });
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
    'DTSTART;TZID=Asia/Singapore:' + z(q.time), 'DTEND;TZID=Asia/Singapore:' + endDay + 'T' + q.end.replace(':', '') + '00', 'SUMMARY:Round2 · ' + room, 'LOCATION:Round2\\, 20 Haji Lane #02-00\\, Singapore 189213', 'DESCRIPTION:Booking ref ' + ref + '. Your booking and TV message: ' + PUBLIC_BOOK + '/done?ref=' + ref + ' · Questions? WhatsApp +65 9162 5767.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
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
.loc{display:grid;grid-template-columns:44px 1fr auto;gap:14px;align-items:center;text-decoration:none;color:inherit}.loc .pin{width:44px;height:44px;display:grid;place-items:center;color:var(--rc);border:1px solid var(--rc);background:rgba(244,241,251,.04)}.loc .ad{font-weight:600;font-size:17px;line-height:1.3}.loc .sg{color:#a79fbd;font-size:14px}.loc .go{font:9px 'Press Start 2P',monospace;color:var(--rc);white-space:nowrap}.mrt{display:inline-flex;align-items:center;gap:8px;margin-top:12px;padding:5px 10px;border:1px solid rgba(244,241,251,.2);font-size:13px;color:#d6d0e3}.mrt b{background:#009645;color:#fff;font-size:10px;padding:1px 5px;font-weight:700;letter-spacing:.02em}.test{background:#F2C21B;color:#0b0914;padding:8px 12px;font-weight:700;margin-bottom:14px}</style></head><body><main>
${test ? '<div class="test">TEST BOOKING · nothing was really charged</div>' : ''}
<div class="px kick">SAVE FILE CREATED</div><h1>YOU’RE BOOKED!</h1>
<div class="ticket"><p class="room">${esc(room)}</p><div class="type">${esc(look[2])}${q.earlyBird ? ' · Early bird' : ''}</div>
<dl><dt>Date</dt><dd>${esc(dayTxt)}</dd><dt>Time</dt><dd class="big">${esc(clock(q.time))} – ${esc(clock(q.end))}</dd><dt>Length</dt><dd>${q.hours} hours</dd>
<dt>Name</dt><dd>${esc(d.name)}</dd><dt>Guests</dt><dd>${esc(d.pax)}</dd><dt>Paid</dt><dd>$${q.total.toFixed(2)}</dd><dt>Ref</dt><dd class="ref">${esc(ref)}</dd></dl></div>
${msgBox}
<div class="card"><div class="k">WHEN YOU ARRIVE</div><ul><li>Come in and take a seat in our lobby. We’ll know you’ve arrived and come to show you to ${esc(room)}.</li><li>Your booking is under <b>${esc(d.name)}</b>.</li><li>Please be on time: your session ends at ${esc(clock(q.end))}.</li><li>${done.note || !done.bookingId || (done.fallback || []).some((x) => /shared/.test(x)) || (done.email && done.email !== 'ok') ? `We’ll WhatsApp you on ${esc(d.phone)} to confirm the details.` : `A confirmation email is on its way to ${esc(d.email)}.`}</li></ul></div>
<div class="card"><div class="k">ADDRESS</div><a class="loc" href="${MAPS_URL}" target="_blank" rel="noopener"><span class="pin"><svg width="20" height="24" viewBox="0 0 10 12" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h4v1h1v1h1v4H8v2H7v2H6v2H4v-2H3V8H2V6H1V2h1V1h1zm1 3v2h2V3z"/></svg></span><span><span class="ad">20 Haji Lane, #02-00</span><br><span class="sg">Singapore 189213</span></span><span class="go">MAP ›</span></a><span class="mrt"><b>EW12</b>Bugis MRT · Exit B · 6 min walk</span></div>
<div class="row"><a class="btn ghost" download="Round2-${esc(ref)}.ics" href="data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}">Add to calendar</a><a class="btn ghost" href="https://wa.me/6591625767?text=${encodeURIComponent('Hi Round2, about my booking ' + ref + (d.name ? ' under ' + d.name : '') + ' (' + room + ', ' + dt.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) + ', ' + clock(q.time) + ')')}">WhatsApp us</a></div>
${done.bookingId && !test ? `<a class="btn ghost" target="_top" href="${PUBLIC_BOOK}/receipt?ref=${esc(ref)}">Payment receipt</a>` : ''}
${d.ret ? `<a class="btn" href="${esc(d.ret)}">Back to Round2</a>` : '<a class="btn" href="https://www.round2.sg">Back to Round2</a>'}
<p class="fine">Closed this page? The link in your confirmation email brings you back here, and so does your calendar entry.</p>
<script>try{sessionStorage.clear()}catch(e){}</script><script>/* inside book.round2.sg: keep its address bar in step; links that leave these pages open outside the frame */(function(){if(window.top===window)return;try{parent.postMessage({r2:'page',path:location.pathname+location.search,title:document.title},'${PUBLIC_BOOK}')}catch(e){}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;var u=new URL(a.href,location.href);if(u.origin===location.origin&&!/^\\/done\\/message/.test(u.pathname))return;a.target=/(^|\\.)round2\\.sg$/.test(u.hostname)||u.origin===location.origin?'_top':'_blank';a.rel='noopener'},true)})()</script></main></body></html>`;
}

/* ---------- payment receipt (/receipt?ref=…) ---------- */
const PAY_NAME = { paynow_online: 'PayNow', card: 'Card', grabpay_direct: 'GrabPay', grabpay: 'GrabPay', shopee_pay: 'ShopeePay', atome: 'Atome', apple_pay: 'Apple Pay', google_pay: 'Google Pay', wechat: 'WeChat Pay', alipay: 'Alipay' };
async function receiptPage(env, ref, h) {
  const d = h.data, q = d.q, room = q.unit === 11 ? 'Maximillion' : q.room, look = ROOM_LOOK[q.unit] || ['#f4f1fb', '#0b0914', ''];
  const pr = await hitpay(envFor(env, d.pay), 'GET', '/payment-requests/' + h.pr).catch(() => ({})), p = (pr.payments || [])[0] || {};
  const paidAt = Date.parse(String(p.created_at || p.updated_at || pr.updated_at || '').replace(' ', 'T')) || (d.done && d.done.t) || h.created || Date.now();
  const fmt = (ms) => new Date(ms + 8 * 3600e3).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/,/g, '') + ', ' + clock12(ms);
  const day = new Date(q.date + 'T12:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/,/g, '');
  const clock = (t) => { const [hh, m] = t.split(':').map(Number); return ((hh + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (hh % 24 < 12 ? 'am' : 'pm'); };
  const method = PAY_NAME[String(p.payment_type || '').toLowerCase()] || (p.payment_type ? String(p.payment_type).replace(/_/g, ' ') : 'HitPay');
  const line = (k, v, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${k}</td><td>${v}</td></tr>`;
  const paid = pr.status === 'completed' || h.status === 'paid', amt = (+(pr.amount || q.total)).toFixed(2);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt ${esc(ref)} · Round2</title>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
<style>:root{--rc:${look[0]}}*{box-sizing:border-box}body{margin:0;background:#06050a;color:#f4f1fb;font:16px/1.5 'Chakra Petch',system-ui,sans-serif}
main{max-width:520px;margin:0 auto;padding:28px 16px 40px}.px{font-family:'Press Start 2P',monospace;letter-spacing:.08em}.kick{font-size:9px;color:#a79fbd}
h1{font-family:'Press Start 2P',monospace;font-size:18px;margin:10px 0 18px}.rc{border:1px solid rgba(244,241,251,.14);border-top:4px solid var(--rc);background:#0b0914;padding:18px}
.biz{font-weight:700;font-size:18px}.ad{color:#a79fbd;font-size:13px;margin-bottom:14px}table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px dashed rgba(244,241,251,.14);vertical-align:top}td:last-child{text-align:right;font-weight:600}
tr.tot td{border-bottom:0;font-size:20px;font-weight:700;padding-top:12px}tr.tot td:last-child{color:var(--rc)}.st{display:inline-block;font:9px 'Press Start 2P',monospace;padding:6px 8px;background:var(--rc);color:#0b0914;margin-top:14px}
.btn{display:block;text-align:center;padding:13px 14px;font:10px 'Press Start 2P',monospace;letter-spacing:.08em;text-decoration:none;color:#f4f1fb;border:1px solid var(--rc);background:transparent;margin-top:12px;width:100%;cursor:pointer}.fine{font-size:12px;color:#a79fbd}
@media print{body{background:#fff;color:#000}.rc{background:#fff;border-color:#999}.ad,.fine,.kick{color:#555}.btn,.noprint{display:none}td{border-color:#ccc}}</style></head><body><main>
<div class="px kick noprint">ROUND2 · SAVE MENU</div><h1>RECEIPT</h1>
<div class="rc"><div class="biz">Round2</div><div class="ad">20 Haji Lane, #02-00, Singapore 189213 · hello@round2.sg · +65 9162 5767</div>
<table>${line('Receipt for', esc(d.name))}${line('Booking ref', esc(ref))}${line('Paid on', esc(fmt(paidAt)))}${line('Paid with', esc(method) + ' (HitPay)')}${p.id ? line('Payment ID', `<span style="font-size:12px">${esc(String(p.id))}</span>`) : ''}
${line(`${esc(room)} · ${esc(look[2] || 'Private room')}${q.earlyBird ? ' · Early bird' : ''}<br><span class="fine">${esc(day)}, ${esc(clock(q.time))} – ${esc(clock(q.end))} · ${q.hours} hours · ${esc(String(d.pax || ''))} guests</span>`, '$' + (+q.total).toFixed(2))}
${line('Total paid (SGD)', '$' + amt, 'tot')}</table>${paid ? '<span class="st">PAID</span>' : '<span class="st">PAYMENT PENDING</span>'}</div>
<button class="btn" onclick="print()">Save as PDF / print</button><a class="btn" target="_top" href="${PUBLIC_BOOK}/move?ref=${esc(ref)}">Back to your booking</a>
<p class="fine">Bookings are non-cancellable and non-refundable. Questions about this payment? WhatsApp +65 9162 5767 with your booking ref.</p>
</main></body></html>`;
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
/* Apple (Sending web push notifications): "Don't refresh your JWT more frequently than once per hour." Until 14 Nov every
   single alert to every phone carried a freshly signed one. Now one per push service, reused for 2 hours (valid 12): kept in
   memory and in KV (HOLDS › vapid:<service>) so every copy of the engine uses the same one. */
const VAPID_MEM = {};
async function vapidAuth(env, endpoint) {
  const j = JSON.parse(env.VAPID_JWK), aud = new URL(endpoint).origin, now = Date.now(), pk = vapidPublic(env), fresh = (c) => c && c.jwt && c.pk === pk && now - c.t < 2 * 3600e3;
  let c = VAPID_MEM[aud];
  if (!fresh(c) && env.HOLDS) c = await env.HOLDS.get('vapid:' + aud, 'json').catch(() => null);
  if (!fresh(c)) {
    const head = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const body = b64u(utf8(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: 'mailto:hello@round2.sg' })));
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: j.x, y: j.y, d: j.d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(head + '.' + body));   /* raw r||s, as JWT wants */
    c = { t: now, pk, jwt: head + '.' + body + '.' + b64u(sig) };
    if (env.HOLDS) await env.HOLDS.put('vapid:' + aud, JSON.stringify(c), { expirationTtl: 6 * 3600 }).catch(() => null);
  }
  VAPID_MEM[aud] = c;
  return 'vapid t=' + c.jwt + ', k=' + pk;
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
const TOPIC_NO = {};   /* push services that refused the Topic header – remembered while this copy of the engine lives */
async function pushOne(env, sub, msg) {
  try {
    const svc = new URL(sub.endpoint).origin;
    /* Topic (14 Nov): while a phone hasn't taken an alert yet, a newer one for the same booking (our own re-send, or a change)
       REPLACES it at Apple/Google instead of queueing behind it – the owner got 2–3 copies at once when his phone woke up */
    const topic = TOPIC_NO[svc] ? '' : String(msg.tag || '').replace(/[^A-Za-z0-9_-]/g, '').slice(-32);
    const send = async (withTopic) => fetch(sub.endpoint, { method: 'POST', body: await pushEncrypt(sub, JSON.stringify(msg)),
      headers: Object.assign({ Authorization: await vapidAuth(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' }, withTopic ? { Topic: topic } : {}) });
    let r = await send(!!topic), note = '';
    if (r.status === 400 && topic) { TOPIC_NO[svc] = 1; note = ' (topic refused)'; r = await send(false); }   /* a push service that won't take the Topic: the alert still goes, and later ones skip it */
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' + note : 'failed ' + r.status + ' ' + (await r.text()).slice(0, 80);
  } catch (e) { return 'failed ' + String(e.message || e).slice(0, 80); }
}
/* every phone that wants this kind of alert. msg = { title, body, tag, url } */
/* late session (owner, 5 Nov: highlight them): starts 11pm–7am, or runs past 11:15pm (the WhatsApp-only hours) */
function lateSess(s, e) { const m = (t) => { const d = new Date(+t + 8 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
  if (!s) return false; const a = m(s); if (a >= 23 * 60 || a < 7 * 60) return true; if (!e) return false; const b = m(e); return b > 23 * 60 + 15 || (b < 7 * 60 && e > s); }
/* log the alert and point its tap at its own page (/?alert=<id>) */
async function logAlert(env, kind, msg, ctx, hb0) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), c = ctx || {};
  const late = c.late != null ? !!c.late : lateSess(c.s, c.e);   /* by the times only (owner, 5 Nov: sessions keyed in with the control centre's tool say "late till 7pm" but aren't late) */
  try { await (hb0 || book(env)).alogAdd({ id, t: Date.now(), kind, tag: String(msg.tag || '').slice(0, 60), title: String(msg.title || '').slice(0, 160), body: String(msg.body || '').slice(0, 900), ctx: c, late }); } catch (e) {}
  return Object.assign({}, msg, { url: '/?alert=' + id, ctx: undefined });
}
/* a copy of "which phone showed which alert, how fast" in the engine's KV (HOLDS › diag:push), readable from the Cloudflare
   dashboard/API without the staff code (owner, 6 Nov: reminders late on his phone while the browser link was down).
   Written only when something changed. */
/* A phone that reports back but hasn't shown an alert gets it again: about 50 s after it was sent, then ~4 and ~9 min
   (at most 3 times; same tag and Topic, so there is never more than one on the screen).
   Owner, 6 Nov: Apple held his phone's alerts for 15–50 minutes, and a held alert came through the moment another one was
   sent. 14 Nov: the delivery log showed nearly every late alert appearing within 2 s of a re-send – so the first re-send now
   comes after ~50 s (the hold timer's alarm, `pushchk`) instead of waiting for the 5-minute timer, which stays as a backstop.
   Phones that haven't reported anything for 3 days (an old sign-up left behind) are not re-sent to. */
const PUSH_RETRY_GAPS = [45e3, 150e3, 300e3];
async function pushRetry(env, hb0) {
  const hb = hb0 || book(env), seen = (await hb.kvGet('pseen')) || {}, now = Date.now();
  const reports = new Set(); for (const a in seen) for (const k in seen[a]) if (+seen[a][k] > now - 3 * 86400e3) reports.add(k);   /* phones on the new background worker */
  const L = (await hb.alogList()).filter((x) => x.t < now - 45e3 && x.t > now - 20 * 60e3 && !x.preview);
  if (!L.length || !reports.size) return { out: [], more: false };
  const T = (await hb.kvGet('pretry')) || {}, subs = await hb.pushList(), out = []; let more = false;
  for (const x of L) for (const sb of subs) {
    const sid = String(sb.id).slice(0, 6); if (!reports.has(sid) || (seen[x.id] || {})[sid] || !sb.kinds.includes(x.kind === 'human' ? sb.kinds[0] : x.kind)) continue;
    const k = x.id + ':' + sid, r = typeof T[k] === 'number' ? { n: 3, t: 0 } : T[k] || { n: 0, t: x.t };
    if (r.n >= PUSH_RETRY_GAPS.length) continue;
    if (now - r.t < PUSH_RETRY_GAPS[r.n]) { more = true; continue; }
    T[k] = { n: r.n + 1, t: now }; if (r.n + 1 < PUSH_RETRY_GAPS.length) more = true;
    out.push(sid + ' ' + x.id + ' ' + (await pushOne(env, sb.sub, { kind: x.kind, title: x.title, body: x.body, tag: x.tag || 'r' + x.id, url: '/?alert=' + x.id })));
  }
  for (const k in T) if (!L.some((x) => k.startsWith(x.id + ':'))) delete T[k];
  await hb.kvSet('pretry', T); if (out.length) await hb.kvSet('pretryLast', { t: now, out });
  return { out, more };
}
/* a read-only staff question left in the engine's KV (HOLDS › diag:req, JSON form fields) is answered within 5 minutes into
   diag:res – for when the browser link to the owner's computer is down (6 Nov). Only reading actions; only someone with
   Cloudflare access to this account can write the KV. */
const DIAG_OK = ['cronnet', 'noise', 'paxof', 'tvmsgs', 'alerts', 'pushsubs', 'tvlog', 'guestlook', 'list', 'auto', 'insess', 'holdsday', 'acks', 'latelist', 'paytimes', 'prinfo', 'queue', 'links'];
async function diagReq(env) {
  if (!env.HOLDS) return;
  const q = await env.HOLDS.get('diag:req', 'json').catch(() => null); if (!q) return;
  await env.HOLDS.delete('diag:req');
  const reqs = Array.isArray(q) ? q.slice(0, 5) : [q], out = [];
  for (const f of reqs) {
    if (!DIAG_OK.includes(String(f.action))) { out.push({ q: f, error: 'not a reading action' }); continue; }
    if (f.action !== 'noise') delete f.sync;   /* read only – except bringing the noise blocks up to date, which the timer does anyway */
    const r = await gm(env, new Request('https://engine/gm', { method: 'POST', body: new URLSearchParams(Object.assign({}, f, { staff: env.GM_STAFF })) }));
    out.push({ q: f, r: await r.json().catch(() => null) });
  }
  await env.HOLDS.put('diag:res', JSON.stringify({ t: sgStr(Date.now()), out }));
}
async function pushDiag(env) {
  if (!env.HOLDS) return;
  const hb = book(env), seen = (await hb.kvGet('pseen')) || {}, al = (await hb.alogList()).slice(0, 25);
  const phones = (await hb.rows(`SELECT id, label, t, last FROM push`)).map((r) => ({ id: String(r.id).slice(0, 6), label: r.label, since: sgStr(r.t).slice(0, 16), last: r.last ? JSON.parse(r.last) : null }));
  const out = { at: sgStr(Date.now()), phones, alerts: al.map((x) => ({ sent: sgStr(x.t).slice(5, 19), title: String(x.title).slice(0, 60), shown: Object.fromEntries(Object.entries(seen[x.id] || {}).map(([k, v]) => [k, '+' + Math.round((v - x.t) / 1000) + 's'])) })) };
  const sig = JSON.stringify([out.phones.map((p) => p.last && p.last.t), out.alerts.map((a) => a.shown)]);
  if ((await hb.kvGet('pushDiagSig')) === sig) return;
  await hb.kvSet('pushDiagSig', sig); await env.HOLDS.put('diag:push', JSON.stringify(out, null, 1));
}
/* 14 Nov, 10am: two of four 1-hour reminders failed for every phone with "Too many subrequests by single Worker invocation" –
   the 5-minute timer's run does a lot of SimplyBook work, and a free-plan run may make only 50 outside requests in all, the
   alerts to Apple included (the ~50 s re-send, which runs in the store, got them out a minute or two late). So the sending
   now happens INSIDE the store (the Durable Object, `pushRun`): each alert gets its own allowance, whatever else the caller
   is doing. If that call itself fails, it is sent from here as before. */
async function pushAll(env, kind, msg) {
  if (!env.VAPID_JWK) return { sent: 0, why: 'no VAPID_JWK' };
  try { return await book(env).pushRun(kind, JSON.parse(JSON.stringify(msg))); } catch (e) { console.log('[push] in-store send failed, sending here: ' + String(e.message || e).slice(0, 120)); }
  return pushAllHere(env, kind, msg, book(env));
}
async function pushAllHere(env, kind, msg, hb) {
  const subs = await hb.pushList(kind); let sent = 0;
  msg = await logAlert(env, kind, msg, msg.ctx, hb);
  await Promise.all(subs.map(async (s) => {
    const r = await pushOne(env, s.sub, Object.assign({ kind }, msg));
    if (/^ok/.test(r)) sent++;
    await hb.pushResult(s.id, r);
  }));
  if (sent) { try { await hb.pushChk(Date.now() + 50e3); } catch (e) {} }   /* look again in ~50 s: re-send to any phone that hasn't shown it */
  return { sent, phones: subs.length };
}
async function pushId(endpoint) { return b64u(await crypto.subtle.digest('SHA-256', utf8(String(endpoint)))).slice(0, 22); }
/* /push/* – the control centre's "Alerts on this phone". Body is JSON sent as text (no CORS preflight). */
async function pushApi(env, req, path) {
  if (path === '/push/key') return J(env.VAPID_JWK ? { key: vapidPublic(env), kinds: PUSH_KINDS } : { error: 'Alerts aren’t set up in Cloudflare yet' });
  if (req.method !== 'POST') return J({ error: 'POST' }, 405);
  const f = await req.json().catch(() => ({})), hb = book(env);
  /* a phone saying it really showed an alert (6 Nov: Apple accepted the 4:41am alert for every phone, but it never appeared
     on the owner's). No staff code: it only records "this phone showed alert X" for a phone that is signed up. */
  if (path === '/push/seen') {
    const a = String(f.a || '').replace(/[^a-z0-9]/g, '').slice(0, 20), e = String(f.e || '').slice(-40);
    if (!a || e.length < 20 || !(await hb.gmRate('pushseen:' + (req.headers.get('cf-connecting-ip') || '?'), 300))) return J({ ok: false });
    const sub = (await hb.rows(`SELECT id FROM push WHERE instr(sub, ?) > 0`, e))[0]; if (!sub) return J({ ok: false });
    const m = (await hb.kvGet('pseen')) || {}; (m[a] = m[a] || {})[String(sub.id).slice(0, 6)] = Date.now();
    const keys = Object.keys(m); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach((k) => delete m[k]);
    await hb.kvSet('pseen', m); return J({ ok: true });
  }
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
    return J(/^ok/.test(r) ? { ok: true } : { error: r === 'gone' ? 'The phone’s subscription expired. Turn alerts off and on again.' : r });
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
/* the 1-hour reminder says first visit / returning too (owner, 6 Nov): this booking's guest from the visit list (its own row
   holds the phone/email it was booked with), else the phone on the session */
async function soonVisit(env, S) {
  if (S.k !== 'b') return '';
  try {
    const hb = book(env), bid = String(S.key).slice(1); if (!(await hb.kvGet('visitSync'))) return '';
    const me = (await hb.rows(`SELECT p, e FROM visits WHERE bid = ?`, bid))[0] || { p: vPhone(S.phone), e: '' };
    if (!me.p && !me.e) return '';
    const v = await hb.vBefore(bid, S.s, me.p, me.e);
    return v.n === 0 ? '🆕 1st visit' : '🔁 ' + ordinal(v.n + 1) + ' visit';
  } catch (e) { return ''; }
}
function soonMsg(S, now, pax, extra, visit) {
  const mins = Math.round((S.s - now) / 60e3), unit = S.unit, inT = ' · in ' + (mins >= 55 && mins <= 65 ? '1 hour' : mins + ' min');
  const len = Math.round((S.guestEnd - S.s) / 360e3) / 10, when = [clock12(S.s) + '–' + clock12(S.guestEnd), len + 'h', (pax || '?') + ' pax'].join(' · ') + (extra && extra.length ? '\n' + extra.join(' · ') : '');
  const ctx = { type: 'soon', key: S.key, k: S.k, unit, room: ROOMS[unit] ? (unit === 11 ? 'Maximillion' : ROOMS[unit][0]) : '', s: S.s, e: S.guestEnd, name: S.name || '', pax: pax || '', phone: S.phone || '', extra: extra || [] };
  if (S.k === 'b') return { title: roomTitle(unit) + ' · ' + (S.name || 'No name') + inT, body: when.replace(/^([^\n]*)/, (l) => l + (visit ? ' · ' + visit : '')), tag: 'soon' + S.key, url: '/?tab=insession', ctx };
  /* a calendar note: the whole note under the times, so nothing staff wrote is lost (owner, 1 Nov) */
  const note = String(S.name || '').replace(/\s+/g, ' ').trim();
  return { title: roomTitle(unit) + ' · Note' + inT, body: when + '\n' + (note ? '“' + note.slice(0, 200) + '”' : '(empty note)'), tag: 'soon' + S.key, url: '/?tab=insession', ctx };
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
  /* a session has key 'b<id>', not id (10 Nov: so the noise rule and the 1-hour reminder never got a booking's guest count) */
  const b = await (await admin(env))('getBookingDetails', [S.id || String(S.key || '').slice(1)]).catch(() => null); let pax = '';
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
  let all; try { all = await soonSessions(env, days); } catch (e) { await hb.kvSet('soonAgain', now).catch(() => null); throw e; }   /* tried again on the next 5-minute tick */
  for (const S of all) {
    const m = S.s - now; if (m <= 50 * 60e3 || m > 61 * 60e3) continue;   /* exactly 1 h before on the 5-min tick (owner, 2 Nov); keyed in within the hour → none */
    if (!(await hb.soonMark(S.key + ':' + S.s))) continue;
    sent.push(Object.assign({ key: S.key }, await pushAll(env, 'soon', soonMsg(S, now, await soonPax(env, S), await soonExtra(env, S, all, now), await soonVisit(env, S)))));
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
/* who a guest is, for "first visit / returning": the last 8 digits of the phone and a real email (not our own) */
const vPhone = (x) => { const d = String(x || '').replace(/\D/g, ''); return d.length >= 8 && !/91625767$/.test(d) ? d.slice(-8) : ''; };
const vMail = (x) => { const m = String(x || '').trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m) && !/round2|example\.com|noemail|no-?reply|test@/.test(m) ? m : ''; };
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
/* fill the guest list from SimplyBook's bookings (staff, once; gm visitsync from=YYYY-MM-DD months=N, 1 request per month) */
async function visitSync(env, from, months) {
  const a = await admin(env), hb = book(env); let d = /^\d{4}-\d\d-\d\d$/.test(from || '') ? from : '2024-01-01', n = 0, seen = 0;
  for (let i = 0; i < Math.max(1, Math.min(12, +months || 6)); i++) {
    const to = addDays(d, 30);
    const L = Object.values((await a('getBookings', [{ date_from: d, date_to: to, booking_type: 'non_cancelled' }])) || {});
    const rows = [];
    for (const b of L) {
      const cid = String(b.client_id || ''), name = String(b.client || b.client_name || '');
      if (SYS_CLIENTS.includes(cid) || SYS_RE.test(name) || !ROOMS[+b.unit_id]) continue;
      const p = vPhone(b.client_phone), e = vMail(b.client_email); seen++;
      if (p || e) rows.push({ bid: String(b.id), s: sgMs0(b.start_date || b.start_date_time), p, e });
    }
    n += await hb.vPut(rows); d = addDays(to, 1);
  }
  await hb.kvSet('visitSync', { t: Date.now(), upTo: d });
  return { ok: true, bookings: seen, saved: n, next: d };
}
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
  /* first visit or returning (owner, 6 Nov) – only once the guest list has been filled (gm visitsync) */
  let visit = null;
  if (type !== 'cancel') {
    const vp = vPhone(b.client_phone), ve = vMail(b.client_email), hbv = book(env);
    if ((vp || ve) && (await hbv.kvGet('visitSync').catch(() => null))) {
      const v = await hbv.vBefore(String(bid), s, vp, ve).catch(() => null);
      if (v) visit = { n: v.n + 1, last: v.last };
      await hbv.vPut([{ bid: String(bid), s, p: vp, e: ve }]).catch(() => null);
    }
  }
  const vTag = visit ? (visit.n === 1 ? ' · 🆕 1st visit' : ' · 🔁 ' + ordinal(visit.n) + ' visit') : '';   /* at the end of the details, not the bold line – it got cut off there (owner, 6 Nov) */
  const ctx = { type: 'booking', change: type || 'new', bid: String(bid), unit, room, s, e, hours, name, pax, money, rate: short || rate, phone: String(b.client_phone || ''), email: String(b.client_email || ''), visit,
    ref: own && own.ref || '', tvmsg: own && own.msg || null, prev: prev && type === 'change' ? { unit: prev.unit, s: prev.s, e: prev.e } : null };
  return { msg: { title: roomTitle(unit) + ' · ' + (name || 'No name'), body: body + vTag, tag: 'bk' + bid, url: today ? '/?tab=insession' : '/', ctx }, b, now: { unit, s, e } };
}
/* An online booking cut short in SimplyBook (owner, 3 Nov: Andrew L paid 5 h for Vale; his start was moved in SimplyBook,
   SimplyBook reset him to its standard 3 h, Auto wrap-up followed and the room looked free after 3 h). The engine knows what
   was paid: shorter than that → every phone + a red card on Home. Put right → the card ticks itself off. */
async function paidLengthCheck(env, bid, type) {
  if (type === 'cancel') return null;
  const hb = book(env), h = await hb.holdOfBid(bid); if (!h || !h.data.q) return null;
  const b = await (await admin(env))('getBookingDetails', [bid]).catch(() => null); if (!b) return null;
  const q = h.data.q, s = sgMs0(b.start_date_time || b.start_date), e = sgMs0(b.end_date_time || b.end_date), have = Math.round((e - s) / 60e3), paid = q.hours * 60 + BUF;
  const title = '⚠️ Online booking cut short in SimplyBook', room = q.unit === 11 ? 'Maximillion' : q.room;
  if (have >= paid - 1) {   /* fine (again): tick off an open card for it */
    const L = (await hb.kvGet('human')) || []; let ch = false;
    for (const x of L) if (x.ref === h.ref && x.title === title && !x.sorted) { x.sorted = Date.now(); x.body += '\n✓ Put right in SimplyBook ' + clock12(Date.now()); ch = true; }
    if (ch) await hb.kvSet('human', L);
    return { ok: true, have, paid };
  }
  const want = s + paid * 60e3;
  await humanAlert(env, h.ref, title, `${h.data.name} paid for ${q.hours}h in ${room}, but SimplyBook now shows ${Math.round((have - BUF) / 6) / 10}h (${clock12(s)}–${clock12(e - BUF * 60e3)}).` +
    `\nSet the SimplyBook end to ${clock12(want)} (guest leaves ${clock12(want - BUF * 60e3)}) – until then those hours look free to other guests.\nRef ${h.ref} · ${h.data.phone}`);
  return { short: true, have, paid };
}
async function bookingPush(env, bid, type) {
  if (!SB_ALERT[type] || !env.VAPID_JWK) return null;
  const hb = book(env), prev = await hb.bkGet(String(bid)).catch(() => null);
  const mvp = type === 'change' ? await hb.kvGet('mvpush:' + bid).catch(() => null) : null;
  if (mvp && mvp > Date.now()) { const r0 = await bookingAlert(env, bid, type, prev); if (r0 && r0.now) await hb.bkPut(String(bid), r0.now).catch(() => null); return { skipped: 'moved through Round2 – its own alert was sent' }; }
  const r = await bookingAlert(env, bid, type, prev);
  if (r && r.now) await (type === 'cancel' ? hb.bkDel(String(bid)) : hb.bkPut(String(bid), r.now)).catch(() => null);
  if (type === 'cancel') await hb.vDel(String(bid)).catch(() => null);   /* a cancelled booking isn't a visit */
  return r && r.msg ? pushAll(env, 'booking', r.msg) : r;
}

/* ===== Noise rule (owner, 8 Nov) =====
   A booking for 4 or more guests in Max or Atlas blocks Bella; 4 or more in Bella blocks Atlas (noise between the rooms).
   Max is never blocked by this rule. The block is a SimplyBook time-blocked note "SYSTEM BLOCK · NOISE …" over the same time
   as the session, including its cleaning time and any extensions, so the booking page, SimplyBook and staff all see the room
   as taken; screens skip it like every other SYSTEM BLOCK. Everywhere: online bookings, bookings made in SimplyBook (guest
   count field) and control-centre sessions (guest count in the note text, e.g. "5 pax").
   If the other room is already booked at that time, the booking still stands (owner's choice) and staff are alerted
   (control-centre alert + Telegram), once per clash. Runs on every SimplyBook change, after In session / Late session
   actions, every 10 minutes for tonight and tomorrow, and hourly for the week ahead. */
const NOISE = { 11: 10, 12: 10, 10: 12 }, NOISE_PAX = 4, NOISE_RE = /SYSTEM\s*BLOCK\s*·\s*NOISE/i;
const noiseRoom = (u) => (u === 11 ? 'Max' : ROOMS[u] ? ROOMS[u][0] : 'Room');
const noiseWho = (S) => String(S.name || '').split('·')[0].trim().slice(0, 30) || 'session';
const noiseText = (S, pax) => `SYSTEM BLOCK · NOISE · ${noiseRoom(S.unit)}: ${pax} guests (${noiseWho(S)}) · removed automatically · src ${S.key}`;
async function noisePax(env, hb, S) {
  if (S.k !== 'b') return +notePax(S.name) || 0;
  const k = 'npax:' + S.key, c = await hb.kvGet(k);
  if (c && Date.now() - c.t < (c.p ? 6 * 3600e3 : 120e3)) return c.p;   /* "no count" only for 2 min: SimplyBook tells us about a new booking a moment before its guest count is saved (Anisah, 10 Nov – read as 0 and kept for 6 h) */
  const p = +(await soonPax(env, S).catch(() => '')) || 0;
  await hb.kvSet(k, { p, t: Date.now() });
  return p;
}
async function noiseSync(env, days, why) {
  const hb = book(env), s2 = await sb2(env), out = { made: 0, removed: 0, warned: 0 };
  for (const day of [...new Set(days)].filter((d) => /^\d{4}-\d\d-\d\d$/.test(d))) {
    const D = await sessDay(env, day), d0 = sgMs0(day + ' 00:00'), d1 = d0 + 86400e3, inDay = (x) => x.s >= d0 && x.s < d1;
    const want = [];
    for (const S of D.sessions) {
      if (S.sys || S.orphanExt || !NOISE[S.unit] || !inDay(S)) continue;
      const pax = await noisePax(env, hb, S);
      if (pax >= NOISE_PAX) want.push({ S, pax, unit: NOISE[S.unit], s: S.s, e: S.end });
    }
    const have = D.items.filter((x) => x.k === 'n' && NOISE_RE.test(x.name) && inDay(x)).map((x) => Object.assign({ src: (x.name.match(/src ([bn]\d+)/) || [])[1] || '' }, x));
    const keep = new Set();
    for (const w of want) {
      const same = have.find((x) => x.src === w.S.key && x.unit === w.unit && Math.abs(x.s - w.s) < 60e3 && Math.abs(x.e - w.e) < 60e3);
      if (same) { keep.add(same.id); continue; }
      /* already taken in the other room? the booking stands; tell staff (once for this exact clash) */
      const clash = D.items.filter((x) => x.unit === w.unit && !x.blk && (!x.sys || HOLD_RE.test(x.name)) && x.s < w.e - BUF * 60e3 && x.e - BUF * 60e3 > w.s);   /* real guests (and guests paying) in the room at the same time – cleaning time doesn't count; not mirror/noise blocks */
      const r = await s2('POST', '/admin/calendar-notes', { provider_id: w.unit, service_id: null, start_date_time: sgStr(w.s), end_date_time: sgStr(w.e), note_type_id: 1, note: noiseText(w.S, w.pax), mode: 'provider', time_blocked: true }).catch((e) => ({ err: String(e.message || e).slice(0, 120) }));
      if (r && r.id) { out.made++; keep.add(String(r.id)); }
      if (clash.length && !/^ZZTEST/.test(w.S.name)) {   /* the System check's test sessions never alert */
        const wk = 'nwarn:' + w.S.key + ':' + w.unit + ':' + w.s + ':' + w.e;
        if (!(await hb.kvGet(wk))) {
          await hb.kvSet(wk, Date.now()); out.warned++;
          const who = clash.map((x) => (x.k === 'b' ? (x.sys ? 'a system block' : x.name || 'a booking') : HOLD_RE.test(x.name) ? 'an online guest paying' : 'a note') + ' ' + clock12(x.s) + '–' + clock12(x.e)).slice(0, 3).join(', ');
          const span = sgDayName(w.s).replace(/,/g, '') + ', ' + clock12(w.s) + '–' + clock12(w.e - BUF * 60e3);
          const title = '🔊 NOISE RULE · ' + noiseRoom(w.unit).toUpperCase() + ' ALREADY BOOKED';
          const body = noiseRoom(w.S.unit) + ' has ' + w.pax + ' guests (' + noiseWho(w.S) + ') ' + span + ', but ' + noiseRoom(w.unit) + ' is already taken then: ' + who + '. Check the noise between the rooms.';
          await pushAll(env, 'booking', { title, body, tag: 'noise' + w.S.key, url: '/', ctx: { type: 'noise', unit: w.S.unit, room: noiseRoom(w.S.unit), s: w.s, e: w.e - BUF * 60e3, pax: String(w.pax), name: w.S.name || '', late: false } }).catch(() => null);
          await staffAlert(env, title + '\n' + body).catch(() => null);
        }
      }
    }
    for (const x of have) if (!keep.has(x.id)) { await s2('DELETE', '/admin/calendar-notes/' + x.id).catch((e) => { if (!/ 404:/.test(String(e.message || e))) throw e; }); out.removed++; }
  }
  if (out.made || out.removed || out.warned) console.log('[noise] ' + (why || '') + ' ' + JSON.stringify(out));
  return out;
}
/* a SimplyBook change: that booking's day (and the day it was on before, if it moved) */
async function noiseOnSb(env, bid, type) {
  const hb = book(env), b = await (await admin(env))('getBookingDetails', [bid]).catch(() => null);
  await hb.kvSet('npax:b' + bid, null);
  const days = [], prev = await hb.kvGet('nday:b' + bid);
  if (prev) days.push(prev);
  const s = b ? sgMs0(b.start_date_time || b.start_date) : 0;
  if (s) { days.push(sgDay(s)); await hb.kvSet('nday:b' + bid, type === 'cancel' ? null : sgDay(s)); }
  if (days.length) { const ag = (await hb.kvGet('noiseAgain')) || { days: [] }; await hb.kvSet('noiseAgain', { at: Date.now() + 3 * 60e3, days: [...new Set(ag.days.concat(days))].slice(-10) }); }   /* again in ~3–5 min: a brand-new booking can be missing from SimplyBook's list for a moment (10 Nov) */
  return days.length ? noiseSync(env, days, 'simplybook ' + type) : null;
}

/* ===== Vale ↔ Atlas mirror (owner, 11 Nov: moved here from Make [BACKEND] SYSTEM BLOCKS MIRROR ROOMS 6990225) =====
   Same as Make did: a guest booking in Vale makes a SYSTEM BLOCK booking in Atlas (client 2472) and the other way round
   (client 2476), with the booking's exact SimplyBook start and end (cleaning included). The block moves when the booking
   moves (and goes if it leaves Vale/Atlas), and is cancelled with it. Better than Make: any service (same kind – off-peak /
   peak / early bird – in the twin, else its off-peak service), and a failed block alerts the staff phones.
   kv mir:<booking> = { blk } (adopted from Make's blocks at switch-over: same room twin, same start and end). */
const MIR_CLIENT = { 12: '2472', 5: '2476' };
function mirSvc(ev, from, to) {
  const A = SVC[ROOMS[from][1]] || {}, B = SVC[ROOMS[to][1]] || {}, kind = Object.keys(A).find((k) => A[k] === +ev);
  return B[kind || 'off'];
}
async function mirrorOnSb(env, bid, type, tries = 0) {
  const hb = book(env), rec = await hb.kvGet('mir:' + bid), a = await admin(env);
  if (!(await hb.lock('mirlock:' + bid, 60e3))) { if (tries < 3) { await new Promise((r) => setTimeout(r, 5000)); return mirrorOnSb(env, bid, type, tries + 1); } await humanAlert(env, 'mirror-' + bid, 'Vale/Atlas block not checked – look', `Booking #${bid} changed (${type}) but the twin block couldn’t be checked (busy 3 times). Check its twin room in SimplyBook, or System check › Moves and Vale/Atlas blocks.`).catch(() => null); return { busy: true }; }
  try {
    const drop = async (why) => {
      if (!rec || !rec.blk) return { none: why };
      const ok = await a('cancelBooking', [rec.blk]).then(() => true).catch((e) => String(e.message || e).slice(0, 120));
      await hb.kvSet('mir:' + bid, null); await hb.kvSet('mirb:' + rec.blk, null);
      if (ok !== true && !/cancel/i.test(ok)) await humanAlert(env, 'mirror-' + bid, 'Vale/Atlas block not removed', `Booking #${bid} ${why}, but its SYSTEM BLOCK #${rec.blk} in the other room couldn't be cancelled. Cancel it by hand in SimplyBook. (${ok})`).catch(() => null);
      await mirLog(env, { bid, do: 'cancel', why, blk: rec.blk, ok: ok === true });
      return { cancelled: rec.blk, why };
    };
    if (type === 'cancel') {
      const owner = await hb.kvGet('mirb:' + bid);   /* someone cancelled a block itself: forget it (Make did the same, no re-block) */
      if (owner) { await hb.kvSet('mir:' + owner, null); await hb.kvSet('mirb:' + bid, null); await mirLog(env, { bid: owner, do: 'block cancelled by hand', blk: bid }); return { forgot: bid }; }
      return drop('was cancelled');
    }
    const b = await a('getBookingDetails', [bid]).catch(() => null);
    if (!b || !b.unit_id) return { noBooking: true };
    if (SYS_CLIENTS.includes(String(b.client_id)) || SYS_RE.test(String(b.client_name || ''))) return { skipped: 'block' };
    if (String(b.is_confirm) === '0' && /cancel/i.test(String(b.status || ''))) return drop('was cancelled');
    const unit = +b.unit_id, tw = MIRROR[unit];
    if (!tw) return drop('left Vale/Atlas');
    const st = String(b.start_date_time || ''), en = String(b.end_date_time || '');
    if (!/^\d{4}-\d\d-\d\d \d\d:\d\d/.test(st) || !/^\d{4}-\d\d-\d\d \d\d:\d\d/.test(en)) return { badTimes: true };
    const fields = {}; for (const x of [].concat(b.additional_fields || [])) if (x && x.field_name) fields[x.field_name] = '1';
    const args = [mirSvc(b.event_id, unit, tw), tw, MIR_CLIENT[tw], st.slice(0, 10), st.slice(11, 19), en.slice(0, 10), en.slice(11, 19), 0, fields];
    const room = ROOMS[unit][0], twin = ROOMS[tw][0], when = `${st.slice(0, 10)} ${st.slice(11, 16)}–${en.slice(11, 16)}`;
    if (rec && rec.blk) {
      if (rec.s === st && rec.e === en && rec.u === tw) return { same: rec.blk };
      const ok = await a('editBook', [rec.blk, ...args]).then(() => true).catch((e) => String(e.message || e).slice(0, 120));
      if (ok === true) { await hb.kvSet('mir:' + bid, { blk: rec.blk, s: st, e: en, u: tw }); await mirLog(env, { bid, do: 'move', blk: rec.blk, room, when, ok: true }); return { moved: rec.blk }; }
      await mirLog(env, { bid, do: 'move', blk: rec.blk, room, when, ok: false, err: ok });
      await humanAlert(env, 'mirror-' + bid, `${twin} not blocked – check`, `${room} booking #${bid} (${b.client_name || 'guest'}) moved to ${when}, but its SYSTEM BLOCK in ${twin} (#${rec.blk}) couldn't follow. Move or add the block in ${twin} by hand. (${ok})`).catch(() => null);
      return { error: ok };
    }
    const r = await a('book', args).catch((e) => ({ err: String(e.message || e).slice(0, 120) }));
    const blk = r && r.bookings && r.bookings[0] && String(r.bookings[0].id);
    if (blk) { await hb.kvSet('mir:' + bid, { blk, s: st, e: en, u: tw }); await hb.kvSet('mirb:' + blk, bid); await mirLog(env, { bid, do: 'block', blk, room, when, ok: true }); return { blocked: blk }; }
    await mirLog(env, { bid, do: 'block', room, when, ok: false, err: r && r.err });
    await humanAlert(env, 'mirror-' + bid, `${twin} not blocked – check`, `${room} was booked for ${when} (#${bid}, ${b.client_name || 'guest'}), but ${twin} couldn't be blocked at the same time – someone could book ${twin} then. Block ${twin} by hand in SimplyBook. (${(r && r.err) || 'no answer'})`).catch(() => null);
    return { error: r && r.err };
  } finally { await hb.kvSet('mirlock:' + bid, 0); }
}
async function mirLog(env, x) { const hb = book(env), L = (await hb.kvGet('mirlog')) || []; L.unshift(Object.assign({ t: Date.now() }, x)); await hb.kvSet('mirlog', L.slice(0, 60)); }
/* switch-over: link every upcoming Vale/Atlas guest booking to the SYSTEM BLOCK Make made for it (twin room, same start and
   end). Nothing in SimplyBook changes. Bookings with no block are listed (and, with fix=1, blocked now). */
async function mirAdopt(env, fix) {
  const a = await admin(env), hb = book(env), from = sgDay(Date.now() - 86400e3), to = addDays(from, 120);
  const L = Object.values((await a('getBookings', [{ booking_type: 'non_cancelled', date_from: from, date_to: to }])) || {});
  const blocks = L.filter((x) => SYS_CLIENTS.includes(String(x.client_id)) && MIRROR[+x.unit_id]), used = new Set(), out = { linked: 0, already: 0, missing: [], fixed: [], spareBlocks: [] };
  for (const x of L) {
    if (SYS_CLIENTS.includes(String(x.client_id)) || !MIRROR[+x.unit_id]) continue;
    const st = String(x.start_date || x.start_date_time || ''), en = String(x.end_date || x.end_date_time || ''), tw = MIRROR[+x.unit_id];
    const have = await hb.kvGet('mir:' + x.id); if (have && have.blk) { used.add(String(have.blk)); out.already++; continue; }
    const m = blocks.find((y) => +y.unit_id === tw && !used.has(String(y.id)) && String(y.start_date || y.start_date_time) === st && String(y.end_date || y.end_date_time) === en);
    if (m) { used.add(String(m.id)); await hb.kvSet('mir:' + x.id, { blk: String(m.id), s: st, e: en, u: tw }); await hb.kvSet('mirb:' + m.id, String(x.id)); out.linked++; continue; }
    out.missing.push({ bid: x.id, room: ROOMS[+x.unit_id][0], when: st.slice(0, 16), name: x.client || x.client_name || '' });
    if (fix) out.fixed.push(Object.assign({ bid: x.id }, await mirrorOnSb(env, String(x.id), 'create').catch((e) => ({ error: String(e.message || e).slice(0, 80) }))));
  }
  for (const y of blocks) if (!used.has(String(y.id)) && !(await hb.kvGet('mirb:' + y.id))) out.spareBlocks.push({ blk: y.id, room: ROOMS[+y.unit_id][0], when: String(y.start_date || y.start_date_time).slice(0, 16) });
  return out;
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

/* ===== Room PS4s (13 Nov 2026) – check-ins from the Round2 PS4 helper (round2-tv-launcher ps4/, branch ps4-helper) =====
   Each PS4 POSTs /ps4/in every ~15 min with header x-r2-ps4 = secret PS4_KEY (the PS4 keeps it in /data/round2/key.txt).
   A PS4 is known by its console ID; the room is set once by staff (gm ps4map) because profile names are characters
   (Valentine = Vale). The engine keeps each PS4's latest report (kv ps4:<id>), adds the minutes each game was played to the
   shop night's tally (kv ps4play:<night>, engine clock – the PS4 clocks have been wrong for long stretches) and answers
   with the engine time. Nothing on a PS4 is changed from here yet. /ps4/games = the games list for the website: what the
   PS4s report per room type + the lobby disc games (kv ps4discs) + display names (kv ps4names). */
const PS4_TIER = { vale: 'n', kaeden: 'n', scarlett: 'n', kai: 'd', bella: 'd', atlas: 'd', max: 'v' };
const ps4Id = (x) => String(x || '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 32);
async function ps4In(env, req) {
  if (!env.PS4_KEY || req.headers.get('x-r2-ps4') !== env.PS4_KEY) return J({ error: 'no' }, 403);
  let r = {}; try { r = JSON.parse(await req.text()); } catch (e) { return J({ error: 'bad json' }, 400); }
  const id = ps4Id(r.id); if (id.length < 16) return J({ error: 'no console id' }, 400);
  const hb = book(env), now = Date.now(), map = (await hb.kvGet('ps4map')) || {}, room = map[id] || null;
  const prev = await hb.kvGet('ps4:' + id);
  r.games = Array.isArray(r.games) ? r.games.slice(0, 400) : prev && prev.games || [];   /* the helper sends games only when they change */
  const rep = Object.assign({}, r, { id, room, t: now, ip: req.headers.get('cf-connecting-ip') || '' });
  await hb.kvSet('ps4:' + id, rep);
  const uc = await hb.kvGet('ps4cmd:' + id);   /* an update: did the new version arrive, or was it rolled back? */
  if (uc && uc.do === 'update' && (uc.state === 'taken' || uc.state === 'done')) {
    if (r.v === uc.v) { uc.state = 'updated'; uc.doneAt = now; await hb.kvSet('ps4cmd:' + id, uc); }
    else if (r.rolled && String(r.rolled).includes(' ' + uc.v + ':')) { uc.state = 'rolledback'; uc.doneAt = now; uc.res = { why: String(r.rolled).slice(0, 120) }; await hb.kvSet('ps4cmd:' + id, uc); }
  }
  const ids = (await hb.kvGet('ps4ids')) || []; if (!ids.includes(id)) { ids.push(id); await hb.kvSet('ps4ids', ids.slice(-40)); }
  /* play time: the helper counts minutes per title since its last check-in (it looks every minute) */
  if (room && r.played && typeof r.played === 'object') {
    const night = sgDay(now - SHADOW_TILL * 60e3), k = 'ps4play:' + night, P = (await hb.kvGet(k)) || {};
    for (const tid in r.played) { const m = Math.max(0, Math.min(30, +r.played[tid] || 0)); if (!m || !/^[A-Z]{4}\d{5}$/.test(tid)) continue; P[room] = P[room] || {}; P[room][tid] = (P[room][tid] || 0) + m; }
    await hb.kvSet(k, P);
  }
  return J({ ok: true, now, room });
}
async function ps4Games(env) {
  const hb = book(env), ids = (await hb.kvGet('ps4ids')) || [], names = (await hb.kvGet('ps4names')) || {}, discs = (await hb.kvGet('ps4discs')) || [];
  const map = (await hb.kvGet('ps4map')) || {};   /* the room comes from the map (a link set by staff works at once, not at the next check-in) */
  const out = {};   /* title id → { t: name, tiers: 'ndv', rooms: [...] } */
  for (const id of ids) {
    const rep = await hb.kvGet('ps4:' + id); if (!rep) continue;
    rep.room = map[id] || null; if (!rep.room) continue;
    for (const g of rep.games || []) {
      if (!g || !/^CUSA\d{5}$/.test(g.id) || g.cat === 'gde' || names[g.id] === '-') continue;   /* gde = apps like PS Vue; '-' = hidden by staff */
      const o = out[g.id] || (out[g.id] = { id: g.id, t: names[g.id] || g.t || g.id, tiers: '', rooms: [] });
      const tier = PS4_TIER[rep.room] || ''; if (tier && !o.tiers.includes(tier)) o.tiers += tier;
      if (!o.rooms.includes(rep.room)) o.rooms.push(rep.room);
    }
  }
  for (const d of discs) if (d && d.t) out['disc:' + d.t] = { t: d.t, tiers: d.tiers || 'ndv', rooms: [], disc: true, p: d.p || '' };
  const list = Object.values(out).sort((a, b) => a.t.localeCompare(b.t));
  return new Response(JSON.stringify({ ok: true, at: Date.now(), games: list }), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } });
}
/* Staff commands for a PS4 (13 Nov, owner: "one-tap clean-up"). The helper asks /ps4/cmd every minute; one command waits per
   PS4 in kv ps4cmd:<id> { cid, do, at, by, state: sent → taken → done | failed | refused | expired, res }. Clean-up deletes the
   stuck update downloads (never PS Vue's) and guests' screenshots/clips – only when the room has no guest session now (its own guests – not
   the twin's SYSTEM BLOCK) or within 15 minutes, checked when staff press the button AND again when the PS4 picks it up; the PS4 itself also refuses
   while a game is open. */
const PS4_GAP = 15;
/* a real guest session in this room (13 Nov, owner): only the room's OWN guests count. Vale and Atlas are separate rooms (Atlas
   is upstairs) – their twin SYSTEM BLOCK *bookings* (the mirror blocks the other room's sale) are not guests, nor noise blocks /
   other SYSTEM BLOCK notes, nor long "room blocked" notes (Kaeden renovation). Used by PS4 jobs and the TVs' Update now. */
const realGuests = (S, unit) => S.unit === unit && !S.sys && !(S.e0 - S.s > 12 * 3600e3);
async function roomBusy(env, unit, gap) {
  const now = Date.now(), night = sgDay(now - SHADOW_TILL * 60e3);
  for (const d of [night, addDays(night, 1)]) for (const S of (await sessDay(env, d)).sessions)
    if (realGuests(S, unit) && S.s - gap * 60e3 <= now && now < S.guestEnd) return S;
  return null;
}
async function ps4Busy(env, room, gap = PS4_GAP) {
  const unit = +(Object.keys(GM_ROOM).find((u) => GM_ROOM[u] === room) || 0), now = Date.now();
  if (!unit) return null;
  const S = await roomBusy(env, unit, gap);
  return S ? 'has a session ' + (S.s > now ? 'starting at ' : 'until ') + clock12(S.s > now ? S.s : S.guestEnd) : null;
}
/* Helper updates (13 Nov). The newest helper lives on round2-tv-launcher branch ps4-release (only round2d.elf + round2d.json
   { v, sha256, size }, replaced for each version; the TV apps never look there). The PS4s can only reach Round2, so the engine
   passes the file on (/ps4/app) after checking its SHA-256. When: by itself in quiet time (helper with the starter, no game
   open, no guest session in the room within 60 min, not a version that was rolled back, one try per version per 6 h;
   switch off with kv ps4auto=false), or "Update now" (staff, same rules as Clean up: 10 min). */
const PS4_REL = 'https://raw.githubusercontent.com/donttelldadyet-prog/round2-tv-launcher/';   /* + <commit>/round2d.json – the branch head is looked up first (GitHub API), so both files come from the same commit and nothing is stale */
const ps4Ver = (v) => String(v || '0').split('.').map((x) => +x || 0);
const PS4_SELFUP = '1.0.7';   /* helpers older than this exit to hand over, which got stuck on Max (13 Nov) – they get 1.0.7+ by FTP once */
const ps4Newer = (a, b) => { const x = ps4Ver(a), y = ps4Ver(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
async function ps4Latest(env, fresh) {
  const hb = book(env), c = await hb.kvGet('ps4rel'), now = Date.now();
  if (c && !fresh && now - c.at < 10 * 60e3) return c.v ? c : null;
  try {
    const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'round2-book' };
    if (env.GH_TOKEN) h.Authorization = 'Bearer ' + env.GH_TOKEN;
    const hr = await fetch('https://api.github.com/repos/donttelldadyet-prog/round2-tv-launcher/commits/ps4-release', { headers: h }).catch((e) => ({ ok: false, status: 'net ' + e.message }));
    const head = hr.ok ? await hr.json().catch(() => null) : null;
    const sha1 = head && /^[0-9a-f]{40}$/.test(head.sha || '') ? head.sha : null;
    if (!sha1) { await hb.kvSet('ps4relErr', { at: now, why: 'GitHub ' + hr.status + (head ? '' : ' ' + (await hr.text?.().catch(() => '') || '').slice(0, 120)) }); return c && c.v ? c : null; }
    if (c && c.commit === sha1 && c.v) { c.at = now; await hb.kvSet('ps4rel', c); return c; }
    const info = await fetch(PS4_REL + sha1 + '/round2d.json', { headers: { 'User-Agent': 'round2-book' } }).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (!info || !/^\d+\.\d+\.\d+$/.test(info.v || '') || !/^[0-9a-f]{64}$/.test(info.sha256 || '') || !(+info.size > 1024)) { await hb.kvSet('ps4rel', { at: now }); return null; }
    const out = { at: now, v: info.v, sha: info.sha256, size: +info.size, commit: sha1, url: PS4_REL + sha1 + '/round2d.elf' };
    await hb.kvSet('ps4rel', out); return out;
  } catch (e) { return c && c.v ? c : null; }
}
async function ps4App(env, req) {   /* the helper downloads the newest version through here */
  if (!env.PS4_KEY || req.headers.get('x-r2-ps4') !== env.PS4_KEY) return J({ error: 'no' }, 403);
  const rel = await ps4Latest(env); if (!rel) return J({ error: 'no release' }, 404);
  const b = await fetch(rel.url, { headers: { 'User-Agent': 'round2-book' } }).then((r) => r.ok ? r.arrayBuffer() : null).catch(() => null);
  if (!b) return J({ error: 'download failed' }, 502);
  const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map((x) => x.toString(16).padStart(2, '0')).join('');
  if (sha !== rel.sha || b.byteLength !== rel.size) return J({ error: 'file check failed' }, 502);
  return new Response(b, { headers: { 'content-type': 'application/octet-stream', 'x-r2-v': rel.v } });
}
async function ps4AutoUpdate(env, hb, id, room) {   /* quiet time? hand out an update */
  if ((await hb.kvGet('ps4auto')) === false) return null;
  const rep = await hb.kvGet('ps4:' + id), now = Date.now();
  if (!rep || !rep.boot || rep.running || now - rep.t > 20 * 60e3 || ps4Newer(PS4_SELFUP, rep.v)) return null;
  const rel = await ps4Latest(env); if (!rel || !ps4Newer(rel.v, rep.v)) return null;
  if (rep.rolled && rep.rolled.includes(' ' + rel.v + ':')) return null;   /* that version was rolled back here – needs a newer one or Update now */
  const tried = await hb.kvGet('ps4autoTry:' + id); if (tried && tried.v === rel.v && now - tried.t < 6 * 3600e3) return null;
  const chk = (await hb.kvGet('ps4autoChk:' + id)) || 0; if (now - chk < 10 * 60e3) return null;   /* bookings looked up at most every 10 min per PS4 */
  await hb.kvSet('ps4autoChk:' + id, now);
  if (await ps4Busy(env, room, 60)) return null;
  const c = { cid: 'a' + now.toString(36), do: 'update', v: rel.v, sha: rel.sha, size: rel.size, from: rep.v, at: now, takenAt: now, by: 'auto (quiet time)', state: 'taken' };
  await hb.kvSet('ps4autoTry:' + id, { v: rel.v, t: now }); await hb.kvSet('ps4cmd:' + id, c);
  return c;
}
const ps4Out = (c) => c.do === 'update' ? { cid: c.cid, do: 'update', v: c.v, sha: c.sha, size: c.size } : c.do === 'look' && c.p ? { cid: c.cid, do: 'look', p: c.p } : c.do === 'prof' ? { cid: c.cid, do: 'prof', op: c.op, u: c.u, v: c.pv || '' } : { cid: c.cid, do: c.do };
async function ps4Cmd(env, req) {   /* the helper, every minute: anything for me? */
  if (!env.PS4_KEY || req.headers.get('x-r2-ps4') !== env.PS4_KEY) return J({ error: 'no' }, 403);
  let r = {}; try { r = JSON.parse(await req.text()); } catch (e) {}
  const id = ps4Id(r.id); if (id.length < 16) return J({ error: 'no console id' }, 400);
  const hb = book(env), now = Date.now();
  await hb.kvSet('ps4poll:' + id, now);
  const c = await hb.kvGet('ps4cmd:' + id);
  if (!c || c.state !== 'sent') {
    const room0 = ((await hb.kvGet('ps4map')) || {})[id];
    const a = room0 && !(c && c.state === 'taken' && now - c.takenAt < 15 * 60e3) ? await ps4AutoUpdate(env, hb, id, room0).catch(() => null) : null;
    return J(a ? { ok: true, now, cmd: ps4Out(a) } : { ok: true, now });
  }
  if (now - c.at > 10 * 60e3) { c.state = 'expired'; await hb.kvSet('ps4cmd:' + id, c); return J({ ok: true, now }); }
  const room = ((await hb.kvGet('ps4map')) || {})[id] || null, busy = room ? await ps4Busy(env, room) : 'not linked to a room';
  if (busy) { c.state = 'refused'; c.res = { why: busy }; await hb.kvSet('ps4cmd:' + id, c); return J({ ok: true, now }); }
  c.state = 'taken'; c.takenAt = now; await hb.kvSet('ps4cmd:' + id, c);
  return J({ ok: true, now, cmd: ps4Out(c) });
}
async function ps4Done(env, req) {   /* the helper: how the command went */
  if (!env.PS4_KEY || req.headers.get('x-r2-ps4') !== env.PS4_KEY) return J({ error: 'no' }, 403);
  let r = {}; try { r = JSON.parse(await req.text()); } catch (e) { return J({ error: 'bad json' }, 400); }
  const id = ps4Id(r.id), hb = book(env), c = await hb.kvGet('ps4cmd:' + id);
  if (!c || c.cid !== r.cid) return J({ error: 'unknown command' }, 404);
  c.state = r.ok ? 'done' : r.refused ? 'refused' : 'failed'; c.doneAt = Date.now();
  c.res = { dlMB: +r.dlMB || 0, capMB: +r.capMB || 0, files: +r.files || 0, why: String(r.why || '').slice(0, 120) };
  await hb.kvSet('ps4cmd:' + id, c);
  if ((c.do === 'look' || c.do === 'prof') && r.list && typeof r.list === 'object') await hb.kvSet('ps4look:' + id, { at: Date.now(), list: Object.fromEntries(Object.entries(r.list).slice(0, 400).map(([k, v]) => [String(k).slice(0, 200), String(v).slice(0, 40)])) });
  return J({ ok: true });
}
/* PS4 game saves (helper 1.1.4+, owner 14 Nov): the helper uploads the files of an opened save, 8 MB pieces, into Cloudflare
   storage (bucket round2-saves, binding SAVES) under saves/<console>/<user>/<title>/<save>/<stamp>/ (f/<file>~<n> + manifest.txt),
   and downloads them again to restore. Header x-r2-ps4 = PS4_KEY. */
function ps4SaveKey(k) { k = String(k || ''); return k.length > 0 && k.length < 600 && !k.includes('..') && !k.startsWith('/') && /^[\w.@~ +=,()\[\]{}'&!$#%-]+(\/[\w.@~ +=,()\[\]{}'&!$#%-]+)*$/.test(k) ? k : ''; }
async function ps4SPut(env, req, u) {
  if (!env.PS4_KEY || req.headers.get('x-r2-ps4') !== env.PS4_KEY) return J({ error: 'no' }, 403);
  if (!env.SAVES) return J({ error: 'no storage' }, 503);
  const k = ps4SaveKey(u.searchParams.get('k')); if (!k) return J({ error: 'bad key' }, 400);
  const b = await req.arrayBuffer(); if (b.byteLength > 20e6) return J({ error: 'too big' }, 413);
  await env.SAVES.put('saves/' + k, b); return J({ ok: true, n: b.byteLength });
}
async function ps4SGet(env, req, u) {
  if (!env.PS4_KEY || req.headers.get('x-r2-ps4') !== env.PS4_KEY) return J({ error: 'no' }, 403);
  if (!env.SAVES) return J({ error: 'no storage' }, 503);
  const k = ps4SaveKey(u.searchParams.get('k')); if (!k) return J({ error: 'bad key' }, 400);
  const o = await env.SAVES.get('saves/' + k); if (!o) return J({ error: 'not found' }, 404);
  return new Response(o.body, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(o.size) } });
}
async function ps4Gm(env, hb, f) {   /* staff (control centre): ps4list · ps4map (id, room or '' to clear) · ps4discs (json list) · ps4names (id, name; '-' hides) */
  const act = f.action;
  if (act === 'ps4map') {
    const id = ps4Id(f.id), room = String(f.room || '').toLowerCase();
    if (id.length < 16) return { error: 'Which PS4?' };
    if (room && !PS4_TIER[room]) return { error: 'Pick a room.' };
    const map = (await hb.kvGet('ps4map')) || {};
    for (const k in map) if (room && map[k] === room && k !== id) delete map[k];   /* one PS4 per room */
    if (room) map[id] = room; else delete map[id];
    await hb.kvSet('ps4map', map); return { ok: true, map };
  }
  if (act === 'ps4clean') {
    const id = ps4Id(f.id), room = ((await hb.kvGet('ps4map')) || {})[id], now = Date.now();
    if (!room) return { error: 'Link this PS4 to a room first.' };
    const poll = (await hb.kvGet('ps4poll:' + id)) || 0;
    if (now - poll > 3 * 60e3) return { error: 'The PS4 isn’t answering (off, in rest mode, or not jailbroken yet) – switch it on and jailbreak it first.', off: true };
    const busy = await ps4Busy(env, room); if (busy) return { error: busy + ' – try after that.', busy: true };
    const c = { cid: 'c' + now.toString(36), do: 'clean', at: now, by: String(f.by || 'control centre').slice(0, 40), state: 'sent' };
    await hb.kvSet('ps4cmd:' + id, c); return { ok: true, cmd: c };
  }
  if (act === 'ps4look') {   /* read-only folder listing from the PS4 (helper 1.0.5+): what the Capture Gallery keeps, etc. */
    const id = ps4Id(f.id), now = Date.now();
    if (now - ((await hb.kvGet('ps4poll:' + id)) || 0) > 3 * 60e3) return { error: 'The PS4 isn’t answering.', off: true };
    const paths = String(f.paths || '').replace(/[^\w./|;-]/g, '').slice(0, 300);   /* "/dir|depth;/dir2|depth" (helper 1.0.6+) */
    const c = { cid: 'l' + now.toString(36), do: 'look', p: paths, at: now, by: String(f.by || 'staff').slice(0, 40), state: 'sent' };
    await hb.kvSet('ps4cmd:' + id, c); return { ok: true, cmd: c };
  }
  if (act === 'ps4saves') {   /* staff: what's in the game-save storage (prefix = console/user/title/...) – sizes only */
    if (!env.SAVES) return { error: 'no storage' };
    const pre = 'saves/' + String(f.p || '').replace(/[^\w./@~-]/g, '').replace(/\.\./g, ''), out = []; let cur, tot = 0;
    for (let i = 0; i < 10; i++) { const L = await env.SAVES.list({ prefix: pre, cursor: cur, limit: 1000 }); for (const o of L.objects) { tot += o.size; if (out.length < 300) out.push([o.key.slice(6), o.size]); } if (!L.truncated) break; cur = L.cursor; }
    const man = String(f.m || '') ? await env.SAVES.get('saves/' + String(f.m).replace(/\.\./g, '')) : null;
    return { ok: true, n: out.length, bytes: tot, list: out, manifest: man ? (await man.text()).slice(0, 8000) : undefined };
  }
  if (act === 'ps4rel') return { ok: true, rel: await ps4Latest(env, true), err: await hb.kvGet('ps4relErr') };   /* staff: which helper version is out (fresh look) */
  if (act === 'ps4prof') {   /* profile write test (helper 1.1.0+, owner 13 Nov: spare profiles only): op name|acct|unacct, u = user id hex */
    const id = ps4Id(f.id), room = ((await hb.kvGet('ps4map')) || {})[id], now = Date.now(), op = String(f.op || '');
    if (!/^(name|acct|unacct|logout|login)$/.test(op) || !/^[0-9a-f]{8}$/.test(String(f.u || ''))) return { error: 'bad op or user id' };   /* logout/login: helper 1.1.1+ */
    const pv = op === 'name' ? String(f.v || '').replace(/[^\w .-]/g, '').slice(0, 16) : op === 'acct' ? String(f.v || '').toLowerCase() : '';
    if ((op === 'name' && !pv) || (op === 'acct' && !/^[0-9a-f]{16}$/.test(pv))) return { error: 'bad value' };
    if (!room) return { error: 'Link this PS4 to a room first.' };
    if (now - ((await hb.kvGet('ps4poll:' + id)) || 0) > 3 * 60e3) return { error: 'The PS4 isn’t answering.', off: true };
    const busy = await ps4Busy(env, room, 10); if (busy) return { error: busy + ' – try after that.', busy: true };
    const c = { cid: 'p' + now.toString(36), do: 'prof', op, u: String(f.u), pv, at: now, by: String(f.by || 'staff').slice(0, 40), state: 'sent' };
    await hb.kvSet('ps4cmd:' + id, c); return { ok: true, cmd: c };
  }
  if (act === 'ps4lookres') return { ok: true, look: await hb.kvGet('ps4look:' + ps4Id(f.id)) };
  if (act === 'ps4update') {
    const id = ps4Id(f.id), room = ((await hb.kvGet('ps4map')) || {})[id], now = Date.now(), rep = await hb.kvGet('ps4:' + id);
    if (!room || !rep) return { error: 'Link this PS4 to a room first.' };
    if (now - ((await hb.kvGet('ps4poll:' + id)) || 0) > 3 * 60e3) return { error: 'The PS4 isn’t answering (off, in rest mode, or not jailbroken yet) – switch it on and jailbreak it first.', off: true };
    if (!rep.boot) return { error: 'This PS4 has no Round2 starter yet – install round2-boot.elf once (FTP + AutoRun), then it updates itself.' };
    if (ps4Newer(PS4_SELFUP, rep.v)) return { error: 'Helper ' + rep.v + ' can’t update itself safely – put round2d.elf ' + PS4_SELFUP + '+ and the new round2-boot.elf on it once by FTP.' };
    const rel = await ps4Latest(env, true); if (!rel) return { error: 'No PS4 helper release found on GitHub.' };
    if (!ps4Newer(rel.v, rep.v)) return { error: 'Already on the newest version (' + rep.v + ').' };
    const busy = await ps4Busy(env, room, 10); if (busy) return { error: busy + ' – try after that.', busy: true };
    const c = { cid: 'u' + now.toString(36), do: 'update', v: rel.v, sha: rel.sha, size: rel.size, from: rep.v, at: now, by: String(f.by || 'control centre').slice(0, 40), state: 'sent' };
    await hb.kvSet('ps4cmd:' + id, c); return { ok: true, cmd: c };
  }
  if (act === 'ps4discs') {
    let l; try { l = JSON.parse(f.list || '[]'); } catch (e) { return { error: 'Bad list.' }; }
    if (!Array.isArray(l)) return { error: 'Bad list.' };
    l = l.filter((d) => d && d.t).slice(0, 100).map((d) => ({ t: String(d.t).slice(0, 80), p: String(d.p || '').slice(0, 10), tiers: String(d.tiers || 'ndv').replace(/[^ndv]/g, '') || 'ndv' }));
    await hb.kvSet('ps4discs', l); return { ok: true, discs: l };
  }
  if (act === 'ps4names') {
    const id = String(f.id || '').toUpperCase(); if (!/^CUSA\d{5}$/.test(id)) return { error: 'Which game?' };
    const n = (await hb.kvGet('ps4names')) || {}, t = String(f.name || '').trim().slice(0, 80);
    if (t) n[id] = t; else delete n[id];
    await hb.kvSet('ps4names', n); return { ok: true, names: n };
  }
  /* ps4list */
  const ids = (await hb.kvGet('ps4ids')) || [], now = Date.now(), list = [];
  const map = (await hb.kvGet('ps4map')) || {};
  for (const id of ids) { const r = await hb.kvGet('ps4:' + id); if (r) list.push(Object.assign({}, r, { room: map[id] || null, poll: (await hb.kvGet('ps4poll:' + id)) || 0, cmd: (await hb.kvGet('ps4cmd:' + id)) || null, runName: r.running ? (((r.games || []).find((g) => g && g.id === r.running) || {}).t || '') : '', games: undefined, nGames: (r.games || []).length, ago: Math.round((now - r.t) / 60e3) })); }
  const night = sgDay(now - SHADOW_TILL * 60e3);
  const rel = await ps4Latest(env).catch(() => null);
  return { ok: true, now, list, latest: rel ? rel.v : null, selfUp: PS4_SELFUP, auto: (await hb.kvGet('ps4auto')) !== false, map: (await hb.kvGet('ps4map')) || {}, played: (await hb.kvGet('ps4play:' + night)) || {}, discs: (await hb.kvGet('ps4discs')) || [], names: (await hb.kvGet('ps4names')) || {} };
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
  if (hb.pw && hb.pw !== 'Active') return { error: 'The TV is asleep (screen off, Quick Start+) – switch it on first.', off: true, asleep: true };   /* owner, 3 Nov */
  if (hb.ru === false) return { error: 'Locked on the TV (Staff tools › Updates from the control centre: not allowed).', locked: true };
  const S = await roomBusy(env, unit, 10);   /* the room's own guests only (13 Nov) – not the twin's SYSTEM BLOCK */
  if (S) return { error: 'has a session ' + (S.s > now ? 'starting at ' : 'until ') + clock12(S.s > now ? S.s : S.guestEnd) + ' – try after that.', busy: true };
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
    const base = envFor(env0, 'live'), env = Object.assign(Object.create(base), base, { __tick: new Map() }), hb = book(env); sbWho = 'cron';
    const mm = new Date(ev.scheduledTime || Date.now()).getUTCMinutes(), ten = mm % 10 < 5, quarter = mm % 15 < 5, jobs = [];
    const go = (p) => { const q = p.catch(() => null); jobs.push(q); ctx.waitUntil(q); };
    const net0 = NET.n, by0 = Object.assign({}, NET.by), fail0 = NET.fails.length, t0 = Date.now();
    if (env.TV_KEY) go(Promise.all(['vale', 'kaeden', 'scarlett', 'bella', 'kai', 'atlas', 'max'].map((r) => fetch(FB_BASE + env.TV_KEY + '/' + r + '/msgAck.json').then((x) => x.json()).then((k) => hb.ackNote(r, k)).catch(() => null))));   /* every OK, kept per message */
    go((async () => { const prev = await hb.kvGet('cronLast'); await hb.kvSet('cronPrev', prev || 0); await hb.kvSet('cronLast', Date.now()); })());
    /* the reminder only needs the 10-min ticks plus :15 and :45 (bookings start on the quarter hour) */
    /* 14 Nov: if that read fails (SimplyBook down, or the run out of outside requests) the next 5-minute tick tries once more –
       55 min before is still inside the window, and a reminder is only ever sent once (soonMark) */
    if (ten || quarter) go(soonRun(env));
    else go((async () => { if (await hb.kvGet('soonAgain')) { await hb.kvSet('soonAgain', 0); await soonRun(env); } })());
    go(paidSweep(env).catch(() => null));
    /* paid moves that never ran (HitPay's message missed and the guest closed the page): finish them, or alert staff */
    go((async () => { for (const m of await hb.mvRecent(Date.now() - 48 * 3600e3)) if (m.status === 'pending' && Date.now() - m.t > 60e3) {
      const r = await mvComplete(env, m.ref, 'sweep').catch((e) => ({ error: String(e.message || e) }));
      { const m1 = await hb.kvGet('mv:' + m.ref), over = m1 && m1.guest && m1.status === 'pending' && Date.now() > (m1.hold ? m1.hold.exp : m1.t + 30 * 60e3);
        if (over && !(await mvPayStatus(env, m1).catch(() => ({ paid: true }))).paid) { await mvHoldRelease(env, m1, 'expired').catch(() => null); continue; } }   /* unpaid and its 10 minutes are over: closed, slot free */
      /* paid but still not moved after 15 min (any reason) → a Round2 alert, once */
      const m2 = await hb.kvGet('mv:' + m.ref);
      if (m2 && m2.status === 'pending' && Date.now() - m.t > 15 * 60e3 && (await mvPayStatus(env, m2).catch(() => ({}))).paid && !(await hb.kvGet('mvstuck:' + m.ref))) {
        await hb.kvSet('mvstuck:' + m.ref, 1);
        await humanAlert(env, 'move-' + m.ref, 'Paid move not done yet', `${m.from.name || 'Guest'} paid $${(+m.total).toFixed(2)} to move ${m.from.room} ${m.from.date} ${m.from.time} → ${m.to.room} ${m.to.date} ${m.to.time}, still not moved after 15 min (${(r && (r.error || (r.busy ? 'busy' : ''))) || 'no answer'}). Bookings › Rescheduling, or ask Claude (mvfinish ${m.ref}).`).catch(() => null);
      }
    } })());
    go(book(env).pushRetryRun().catch(() => pushRetry(env)).then(() => pushDiag(env)).catch(() => null));   /* in the store: its own allowance of outside requests */
    go(diagReq(env).catch(() => null));   /* staff questions left in KV (diag:req → diag:res) */   /* resend alerts a phone hasn't shown; delivery report copy (KV diag:push) */   /* paid at HitPay but not booked? book it (every 5 min) */
    /* a SimplyBook change a few minutes ago: Auto wrap-up looks again on the next 5-min tick (owner, 3 Nov: a quick fix was
       only picked up after a refresh); the 10-min ticks run it anyway */
    go((async () => { const na = await hb.kvGet('noiseAgain'); if (na && na.at && Date.now() >= na.at) { await hb.kvSet('noiseAgain', null); await noiseSync(env, na.days || [], 'recheck'); } })().catch(() => null));
    go((async () => { const ag = await hb.kvGet('autoAgain'); if (ag && Date.now() >= ag) { await hb.kvSet('autoAgain', 0); if (!ten) await autoRun(env, 'recheck'); } })());
    if (ten) {
      go(autoRun(env, 'cron')); go(msgOrphans(env, 'cron')); go(waitWarn(env)); go(keyDaily(env)); go(holdSweep(env));
      /* 14 Nov: the heavy sweeps are kept OFF minute 0 and 30 – that is when most 1-hour reminders go (sessions start on the
         hour), and one run may make only 50 outside requests. After-midnight notes: :10 and :40; the week-ahead noise sweep: :40
         (was minute 0); tonight + tomorrow's noise check stays on every 10-minute tick. */
      if ((mm >= 10 && mm < 20) || (mm >= 40 && mm < 50)) { const t = sgDay(Date.now() - SHADOW_TILL * 60e3); go(shadowSync(env, [t, addDays(t, 1)])); }
      { const t = sgDay(Date.now() - SHADOW_TILL * 60e3); go(noiseSync(env, mm >= 40 && mm < 50 ? Array.from({ length: 7 }, (_, i) => addDays(t, i)) : [t, addDays(t, 1)], 'cron')); }   /* noise rule: tonight + tomorrow, hourly the week ahead */
      /* ...and further ahead, one day every half hour, 8–91 days out (owner, 10 Nov: Anisah's 6 pax on 11 Dec hadn't blocked
         Bella – bookings made before the rule started, or a change SimplyBook didn't tell us about, were only caught a week
         before). The whole 12 weeks are gone through every ~42 hours, about one SimplyBook day per half hour. */
      if ((mm >= 20 && mm < 30) || mm >= 50) { const t = sgDay(Date.now() - SHADOW_TILL * 60e3); go(noiseSync(env, [addDays(t, 7 + Math.floor(Date.now() / 1800e3) % 84)], 'cron far')); }
    }
    ctx.waitUntil(Promise.all(jobs).then(() => sbFlush(env)).catch(() => null));
    /* how many outside requests this run made (see NET): the last run, the biggest of the last 24 h, and any that were refused */
    ctx.waitUntil(Promise.all(jobs).then(async () => {
      const by = {}; for (const h in NET.by) { const d = NET.by[h] - (by0[h] || 0); if (d > 0) by[h] = d; }
      const run = { t: t0, mm, n: NET.n - net0, by, ms: Date.now() - t0 }, fails = NET.fails.splice(0, NET.fails.length);
      const c = (await hb.kvGet('cronNet')) || {};
      const max = c.max && c.max.t > t0 - 86400e3 && c.max.n >= run.n ? c.max : run;
      const fl = (c.fails || []).concat(fails).filter((x) => x.t > t0 - 3 * 86400e3).slice(-60);
      await hb.kvSet('cronNet', { last: run, max, fails: fl, limit: 50 });
    }).catch(() => null));
  },
  async fetch(req, env0, ctx) { try { return await HANDLER.fetch0(req, env0, ctx); } finally { ctx.waitUntil(sbFlush(rawEnv(env0)).catch(() => null)); } },
  async fetch0(req, env0, ctx) {
    const u = new URL(req.url); sbWho = u.pathname.slice(0, 24);
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
      if (u.pathname === '/release' && req.method === 'POST') { const { ref, why } = await req.json(); const r = await safeRelease(env, String(ref || '').replace(/[^A-Z0-9]/g, ''), ['payback', 'cancel', 'timeout'].includes(why) ? why : 'left'); return J(r); }
      /* guest rescheduling (owner, 12 Nov): the page (round2sg-home move/index.html), its rules (the engine's own gLogic) and API */
      if (u.pathname === '/move/logic.js') return new Response('/* Round2 rescheduling rules – the same code the engine charges with */\n' + gLogic.toString(), { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
      if (u.pathname === '/move/api') { const f = req.method === 'POST' ? await req.json().catch(() => ({})) : Object.fromEntries(u.searchParams); try { return J(await gApi(env, f, u.origin)); } catch (e) { return J({ error: 'Something went wrong – try again, or WhatsApp us.', detail: String(e.message || e).slice(0, 160) }); } }
      if (u.pathname === '/move' || u.pathname === '/move/') {
        const c = caches.default, key = new Request('https://r2-cache/move-page'), hit = await c.match(key);
        if (hit) return new Response(hit.body, hit);
        const r = await fetch('https://raw.githubusercontent.com/donttelldadyet-prog/round2sg-home/main/move/index.html', { cf: { cacheTtl: 60 } });
        if (!r.ok) return H(PAGE('<h1>Reschedule</h1><p>This page didn’t load – try again in a minute, or <a href="https://wa.me/6591625767">WhatsApp us</a>.</p>'));
        const out = new Response(await r.text(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' } });
        ctx.waitUntil(c.put(key, out.clone()));
        return out;
      }
      if (u.pathname === '/move/hitpay' && req.method === 'POST') {   /* a staff move paid by PayNow QR or link */
        const raw = await req.text(), sig = req.headers.get('Hitpay-Signature') || '';
        if ((await hmacHex(envFor(env, 'live').HITPAY_SALT, raw)) !== sig && (await hmacHex(envFor(env, 'test').HITPAY_SALT, raw)) !== sig) return J({ error: 'bad signature' }, 401);
        const p = JSON.parse(raw), ref = String(p.reference_number || '').replace(/[QLG]$/, '');
        if (p.status === 'completed' && /^MV[A-Z0-9]{8}$/.test(ref)) return J(await mvComplete(env, ref, 'webhook'));
        return J({ ignored: p.status });
      }
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
        if (h.status !== 'paid' && h.status !== 'booking') {
          const pp = await hpPaid(env, h);
          if (!pp.paid) {
            /* PayNow can take a while to confirm at HitPay: keep checking for ~2 minutes before giving the time up */
            const n = Math.max(0, Math.min(99, +u.searchParams.get('n') || 0));
            if (h.status === 'pending' && n < 40) return H(PAGE(`<h1>Checking your payment…</h1><p>PayNow can take a few seconds to confirm. This page checks again by itself – please keep it open and <b>don’t pay again</b>.</p><meta http-equiv="refresh" content="3;url=/done?ref=${ref}&n=${n + 1}">`));
            const r = h.status === 'pending' ? await safeRelease(env, ref, 'payback') : h.status === 'released' && pp.err && !pp.none ? { unknown: true } : { released: true };
            if (r.unknown && pp.inflight) return H(PAGE(`<h1>Your payment is going through…</h1><p>The bank is still confirming it. This page checks again by itself – please keep it open and <b>don’t pay again</b>. Ref <b>${esc(ref)}</b>.</p><meta http-equiv="refresh" content="5;url=/done?ref=${ref}&n=${n + 1}">`));
            if (r.unknown) return H(PAGE(`<h1>Checking your payment…</h1><p>We can’t reach the payment service right now. If you paid, you’re covered – we’ll confirm by email or WhatsApp. Please <b>don’t pay again</b>. Ref <b>${esc(ref)}</b>.</p><meta http-equiv="refresh" content="10;url=/done?ref=${ref}&n=${n + 1}">`));
            if (!r.paid && r.released) return Response.redirect((h.data.ret || u.origin + '/test') + '?released=1', 302);   /* paid/booking in the meantime → on to the booking below (review 5 Nov) */
          }
        }
        const f = await finalize(env, ref, 'redirect');
        const q = f.h.q;
        /* one booking page everywhere (owner, 12 Nov): a real booking goes to the 4-button page; test runs that never reach SimplyBook keep this one */
        if (f.ok && f.h.done && (f.h.done.bookingId || f.h.done.dryRun) && !u.searchParams.has('classic')) return Response.redirect(u.origin + '/move?ref=' + ref + (Date.now() - (+f.h.done.at || 0) < 30 * 60e3 && !(f.h.moves || []).length ? '&new=1' : ''), 302);
        if (f.ok) return H(bookedPage(env, ref, f.h, u.origin));
        return H(PAGE(f.ok ? `<h1>You're booked 🎉</h1><p><b>${esc(q.room)}</b>, ${esc(q.date)}, ${esc(q.time)}–${esc(q.end)} (${q.hours}h) · $${q.total.toFixed(2)} paid.</p><p>Ref ${esc(ref)}${f.h.done && f.h.done.dryRun ? ' · <span class="tag">TEST – not put in calendar</span>' : ''}</p><p>A confirmation email is on its way.</p>${f.h.done && f.h.done.tv && f.h.done.tv.code ? `<p>Your message pops up on the TV ${f.h.msg.after ? f.h.msg.after + ' minutes after you start' : 'when you start'}. Want to change it? <a style="color:#F2C21B" href="https://cue.round2.sg/${esc(f.h.done.tv.code)}">cue.round2.sg/${esc(f.h.done.tv.code)}</a></p>` : ''}${f.h.ret ? `<a class="btn" href="${esc(f.h.ret)}">Back to Round2</a>` : ''}<script>try{sessionStorage.clear()}catch(e){}</script>`
          : f.pending ? `<h1>Confirming your booking…</h1><p>Your payment came through. We’re putting the booking into our calendar – this page refreshes by itself.</p><meta http-equiv="refresh" content="4">`
          : `<h1>Payment received</h1><p>We couldn’t confirm your booking automatically, so our team has been alerted and will WhatsApp you on <b>${esc(f.h.phone || '')}</b> shortly to sort it out.</p><p>Please keep this reference: <b>${esc(ref)}</b>. Questions? <a href="https://wa.me/6591625767">WhatsApp us</a>.</p>`));
      }
      /* the receipt line in SimplyBook's confirmation email: /r/<booking code> → that booking's receipt */
      if (u.pathname.startsWith('/r/')) {
        const code = u.pathname.slice(3).replace(/[^a-z0-9]/gi, '').slice(0, 20), r = code ? await book(env).byCode(code) : null;
        if (r) return Response.redirect(u.origin + '/receipt?ref=' + r.ref, 302);
        return H(PAGE(`<h1>Receipt</h1><p>This booking was paid with us directly, so its receipt is with our team. Message us on WhatsApp and we’ll send it.</p><a class="btn" href="https://wa.me/6591625767?text=${encodeURIComponent('Hi Round2, could I have the receipt for my booking ' + code + '?')}" target="_top">WhatsApp us</a>`));
      }
      /* SimplyBook's confirmation email links here with its booking code → that booking's page (see it, add/change the TV message) */
      if (u.pathname.startsWith('/b/')) {
        const code = u.pathname.slice(3).replace(/[^a-z0-9]/gi, '').slice(0, 20), r = code ? await book(env).byCode(code) : null;
        if (r) return Response.redirect(u.origin + '/move?ref=' + r.ref, 302);   /* the 4-button booking page (owner, 12 Nov) */
        return H(PAGE(`<h1>Your booking</h1><p>We can’t show this booking here. For anything about it – its details, a change, or a message on the big screen in your Round2 room – message us on WhatsApp and we’ll sort it out.</p><a class="btn" href="https://wa.me/6591625767?text=${encodeURIComponent('Hi Round2, about my booking ' + code)}">WhatsApp us</a>`));
      }
      /* "Find my booking": email + mobile → the confirmation page again (to see it or add/change the TV message) */
      if (u.pathname === '/find') {
        const form = (err, em = '') => H(PAGE(`<h1>View your booking</h1><p>Enter the email and mobile number you booked with to see your booking and add or change your TV message.</p>
<form method="post"><label>Email</label><input name="email" type="email" required value="${esc(em)}"><label>Mobile</label><input name="phone" type="tel" required placeholder="8123 4567"><button>Show my booking</button></form>${err ? `<p class="err">${err}</p>` : ''}
<p style="font-size:14px;margin-top:18px">Booked with us on WhatsApp? Open the booking link we sent you – or enter the email and mobile you gave us. No link, or a late-night session? Message us on <a href="https://wa.me/6591625767">WhatsApp</a>.</p>`));
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
        if (list.length === 1) return Response.redirect(u.origin + '/move?ref=' + list[0].ref, 303);
        const rows = [];
        for (const r of list) { const h = await hb.get(r.ref), q = h.data.q; rows.push(`<a class="btn ghost" style="margin-top:10px" href="/move?ref=${r.ref}">${esc(q.unit === 11 ? 'Maximillion' : q.room)} · ${esc(q.date)} · ${esc(q.time)}</a>`); }
        return H(PAGE(`<h1>Your bookings</h1><p>Pick one:</p>${rows.join('')}`));
      }
      /* "Add a message for the TV" on the confirmation page: make the guest-message link only when it's wanted */
      /* the payment receipt (owner, 11 Nov: guests got the booking email but no receipt) – from HitPay's own record */
      if (u.pathname === '/receipt') {
        const ref = (u.searchParams.get('ref') || '').replace(/[^A-Z0-9]/g, ''), h = ref ? await book(env).get(ref) : null;
        if (!h || h.status !== 'paid' || !h.pr) return H(PAGE('<h1>Receipt not found</h1><p>WhatsApp us on +65 9162 5767 and we’ll send it.</p>'));
        return H(await receiptPage(env, ref, h));
      }
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
      if (u.pathname === '/ps4/in' && req.method === 'POST') return await ps4In(env, req);   /* room PS4 check-ins (13 Nov) */
      if (u.pathname === '/ps4/games') return await ps4Games(env);
      if (u.pathname === '/ps4/cmd' && req.method === 'POST') return await ps4Cmd(env, req);   /* helper: waiting command? (every minute) */
      if (u.pathname === '/ps4/done' && req.method === 'POST') return await ps4Done(env, req);
      if (u.pathname === '/ps4/app' && req.method === 'POST') return await ps4App(env, req);
      if (u.pathname === '/ps4/sput' && req.method === 'POST') return await ps4SPut(env, req, u);   /* helper: one piece of a save backup (1.1.4) */
      if (u.pathname === '/ps4/sget' && req.method === 'GET') return await ps4SGet(env, req, u);   /* helper: a piece back, to restore */   /* helper: download the newest version */   /* helper: command result */
      if (u.pathname === '/gm' && req.method === 'POST') return await gm(env, req);
      if (u.pathname === '/gh' && req.method === 'POST') return await ghProxy(env, req);
      if (u.pathname.startsWith('/push/')) return await pushApi(env, req, u.pathname);
      /* SimplyBook's callback (Custom features › API › callback URL) = /sb/notify/<SB_NOTIFY_KEY>. Passed on unchanged to
         Make's mirror-rooms scenario (secret MIRROR_HOOK_URL), then: cancelled → off "View your booking"; any change →
         guest messages follow at once. The key keeps strangers from triggering Make. */
      if (u.pathname.startsWith('/sb/notify/') && req.method === 'POST') {
        if (!env.SB_NOTIFY_KEY || u.pathname.slice(11) !== env.SB_NOTIFY_KEY) return J({ error: 'no' }, 404);
        const raw = await req.text(), ct = req.headers.get('content-type') || 'application/json';
        let j = {}; try { j = JSON.parse(raw); } catch (e) { j = Object.fromEntries(new URLSearchParams(raw)); }
        const bid = String(j.booking_id || '').replace(/\D/g, ''), type = String(j.notification_type || '');
        const mirE = (await book(env).getMode()).mirror === 'engine';   /* Vale ↔ Atlas: the engine (owner, 11 Nov) or still Make */
        if (!mirE && env.MIRROR_HOOK_URL) ctx.waitUntil(fetch(env.MIRROR_HOOK_URL, { method: 'POST', headers: { 'content-type': ct }, body: raw }).catch(() => null));
        if (mirE && bid) ctx.waitUntil(mirrorOnSb(env, bid, type).catch((e) => console.log('[mirror] ' + String(e.message || e).slice(0, 160))));
        ctx.waitUntil(book(env).kvSet('gapc', {}).catch(() => null)); ctx.waitUntil(book(env).kvSet('gcal', null).catch(() => null));   /* the booking board asks SimplyBook afresh */
        if (bid) ctx.waitUntil(book(env).onSb(bid, type).catch(() => null));
        if (bid) ctx.waitUntil(bookingPush(env, bid, type).catch(() => null));   /* staff phones: New booking / changed / cancelled */
        if (bid) ctx.waitUntil(paidLengthCheck(env, bid, type).catch(() => null));   /* an online booking cut shorter than paid */
        if (bid) ctx.waitUntil(noiseOnSb(env, bid, type).catch((e) => console.log('[noise] ' + String(e.message || e).slice(0, 160))));   /* noise rule: Max/Atlas 4+ → Bella, Bella 4 → Atlas */
        ctx.waitUntil(book(env).kvSet('autoAgain', Date.now() + 2 * 60e3).catch(() => null));   /* look again in ~2–5 min (a quick second edit) */
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
