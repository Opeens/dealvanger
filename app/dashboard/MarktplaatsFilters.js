'use client';

import { useEffect, useState } from 'react';

const VISIBLE_OPTIONS = 10;

// Categorie + alle kenmerken die Marktplaats voor die categorie aanbiedt (conditie, merk, levering, bouwjaar, ...)
export default function MarktplaatsFilters({ form, setForm }) {
  const [opts, setOpts] = useState({ categories: [], subcategories: [], facets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  const l1 = form.l1_category_id ? String(form.l1_category_id) : '';
  const l2 = form.l2_category_id ? String(form.l2_category_id) : '';

  // zoekterm met vertraging doorgeven, zodat niet bij elke toetsaanslag opnieuw geladen wordt
  const [query, setQuery] = useState(form.query.trim());
  useEffect(() => {
    const t = setTimeout(() => setQuery(form.query.trim()), 700);
    return () => clearTimeout(t);
  }, [form.query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const p = new URLSearchParams();
    if (query) p.set('query', query);
    if (l1) p.set('l1', l1);
    if (l1 && l2) p.set('l2', l2);
    fetch('/api/marktplaats/options?' + p.toString())
      .then(r => r.json().then(d => (r.ok ? d : Promise.reject(new Error(d.error)))))
      .then(d => {
        if (cancelled) return;
        setOpts(d);
        if (!d.facets.length) return;
        // kenmerken die in de nieuwe categorie niet bestaan weghalen
        const ids = new Set(d.facets.flatMap(f => (f.options || []).map(o => o.id)));
        const rangeKeys = new Set(d.facets.filter(f => f.type === 'range').map(f => f.key));
        setForm(f => ({
          ...f,
          attributes: f.attributes.filter(a => ids.has(a.id)),
          ranges: f.ranges.filter(r => rangeKeys.has(r.key)),
        }));
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Kon filters niet laden.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l1, l2, query]);

  function chooseL1(e) {
    const id = e.target.value;
    const cat = opts.categories.find(c => String(c.id) === id);
    setForm(f => ({ ...f, l1_category_id: id, l2_category_id: '', category_label: cat?.label || '' }));
  }

  function chooseL2(e) {
    const id = e.target.value;
    const main = opts.categories.find(c => String(c.id) === l1);
    const sub = opts.subcategories.find(c => String(c.id) === id);
    setForm(f => ({ ...f, l2_category_id: id, category_label: sub ? `${main?.label} › ${sub.label}` : main?.label || '' }));
  }

  function toggle(facet, option) {
    setForm(f => {
      const on = f.attributes.some(a => a.id === option.id);
      return {
        ...f,
        attributes: on
          ? f.attributes.filter(a => a.id !== option.id)
          : [...f.attributes, { id: option.id, label: option.label, group: facet.label }],
      };
    });
  }

  function setRange(facet, side, value) {
    setForm(f => {
      const current = f.ranges.find(r => r.key === facet.key) || { key: facet.key, label: facet.label, from: '', to: '' };
      const next = { ...current, [side]: value };
      const rest = f.ranges.filter(r => r.key !== facet.key);
      return { ...f, ranges: next.from === '' && next.to === '' ? rest : [...rest, next] };
    });
  }

  const groups = opts.facets.filter(f => f.type === 'group');
  const ranges = opts.facets.filter(f => f.type === 'range');
  const selectedCount = form.attributes.length + form.ranges.length;

  return (
    <>
      <div className="fieldset">
        <p className="fieldset-title">Categorie</p>
        <div className="row">
          <div>
            <label htmlFor="l1">Hoofdcategorie</label>
            <select id="l1" value={l1} onChange={chooseL1}>
              <option value="">Alle categorieën</option>
              {opts.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="l2">Subcategorie</label>
            <select id="l2" value={l2} onChange={chooseL2} disabled={!l1 || (loading && !opts.subcategories.length)}>
              <option value="">{l1 ? 'Alle subcategorieën' : '–'}</option>
              {opts.subcategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {!l1 && <p className="hint">Tip: met een categorie sluit je accessoires en hoesjes direct uit, en krijg je extra kenmerken om op te filteren.</p>}
      </div>

      <div className="fieldset">
        <p className="fieldset-title">
          Kenmerken {selectedCount > 0 && <span className="count-pill">{selectedCount} gekozen</span>}
        </p>
        <p className="fieldset-desc">
          {l2 ? 'Alle filters die Marktplaats voor deze categorie aanbiedt.' : 'Kies een subcategorie voor meer specifieke kenmerken, zoals merk, opslag of bouwjaar.'}
        </p>
        {loading && <p className="hint">Filters laden…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && groups.length === 0 && ranges.length === 0 && (
          <p className="hint">{query || l1 ? 'Geen extra kenmerken beschikbaar.' : 'Vul een zoekterm in of kies een categorie om kenmerken te zien.'}</p>
        )}

        {groups.map(facet => {
          const showAll = expanded[facet.key] || facet.options.length <= VISIBLE_OPTIONS;
          const visible = showAll ? facet.options : facet.options.slice(0, VISIBLE_OPTIONS);
          return (
            <div key={facet.key} className="facet">
              <div className="facet-label">{facet.label}</div>
              <div className="chips">
                {visible.map(o => {
                  const on = form.attributes.some(a => a.id === o.id);
                  return (
                    <button key={o.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(facet, o)}>
                      {o.label}{o.count != null && <span className="chip-count">{o.count.toLocaleString('nl-NL')}</span>}
                    </button>
                  );
                })}
                {!showAll && (
                  <button type="button" className="chip more" onClick={() => setExpanded(x => ({ ...x, [facet.key]: true }))}>
                    +{facet.options.length - VISIBLE_OPTIONS} meer
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {ranges.length > 0 && (
          <div className="facet">
            <div className="facet-label">Bereik</div>
            {ranges.map(facet => {
              const r = form.ranges.find(x => x.key === facet.key) || { from: '', to: '' };
              return (
                <div key={facet.key} className="range-row">
                  <span className="range-label">{facet.label}</span>
                  <input type="number" min="0" placeholder="van" value={r.from ?? ''} onChange={e => setRange(facet, 'from', e.target.value)} />
                  <input type="number" min="0" placeholder="tot" value={r.to ?? ''} onChange={e => setRange(facet, 'to', e.target.value)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
