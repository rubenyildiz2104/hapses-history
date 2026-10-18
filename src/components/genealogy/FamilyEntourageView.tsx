import { FamilyEntourage } from '@/lib/types/database';
import { PersonCard } from './PersonCard';
import { formatHistoricalDate } from '@/lib/services/dates';
import { Heart, Users, ArrowUp, ArrowDown } from 'lucide-react';

interface FamilyEntourageViewProps {
  entourage: FamilyEntourage;
}

export function FamilyEntourageView({ entourage }: FamilyEntourageViewProps) {
  const { parents, spouses, children, siblings } = entourage;

  const hasEntourage =
    parents.length > 0 || spouses.length > 0 || children.length > 0 || siblings.length > 0;

  if (!hasEntourage) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-heritage-300 bg-heritage-50/50 text-center">
        <Users className="w-8 h-8 text-heritage-400 mx-auto mb-2" />
        <p className="text-sm text-heritage-700 font-medium">
          Aucun lien familial documenté pour cette fiche pour le moment.
        </p>
        <p className="text-xs text-heritage-500 mt-1">
          Les recherches généalogiques sont en cours. Vous pouvez proposer un ajout si vous disposez d&apos;actes d&apos;archives.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Parents */}
      {parents.length > 0 && (
        <section aria-labelledby="parents-heading">
          <div className="flex items-center space-x-2 mb-3 pb-1 border-b border-heritage-200">
            <ArrowUp className="w-4 h-4 text-heritage-600" />
            <h2 id="parents-heading" className="font-serif text-lg font-bold text-heritage-900">
              Parents ({parents.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parents.map(({ person, relationId }) => (
              <PersonCard
                key={relationId}
                person={person}
                relationshipLabel={person.gender === 'F' ? 'Mère' : person.gender === 'M' ? 'Père' : 'Parent'}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. Spouses */}
      {spouses.length > 0 && (
        <section aria-labelledby="spouses-heading">
          <div className="flex items-center space-x-2 mb-3 pb-1 border-b border-heritage-200">
            <Heart className="w-4 h-4 text-rose-600" />
            <h2 id="spouses-heading" className="font-serif text-lg font-bold text-heritage-900">
              Union(s) & Conjoint(s) ({spouses.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {spouses.map(({ person, relationship }) => {
              const marriageDate = formatHistoricalDate({
                date: relationship.start_date,
                year: relationship.start_year,
                precision: relationship.start_date_precision,
              });

              return (
                <div key={relationship.id} className="space-y-1.5">
                  <PersonCard
                    person={person}
                    relationshipLabel={person.gender === 'F' ? 'Épouse' : person.gender === 'M' ? 'Époux' : 'Conjoint'}
                  />
                  {(relationship.start_year || relationship.start_place) && (
                    <p className="text-xs text-heritage-600 px-1 italic">
                      Mariage : {marriageDate !== 'Date inconnue' ? marriageDate : ''}{' '}
                      {relationship.start_place ? `à ${relationship.start_place}` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Children */}
      {children.length > 0 && (
        <section aria-labelledby="children-heading">
          <div className="flex items-center space-x-2 mb-3 pb-1 border-b border-heritage-200">
            <ArrowDown className="w-4 h-4 text-heritage-600" />
            <h2 id="children-heading" className="font-serif text-lg font-bold text-heritage-900">
              Enfants ({children.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map(({ person, relationId }) => (
              <PersonCard
                key={relationId}
                person={person}
                relationshipLabel={person.gender === 'F' ? 'Fille' : person.gender === 'M' ? 'Fils' : 'Enfant'}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Siblings */}
      {siblings.length > 0 && (
        <section aria-labelledby="siblings-heading">
          <div className="flex items-center space-x-2 mb-3 pb-1 border-b border-heritage-200">
            <Users className="w-4 h-4 text-heritage-600" />
            <h2 id="siblings-heading" className="font-serif text-lg font-bold text-heritage-900">
              Frères et Sœurs ({siblings.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {siblings.map(({ person, relationId }) => (
              <PersonCard
                key={relationId}
                person={person}
                relationshipLabel={person.gender === 'F' ? 'Sœur' : person.gender === 'M' ? 'Frère' : 'Fratrie'}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
