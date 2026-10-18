'use client';

import Link from 'next/link';
import { Person } from '@/lib/types/database';
import { formatLifespan } from '@/lib/services/dates';
import { useTranslation } from '@/lib/i18n/context';
import { Briefcase, MapPin, ArrowRight } from 'lucide-react';

interface PersonCardProps {
  person: Person;
  relationshipLabel?: string;
}

export function PersonCard({ person, relationshipLabel }: PersonCardProps) {
  const { locale } = useTranslation();

  const lifespan = formatLifespan(
    { date: person.birth_date, year: person.birth_year, precision: person.birth_date_precision },
    { date: person.death_date, year: person.death_year, precision: person.death_date_precision },
    person.life_status,
    locale
  );

  return (
    <Link
      href={`/genealogie/${person.id}`}
      className="group block p-4 sm:p-5 rounded-lg border border-heritage-200 bg-white hover:border-heritage-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1 pr-2">
          {relationshipLabel && (
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-heritage-600 mb-0.5">
              {relationshipLabel}
            </span>
          )}

          <div className="flex items-baseline space-x-2">
            <h3 className="font-serif text-lg font-bold text-heritage-950 group-hover:text-heritage-800 transition-colors">
              <span className="capitalize">{person.first_names}</span>{' '}
              <span className="uppercase tracking-wide">{person.last_name}</span>
            </h3>
          </div>

          {person.name_variants && person.name_variants.length > 0 && (
            <p className="text-xs text-heritage-600 italic">
              Var. : {person.name_variants.join(', ')}
            </p>
          )}

          {lifespan && (
            <p className="text-sm font-medium text-heritage-700">
              {lifespan}
            </p>
          )}

          <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-heritage-600">
            {person.profession && (
              <span className="inline-flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5 text-heritage-400" />
                <span>{person.profession}</span>
              </span>
            )}
            {(person.birth_place || person.death_place) && (
              <span className="inline-flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-heritage-400" />
                <span>{person.birth_place ?? person.death_place}</span>
              </span>
            )}
          </div>
        </div>

        <div className="pt-1 text-heritage-400 group-hover:text-heritage-700 group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
