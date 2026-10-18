'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { resetPasswordAction } from '@/app/actions/auth';
import { KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function MotDePasseOubliePage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await resetPasswordAction(formData);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error ?? 'Une erreur est survenue.');
      }
    });
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-heritage-950">
          E-mail envoyé
        </h1>
        <p className="text-sm text-heritage-700 leading-relaxed">
          Si un compte est associé à cette adresse e-mail, vous recevrez un lien pour réinitialiser votre mot de passe d&apos;ici quelques instants.
        </p>
        <div className="pt-4">
          <Link
            href="/connexion"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la connexion</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-heritage-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-heritage-950">
            Mot de passe oublié
          </h1>
          <p className="text-xs text-heritage-600">
            Saisissez votre adresse e-mail pour recevoir les instructions de réinitialisation.
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

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-lg bg-heritage-800 text-heritage-50 font-semibold text-sm hover:bg-heritage-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-heritage-800 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>

        <div className="pt-4 border-t border-heritage-100 text-center text-xs text-heritage-600">
          <Link href="/connexion" className="inline-flex items-center space-x-1 font-semibold text-heritage-900 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à la connexion</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
