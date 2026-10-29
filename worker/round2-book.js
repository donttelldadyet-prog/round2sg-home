/* Round2 booking Worker (Cloudflare). Test build – see docs/own-booking-plan.md.
   Secrets: HITPAY_KEY, HITPAY_SALT, HITPAY_API, SB_COMPANY, SB_USER, SB_PASS.  Vars: SB_PUBLIC_KEY, DRY_RUN ("1" = don't create SimplyBook bookings).
   KV binding: HOLDS.
   Routes: GET /ph, POST /quote, POST /checkout, POST /hitpay (webhook), GET /done?ref=, GET /test (test form), GET /selftest */

const SB = 'https://user-api.simplybook.asia';
const ICS = 'https://calendar.google.com/calendar/ical/en.singapore%23holiday%40group.v.calendar.google.com/public/basic.ics';
const EXTRA_PH = [];                       // in-lieu days Google hasn't listed yet, e.g. '2027-02-08'
const ROOMS = { 5: ['Vale', 'netflix'], 7: ['Kaeden', 'netflix'], 8: ['Scarlett', 'netflix'], 9: ['Kai', 'deluxe'], 10: ['Bella', 'deluxe'], 12: ['Atlas', 'deluxe'], 11: ['Max', 'vip'] };
const SVC = { netflix: { off: 28, peak: 29, eb: 32 }, deluxe: { off: 35, peak: 37, eb: 33 }, vip: { off: 36, peak: 38, eb: 34 } };
const MIRROR = { 5: 12, 12: 5 };          // Vale sits under Atlas
/* ===== PRICES – edit here. base = 3 hours; ext = extra price for +1h / +2h / +3h. =====
   Early Bird = 11:00 start only. Its extensions default to the day's rate ÷ 3 per hour (no discount). */
const PRICES = {
  netflix: { off: { base: 49, ext: [16.30, 28.58, 39.20] }, peak: { base: 69, ext: [23, 40.25, 55.20] }, eb: { base: 35, ext: { off: [16.33, 32.67, 49], peak: [23, 46, 69] } } },
  deluxe:  { off: { base: 79, ext: [26.30, 39.50, 47.40] }, peak: { base: 99, ext: [33, 49.50, 59.40] }, eb: { base: 35, ext: { off: [26.33, 52.67, 79], peak: [33, 66, 99] } } },
  vip:     { off: { base: 109, ext: [36.30, 54.50, 65.40] }, peak: { base: 129, ext: [43, 64.50, 77.40] }, eb: { base: 35, ext: { off: [36.33, 72.67, 109], peak: [43, 86, 129] } } },
};
const PAX_FIELD = 'fb11a6d3f6a3baaf248df77785de850e';
const BUF = 15, HOLD_SEC = 900, EB_START = 660;

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

/* ---------- is the slot free? (SimplyBook gaps + our own unpaid holds) ---------- */
async function isFree(env, q, ignoreRef) {
  const p = await pub(env);
  const r = await p('getAvailableTimeIntervals', [q.date, q.date, q.checkEventId, q.unit, 1]);
  const gaps = ((r && r[q.date] && r[q.date][q.unit]) || []).map((g) => [mins(g.from), mins(g.to) || 1440]);
  const s = mins(q.time), e = s + q.hours * 60;
  if (!gaps.some(([f, t]) => s >= f && e + BUF <= t)) return false;
  for (const u of [q.unit, MIRROR[q.unit]].filter(Boolean)) {
    const l = await env.HOLDS.list({ prefix: `hold:${q.date}:${u}:` });
    for (const k of l.keys) {
      const ref = k.name.split(':').pop(); if (ref === ignoreRef) continue;
      const h = k.metadata || {}; if (s < h.e + BUF && h.s < e + BUF) return false;
    }
  }
  return true;
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
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* ---------- checkout: hold the slot, make the HitPay payment ---------- */
async function checkout(env, b, origin) {
  const q = await quote(env, b);
  const name = String(b.name || '').trim().slice(0, 80), email = String(b.email || '').trim().slice(0, 120), phone = String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
  const pax = Math.max(1, Math.min(q.type === 'vip' ? 6 : 4, +b.pax || 1));
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.length < 8) throw new Error('Please fill in name, email and phone');
  if (!(await isFree(env, q))) throw new Error('Sorry, that time was just taken – please pick another');
  const ref = 'R2B' + crypto.randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase();
  const when = new Date(q.date + 'T00:00:00Z').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const pr = await hitpay(env, 'POST', '/payment-requests', {
    amount: q.total.toFixed(2), currency: 'SGD', name, email, phone,
    purpose: `Round2 ${q.room} · ${when} ${q.time}–${q.end} (${q.hours}h)`,
    reference_number: ref, redirect_url: `${origin}/done?ref=${ref}`,
  });
  const hold = { ref, q, name, email, phone, pax, pr: pr.id, at: Date.now() };
  await env.HOLDS.put(`hold:${q.date}:${q.unit}:${ref}`, '1', { expirationTtl: HOLD_SEC, metadata: { s: mins(q.time), e: mins(q.time) + q.hours * 60 } });
  await env.HOLDS.put(`ref:${ref}`, JSON.stringify(hold), { expirationTtl: 86400 * 30 });
  return { ref, url: pr.url, total: q.total };
}

