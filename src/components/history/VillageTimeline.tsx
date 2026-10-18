'use client';

import { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { HistoricalArticle } from '@/lib/types/database';
import { useTranslation } from '@/lib/i18n/context';
import { Locale } from '@/lib/i18n/types';

export interface TimelineEra {
  id: string;
  name: string;
  periodText: string;
  yearRange: [number, number];
  description: string;
}

const HISTORICAL_ERAS_DATA: Record<Locale, TimelineEra[]> = {
  fr: [
    {
      id: 'antiquity',
      name: 'Antiquité & Origines',
      periodText: 'Jusqu’au IVe siècle',
      yearRange: [500, 400],
      description: 'Premières traces d’habitat rupestre, grottes et implantation araméenne antique.',
    },
    {
      id: 'monastic',
      name: 'Essor chrétien & Monastères',
      periodText: 'IVe – XIVe siècle',
      yearRange: [400, 1400],
      description: 'Édification des sanctuaires Mor Hadbshabo et Mor Osyo, rayonnement spirituel du Tur Abdin.',
    },
    {
      id: 'ottoman',
      name: 'Époque Ottomane & Agriculture',
      periodText: 'XVe – XVIIIe siècle',
      yearRange: [1401, 1800],
      description: 'Organisation agraire, cultures en terrasses et mentions dans les registres fiscaux ottomans.',
    },
    {
      id: 'nineteenth',
      name: 'XIXe Siècle & Artisanat',
      periodText: '1801 – 1900',
      yearRange: [1801, 1900],
      description: 'Développement des forges communales, métiers du bois, tissage et premiers recensements modernes.',
    },
    {
      id: 'twentieth',
      name: 'Épreuves du XXe siècle & Sayfo',
      periodText: '1901 – 1970',
      yearRange: [1901, 1970],
      description: 'Les tragiques événements de 1915, la résilience communautaire et les reconstructions d’après-guerre.',
    },
    {
      id: 'diaspora',
      name: 'Diaspora & Mémoire vivante',
      periodText: '1970 – Aujourd’hui',
      yearRange: [1971, 2030],
      description: 'Émigration en Europe, sauvegarde généalogique et transmission du patrimoine immatériel.',
    },
  ],
  en: [
    {
      id: 'antiquity',
      name: 'Antiquity & Origins',
      periodText: 'Up to 4th century',
      yearRange: [500, 400],
      description: 'First cave dwellings, rock-cut shelters and ancient Aramaic settlements.',
    },
    {
      id: 'monastic',
      name: 'Christian Rise & Monasteries',
      periodText: '4th – 14th century',
      yearRange: [400, 1400],
      description: 'Founding of Mor Hadbshabo and Mor Osyo sanctuaries, spiritual influence across Tur Abdin.',
    },
    {
      id: 'ottoman',
      name: 'Ottoman Era & Agriculture',
      periodText: '15th – 18th century',
      yearRange: [1401, 1800],
      description: 'Terraced farming, agrarian community and mentions in Ottoman tax defters.',
    },
    {
      id: 'nineteenth',
      name: '19th Century & Crafts',
      periodText: '1801 – 1900',
      yearRange: [1801, 1900],
      description: 'Communal blacksmiths, woodworking, weaving, and early modern censuses.',
    },
    {
      id: 'twentieth',
      name: '20th Century Trials & Sayfo',
      periodText: '1901 – 1970',
      yearRange: [1901, 1970],
      description: 'The tragic events of 1915, community resilience, and post-war rebuilding.',
    },
    {
      id: 'diaspora',
      name: 'Diaspora & Living Memory',
      periodText: '1970 – Present',
      yearRange: [1971, 2030],
      description: 'Emigration to Europe, genealogical preservation, and oral heritage transmission.',
    },
  ],
};

export function getHistoricalEras(locale: Locale): TimelineEra[] {
  return HISTORICAL_ERAS_DATA[locale] || HISTORICAL_ERAS_DATA.fr;
}

export const HISTORICAL_ERAS: TimelineEra[] = HISTORICAL_ERAS_DATA.fr;

interface VillageTimelineProps {
  articles: HistoricalArticle[];
  selectedEraId?: string | null;
  onSelectEra?: (eraId: string | null) => void;
}

export function VillageTimeline({
  articles,
  selectedEraId,
  onSelectEra,
}: VillageTimelineProps) {
  const { t, locale } = useTranslation();
  const [activeEra, setActiveEra] = useState<string | null>(selectedEraId || null);

  const eras = getHistoricalEras(locale);

  function handleEraClick(eraId: string) {
    const next = activeEra === eraId ? null : eraId;
    setActiveEra(next);
    if (onSelectEra) {
      onSelectEra(next);
    }
  }

  return (
    <div className="bg-heritage-100/60 p-6 sm:p-8 rounded-3xl border border-heritage-200 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-heritage-600 font-semibold flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('history.timelineSubtitle')}</span>
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-heritage-950 mt-0.5">
            {t('history.timelineTitle')}
          </h2>
        </div>

        {activeEra && (
          <button
            type="button"
            onClick={() => handleEraClick(activeEra)}
            className="text-xs font-semibold text-heritage-700 hover:text-heritage-950 underline self-start sm:self-auto"
          >
            {t('history.resetPeriodFilter')}
          </button>
        )}
      </div>

      {/* Timeline track */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eras.map((era) => {
          const isSelected = activeEra === era.id;

          // Count matching articles
          const matchingArticles = articles.filter((art) => {
            if (!art.period_start) return false;
            return art.period_start >= era.yearRange[0] && art.period_start <= era.yearRange[1];
          });

          return (
            <button
              key={era.id}
              type="button"
              onClick={() => handleEraClick(era.id)}
              className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-heritage-800 text-heritage-50 border-heritage-900 shadow-md ring-2 ring-heritage-800 ring-offset-2'
                  : 'bg-white text-heritage-900 border-heritage-200 hover:border-heritage-400 hover:shadow-sm'
              }`}
            >
              <div>
                <span className={`text-[11px] font-semibold uppercase tracking-wider block mb-1 ${
                  isSelected ? 'text-heritage-300' : 'text-heritage-600'
                }`}>
                  {era.periodText}
                </span>
                <h3 className={`font-serif font-bold text-base ${
                  isSelected ? 'text-white' : 'text-heritage-950'
                }`}>
                  {era.name}
                </h3>
                <p className={`text-xs mt-1.5 leading-relaxed font-serif ${
                  isSelected ? 'text-heritage-200' : 'text-heritage-600'
                }`}>
                  {era.description}
                </p>
              </div>

              <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-medium ${
                isSelected ? 'border-heritage-700 text-heritage-300' : 'border-heritage-100 text-heritage-500'
              }`}>
                <span>
                  {t('history.associatedNarratives', { count: matchingArticles.length })}
                </span>
                <span className="flex items-center space-x-1">
                  <span>{isSelected ? t('history.selectedAction') : t('history.filterAction')}</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
