'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/marktplaats';
import AccountSettings from './AccountSettings';
import ImportFilters from './ImportFilters';
import FilterForm, { filterToForm } from './FilterForm';
import { parseJson } from '@/lib/marktplaats';

function ago(ms, now) {
  if (!ms) return '–';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s} sec geleden`;
  if (s < 3600) return `${Math.floor(s / 60)} min geleden`;
  if (s < 86400) return `${Math.floor(s / 3600)} uur geleden`;
  return new Date(ms).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function agoShort(ms, now) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s} sec`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} uur`;
  return `${Math.floor(s / 86400)} d`;
}

const eur = n => '€ ' + Math.round(n).toLocaleString('nl-NL');

async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Niet ingelogd'); }
  if (!res.ok) throw new Error(data.error || 'Er ging iets mis');
  return data;
}

function beep() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.12);
    });
  } catch {}
}

function filterSummary(f, { category = true } = {}) {
  const bits = [];
  if (category && f.category_label) bits.push(f.category_label.split(' › ').pop());
  const extra = parseJson(f.attributes).length + parseJson(f.ranges).length;
  if (extra) bits.push(`${extra} kenmerk${extra === 1 ? '' : 'en'}`);
  if (f.min_price != null || f.max_price != null) bits.push(`€${f.min_price ?? 0}–${f.max_price ?? '∞'}`);
  if (f.postcode && f.distance_km) bits.push(`${f.distance_km} km`);
  if (f.resale_price != null) bits.push(`verkoop €${f.resale_price}`);
  bits.push(f.interval_min === 1 ? 'elke min.' : `elke ${f.interval_min} min.`);
  return bits.join(', ');
}

export default function Dashboard({ email, intervals }) {
  const [filters, setFilters] = useState([]);
  const [max, setMax] = useState(5);
  const [aiReady, setAiReady] = useState(false);
  const [hits, setHits] = useState([]);
  const [account, setAccount] = useState({ email, username: null, hasPassword: true });
  const [active, setActive] = useState('all');
  const [view, setView] = useState('all');
  const [drawer, setDrawer] = useState(null); // { type: 'filter', filter } | { type: 'account' }
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);
  const [freshIds, setFreshIds] = useState(new Set());
  const [notifOk, setNotifOk] = useState(true);
  const [offline, setOffline] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [lastCronAt, setLastCronAt] = useState(null);
  const [mailError, setMailError] = useState(null);
  const lastHitId = useRef(null);
  // verschil tussen de klok van de server en die van dit apparaat; een verkeerd ingestelde
  // computerklok liet "Laatste scan" anders steeds X min geleden zien
  const clockOffset = useRef(0);
  const loading = useRef(false);
  const lastOk = useRef(0);

  const load = useCallback(async () => {
    // niet stapelen: een trage of hangende aanroep mag geen oudere data over nieuwere heen zetten
    if (loading.current) return;
    loading.current = true;
    try {
      await loadOnce();
      lastOk.current = Date.now();
      setOffline(false);
    } catch (e) {
      // pas na een minuut zonder geslaagde update melden, één mislukte poging is normaal
      if (Date.now() - lastOk.current > 60000) setOffline(true);
      throw e;
    } finally {
      loading.current = false;
    }
  }, []);

  const loadOnce = async () => {
    // eerst hits: die aanroep scant ook de filters die aan de beurt zijn, daarna de bijgewerkte filterstatus
    const h = await api('/api/hits');
    const f = await api('/api/filters');
    if (f.now) {
      clockOffset.current = f.now - Date.now();
      setNow(Date.now() + clockOffset.current);
    }
    setFilters(f.filters);
    setMax(f.max);
    setBlockedUntil(f.blockedUntil || null);
    setLastCronAt(f.lastCronAt ?? null);
    setMailError(f.mailError || null);
    setAiReady(!!f.ai);
    setHits(h.hits);
    setLoaded(true);
    const top = h.hits[0]?.id ?? 0;
    if (lastHitId.current !== null) {
      const incoming = h.hits.filter(x => x.id > lastHitId.current && x.is_new && x.ai_verdict !== 0);
      if (incoming.length) {
        setFreshIds(prev => new Set([...prev, ...incoming.map(x => x.id)]));
        if (incoming.some(x => x.is_deal)) beep();
        if ('Notification' in window && Notification.permission === 'granted') {
          incoming.slice(0, 3).forEach(x => {
            const n = new Notification(`${x.filter_name}: ${formatPrice(x)}`, { body: `${x.title}\n${x.city}`, tag: String(x.id) });
            n.onclick = () => { window.open(x.url, '_blank'); n.close(); };
          });
        }
      }
    }
    lastHitId.current = Math.max(lastHitId.current ?? 0, top);
  };

  useEffect(() => {
    load().catch(() => {});
    api('/api/account').then(setAccount).catch(() => {});
    const t1 = setInterval(() => load().catch(() => {}), 20000);
    const t2 = setInterval(() => setNow(Date.now() + clockOffset.current), 1000);
    // browsers remmen of bevriezen timers in achtergrondtabbladen en na slaapstand;
    // zodra het tabblad weer zichtbaar is of de verbinding terug is meteen verversen
    const refresh = () => { if (document.visibilityState === 'visible') load().catch(() => {}); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    setNotifOk(!('Notification' in window) || Notification.permission === 'granted');
    const onKey = e => { if (e.key === 'Escape') setDrawer(null); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(t1); clearInterval(t2);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [load]);

  const current = filters.find(f => f.id === active) || null;
  useEffect(() => { if (active !== 'all' && loaded && !current) setActive('all'); }, [active, current, loaded]);

  async function saveFilter(form, id) {
    if (id) await api(`/api/filters/${id}`, 'PUT', form);
    else {
      const res = await api('/api/filters', 'POST', form);
      setActive(res.id);
    }
    setDrawer(null);
    await load();
  }

  async function importFilters(list) {
    let done = 0;
    try {
      for (const form of list) { await api('/api/filters', 'POST', form); done++; }
    } catch (err) {
      await load().catch(() => {});
      throw new Error(`${done} van ${list.length} filters toegevoegd. Daarna ging het mis: ${err.message}`);
    }
    setDrawer(null);
    setActive('all');
    await load();
  }

  async function act(f, action) {
    if (action === 'delete' && !confirm(`Filter "${f.name}" verwijderen? De gevonden resultaten worden ook verwijderd.`)) return;
    if (action === 'delete') { await api(`/api/filters/${f.id}`, 'DELETE'); setActive('all'); }
    if (action === 'toggle') await api(`/api/filters/${f.id}`, 'PATCH', { enabled: !f.enabled });
    if (action === 'mail') await api(`/api/filters/${f.id}`, 'PATCH', { email_deals: !f.email_deals });
    load();
  }

  async function clearHits() {
    if (!confirm('Alle resultaten uit je overzicht verwijderen?')) return;
    await api('/api/hits', 'DELETE');
    load();
  }

  async function deleteAccount() {
    if (!confirm('Je account, filters en resultaten definitief verwijderen?')) return;
    await fetch('/api/account/delete', { method: 'POST' });
    window.location.href = '/';
  }

  // door de AI afgekeurde advertenties tellen nergens mee en staan alleen onder "Afgekeurd"
  const accepted = hits.filter(h => h.ai_verdict !== 0);
  const counts = {};
  accepted.forEach(h => { counts[h.filter_id] = (counts[h.filter_id] || 0) + 1; });
  const inScope = h => !current || h.filter_id === current.id;
  const scoped = accepted.filter(inScope);
  const rejected = hits.filter(h => h.ai_verdict === 0 && inScope(h));
  // advertenties uit de eerste scan van een filter (is_new = 0) stonden er al; daarvoor komt geen mail
  // en ze tellen niet als deal, anders lijkt het alsof er tientallen deals gemist zijn
  const isDeal = h => h.is_deal && h.is_new;
  const shown = view === 'deals' ? scoped.filter(isDeal) : view === 'rejected' ? rejected : scoped;
  const deals = scoped.filter(isDeal);
  const bestProfit = deals.reduce((m, h) => Math.max(m, h.profit ?? 0), 0);
  const lastScan = (current ? [current] : filters).reduce((m, f) => Math.max(m, f.last_scan_at || 0), 0);
  const initial = (account.username || account.email || '?').slice(0, 1).toUpperCase();

  return (
    <div className="app">
      <aside className="sb">
        <div className="sb-label"><span>Filters</span><span>{filters.length}/{max}</span></div>
        <button className={'sb-item' + (active === 'all' ? ' active' : '')} onClick={() => setActive('all')}>
          <span className="sb-text"><span className="sb-name">Alle resultaten</span></span>
          <span className="count">{accepted.length}</span>
        </button>
        {filters.map(f => (
          <button key={f.id} className={'sb-item' + (active === f.id ? ' active' : '')} onClick={() => setActive(f.id)}>
            <span className={'status' + (f.last_error ? ' err' : f.enabled ? ' on' : '')} title={f.last_error ? 'Fout' : f.enabled ? 'Actief' : 'Gepauzeerd'} />
            <span className="sb-text">
              <span className="sb-name">{f.name}</span>
              <span className="sb-sub">{filterSummary(f)}</span>
            </span>
            <span className="count">{counts[f.id] || 0}</span>
          </button>
        ))}
        <button className="primary sb-new" disabled={filters.length >= max} onClick={() => setDrawer({ type: 'filter', filter: null })}>
          Nieuw filter
        </button>
        <button className="text-btn sb-import" onClick={() => setDrawer({ type: 'import' })}>Filters importeren of delen</button>
        {filters.length >= max && <p className="hint" style={{ padding: '0 4px' }}>Maximum van {max} filters bereikt.</p>}

        <div className="sb-foot">
          <div className="sb-user">
            <span className="avatar">{initial}</span>
            <span className="sb-user-text">
              <div className="sb-user-name">{account.username || 'Mijn account'}</div>
              <div className="sb-user-mail">{account.email}</div>
            </span>
          </div>
          <div className="sb-links">
            <button className="text-btn" onClick={() => setDrawer({ type: 'account' })}>Instellingen</button>
            <form method="post" action="/api/auth/logout"><button className="text-btn">Uitloggen</button></form>
          </div>
        </div>
      </aside>

      <section className="main">
        <div className="main-head">
          <div>
            <h1>{current ? current.name : 'Alle resultaten'}</h1>
            <p className="main-sub">
              {current
                ? <>{current.query ? <>Zoekt op &ldquo;{current.query}&rdquo;, </> : null}{current.category_label ? `${current.category_label}, ` : ''}{filterSummary(current, { category: false })}</>
                : `${filters.filter(f => f.enabled).length} van ${filters.length} filters actief`}
            </p>
          </div>
          {current && (
            <div className="actions">
              <button className={current.email_deals ? 'btn-on' : ''} onClick={() => act(current, 'mail')} title="Mail bij een nieuwe deal">
                Deal-mail {current.email_deals ? 'aan' : 'uit'}
              </button>
              <button onClick={() => act(current, 'toggle')}>{current.enabled ? 'Pauzeren' : 'Hervatten'}</button>
              <button onClick={() => setDrawer({ type: 'filter', filter: current })}>Bewerken</button>
              <button className="btn-danger" onClick={() => act(current, 'delete')}>Verwijderen</button>
            </div>
          )}
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-label">Resultaten</div><div className="stat-val">{scoped.length}</div></div>
          <div className="stat"><div className="stat-label">Deals</div><div className="stat-val accent">{deals.length}</div></div>
          <div className="stat"><div className="stat-label">Hoogste winst</div><div className="stat-val">{bestProfit ? eur(bestProfit) : '–'}</div></div>
          <div className="stat"><div className="stat-label">Laatste scan</div><div className="stat-val">{lastScan ? <>{agoShort(lastScan, now)}<span className="stat-unit"> geleden</span></> : '–'}</div></div>
        </div>

        {offline && <div className="notice err">Geen verbinding met de server, de gegevens hieronder zijn mogelijk niet actueel. We blijven het proberen.</div>}
        {lastCronAt !== null && filters.some(f => f.enabled) && now - lastCronAt > 5 * 60000 && (
          <div className="notice err">
            Automatisch scannen staat uit: {lastCronAt ? <>de laatste automatische scan was {ago(lastCronAt, now)}</> : 'er is nog nooit automatisch gescand'}.
            Er wordt nu alleen gescand terwijl dit dashboard openstaat, dus je mist deals en oude advertenties lijken nieuw.
            Controleer de job op cron-job.org.
          </div>
        )}
        {mailError && (
          <div className="notice err">
            Deal-mails komen niet aan: versturen mislukte {ago(mailError.at, now)} ({mailError.message}).
            Controleer de SMTP-instellingen in Vercel en stuur een testmail via Instellingen.
          </div>
        )}
        {blockedUntil && <div className="notice err">Marktplaats remt ons af. Om een blokkade te voorkomen is het scannen gepauzeerd tot {new Date(blockedUntil).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}. Daarna gaat het vanzelf verder.</div>}
        {current?.last_error && <div className="notice err">Scannen lukt niet: {current.last_error}</div>}
        {current && !current.last_error && current.enabled && !current.baseline_done && <div className="notice">Eerste scan wordt uitgevoerd…</div>}
        {current && !current.enabled && <div className="notice">Dit filter is gepauzeerd en scant niet.</div>}
        {current && current.email_deals && (current.resale_price == null || current.min_profit == null) && (
          <div className="notice">Vul een verkoopprijs en minimale winst in om deal-mails te krijgen.</div>
        )}

        <div className="feed-bar">
          <div className="seg">
            <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>Alles</button>
            <button className={view === 'deals' ? 'active' : ''} onClick={() => setView('deals')}>Deals</button>
            {(rejected.length > 0 || view === 'rejected') && (
              <button className={view === 'rejected' ? 'active' : ''} onClick={() => setView('rejected')}>Afgekeurd ({rejected.length})</button>
            )}
          </div>
          <span className="spacer" />
          {!notifOk && (
            <button className="text-btn" onClick={async () => { await Notification.requestPermission(); setNotifOk(Notification.permission === 'granted'); }}>
              Browsermeldingen aanzetten
            </button>
          )}
          {hits.length > 0 && <button className="text-btn danger" onClick={clearHits}>Overzicht leegmaken</button>}
        </div>

        <div className="list">
          {shown.length === 0 && (
            <div className="empty">
              {!loaded ? 'Laden…'
                : filters.length === 0 ? <><strong>Nog geen filters</strong>Maak een filter aan om nieuwe advertenties te volgen.</>
                : view === 'deals' ? <><strong>Nog geen deals</strong>Advertenties die binnen je winstmarge vallen verschijnen hier.</>
                : view === 'rejected' ? <><strong>Niets afgekeurd</strong>Advertenties die de AI-controle afkeurt verschijnen hier.</>
                : <><strong>Nog geen resultaten</strong>Nieuwe advertenties verschijnen hier zodra ze geplaatst worden.</>}
            </div>
          )}
          {shown.map(h => (
            <a key={h.id} className={'item' + (isDeal(h) ? ' deal' : '') + (freshIds.has(h.id) ? ' fresh' : '')} href={h.url} target="_blank" rel="noopener noreferrer">
              <div className="item-img" style={{ backgroundImage: h.image ? `url("${h.image}")` : undefined }} />
              <div className="item-main">
                <div className="item-title">{h.title}</div>
                <div className="item-meta">
                  <span>
                    {!h.is_new
                      ? <span className="tag quiet" title="Stond al op Marktplaats toen het filter werd aangemaakt; hiervoor komt geen mail">Al online{h.is_deal ? ', deal' : ''}</span>
                      : h.is_deal ? <span className="tag">Deal</span> : <span className="tag quiet">Nieuw</span>}
                    {h.city}{h.distance_km != null ? ` (${h.distance_km} km)` : ''}
                  </span>
                  {!current && <span>{h.filter_name}</span>}
                  <span>{ago(h.found_at, now)}</span>
                </div>
                {h.ai_reason && <div className={'item-ai' + (h.ai_verdict === 0 ? ' rejected' : '')}>AI: {h.ai_reason}</div>}
              </div>
              <div className="item-price">
                <div className="price">{formatPrice(h)}</div>
                {h.price_type === 'MIN_BID' && h.price_cents > 0 && <div className="price-note">bieden vanaf</div>}
                {h.profit != null && <div className={'profit ' + (h.profit >= 0 ? 'pos' : 'neg')}>{h.profit >= 0 ? '+' : '−'}{eur(Math.abs(h.profit))}</div>}
              </div>
            </a>
          ))}
        </div>
      </section>

      {drawer && (
        <div className="overlay" onMouseDown={() => setDrawer(null)}>
          <div className="drawer" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
            {drawer.type === 'filter'
              ? <FilterForm
                  key={drawer.filter?.id || 'new'}
                  initial={filterToForm(drawer.filter)}
                  editing={!!drawer.filter}
                  intervals={intervals}
                  aiReady={aiReady}
                  onSave={form => saveFilter(form, drawer.filter?.id)}
                  onClose={() => setDrawer(null)}
                />
              : drawer.type === 'import'
              ? <ImportFilters filters={filters} room={Math.max(0, max - filters.length)} onImport={importFilters} onClose={() => setDrawer(null)} />
              : <AccountSettings account={account} onSaved={a => setAccount(x => ({ ...x, ...a }))} onClose={() => setDrawer(null)} onDelete={deleteAccount} />}
          </div>
        </div>
      )}
    </div>
  );
}
