'use client';

import { useState } from 'react';
import type { FamilyEntourage, VisualFamilyTreeData } from '@/lib/types/database';
import { FamilyEntourageView } from './FamilyEntourageView';
import { InteractiveFamilyTree } from './InteractiveFamilyTree';
import { LayoutGrid, Network } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface FamilyViewTabsProps {
  entourage: FamilyEntourage;
  treeData: VisualFamilyTreeData;
}

export function FamilyViewTabs({ entourage, treeData }: FamilyViewTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'cards' | 'tree'>('tree');

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-heritage-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
            {t('tree.generationParents')} & {t('tree.generationChildren')}
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-heritage-950 mt-0.5">
            {t('home.cardGenealogyTitle')}
          </h2>
        </div>

        <div className="inline-flex rounded-xl bg-heritage-100 p-1 border border-heritage-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tree'
                ? 'bg-heritage-800 text-heritage-50 shadow-sm'
                : 'text-heritage-700 hover:text-heritage-950 hover:bg-heritage-200/50'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{t('genealogy.tabTree')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'cards'
                ? 'bg-heritage-800 text-heritage-50 shadow-sm'
                : 'text-heritage-700 hover:text-heritage-950 hover:bg-heritage-200/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{t('genealogy.tabDetails')}</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'tree' ? (
        <InteractiveFamilyTree treeData={treeData} />
      ) : (
        <FamilyEntourageView entourage={entourage} />
      )}
    </div>
  );
}
