'use client';

import { useState } from 'react';
import { EMPTY_FILTER, filterToForm } from './FilterForm';

// Filters in- en exporteren als tekst (JSON), zodat je ze kunt delen of in één keer kunt toevoegen.
// Velden die ontbreken krijgen dezelfde standaardwaarden als in het formulier "Nieuw filter".

const EXPORT_SKIP = new Set(['postcode']);

export function filtersToText(filters) {
  const list = filters.map(f => {
    const form = filterToForm(f);
    const out = {};
    for (const [k, v] of Object.entries(form)) {
      if (EXPORT_SKIP.has(k)) continue;
      if (v === '' || (Array.isArray(v) && !v.length)) continue;
      out[k] = v;
    }
    return out;
  });
  return JSON.stringify(list, null, 2);
}

function parseText(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Dit is geen geldige filtertekst. Plak de tekst precies zoals je hem hebt gekregen.'); }
  const list = Array.isArray(data) ? data : [data];
  if (!list.length || list.some(x => !x || typeof x !== 'object' || Array.isArray(x))) {
    throw new Error('Dit is geen geldige filtertekst.');
  }
  return list.map(x => ({ ...EMPTY_FILTER, ...x }));
}

export default function ImportFilters({ filters, room, onImport, onClose }) {
  const [text, setText] = useState('');
  const [postcode, setPostcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  let count = 0;
  try { count = text.trim() ? parseText(text).length : 0; } catch {}

  async function submit(e) {
    e.preventDefault();
    setError('');
    let list;
    try { list = parseText(text); } catch (err) { setError(err.message); return; }
    if (list.length > room) {
      setError(`Je kunt nog ${room} filter${room === 1 ? '' : 's'} toevoegen, deze tekst bevat er ${list.length}.`);
      return;
    }
    const pc = postcode.trim();
    if (pc) list = list.map(f => (f.distance_km ? { ...f, postcode: pc } : f));
    setBusy(true);
    try { await onImport(list); } catch (err) { setError(err.message); setBusy(false); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(filtersToText(filters));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError('Kopiëren lukte niet.'); }
  }

  return (
    <form onSubmit={submit} autoComplete="off" style={{ display: 'contents' }}>
      <div className="drawer-head">
        <h2>Filters importeren</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten">×</button>
      </div>

      <div className="drawer-body">
        <div className="fieldset">
          <p className="fieldset-title">Filtertekst plakken</p>
          <p className="fieldset-desc">Plak hier een of meer filters die je als tekst hebt gekregen. Ze worden toegevoegd aan je bestaande filters.</p>
          <label htmlFor="imp">Filtertekst</label>
          <textarea id="imp" className="textarea" style={{ minHeight: 220, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            value={text} onChange={e => setText(e.target.value)} placeholder='[{ "name": "...", "query": "..." }]' autoFocus />
          {count > 0 && <p className="hint">{count} filter{count === 1 ? '' : 's'} gevonden.</p>}
          <label htmlFor="imp-pc">Postcode <span className="muted">(optioneel, voor filters met een maximale afstand)</span></label>
          <input id="imp-pc" type="text" value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="1234AB" maxLength={7} />
        </div>
        <div className="fieldset">
          <p className="fieldset-title">Je eigen filters delen</p>
          <p className="fieldset-desc">Kopieer al je filters als tekst, bijvoorbeeld om ze te laten nakijken. Je postcode wordt niet meegekopieerd.</p>
          <button type="button" style={{ marginTop: 10 }} onClick={copy} disabled={!filters.length}>{copied ? 'Gekopieerd' : 'Filters kopiëren'}</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="drawer-foot">
        <button type="button" onClick={onClose}>Annuleren</button>
        <button type="submit" className="primary" disabled={busy || !count}>{busy ? 'Bezig…' : `Importeren${count ? ` (${count})` : ''}`}</button>
      </div>
    </form>
  );
}
