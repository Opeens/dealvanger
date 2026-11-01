'use client';

import { useState } from 'react';

export default function AccountSettings({ account, onSaved, onClose, onDelete }) {
  const [f, setF] = useState({ username: '', currentPassword: '', password: '', password2: '' });
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [busy, setBusy] = useState(false);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));

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
    onSaved({ username: data.username, hasPassword: true });
    setF({ username: '', currentPassword: '', password: '', password2: '' });
    setMsg({ text: 'Opgeslagen.', ok: true });
  }

  return (
    <form onSubmit={submit} autoComplete="off" style={{ display: 'contents' }}>
      <div className="drawer-head">
        <h2>Instellingen</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten">×</button>
      </div>

      <div className="drawer-body">
        <div className="fieldset">
          <p className="fieldset-title">Account</p>
          <label>Gebruikersnaam</label>
          {account.username
            ? <input type="text" value={account.username} disabled />
            : <input type="text" required minLength={3} maxLength={20} value={f.username} onChange={set('username')} autoComplete="username" placeholder="3-20 tekens" />}
          <label>E-mailadres <span className="muted">(voor deal-mails)</span></label>
          <input type="email" value={account.email || ''} disabled />
        </div>

        <div className="fieldset">
          <p className="fieldset-title">{account.hasPassword ? 'Wachtwoord wijzigen' : 'Wachtwoord instellen'}</p>
          {!account.hasPassword && <p className="fieldset-desc">Stel een wachtwoord in om voortaan met je gebruikersnaam in te loggen.</p>}
          {account.hasPassword && <>
            <label>Huidig wachtwoord</label>
            <input type="password" required value={f.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" />
          </>}
          <label>Nieuw wachtwoord</label>
          <input type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" placeholder="Minstens 8 tekens" />
          <label>Herhaal wachtwoord</label>
          <input type="password" required minLength={8} value={f.password2} onChange={set('password2')} autoComplete="new-password" />
          {msg.text && <p className={msg.ok ? 'hint' : 'error'}>{msg.text}</p>}
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Account verwijderen</p>
          <p className="fieldset-desc">Verwijdert je account, filters en resultaten definitief.</p>
          <button type="button" className="btn-danger" style={{ marginTop: 10 }} onClick={onDelete}>Account verwijderen</button>
        </div>
      </div>

      <div className="drawer-foot">
        <button type="button" onClick={onClose}>Sluiten</button>
        <button className="primary" disabled={busy}>{busy ? 'Opslaan…' : 'Opslaan'}</button>
      </div>
    </form>
  );
}
