import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { FileText, Plus, Search, Globe, Lock, ExternalLink, Calendar } from 'lucide-react';
import { Source } from '@/lib/types/database';

export const metadata = {
  title: 'Gestion des sources & archives | Administration',
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  parish_register: 'Registre paroissial',
  civil_registry: 'État civil',
  census: 'Recensement / Defter',
  oral_testimony: 'Témoignage oral',
  communal_archives: 'Archives communales',
  notarial_act: 'Acte notarié',
  other: 'Autre document',
};

export default async function AdminSourcesPage() {
  const adminClient = createAdminClient();

  // Fetch all sources (public and private)
  const { data: rawSources } = await adminClient
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false });

  const sources = (rawSources as Source[]) || [];

  const publicCount = sources.filter((s) => s.is_public).length;
  const privateCount = sources.filter((s) => !s.is_public).length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-heritage-950">
            Sources & Archives du Village
          </h1>
          <p className="text-sm text-heritage-700 mt-1">
            Inventaire des documents d’archives, registres paroissiaux, actes et témoignages.
          </p>
        </div>

        <Link
          href="/admin/sources/nouveau"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle source</span>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-heritage-200">
          <span className="text-xs uppercase font-semibold text-heritage-500">Total documents</span>
          <div className="text-2xl font-bold text-heritage-900 mt-1">{sources.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-heritage-200">
          <span className="text-xs uppercase font-semibold text-emerald-600 flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Publiques (en ligne)</span>
          </span>
          <div className="text-2xl font-bold text-emerald-950 mt-1">{publicCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-heritage-200">
          <span className="text-xs uppercase font-semibold text-amber-600 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Privées / Réservées</span>
          </span>
          <div className="text-2xl font-bold text-amber-950 mt-1">{privateCount}</div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-2xl border border-heritage-200 overflow-hidden shadow-sm">
        {sources.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-heritage-400 mx-auto" />
            <p className="text-sm text-heritage-700 font-medium">
              Aucune source d’archive enregistrée pour le moment.
            </p>
            <Link
              href="/admin/sources/nouveau"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-heritage-800 underline hover:text-heritage-950"
            >
              <span>Ajouter la première source</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-heritage-50/70 border-b border-heritage-200 text-[11px] font-semibold uppercase tracking-wider text-heritage-600">
                  <th className="py-3 px-4">Titre de la source</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Période / Date</th>
                  <th className="py-3 px-4">Cote d&apos;archive</th>
                  <th className="py-3 px-4 text-center">Visibilité</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-heritage-100 text-xs">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-heritage-50/50 transition-colors">
                    <td className="py-3 px-4 font-serif font-bold text-heritage-950 max-w-xs truncate">
                      <Link
                        href={`/admin/sources/${source.id}`}
                        className="hover:underline hover:text-heritage-800"
                      >
                        {source.title}
                      </Link>
                      {source.author_or_organization && (
                        <p className="text-[11px] font-sans font-normal text-heritage-600 truncate">
                          {source.author_or_organization}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-heritage-100 text-heritage-800">
                        {SOURCE_TYPE_LABELS[source.source_type] || source.source_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-heritage-700">
                      {source.source_date || '—'}
                    </td>
                    <td className="py-3 px-4 text-heritage-600 font-mono text-[11px]">
                      {source.archive_reference || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {source.is_public ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <Globe className="w-3 h-3" />
                          <span>Publique</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          <Lock className="w-3 h-3" />
                          <span>Privée</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/sources/${source.id}`}
                        className="inline-flex items-center space-x-1 text-heritage-700 font-semibold hover:text-heritage-950 underline"
                      >
                        <span>Éditer</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
