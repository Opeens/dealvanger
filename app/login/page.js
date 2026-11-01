import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { SITE_NAME } from '@/lib/config';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Inloggen of account maken',
  description: `Log in of maak gratis een account aan bij ${SITE_NAME} met een gebruikersnaam en wachtwoord.`,
};

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/dashboard');
  const { error, mode } = await searchParams;
  return (
    <main className="narrow">
      <div className="panel">
        <h1 className="page-title">Welkom bij {SITE_NAME}</h1>
        {error === 'expired' && <p className="error">Die inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.</p>}
        <LoginForm initialMode={mode === 'register' ? 'register' : 'login'} />
      </div>
    </main>
  );
}