/* ---------- after payment: put the booking into SimplyBook (once) ---------- */
async function finalize(env, ref, source) {
  const raw = await env.HOLDS.get(`ref:${ref}`); if (!raw) return { ok: false, err: 'unknown ref' };
  const h = JSON.parse(raw);
  if (h.done) return { ok: true, already: true, h };
  const q = h.q;
  let result;
  if (env.DRY_RUN === '1') {
    result = { dryRun: true, would: ['book', q.eventId, q.unit, 'client(' + h.email + ')', q.date, q.time + ':00', q.endDate, q.end + ':00', 0, { [PAX_FIELD]: String(h.pax) }] };
  } else {
    if (!(await isFree(env, q, ref))) { h.problem = 'paid but slot taken – refund needed'; await env.HOLDS.put(`ref:${ref}`, JSON.stringify(h)); return { ok: false, err: h.problem, h }; }
    const a = await admin(env);
    let cid;
    const found = await a('getClientList', [h.email, 1]).catch(() => null);
    if (found && Object.keys(found).length) cid = Object.values(found)[0].id;
    else cid = await a('addClient', [{ name: h.name, email: h.email, phone: h.phone }]);
    const bk = await a('book', [q.eventId, q.unit, cid, q.date, q.time + ':00', q.endDate, q.end + ':00', 0, { [PAX_FIELD]: String(h.pax) }]);
    result = { bookingId: bk && bk.bookings && bk.bookings[0] && bk.bookings[0].id, code: bk && bk.bookings && bk.bookings[0] && bk.bookings[0].code };
  }
  h.done = { at: Date.now(), source, ...result };
  await env.HOLDS.put(`ref:${ref}`, JSON.stringify(h), { expirationTtl: 86400 * 90 });
  await env.HOLDS.delete(`hold:${q.date}:${q.unit}:${ref}`);
  return { ok: true, h };
}

