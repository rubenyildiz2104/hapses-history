import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  User, 
  Shield, 
  Calendar, 
  ArrowLeft,
  FileText,
  Filter
} from 'lucide-react';

export const metadata = {
  title: 'Journal d’audit | Administration Habses',
  description: 'Journal immuable de traçabilité des opérations de modération et modifications sensibles.',
};

interface PageProps {
  searchParams: Promise<{ action?: string }>;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  accept_add_person: {
    label: 'Création personne (acceptée)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  accept_update_person: {
    label: 'Mise à jour fiche (acceptée)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  accept_add_relationship: {
    label: 'Création lien familial (accepté)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  reject_proposal: {
    label: 'Rejet de proposition',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: XCircle,
  },
  request_info_proposal: {
    label: 'Demande de compléments',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: HelpCircle,
  },
};

export default async function AdminAuditPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const filterAction = searchParams.action || 'all';

  const adminSupabase = createAdminClient();

  // Query audit logs
  let query = adminSupabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filterAction !== 'all') {
    query = query.eq('action', filterAction);
  }

  const { data: logs, error } = await query;
  const auditLogs = logs || [];

  // Batch query actors
  const actorIds = Array.from(
    new Set(auditLogs.map((l) => l.actor_id).filter((id): id is string => Boolean(id)))
  );

  const { data: profiles } = actorIds.length > 0
    ? await adminSupabase.from('profiles').select('id, display_name').in('id', actorIds)
    : { data: [] };

  const actorMap = new Map((profiles || []).map((p) => [p.id, p.display_name]));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-heritage-600 font-semibold">
            Traçabilité & Immuabilité
          </span>
          <h1 className="font-serif text-3xl font-bold text-heritage-950 mt-1">
            Journal d’audit des opérations sensibles
          </h1>
          <p className="text-sm text-heritage-600 font-serif max-w-2xl mt-1">
            Conformément aux spécifications (Section 13), chaque décision de modération et intervention
            sur les données est horodatée et conservée de façon immuable.
          </p>
        </div>
      </div>

      {/* Action Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-heritage-200 pb-3">
        <Link
          href="/admin/audit"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterAction === 'all'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Toutes les opérations ({auditLogs.length})
        </Link>
        <Link
          href="/admin/audit?action=accept_add_person"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterAction === 'accept_add_person'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Créations personnes
        </Link>
        <Link
          href="/admin/audit?action=accept_update_person"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterAction === 'accept_update_person'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Mises à jour
        </Link>
        <Link
          href="/admin/audit?action=reject_proposal"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterAction === 'reject_proposal'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Rejets
        </Link>
        <Link
          href="/admin/audit?action=request_info_proposal"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterAction === 'request_info_proposal'
              ? 'bg-heritage-800 text-white shadow-sm'
              : 'text-heritage-700 hover:bg-heritage-200/60'
          }`}
        >
          Demandes de compléments
        </Link>
      </div>

      {/* Logs Table / Timeline */}
      {auditLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-heritage-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-heritage-100 text-heritage-600 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-lg font-bold text-heritage-900">
            Aucun enregistrement d’audit dans cette catégorie
          </h2>
          <p className="text-xs text-heritage-600 max-w-md mx-auto">
            Le journal d’audit enregistre automatiquement chaque décision de modération prise sur la plateforme.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-heritage-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-heritage-100">
            {auditLogs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] || {
                label: log.action,
                badgeClass: 'bg-heritage-100 text-heritage-800 border-heritage-200',
                icon: Shield,
              };
              const Icon = cfg.icon;
              const actorName = log.actor_id ? actorMap.get(log.actor_id) || 'Administrateur' : 'Système';
              const details = log.details as Record<string, unknown>;

              return (
                <div key={log.id} className="p-5 hover:bg-heritage-50/50 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold border ${cfg.badgeClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </span>
                      <span className="text-xs text-heritage-600">
                        par <strong className="text-heritage-900">{actorName}</strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-heritage-500">
                      <Calendar className="w-3.5 h-3.5 text-heritage-400" />
                      <span>
                        {new Date(log.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Details summary */}
                  <div className="text-xs text-heritage-700 bg-heritage-50/70 p-3 rounded-lg border border-heritage-100 space-y-1">
                    <div className="flex items-center space-x-3 text-heritage-600 text-[11px]">
                      <span>Entité : <strong>{log.entity_type}</strong></span>
                      {log.entity_id && (
                        <span>
                          ID : <code className="bg-heritage-200/60 px-1 py-0.5 rounded font-mono text-[10px]">{log.entity_id}</code>
                        </span>
                      )}
                    </div>

                    {details && Object.keys(details).length > 0 && (
                      <div className="pt-1 text-heritage-800 font-mono text-[11px]">
                        <pre className="whitespace-pre-wrap font-sans text-xs">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
