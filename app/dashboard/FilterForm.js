'use client';

import { useState } from 'react';
import { parseJson } from '@/lib/marktplaats';
import MarktplaatsFilters from './MarktplaatsFilters';

export const EMPTY_FILTER = {
  query: '', name: '', min_price: '', max_price: '', resale_price: '', min_profit: '', postcode: '', distance_km: '',
  require_words: '', exclude_words: '', interval_min: 1, title_only: true, skip_ads: true, include_no_price: false, email_deals: true,
  l1_category_id: '', l2_category_id: '', category_label: '', attributes: [], ranges: [],
  ai_check: false, ai_description: '', free_only: false,
};

// databaserij -> formulierwaarden
export function filterToForm(f) {
  if (!f) return EMPTY_FILTER;
  const form = {};
  for (const [k, empty] of Object.entries(EMPTY_FILTER)) {
    if (typeof empty === 'boolean') form[k] = !!f[k];
    else if (Array.isArray(empty)) form[k] = parseJson(f[k]);
    else form[k] = f[k] ?? '';
  }
  return form;
}

export default function FilterForm({ initial, editing, intervals, aiReady, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const preview = form.resale_price !== '' && form.min_profit !== ''
    ? `Deal bij een vraagprijs van € ${Math.max(0, Number(form.resale_price) - Number(form.min_profit)).toLocaleString('nl-NL')} of minder.`
    : null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await onSave(form); } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} autoComplete="off" style={{ display: 'contents' }}>
      <div className="drawer-head">
        <h2>{editing ? 'Filter bewerken' : 'Nieuw filter'}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten">×</button>
      </div>

      <div className="drawer-body">
        <div className="fieldset">
          <p className="fieldset-title">Zoekopdracht</p>
          <label htmlFor="q">Zoekterm</label>
          <input id="q" type="text" value={form.query} onChange={set('query')} placeholder="bijv. iphone 15 pro" required={!form.l1_category_id} maxLength={100} autoFocus />
          {form.l1_category_id && !form.query && <p className="hint">Zonder zoekterm volg je alle nieuwe advertenties in de gekozen categorie.</p>}
          <label htmlFor="n">Naam <span className="muted">(optioneel)</span></label>
          <input id="n" type="text" value={form.name} onChange={set('name')} placeholder="Zoals het in je overzicht staat" maxLength={60} />
          <label className="check"><input type="checkbox" checked={form.title_only} onChange={set('title_only')} /> Alleen in de titel zoeken</label>
        </div>

        <MarktplaatsFilters form={form} setForm={setForm} />

        <div className="fieldset">
          <p className="fieldset-title">AI-controle</p>
          <p className="fieldset-desc">AI bekijkt bij elke nieuwe advertentie de foto, titel en beschrijving, en keurt alles af wat niet echt is wat je zoekt.</p>
          <label className="check"><input type="checkbox" checked={form.ai_check} onChange={set('ai_check')} disabled={!aiReady} /> Advertenties controleren met AI</label>
          {!aiReady && <p className="hint">Nog niet beschikbaar: er is geen Anthropic API-sleutel ingesteld op de server.</p>}
          {form.ai_check && <>
            <label htmlFor="aid">Wat zoek je precies?</label>
            <textarea
              id="aid"
              className="textarea"
              rows={3}
              maxLength={500}
              value={form.ai_description}
              onChange={set('ai_description')}
              placeholder="bijv. Een complete SM06 uitlaat (einddemper) voor een 172cc scooter. Geen hitteschild, bocht of losse onderdelen."
            />
            <p className="hint">Hoe specifieker, hoe beter. Afgekeurde advertenties vind je terug onder &ldquo;Afgekeurd&rdquo;.</p>
          </>}
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Prijs</p>
          <div className="row">
            <div><label htmlFor="pmin">Minimaal (€)</label><input id="pmin" type="number" min="0" value={form.min_price} onChange={set('min_price')} /></div>
            <div><label htmlFor="pmax">Maximaal (€)</label><input id="pmax" type="number" min="0" value={form.max_price} onChange={set('max_price')} /></div>
          </div>
          <label className="check"><input type="checkbox" checked={form.free_only} onChange={set('free_only')} /> Alleen gratis spullen</label>
          {form.free_only
            ? <p className="hint">Alleen advertenties met de prijs &ldquo;Gratis&rdquo;. Lokkertjes worden overgeslagen: € 0-prijzen, topadvertenties, bedrijven en reclame zoals gratis offerte, bezorging, verhuur of inkoop. Elke echt gratis advertentie telt als deal. Zet de AI-controle aan om ook de lastige gevallen eruit te halen.</p>
            : <label className="check"><input type="checkbox" checked={form.include_no_price} onChange={set('include_no_price')} /> Ook advertenties zonder vaste prijs</label>}
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Winst en meldingen</p>
          <p className="fieldset-desc">Een advertentie is een deal als je verkoopprijs minus de vraagprijs minstens je minimale winst is.</p>
          <div className="row">
            <div><label htmlFor="rs">Verkoopprijs (€)</label><input id="rs" type="number" min="0" value={form.resale_price} onChange={set('resale_price')} /></div>
            <div><label htmlFor="mp">Minimale winst (€)</label><input id="mp" type="number" min="0" value={form.min_profit} onChange={set('min_profit')} /></div>
          </div>
          {preview && <p className="hint">{preview}</p>}
          <label className="check"><input type="checkbox" checked={form.email_deals} onChange={set('email_deals')} /> Mail mij bij een nieuwe deal</label>
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Locatie <span className="muted" style={{ fontWeight: 400 }}>(optioneel)</span></p>
          <div className="row">
            <div><label htmlFor="pc">Postcode</label><input id="pc" type="text" value={form.postcode} onChange={set('postcode')} placeholder="1012AB" maxLength={7} /></div>
            <div><label htmlFor="km">Maximale afstand (km)</label><input id="km" type="number" min="1" value={form.distance_km} onChange={set('distance_km')} /></div>
          </div>
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Verfijnen</p>
          <label htmlFor="rw">Titel moet bevatten <span className="muted">(komma-gescheiden)</span></label>
          <input id="rw" type="text" value={form.require_words} onChange={set('require_words')} placeholder="bijv. 128gb" />
          <label htmlFor="ew">Blacklist voor dit filter <span className="muted">(komma-gescheiden)</span></label>
          <input id="ew" type="text" value={form.exclude_words} onChange={set('exclude_words')} placeholder="hoesje, kapot, defect, gezocht" />
          <p className="hint">Staat een van deze woorden in de titel of beschrijving, dan wordt de advertentie overgeslagen. Je algemene blacklist (Instellingen) geldt daarnaast altijd.</p>
          <label className="check"><input type="checkbox" checked={form.skip_ads} onChange={set('skip_ads')} /> Betaalde topadvertenties overslaan</label>
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Scanfrequentie</p>
          <select value={form.interval_min} onChange={set('interval_min')} style={{ marginTop: 8 }}>
            {intervals.map(i => <option key={i} value={i}>{i === 1 ? 'Elke minuut' : `Elke ${i} minuten`}</option>)}
          </select>
          {editing && <p className="hint">Na opslaan begint het filter opnieuw: bestaande advertenties tellen dan niet als nieuw.</p>}
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="drawer-foot">
        <button type="button" onClick={onClose}>Annuleren</button>
        <button className="primary" disabled={busy}>{busy ? 'Opslaan…' : editing ? 'Opslaan' : 'Filter aanmaken'}</button>
      </div>
    </form>
  );
}
