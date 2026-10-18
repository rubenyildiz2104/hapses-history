'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Person, Relationship, VisualFamilyTreeData } from '@/lib/types/database';
import { formatHistoricalDate } from '@/lib/services/dates';
import { Users, Heart, ArrowUp, ArrowDown, Maximize2, Minimize2, ZoomIn, ZoomOut, User } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface InteractiveFamilyTreeProps {
  treeData: VisualFamilyTreeData;
}

function TreeNodeCard({
  person,
  roleLabel,
  isFocus = false,
}: {
  person: Person;
  roleLabel?: string;
  isFocus?: boolean;
}) {
  const birthText = person.birth_year ? String(person.birth_year) : '?';
  const deathText = person.death_year ? String(person.death_year) : '?';
  const datesLabel = `${birthText} – ${deathText}`;

  return (
    <Link
      href={`/genealogie/${person.id}`}
      className={`group block p-3 rounded-xl border text-left transition-all duration-200 shrink-0 ${
        isFocus
          ? 'bg-heritage-900 text-heritage-50 border-heritage-950 shadow-md ring-2 ring-heritage-400 ring-offset-2'
          : 'bg-white text-heritage-950 border-heritage-200 hover:border-heritage-400 hover:shadow-sm hover:scale-[1.02]'
      }`}
      style={{ minWidth: '175px', maxWidth: '210px' }}
    >
      <div className="flex items-center space-x-2.5">
        {/* Avatar or portrait */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${
            isFocus
              ? 'border-heritage-400 bg-heritage-800 text-heritage-200'
              : person.gender === 'F'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-heritage-200 bg-heritage-100 text-heritage-700'
          }`}
        >
          {person.portrait_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.portrait_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {roleLabel && (
            <span
              className={`block text-[10px] uppercase font-bold tracking-wider truncate ${
                isFocus ? 'text-heritage-300' : 'text-heritage-500'
              }`}
            >
              {roleLabel}
            </span>
          )}
          <h4 className="font-serif font-bold text-xs sm:text-sm truncate">
            {person.first_names} {person.last_name}
          </h4>
          <span
            className={`block text-[11px] font-mono mt-0.5 ${
              isFocus ? 'text-heritage-200' : 'text-heritage-600'
            }`}
          >
            {datesLabel}
          </span>
        </div>
      </div>

      {person.profession && (
        <div
          className={`mt-2 pt-1.5 border-t text-[10px] truncate ${
            isFocus
              ? 'border-heritage-800 text-heritage-300'
              : 'border-heritage-100 text-heritage-500'
          }`}
        >
          {person.profession}
        </div>
      )}
    </Link>
  );
}

export function InteractiveFamilyTree({ treeData }: InteractiveFamilyTreeProps) {
  const { t, locale } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const {
    focusPerson,
    paternalGrandparents,
    maternalGrandparents,
    parents,
    spouses,
    children,
    siblings,
  } = treeData;

  const totalAncestors = paternalGrandparents.length + maternalGrandparents.length + parents.length;
  const totalDescendants = children.length + children.reduce((acc, c) => acc + c.grandchildren.length, 0);

  return (
    <div
      className={`rounded-2xl border border-heritage-200 bg-heritage-50/70 p-4 sm:p-6 space-y-6 transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 bg-heritage-50 overflow-y-auto shadow-2xl flex flex-col justify-between'
          : 'relative shadow-sm'
      }`}
    >
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-heritage-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{t('genealogy.tabTree')}</span>
          </span>
          <p className="text-xs text-heritage-500 mt-0.5">
            {totalAncestors} {locale === 'en' ? 'documented ancestors' : 'aïeux documentés'} • {spouses.length} union(s) • {totalDescendants} {locale === 'en' ? 'direct descendants' : 'descendants directs'}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.1))}
            className="p-1.5 rounded-lg border border-heritage-300 bg-white text-heritage-700 hover:bg-heritage-100 transition-colors"
            title={t('tree.zoomOut')}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-medium text-heritage-700 px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.25, z + 0.1))}
            className="p-1.5 rounded-lg border border-heritage-300 bg-white text-heritage-700 hover:bg-heritage-100 transition-colors"
            title={t('tree.zoomIn')}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-heritage-300 bg-white text-heritage-700 hover:bg-heritage-100 text-xs font-medium transition-colors"
            title={isFullscreen ? t('tree.exitFullscreen') : t('tree.fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? t('tree.exitFullscreen') : t('tree.fullscreen')}</span>
          </button>
        </div>
      </div>

      {/* Visual Tree Canvas */}
      <div
        className="overflow-x-auto pb-4 transition-transform origin-top"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        <div className="min-w-[650px] space-y-8 flex flex-col items-center">
          {/* LEVEL +2: Grands-parents */}
          {(paternalGrandparents.length > 0 || maternalGrandparents.length > 0) && (
            <div className="w-full flex flex-col items-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-heritage-600 bg-heritage-200/70 px-3 py-0.5 rounded-full">
                {t('tree.generationGrandparents')}
              </span>
              <div className="flex flex-wrap justify-center gap-4">
                {paternalGrandparents.map((gp) => (
                  <TreeNodeCard
                    key={gp.id}
                    person={gp}
                    roleLabel={locale === 'en' ? (gp.gender === 'F' ? 'Paternal grandmother' : 'Paternal grandfather') : (gp.gender === 'F' ? 'Grand-mère pat.' : 'Grand-père pat.')}
                  />
                ))}
                {maternalGrandparents.map((gp) => (
                  <TreeNodeCard
                    key={gp.id}
                    person={gp}
                    roleLabel={locale === 'en' ? (gp.gender === 'F' ? 'Maternal grandmother' : 'Maternal grandfather') : (gp.gender === 'F' ? 'Grand-mère mat.' : 'Grand-père mat.')}
                  />
                ))}
              </div>
              <div className="w-px h-6 bg-heritage-300"></div>
            </div>
          )}

          {/* LEVEL +1: Parents */}
          {parents.length > 0 ? (
            <div className="w-full flex flex-col items-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-heritage-600 bg-heritage-200/70 px-3 py-0.5 rounded-full">
                {t('tree.generationParents')}
              </span>
              <div className="flex flex-wrap justify-center gap-4">
                {parents.map((parent) => (
                  <TreeNodeCard
                    key={parent.id}
                    person={parent}
                    roleLabel={parent.gender === 'F' ? t('genealogy.mother') : t('genealogy.father')}
                  />
                ))}
              </div>
              <div className="w-px h-6 bg-heritage-300"></div>
            </div>
          ) : (
            <div className="text-[11px] text-heritage-500 italic bg-heritage-100/50 px-3 py-1 rounded-full border border-dashed border-heritage-200">
              {t('tree.noParents')}
            </div>
          )}

          {/* LEVEL 0: Personne centrale + Conjoints + Fratrie */}
          <div className="w-full flex flex-col items-center space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-heritage-950 bg-amber-200/80 px-3 py-0.5 rounded-full border border-amber-300">
              {t('tree.generationSubject')}
            </span>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Spouses */}
              {spouses.map(({ person, relationship }) => {
                const year = relationship.start_year ? `m. ${relationship.start_year}` : (locale === 'en' ? 'Union' : 'Union');
                const spouseRole = locale === 'en'
                  ? (person.gender === 'F' ? `Wife (${year})` : `Husband (${year})`)
                  : (person.gender === 'F' ? `Épouse (${year})` : `Époux (${year})`);
                return (
                  <div key={relationship.id} className="flex items-center space-x-2">
                    <TreeNodeCard
                      person={person}
                      roleLabel={spouseRole}
                    />
                    <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                  </div>
                );
              })}

              {/* Central Focus Person */}
              <TreeNodeCard
                person={focusPerson}
                roleLabel={locale === 'en' ? 'Selected record' : 'Fiche sélectionnée'}
                isFocus={true}
              />

              {/* Siblings */}
              {siblings.length > 0 && (
                <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-heritage-300">
                  <div className="text-[10px] uppercase font-bold text-heritage-600 vertical-text pr-1">
                    {t('genealogy.siblings')}
                  </div>
                  {siblings.slice(0, 3).map((sib) => (
                    <TreeNodeCard
                      key={sib.id}
                      person={sib}
                      roleLabel={locale === 'en' ? (sib.gender === 'F' ? 'Sister' : 'Brother') : (sib.gender === 'F' ? 'Sœur' : 'Frère')}
                    />
                  ))}
                  {siblings.length > 3 && (
                    <span className="text-xs text-heritage-500">+{siblings.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            {children.length > 0 && (
              <div className="w-px h-6 bg-heritage-300"></div>
            )}
          </div>

          {/* LEVEL -1 & -2: Enfants & Petits-enfants */}
          {children.length > 0 && (
            <div className="w-full flex flex-col items-center space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-heritage-600 bg-heritage-200/70 px-3 py-0.5 rounded-full">
                {t('tree.generationChildren')} ({children.length})
              </span>

              <div className="flex flex-wrap justify-center gap-6">
                {children.map(({ person: child, grandchildren }) => (
                  <div
                    key={child.id}
                    className="flex flex-col items-center space-y-2 p-3 rounded-2xl bg-white/60 border border-heritage-200"
                  >
                    <TreeNodeCard
                      person={child}
                      roleLabel={locale === 'en' ? (child.gender === 'F' ? 'Daughter' : 'Son') : (child.gender === 'F' ? 'Fille' : 'Fils')}
                    />

                    {grandchildren.length > 0 && (
                      <div className="w-full flex flex-col items-center space-y-1.5 pt-2 border-t border-heritage-200">
                        <span className="text-[10px] uppercase font-semibold text-heritage-500">
                          {t('tree.generationGrandchildren')} ({grandchildren.length})
                        </span>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {grandchildren.map((gc) => (
                            <Link
                              key={gc.id}
                              href={`/genealogie/${gc.id}`}
                              className="px-2 py-1 rounded bg-heritage-100 hover:bg-heritage-200 text-heritage-900 text-[11px] font-medium transition-colors"
                            >
                              {gc.first_names} {gc.last_name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
