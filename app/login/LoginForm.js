'use client';

import { useState } from 'react';

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Er ging iets mis.');
  return data;
}

export default function LoginForm({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [f, setF] = useState({ identifier: '', username: '', email: '', password: '', password2: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

  function switchMode(m) { setMode(m); setError(''); setLinkSent(false); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register' && f.password !== f.password2) { setError('De wachtwoorden zijn niet hetzelfde.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') await post('/api/auth/login', { identifier: f.identifier, password: f.password });
      if (mode === 'register') await post('/api/auth/register', { username: f.username, email: f.email, password: f.password });
      if (mode === 'link') { await post('/api/auth/request', { email: f.email }); setLinkSent(true); setBusy(false); return; }
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Inloggen</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Account maken</button>
      </div>

      {mode === 'link' && linkSent ? (
        <p className="success">Check je inbox: als er een account bij <b>{f.email}</b> hoort, krijg je een inloglink. Niets ontvangen? Kijk ook in je spam.</p>
      ) : (
        <form onSubmit={submit} className="login-form">
          {mode === 'login' && <>
            <label htmlFor="identifier">Gebruikersnaam of e-mailadres</label>
            <input id="identifier" type="text" required value={f.identifier} onChange={set('identifier')} autoComplete="username" />
            <label htmlFor="password">Wachtwoord</label>
            <input id="password" type="password" required value={f.password} onChange={set('password')} autoComplete="current-password" />
          </>}

          {mode === 'register' && <>
            <label htmlFor="username">Gebruikersnaam</label>
            <input id="username" type="text" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_.\-]+" value={f.username} onChange={set('username')} autoComplete="username" placeholder="3-20 tekens" />
            <label htmlFor="email">E-mailadres <span className="muted">(voor deal-meldingen)</span></label>
            <input id="email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" placeholder="jij@voorbeeld.nl" />
            <label htmlFor="password">Wachtwoord</label>
            <input id="password" type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="minstens 8 tekens" />
            <label htmlFor="password2">Herhaal wachtwoord</label>
            <input id="password2" type="password" required minLength={8} value={f.password2} onChange={set('password2')} autoComplete="new-password" />
          </>}

          {mode === 'link' && <>
            <p className="muted" style={{ margin: '4px 0' }}>Vul je e-mailadres in. Je krijgt een link waarmee je direct inlogt; daarna kun je in je dashboard een nieuw wachtwoord instellen.</p>
            <label htmlFor="email">E-mailadres</label>
            <input id="email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" placeholder="jij@voorbeeld.nl" />
          </>}

          <button className="primary" disabled={busy}>
            {busy ? 'Even geduld…' : mode === 'login' ? 'Inloggen' : mode === 'register' ? 'Account maken' : 'Stuur inloglink'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}

      {mode === 'login' && <button type="button" className="link-btn" onClick={() => switchMode('link')}>Wachtwoord vergeten? Log in via een e-maillink</button>}
      {mode === 'link' && <button type="button" className="link-btn" onClick={() => switchMode('login')}>Terug naar inloggen</button>}
    </>
  );
}
