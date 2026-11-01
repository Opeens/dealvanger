'use client';

import { useEffect, useState } from 'react';

export default function AccountSettings() {
  const [account, setAccount] = useState(null);
  const [f, setF] = useState({ username: '', currentPassword: '', password: '', password2: '' });
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

  useEffect(() => {
    fetch('/api/account').then(r => r.ok ? r.json() : null).then(setAccount).catch(() => {});
  }, []);

  if (!account) return null;

  async function submit(e) {
    e.preventDefault();
    if (f.password !== f.password2) { setMsg({ text: 'De nieuwe wachtwoorden zijn niet hetzelfde.', ok: false }); return; }
    setBusy(true);
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: f.username, currentPassword: f.currentPassword, password: f.password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg({ text: data.error || 'Er ging iets mis.', ok: false }); return; }
    setAccount(a => ({ ...a, username: data.username, hasPassword: true }));
    setF({ username: '', currentPassword: '', password: '', password2: '' });
    setMsg({ text: 'Opgeslagen. Je kunt nu inloggen met je gebruikersnaam en wachtwoord.', ok: true });
  }

  return (
    <details className="account-settings" open={!account.hasPassword}>
      <summary>
        Account{account.username ? `: ${account.username}` : ''}
        {!account.hasPassword && <span className="pill">stel wachtwoord in</span>}
      </summary>
      <p className="hint">E-mail voor meldingen: {account.email}</p>
      <form onSubmit={submit} autoComplete="off">
        {!account.username && <>
          <label>Gebruikersnaam</label>
          <input type="text" required minLength={3} maxLength={20} value={f.username} onChange={set('username')} autoComplete="username" placeholder="3-20 tekens" />
        </>}
        {account.hasPassword && <>
          <label>Huidig wachtwoord</label>
          <input type="password" required value={f.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" />
        </>}
        <label>{account.hasPassword ? 'Nieuw wachtwoord' : 'Wachtwoord'}</label>
        <input type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="minstens 8 tekens" />
        <label>Herhaal wachtwoord</label>
        <input type="password" required minLength={8} value={f.password2} onChange={set('password2')} autoComplete="new-password" />
        <div className="form-actions">
          <button className="primary" disabled={busy}>{account.hasPassword ? 'Wachtwoord wijzigen' : 'Opslaan'}</button>
        </div>
        {msg.text && <p className={msg.ok ? 'hint' : 'error'}>{msg.text}</p>}
      </form>
    </details>
  );
}
