'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface SearchFormProps {
  initialValues?: {
    query?: string;
    lastName?: string;
    firstNames?: string;
    birthYear?: string;
    deathYear?: string;
  };
}

export function SearchForm({ initialValues }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [lastName, setLastName] = useState(
    initialValues?.lastName ?? searchParams.get('lastName') ?? ''
  );
  const [firstNames, setFirstNames] = useState(
    initialValues?.firstNames ?? searchParams.get('firstNames') ?? ''
  );
  const [birthYear, setBirthYear] = useState(
    initialValues?.birthYear ?? searchParams.get('birthYear') ?? ''
  );
  const [deathYear, setDeathYear] = useState(
    initialValues?.deathYear ?? searchParams.get('deathYear') ?? ''
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();

    if (lastName.trim()) params.set('lastName', lastName.trim());
    if (firstNames.trim()) params.set('firstNames', firstNames.trim());
    if (birthYear.trim()) params.set('birthYear', birthYear.trim());
    if (deathYear.trim()) params.set('deathYear', deathYear.trim());

    startTransition(() => {
      router.push(`/genealogie?${params.toString()}`);
    });
  }

  function handleReset() {
    setLastName('');
    setFirstNames('');
    setBirthYear('');
    setDeathYear('');
    startTransition(() => {
      router.push('/genealogie');
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-5 sm:p-6 rounded-xl border border-heritage-200 shadow-sm"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Nom */}
        <div>
          <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
            Nom de famille
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Ex: DUPONT"
            className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 focus:border-transparent text-sm"
          />
        </div>

        {/* Prénom */}
        <div>
          <label htmlFor="firstNames" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
            Prénom(s)
          </label>
          <input
            type="text"
            id="firstNames"
            value={firstNames}
            onChange={(e) => setFirstNames(e.target.value)}
            placeholder="Ex: Pierre"
            className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 focus:border-transparent text-sm"
          />
        </div>

        {/* Année de naissance */}
        <div>
          <label htmlFor="birthYear" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
            Année de naissance
          </label>
          <input
            type="number"
            id="birthYear"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="Ex: 1842"
            min="800"
            max="2100"
            className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 focus:border-transparent text-sm"
          />
        </div>

        {/* Année de décès */}
        <div>
          <label htmlFor="deathYear" className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1.5">
            Année de décès
          </label>
          <input
            type="number"
            id="deathYear"
            value={deathYear}
            onChange={(e) => setDeathYear(e.target.value)}
            placeholder="Ex: 1912"
            min="800"
            max="2100"
            className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-heritage-950 placeholder-heritage-400 focus:outline-none focus:ring-2 focus:ring-heritage-600 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-heritage-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-heritage-600">
          Recherche insensible à la casse et tolérante aux variantes orthographiques.
        </p>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg border border-heritage-300 text-heritage-700 text-sm font-medium hover:bg-heritage-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser</span>
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 focus:ring-2 focus:ring-offset-2 focus:ring-heritage-800 transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{isPending ? 'Recherche en cours...' : 'Rechercher'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