/* ---------- pages ---------- */
const PAGE = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Round2 · Book (test)</title>
<style>body{margin:0;background:#1f1e1e;color:#f4f1fb;font:16px/1.5 system-ui,sans-serif}main{max-width:480px;margin:0 auto;padding:20px 16px}h1{font-size:20px}label{display:block;margin:12px 0 4px;color:#bababa;font-size:14px}
select,input,button{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #444;background:#2a2929;color:#f4f1fb;font:inherit}button{background:#F2C21B;color:#111;border:0;font-weight:700;margin-top:18px}
.q{margin-top:14px;padding:12px;border-radius:10px;background:#2a2929;color:#F2C21B}.err{color:#ff8080}.tag{display:inline-block;background:#F2C21B;color:#111;border-radius:6px;padding:0 6px;font-size:12px;margin-left:6px}</style></head><body><main>${body}</main></body></html>`;

function testForm() {
  const opts = Object.entries(ROOMS).map(([u, [n, t]]) => `<option value="${u}">${n} (${t})</option>`).join('');
  let times = ''; for (let m = 660; m <= 1395; m += 15) times += `<option>${hhmm(m)}</option>`;
  return PAGE(`<h1>Round2 booking <span class="tag">TEST · sandbox</span></h1>
<label>Room</label><select id="unit">${opts}</select>
<label>Date</label><input id="date" type="date">
<label>Start</label><select id="time">${times}</select>
<label>Length</label><select id="hours"><option value="3">3 hours</option><option value="4">4 hours</option><option value="5">5 hours</option><option value="6">6 hours</option></select>
<div class="q" id="q">Pick a date</div>
<label>Name</label><input id="name"><label>Email</label><input id="email" type="email"><label>Mobile</label><input id="phone" type="tel"><label>Guests</label><input id="pax" type="number" min="1" max="6" value="2">
<button id="go">Pay</button><p class="err" id="err"></p>
<script>
const $=id=>document.getElementById(id);$('date').value=new Date(Date.now()+8*36e5+864e5).toISOString().slice(0,10);
const body=()=>({unit:$('unit').value,date:$('date').value,time:$('time').value,hours:$('hours').value});
async function q(){const r=await fetch('/quote',{method:'POST',body:JSON.stringify(body())});const j=await r.json();
$('q').textContent=j.error?j.error:(j.earlyBird?'Early Bird · ':'')+(j.peak?'Peak':'Off-peak')+(j.ph?' (public holiday)':'')+' · '+j.time+'–'+j.end+' · $'+j.total.toFixed(2)+' (base $'+j.base+(j.ext?' + extension $'+j.ext:'')+')'+(j.free===false?' · NOT FREE':'');}
['unit','date','time','hours'].forEach(i=>$(i).onchange=q);q();
$('go').onclick=async()=>{$('err').textContent='';$('go').disabled=true;const b={...body(),name:$('name').value,email:$('email').value,phone:$('phone').value,pax:$('pax').value};
const r=await fetch('/checkout',{method:'POST',body:JSON.stringify(b)});const j=await r.json();if(j.url)location=j.url;else{$('err').textContent=j.error;$('go').disabled=false;}};
</script>`);
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    try {
      if (req.method === 'OPTIONS') return J({});
      if (u.pathname === '/ph') return J([...(await holidays())].sort());
      if (u.pathname === '/quote' && req.method === 'POST') { const b = await req.json(); const q = await quote(env, b); q.free = await isFree(env, q); return J(q); }
      if (u.pathname === '/checkout' && req.method === 'POST') return J(await checkout(env, await req.json(), u.origin));
      if (u.pathname === '/hitpay' && req.method === 'POST') {
        const raw = await req.text(), sig = req.headers.get('Hitpay-Signature') || '';
        if ((await hmacHex(env.HITPAY_SALT, raw)) !== sig) return J({ error: 'bad signature' }, 401);
        const p = JSON.parse(raw);
        if (p.status === 'completed' && p.reference_number) return J(await finalize(env, p.reference_number, 'webhook'));
        return J({ ignored: p.status });
      }
      if (u.pathname === '/done') {
        const ref = (u.searchParams.get('ref') || '').replace(/[^A-Z0-9]/g, '');
        const raw = await env.HOLDS.get(`ref:${ref}`); if (!raw) return H(PAGE('<h1>Booking not found</h1>'));
        const h = JSON.parse(raw);
        const pr = await hitpay(env, 'GET', '/payment-requests/' + h.pr);
        if (pr.status !== 'completed') return H(PAGE(`<h1>Payment not completed</h1><p>Status: ${esc(pr.status)}. Your slot is held for 15 minutes – <a style="color:#F2C21B" href="${esc(pr.url)}">try paying again</a>.</p>`));
        const f = await finalize(env, ref, 'redirect');
        const q = f.h.q;
        return H(PAGE(f.ok ? `<h1>You're booked 🎉</h1><p><b>${esc(q.room)}</b>, ${esc(q.date)}, ${esc(q.time)}–${esc(q.end)} (${q.hours}h) · $${q.total.toFixed(2)} paid.</p><p>Ref ${esc(ref)}${f.h.done && f.h.done.dryRun ? ' · <span class="tag">TEST – not put in calendar</span>' : ''}</p><p>A confirmation email is on its way.</p>`
          : `<h1>Payment received</h1><p class="err">${esc(f.err)}</p><p>We'll WhatsApp you shortly. Ref ${esc(ref)}.</p>`));
      }
      if (u.pathname === '/test') return H(testForm());
      if (u.pathname === '/selftest') { const a = await admin(env); const units = await a('getUnitList', []); return J({ sbLogin: true, rooms: Object.values(units).map((x) => x.name), dryRun: env.DRY_RUN === '1' }); }
      return J({ ok: true, svc: 'round2-book' });
    } catch (e) { return J({ error: String(e.message || e) }, 400); }
  },
};
