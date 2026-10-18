import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, ShieldAlert, CheckSquare, History, ArrowLeft, LogOut, BookOpen } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/connexion?next=/admin/moderation');
  }

  // Check admin role in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-red-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-heritage-950">
            Accès Réservé aux Administrateurs
          </h1>
          <p className="text-sm text-heritage-700 font-serif leading-relaxed">
            Votre compte ({user.email}) ne dispose pas des privilèges d’administration nécessaires pour accéder à l’espace de modération et d’audit.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à l’accueil</span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border border-heritage-300 text-heritage-700 text-sm font-medium hover:bg-heritage-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Fetch pending proposals count for badge
  const { count: pendingCount } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="min-h-screen bg-heritage-100/40">
      {/* Admin Top Navigation */}
      <header className="bg-heritage-900 text-heritage-50 border-b border-heritage-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/admin/moderation" className="flex items-center space-x-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-heritage-800 border border-heritage-700 flex items-center justify-center text-heritage-100 group-hover:bg-heritage-700 transition-colors">
                  <Shield className="w-4 h-4 text-heritage-200" />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-sm text-heritage-50 tracking-tight">
                    Habses
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-heritage-300 font-semibold">
                    Administration
                  </span>
                </div>
              </Link>

              <nav className="hidden sm:flex items-center space-x-1">
                <Link
                  href="/admin/moderation"
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold text-heritage-100 hover:text-white hover:bg-heritage-800 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-heritage-300" />
                  <span>Modération</span>
                  {pendingCount !== null && pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-heritage-950">
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/articles"
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold text-heritage-100 hover:text-white hover:bg-heritage-800 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-heritage-300" />
                  <span>Articles & Récits</span>
                </Link>

                <Link
                  href="/admin/audit"
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold text-heritage-100 hover:text-white hover:bg-heritage-800 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-heritage-300" />
                  <span>Journal d’audit</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="hidden md:inline text-xs text-heritage-300">
                Admin : <strong className="text-white">{profile.display_name || user.email}</strong>
              </span>

              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs text-heritage-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Site public</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile admin sub-nav */}
        <div className="sm:hidden flex border-t border-heritage-800 px-4 py-2 space-x-2 bg-heritage-950/40">
          <Link
            href="/admin/moderation"
            className="flex-1 text-center py-1.5 rounded text-xs font-semibold text-heritage-100 hover:bg-heritage-800"
          >
            Modération {pendingCount ? `(${pendingCount})` : ''}
          </Link>
          <Link
            href="/admin/articles"
            className="flex-1 text-center py-1.5 rounded text-xs font-semibold text-heritage-100 hover:bg-heritage-800"
          >
            Articles
          </Link>
          <Link
            href="/admin/audit"
            className="flex-1 text-center py-1.5 rounded text-xs font-semibold text-heritage-100 hover:bg-heritage-800"
          >
            Audit
          </Link>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
