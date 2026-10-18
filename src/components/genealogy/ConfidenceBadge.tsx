'use client';

import { DatePrecision } from '@/lib/types/database';
import { CheckCircle2, HelpCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface ConfidenceBadgeProps {
  precision?: DatePrecision;
  isHypothesis?: boolean;
  label?: string;
}

export function ConfidenceBadge({ precision, isHypothesis, label }: ConfidenceBadgeProps) {
  const { t } = useTranslation();

  if (isHypothesis) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
        <AlertTriangle className="w-3 h-3 text-amber-700" />
        <span>{label ?? t('genealogy.hypothesis')}</span>
      </span>
    );
  }

  if (!precision) {
    return null;
  }

  switch (precision) {
    case 'exact':
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{t('genealogy.documentedFact')}</span>
        </span>
      );

    case 'approximate':
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{t('genealogy.approximateDate')}</span>
        </span>
      );

    case 'before':
    case 'after':
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 border border-stone-300">
          <Clock className="w-3 h-3 text-stone-500" />
          <span>{t('genealogy.dateRange')}</span>
        </span>
      );

    case 'year_only':
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 border border-stone-300">
          <span>{t('genealogy.attestedYear')}</span>
        </span>
      );

    case 'unknown':
    default:
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
          <HelpCircle className="w-3 h-3 text-stone-400" />
          <span>{t('genealogy.undocumentedDate')}</span>
        </span>
      );
  }
}
