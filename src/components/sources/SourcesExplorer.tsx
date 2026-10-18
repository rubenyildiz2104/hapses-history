'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  ExternalLink, 
  Users, 
  BookOpen, 
  Calendar,
  Building,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Source, Person } from '@/lib/types/database';

export interface EnrichedSource extends Omit<Source, 'private_notes'> {
  linkedPersons?: Person[];
}

const TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  parish_register: {
    label: 'Registre paroissial',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  civil_registry: {
    label: 'État civil',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  census: {
    label: 'Recensement',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  oral_testimony: {
    label: 'Témoignage oral',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  communal_archives: {
    label: 'Archives communales',
    badgeClass: 'bg-heritage-200 text-heritage-900 border-heritage-300',
  },
};

export function SourcesExplorer({ initialSources }: { initialSources: EnrichedSource[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    initialSources.forEach((s) => {
      if (s.source_type) types.add(s.source_type);
    });
    return Array.from(types);
  }, [initialSources]);

  const filteredSources = useMemo(() => {
    return initialSources.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.archive_reference && s.archive_reference.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.author_or_organization && s.author_or_organization.toLowerCase().includes(q));

      const matchType = selectedType === 'all' || s.source_type === selectedType;

      return matchSearch && matchType;
    });
  }, [initialSources, searchQuery, selectedType]);

  return (
    <div className="space-y-8">
      {/* Search & Filter Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-heritage-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-heritage-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, cote, auteur ou mot-clé..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-heritage-300 text-sm placeholder-heritage-400 text-heritage-950 focus:outline-none focus:ring-2 focus:ring-heritage-600 bg-heritage-50/50"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-heritage-600">
            <span>
              {filteredSources.length} document{filteredSources.length > 1 ? 's' : ''} répertorié{filteredSources.length > 1 ? 's' : ''}
            </span>
            {(searchQuery || selectedType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
                className="font-semibold text-heritage-800 hover:underline ml-2"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Source types pill filter */}
        <div className="pt-3 border-t border-heritage-100 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedType === 'all'
                ? 'bg-heritage-800 text-white'
                : 'bg-heritage-100 text-heritage-700 hover:bg-heritage-200'
            }`}
          >
            Tous les types ({initialSources.length})
          </button>

          {availableTypes.map((type) => {
            const cfg = TYPE_CONFIG[type] || { label: type, badgeClass: '' };
            const count = initialSources.filter((s) => s.source_type === type).length;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  selectedType === type
                    ? 'bg-heritage-800 text-white'
                    : 'bg-heritage-50 text-heritage-800 border border-heritage-200 hover:bg-heritage-100'
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources Grid */}
      {filteredSources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-heritage-300 p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-heritage-400 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-heritage-900">
            Aucun document ne correspond à vos critères
          </h3>
          <p className="text-sm text-heritage-600 max-w-md mx-auto">
            Vérifiez l’orthographe ou réinitialisez les filtres pour afficher l’ensemble des sources disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSources.map((source) => {
            const typeCfg = TYPE_CONFIG[source.source_type] || {
              label: source.source_type,
              badgeClass: 'bg-heritage-100 text-heritage-800 border-heritage-200',
            };
            const persons = source.linkedPersons || [];

            return (
              <div
                key={source.id}
                className="bg-white p-6 rounded-2xl border border-heritage-200 shadow-sm hover:border-heritage-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${typeCfg.badgeClass}`}>
                      <Tag className="w-3 h-3" />
                      <span>{typeCfg.label}</span>
                    </span>

                    {source.source_date && (
                      <span className="flex items-center space-x-1 text-heritage-500">
                        <Calendar className="w-3 h-3 text-heritage-400" />
                        <span>Date : {source.source_date}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-xl font-bold text-heritage-950">
                    {source.title}
                  </h3>

                  {source.description && (
                    <p className="text-xs sm:text-sm text-heritage-700 font-serif leading-relaxed line-clamp-3">
                      {source.description}
                    </p>
                  )}

                  {source.document_image_url && (
                    <div className="pt-2">
                      {source.document_image_url.toLowerCase().endsWith('.pdf') ? (
                        <a
                          href={source.document_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-red-600" />
                          <span>Consulter l&apos;acte numérisé (PDF)</span>
                        </a>
                      ) : (
                        <a
                          href={source.document_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative rounded-xl overflow-hidden border border-heritage-200 group bg-heritage-100/50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={source.document_image_url}
                            alt={source.title}
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-heritage-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                            <span>Agrandir l&apos;acte d&apos;archive ↗</span>
                          </div>
                        </a>
                      )}
                    </div>
                  )}

                  <div className="pt-2 space-y-1 text-xs text-heritage-600">
                    {source.archive_reference && (
                      <p>
                        <strong className="text-heritage-800">Cote / Référence :</strong>{' '}
                        <code className="bg-heritage-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-heritage-900">
                          {source.archive_reference}
                        </code>
                      </p>
                    )}
                    {source.author_or_organization && (
                      <p className="flex items-center space-x-1">
                        <Building className="w-3.5 h-3.5 text-heritage-400 shrink-0" />
                        <span>{source.author_or_organization}</span>
                      </p>
                    )}
                    {source.rights_status && (
                      <p className="text-[11px] text-heritage-500 italic">
                        Droits : {source.rights_status}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer with linked persons and external URL */}
                <div className="pt-4 border-t border-heritage-100 space-y-3">
                  {persons.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-heritage-700 flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>Personnes documentées par cet acte ({persons.length}) :</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {persons.map((p) => (
                          <Link
                            key={p.id}
                            href={`/genealogie/${p.id}`}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-heritage-50 border border-heritage-200 text-heritage-800 text-xs hover:bg-heritage-200 transition-colors"
                          >
                            <span>{p.first_names} {p.last_name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {source.url && (
                    <div className="pt-1 flex justify-end">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-heritage-800 hover:text-heritage-950 hover:underline"
                      >
                        <span>Consulter le registre numérisé</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
