'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { signInAction } from '@/app/actions/auth';
import { LogIn, AlertCircle } from 'lucide-react';

export default function ConnexionPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await signInAction(formData);
      if (res && !res.success) {
        setError(res.error ?? 'Échec de connexion.');
      }
    });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-heritage-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-heritage-950">
            Connexion à votre compte
          </h1>
          <p className="text-xs text-heritage-600">
            Accédez à votre espace pour proposer des ajouts et suivre vos contributions.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
              Adresse e-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              placeholder="votre.email@exemple.fr"
              className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800">
                Mot de passe
              </label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-heritage-600 hover:text-heritage-900 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-lg bg-heritage-800 text-heritage-50 font-semibold text-sm hover:bg-heritage-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-heritage-800 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="pt-4 border-t border-heritage-100 text-center text-xs text-heritage-600">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="font-semibold text-heritage-900 hover:underline">
            Créer un compte contributeur
          </Link>
        </div>
      </div>
    </div>
  );
}
