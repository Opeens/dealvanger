'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    const res = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setState('sent');
    else { setState('idle'); setError(data.error || 'Er ging iets mis.'); }
  }

  if (state === 'sent') {
    return <p className="success">Check je inbox: we hebben een inloglink gestuurd naar <b>{email}</b>. Niets ontvangen? Kijk ook in je spam.</p>;
  }
  return (
    <form onSubmit={submit} className="login-form">
      <label htmlFor="email">E-mailadres</label>
      <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" autoComplete="email" />
      <button className="primary" disabled={state === 'sending'}>{state === 'sending' ? 'Versturen…' : 'Stuur inloglink'}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
