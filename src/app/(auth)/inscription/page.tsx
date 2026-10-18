'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { signUpAction } from '@/app/actions/auth';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function InscriptionPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await signUpAction(formData);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error ?? 'Une erreur est survenue lors de l\'inscription.');
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
          Compte créé avec succès !
        </h1>
        <p className="text-sm text-heritage-700 leading-relaxed">
          Un e-mail de confirmation a été envoyé à votre adresse pour valider votre compte. 
          Une fois confirmé, vous pourrez vous connecter et proposer vos contributions généalogiques.
        </p>
        <div className="pt-4">
          <Link
            href="/connexion"
            className="inline-flex px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-20">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-heritage-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-heritage-100 text-heritage-800 flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-heritage-950">
            Rejoindre les contributeurs
          </h1>
          <p className="text-xs text-heritage-600">
            Créez votre compte pour proposer des ajouts et des corrections généalogiques.
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
            <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
              Nom d&apos;affichage public
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              required
              placeholder="Ex: Jean Dupont"
              className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 text-sm"
            />
            <p className="text-xs text-heritage-500 mt-1">
              Nom visible sous vos propositions validées.
            </p>
          </div>

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
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Minimum 8 caractères"
              className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 text-sm"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-start space-x-2.5 text-xs text-heritage-700 cursor-pointer">
              <input
                type="checkbox"
                name="acceptTerms"
                required
                className="mt-0.5 rounded border-heritage-300 text-heritage-800 focus:ring-heritage-700"
              />
              <span>
                J&apos;accepte les{' '}
                <Link href="/conditions" className="font-semibold text-heritage-900 underline">
                  conditions d&apos;utilisation
                </Link>{' '}
                et la{' '}
                <Link href="/confidentialite" className="font-semibold text-heritage-900 underline">
                  politique de confidentialité
                </Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-lg bg-heritage-800 text-heritage-50 font-semibold text-sm hover:bg-heritage-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-heritage-800 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="pt-4 border-t border-heritage-100 text-center text-xs text-heritage-600">
          Vous avez déjà un compte ?{' '}
          <Link href="/connexion" className="font-semibold text-heritage-900 hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
