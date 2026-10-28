'use client';

import { useState, useEffect, useTransition } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, Sparkles, HeartHandshake, Code, MessageSquare, Copy, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { submitContactMessageAction } from '@/app/actions/contact';

type CategoryType = 'help_genealogy' | 'app_improvement' | 'technical_help' | 'question_other';

export function ContactForm() {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<CategoryType>('app_improvement');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-fill user's name and email if logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email) setEmail(user.email);
        supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.display_name) {
              setName(data.display_name);
            } else if (user.user_metadata?.display_name) {
              setName(user.user_metadata.display_name);
            }
          });
      }
    });
  }, []);

  function handleCopyEmail() {
    navigator.clipboard.writeText('ruben.yldz@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await submitContactMessageAction({
        name,
        email,
        category,
        subject,
        message,
      });

      if (res.success) {
        setSuccess(true);
        setSubject('');
        setMessage('');
      } else {
        setError(res.error || 'Une erreur est survenue lors de l’envoi de votre message.');
      }
    });
  }

  const categoryOptions = [
    {
      id: 'app_improvement' as const,
      label: t('contact.catAppImprovement'),
      icon: Sparkles,
      desc: 'Idées de fonctionnalités, retours d’ergonomie, suggestions d’amélioration.',
    },
    {
      id: 'help_genealogy' as const,
      label: t('contact.catHelpGenealogy'),
      icon: HeartHandshake,
      desc: 'Transmettre des documents, arbres de famille, actes, photos ou récits.',
    },
    {
      id: 'technical_help' as const,
      label: t('contact.catTechnicalHelp'),
      icon: Code,
      desc: 'Contribuer au code, à l’infrastructure ou traduire l’application.',
    },
    {
      id: 'question_other' as const,
      label: t('contact.catOther'),
      icon: MessageSquare,
      desc: 'Toute autre question, partenariat ou échange sur la mémoire d’Habses.',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Column 1: Direct Contact Card with Admin */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-heritage-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-heritage-600">
              {t('contact.directContactTitle')}
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-heritage-950">
              Ruben Yildiz
            </h2>
            <p className="text-xs sm:text-sm text-heritage-600 font-serif">
              {t('contact.adminRole')}
            </p>
          </div>

          <p className="text-sm text-heritage-700 leading-relaxed">
            {t('contact.directContactDesc')}
          </p>

          {/* Email address with quick copy & mailto */}
          <div className="p-4 rounded-xl bg-heritage-100/70 border border-heritage-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-heritage-600 tracking-wider">
                Email direct :
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center space-x-1 text-xs text-heritage-700 hover:text-heritage-950 font-medium transition-colors"
                title="Copier l'email"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            <p className="font-mono text-sm font-semibold text-heritage-950 break-all select-all">
              ruben.yldz@gmail.com
            </p>

            <a
              href="mailto:ruben.yldz@gmail.com?subject=Projet%20Habses%20-%20Aide%20ou%20Am%C3%A9lioration"
              className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t('contact.sendEmailButton')}</span>
            </a>
          </div>

          {/* Themes where assistance is warmly welcomed */}
          <div className="space-y-3 pt-2 border-t border-heritage-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-800">
              Comment vous pouvez aider :
            </h3>
            <ul className="space-y-2.5 text-xs text-heritage-700">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-heritage-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Archives familiales :</strong> photos d’époque, arbres manuscrits, passeports ottomans, livrets de famille.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-heritage-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Idées d’amélioration :</strong> fonctionnalités manquantes, confort de lecture, recherche avancée.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-heritage-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Aide technique & traduction :</strong> contributions de code (Next.js/React/PostgreSQL), traductions en langues du village.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Column 2: Interactive Contact Form */}
      <div className="lg:col-span-7">
        <div className="bg-white rounded-2xl border border-heritage-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="space-y-1">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-heritage-950">
              {t('contact.formTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-heritage-600 font-serif">
              {t('contact.formDesc')}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-emerald-950">
                {t('contact.successTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 font-serif leading-relaxed max-w-md mx-auto">
                {t('contact.successDesc')}
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="px-4 py-2 rounded-lg bg-emerald-800 text-emerald-50 text-xs font-semibold hover:bg-emerald-900 transition-colors"
                >
                  {t('contact.sendAnother')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category picker */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800">
                  {t('contact.categoryLabel')} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categoryOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = category === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCategory(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start space-x-2.5 ${
                          isSelected
                            ? 'border-heritage-800 bg-heritage-100/60 ring-1 ring-heritage-800 shadow-xs'
                            : 'border-heritage-200 bg-white hover:border-heritage-300 hover:bg-heritage-50/50'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-heritage-800 text-heritage-50'
                              : 'bg-heritage-100 text-heritage-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-serif font-bold text-xs text-heritage-950 leading-tight">
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-heritage-600 line-clamp-2 leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    {t('contact.nameLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('contact.namePlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    {t('contact.emailLabel')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('contact.emailPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                  {t('contact.subjectLabel')} *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('contact.subjectPlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                  {t('contact.messageLabel')} *
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('contact.messagePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600 resize-y"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('contact.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>{t('contact.submitButton')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
