import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { SITE_NAME } from '@/lib/config';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Inloggen',
  description: `Log in of maak gratis een account aan bij ${SITE_NAME} met alleen je e-mailadres.`,
};

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/dashboard');
  const { error } = await searchParams;
  return (
    <main className="narrow">
      <div className="panel">
        <h1 className="page-title">Inloggen of account maken</h1>
        <p className="muted">Geen wachtwoord nodig: je krijgt een inloglink per e-mail. Nieuw? Dan maken we direct een gratis account voor je aan.</p>
        {error === 'expired' && <p className="error">Die inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
