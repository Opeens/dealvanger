export const metadata = { title: 'Inloggen bevestigen', robots: { index: false } };

export default async function VerifyPage({ searchParams }) {
  const { token } = await searchParams;
  return (
    <main className="narrow">
      <div className="panel">
        <h1 className="page-title">Bijna klaar</h1>
        <p className="muted">Klik op de knop om in te loggen.</p>
        <form method="post" action="/api/auth/verify">
          <input type="hidden" name="token" value={token || ''} />
          <button className="primary">Inloggen</button>
        </form>
      </div>
    </main>
  );
}
