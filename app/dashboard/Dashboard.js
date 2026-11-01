'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/marktplaats';

const EMPTY = {
  query: '', name: '', min_price: '', max_price: '', resale_price: '', min_profit: '', postcode: '', distance_km: '',
  require_words: '', exclude_words: '', interval_min: 1, title_only: true, skip_ads: true, include_no_price: false, email_deals: true,
};

function ago(ms, now) {
  if (!ms) return '–';
  const s = Math.round((now - ms) / 1000);
  if (s < 60) return s + 's geleden';
  if (s < 3600) return Math.floor(s / 60) + 'm geleden';
  if (s < 86400) return Math.floor(s / 3600) + 'u geleden';
  return new Date(ms).toLocaleDateString('nl-NL');
}

async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Niet ingelogd'); }
  if (!res.ok) throw new Error(data.error || 'Er ging iets mis');
  return data;
}

function beep() {
  try {
    const ctx = new AudioContext();
    [880, 1175, 1568].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.12);
    });
  } catch {}
}

export default function Dashboard({ email, intervals }) {
  const [filters, setFilters] = useState([]);
  const [max, setMax] = useState(5);
  const [hits, setHits] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [active, setActive] = useState('all');
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastHitId = useRef(null);
  const [freshIds, setFreshIds] = useState(new Set());
  const [notifOk, setNotifOk] = useState(true);

  const load = useCallback(async () => {
    const [f, h] = await Promise.all([api('/api/filters'), api('/api/hits')]);
    setFilters(f.filters);
    setMax(f.max);
    setHits(h.hits);
    const top = h.hits[0]?.id ?? 0;
    if (lastHitId.current !== null) {
      const incoming = h.hits.filter(x => x.id > lastHitId.current && x.is_new);
      if (incoming.length) {
        setFreshIds(prev => new Set([...prev, ...incoming.map(x => x.id)]));
        const deals = incoming.filter(x => x.is_deal);
        if (deals.length) beep();
        if ('Notification' in window && Notification.permission === 'granted') {
          incoming.slice(0, 3).forEach(x => {
            const n = new Notification(`${x.filter_name}: ${formatPrice(x)}`, { body: `${x.title}\n${x.city}`, tag: String(x.id) });
            n.onclick = () => { window.open(x.url, '_blank'); n.close(); };
          });
        }
      }
    }
    lastHitId.current = Math.max(lastHitId.current ?? 0, top);
  }, []);

  useEffect(() => {
    load().catch(() => {});
    const t1 = setInterval(() => load().catch(() => {}), 20000);
    const t2 = setInterval(() => setNow(Date.now()), 1000);
    setNotifOk(!('Notification' in window) || Notification.permission === 'granted');
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      if (editingId) await api(`/api/filters/${editingId}`, 'PUT', form);
      else await api('/api/filters', 'POST', form);
      setMsg(editingId ? 'Opgeslagen. De volgende scan zet een nieuwe basislijn.' : 'Filter toegevoegd! Binnen een minuut start de eerste scan; daarna zie je alleen nieuwe advertenties.');
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) { setMsg(err.message); }
  }

  function edit(f) {
    setEditingId(f.id);
    setForm(Object.fromEntries(Object.keys(EMPTY).map(k => [k, typeof EMPTY[k] === 'boolean' ? !!f[k] : (f[k] ?? '')])));
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function act(f, action) {
    if (action === 'delete' && !confirm(`Filter "${f.name}" verwijderen?`)) return;
    if (action === 'delete') await api(`/api/filters/${f.id}`, 'DELETE');
    if (action === 'toggle') await api(`/api/filters/${f.id}`, 'PATCH', { enabled: !f.enabled });
    if (action === 'mail') await api(`/api/filters/${f.id}`, 'PATCH', { email_deals: !f.email_deals });
    load();
  }

  async function clearHits() {
    if (!confirm('Alle gevonden advertenties uit je feed verwijderen?')) return;
    await api('/api/hits', 'DELETE');
    load();
  }

  async function deleteAccount() {
    if (!confirm('Je account, filters en resultaten definitief verwijderen?')) return;
    const res = await fetch('/api/account/delete', { method: 'POST' });
    window.location.href = res.redirected ? res.url : '/';
  }

  const counts = {};
  hits.forEach(h => { counts[h.filter_id] = (counts[h.filter_id] || 0) + 1; });
  let shown = active === 'all' ? hits : hits.filter(h => h.filter_id === active);
  if (onlyDeals) shown = shown.filter(h => h.is_deal);

  return (
    <div className="layout">
      <aside>
        <div className="panel">
          <div className="account-row">
            <span className="muted small">{email}</span>
            <form method="post" action="/api/auth/logout"><button className="small">Uitloggen</button></form>
          </div>
          <h2>{editingId ? 'Filter bewerken' : 'Nieuw filter'}</h2>
          <form onSubmit={submit} autoComplete="off">
            <label>Zoekterm *</label>
            <input type="text" value={form.query} onChange={set('query')} placeholder="bijv. iphone 13" required maxLength={100} />
            <label>Naam (optioneel)</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="bijv. iPhone 13 deals" maxLength={60} />
            <div className="row">
              <div><label>Min. prijs (€)</label><input type="number" min="0" value={form.min_price} onChange={set('min_price')} /></div>
              <div><label>Max. prijs (€)</label><input type="number" min="0" value={form.max_price} onChange={set('max_price')} /></div>
            </div>
            <div className="row">
              <div><label>Verkoopprijs (€)</label><input type="number" min="0" value={form.resale_price} onChange={set('resale_price')} placeholder="voor winst" /></div>
              <div><label>Min. winst (€)</label><input type="number" min="0" value={form.min_profit} onChange={set('min_profit')} placeholder="= deal" /></div>
            </div>
            <div className="row">
              <div><label>Postcode</label><input type="text" value={form.postcode} onChange={set('postcode')} placeholder="1012AB" maxLength={7} /></div>
              <div><label>Afstand (km)</label><input type="number" min="1" value={form.distance_km} onChange={set('distance_km')} /></div>
            </div>
            <label>Moet in titel staan (komma's)</label>
            <input type="text" value={form.require_words} onChange={set('require_words')} placeholder="bijv. 128gb" />
            <label>Uitsluiten (komma's)</label>
            <input type="text" value={form.exclude_words} onChange={set('exclude_words')} placeholder="hoesje, kapot, defect, gezocht" />
            <label>Scannen</label>
            <select value={form.interval_min} onChange={set('interval_min')}>
              {intervals.map(i => <option key={i} value={i}>{i === 1 ? 'Elke minuut' : `Elke ${i} minuten`}</option>)}
            </select>
            <label className="check"><input type="checkbox" checked={form.email_deals} onChange={set('email_deals')} /> Mail mij bij een deal (winst ≥ min. winst)</label>
            <label className="check"><input type="checkbox" checked={form.title_only} onChange={set('title_only')} /> Alleen in titel zoeken</label>
            <label className="check"><input type="checkbox" checked={form.skip_ads} onChange={set('skip_ads')} /> Betaalde topadvertenties overslaan</label>
            <label className="check"><input type="checkbox" checked={form.include_no_price} onChange={set('include_no_price')} /> Ook &quot;bieden&quot; / &quot;zie omschrijving&quot;</label>
            <div className="form-actions">
              <button className="primary" disabled={!editingId && filters.length >= max}>{editingId ? 'Opslaan' : 'Filter toevoegen'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); setMsg(''); }}>Annuleren</button>}
            </div>
            {!editingId && filters.length >= max && <p className="hint">Je hebt het maximum van {max} filters bereikt.</p>}
            {form.email_deals && (form.resale_price === '' || form.min_profit === '') && <p className="hint">Vul verkoopprijs en min. winst in om deal-mails te krijgen.</p>}
            {msg && <p className="hint">{msg}</p>}
          </form>

          <div className="filters">
            {filters.length === 0 && <p className="hint">Nog geen filters. Voeg er hierboven een toe.</p>}
            {filters.map(f => {
              const bits = [];
              if (f.min_price != null || f.max_price != null) bits.push(`€${f.min_price ?? 0}–${f.max_price ?? '∞'}`);
              if (f.postcode && f.distance_km) bits.push(`${f.distance_km} km van ${f.postcode}`);
              if (f.resale_price != null) bits.push(`verkoop €${f.resale_price}`);
              bits.push(f.interval_min === 1 ? 'elke min.' : `elke ${f.interval_min} min.`);
              let status;
              if (f.last_error) status = <div className="filter-status err">⚠ {f.last_error}</div>;
              else if (!f.enabled) status = <div className="filter-status">Gepauzeerd</div>;
              else if (!f.baseline_done) status = <div className="filter-status">Wacht op eerste scan…</div>;
              else status = <div className="filter-status">Laatste scan {ago(f.last_scan_at, now)}</div>;
              return (
                <div key={f.id} className={'filter' + (f.enabled ? '' : ' disabled')}>
                  <div className="filter-name">{f.name}</div>
                  <div className="filter-meta">&quot;{f.query}&quot; · {bits.join(' · ')}</div>
                  {status}
                  <div className="filter-btns">
                    <button className="small" onClick={() => act(f, 'toggle')}>{f.enabled ? 'Pauzeer' : 'Hervat'}</button>
                    <button className="small" onClick={() => act(f, 'mail')}>{f.email_deals ? '✉ Mail aan' : '✉ Mail uit'}</button>
                    <button className="small" onClick={() => edit(f)}>Bewerk</button>
                    <button className="small danger" onClick={() => act(f, 'delete')}>Verwijder</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="link-btn" onClick={deleteAccount}>Account verwijderen</button>
        </div>
      </aside>

      <main>
        <div className="toolbar">
          <button className={'chip' + (active === 'all' ? ' active' : '')} onClick={() => setActive('all')}>Alles ({hits.length})</button>
          {filters.map(f => (
            <button key={f.id} className={'chip' + (active === f.id ? ' active' : '')} onClick={() => setActive(f.id)}>{f.name} ({counts[f.id] || 0})</button>
          ))}
          <label className="check inline"><input type="checkbox" checked={onlyDeals} onChange={e => setOnlyDeals(e.target.checked)} /> Alleen deals</label>
          <span style={{ flex: 1 }} />
          {!notifOk && <button className="small" onClick={async () => { await Notification.requestPermission(); setNotifOk(Notification.permission === 'granted'); }}>Browsermeldingen aan</button>}
          <button className="small danger" onClick={clearHits}>Feed leegmaken</button>
        </div>
        <div className="feed">
          {shown.length === 0 && (
            <div className="empty">{filters.length ? 'Nog niets gevonden. Nieuwe advertenties verschijnen hier zodra ze geplaatst worden.' : 'Maak links een filter aan om te beginnen.'}</div>
          )}
          {shown.map(h => (
            <a key={h.id} className={'card' + (freshIds.has(h.id) ? ' fresh' : '') + (h.is_new ? '' : ' old') + (h.is_deal ? ' deal' : '')} href={h.url} target="_blank" rel="noopener noreferrer">
              <div className="thumb" style={{ backgroundImage: h.image ? `url("${h.image}")` : undefined }}>
                {h.is_deal ? <span className="badge deal">DEAL</span> : h.is_new ? <span className="badge">NIEUW</span> : <span className="badge base">bestaand</span>}
              </div>
              <div className="card-body">
                <div className="card-title">{h.title}</div>
                <div className="price-row">
                  <span className="price">{formatPrice(h)}</span>
                  {h.price_type === 'MIN_BID' && <span className="meta">bieden v.a.</span>}
                  {h.profit != null && <span className={'profit ' + (h.profit >= 0 ? 'pos' : 'neg')}>{h.profit >= 0 ? '+' : ''}€{Math.round(h.profit)} winst</span>}
                </div>
                <div className="meta">{h.city}{h.distance_km != null ? ` · ${h.distance_km} km` : ''}{h.seller ? ` · ${h.seller}` : ''}</div>
                <div className="meta">{h.filter_name} · gevonden {ago(h.found_at, now)}</div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
