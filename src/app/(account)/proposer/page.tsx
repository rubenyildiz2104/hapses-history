'use client';

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  submitProposalAction, 
  getProposalForEditAction, 
  updateProposalAction,
  getPersonForCorrectionAction,
  searchPersonsForCorrectionAction,
  getPersonSummaryAction,
  getPersonParentsAction,
  getPersonSpousesAction
} from '@/app/actions/proposals';
import { ProposalType, DatePrecision, LifeStatus } from '@/lib/types/database';
import { 
  UserPlus, 
  Edit3, 
  HeartHandshake, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Loader2,
  User,
  ExternalLink,
  Search,
  ArrowRight,
  X,
  Users,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface PersonSummary {
  id: string;
  first_names: string;
  last_name: string;
  birth_year: number | null;
  death_year: number | null;
  profession: string | null;
  gender?: string | null;
}

function PersonPicker({
  label,
  description,
  selectedPerson,
  onSelect,
  onRemove,
  excludePersonId,
  placeholder = "Rechercher par prénom ou nom...",
}: {
  label: string;
  description?: string;
  selectedPerson: PersonSummary | null;
  onSelect: (p: PersonSummary) => void;
  onRemove?: () => void;
  excludePersonId?: string | null;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchPersonsForCorrectionAction(q);
      const filtered = (res || []).filter((p) => p.id !== excludePersonId);
      setResults(filtered);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800">
        {label}
      </label>
      {description && (
        <p className="text-xs text-heritage-500 font-serif leading-relaxed">
          {description}
        </p>
      )}

      {selectedPerson ? (
        <div className="p-3 rounded-xl bg-heritage-50 border border-heritage-300 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-heritage-200 text-heritage-800 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-serif font-bold text-sm text-heritage-950 truncate">
                {selectedPerson.first_names} {selectedPerson.last_name}
              </p>
              <p className="text-xs text-heritage-600">
                {selectedPerson.birth_year ? `° ${selectedPerson.birth_year}` : '° ?'} — {selectedPerson.death_year ? `† ${selectedPerson.death_year}` : '† ?'}
                {selectedPerson.profession ? ` • ${selectedPerson.profession}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Link
              href={`/genealogie/${selectedPerson.id}`}
              target="_blank"
              className="text-xs text-heritage-700 hover:text-heritage-950 underline inline-flex items-center space-x-1 font-semibold"
            >
              <span>Voir fiche</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="px-2 py-1 rounded-md text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
              >
                Changer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-heritage-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600 bg-white"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-heritage-500 animate-spin absolute right-3 top-3" />
            )}
          </div>

          {results.length > 0 && (
            <div className="divide-y divide-heritage-100 border border-heritage-200 rounded-lg max-h-52 overflow-y-auto bg-white shadow-xs">
              {results.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 flex items-center justify-between hover:bg-heritage-50 transition-colors"
                >
                  <div>
                    <p className="font-serif font-bold text-xs sm:text-sm text-heritage-950">
                      {p.first_names} {p.last_name}
                    </p>
                    <p className="text-[11px] text-heritage-500">
                      {p.birth_year ? `° ${p.birth_year}` : '° ?'} — {p.death_year ? `† ${p.death_year}` : '† ?'}
                      {p.profession ? ` • ${p.profession}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(p);
                      setQuery('');
                      setResults([]);
                    }}
                    className="px-2.5 py-1 rounded bg-heritage-800 text-heritage-50 text-xs font-medium hover:bg-heritage-900 transition-colors shrink-0"
                  >
                    Sélectionner
                  </button>
                </div>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && results.length === 0 && !isSearching && (
            <p className="text-xs text-heritage-500 italic pl-1">
              Aucune personne trouvée pour « {query} ».
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProposerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTargetPersonId = searchParams.get('targetPersonId');
  const editProposalId = searchParams.get('editProposalId');
  const typeParam = searchParams.get('type');
  const personAParam = searchParams.get('personAId');

  const [proposalType, setProposalType] = useState<ProposalType>(() => {
    if (typeParam === 'add_relationship' || personAParam) return 'add_relationship';
    if (prefillTargetPersonId) return 'update_person';
    return 'add_person';
  });

  // Edit proposal state
  const [isLoadingProposal, setIsLoadingProposal] = useState(Boolean(editProposalId));
  const [adminComment, setAdminComment] = useState<string | null>(null);
  const [editTargetPersonId, setEditTargetPersonId] = useState<string | null>(null);

  // Target person prefill state for 'update_person'
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(prefillTargetPersonId || null);
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string;
    first_names: string;
    last_name: string;
  } | null>(null);
  const [isLoadingPerson, setIsLoadingPerson] = useState(Boolean(prefillTargetPersonId && !editProposalId));

  // Search for person to correct when none preselected
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PersonSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form states for Person (add_person / update_person)
  const [firstNames, setFirstNames] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameVariants, setNameVariants] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'other' | 'unknown'>('unknown');
  const [birthYear, setBirthYear] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthDatePrecision, setBirthDatePrecision] = useState<DatePrecision>('unknown');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [deathDatePrecision, setDeathDatePrecision] = useState<DatePrecision>('unknown');
  const [deathPlace, setDeathPlace] = useState('');
  const [lifeStatus, setLifeStatus] = useState<LifeStatus>('deceased');
  const [profession, setProfession] = useState('');
  const [biography, setBiography] = useState('');

  // Optional family link when adding a new person (add_person)
  const [parentPerson, setParentPerson] = useState<PersonSummary | null>(null);
  const [parent2Person, setParent2Person] = useState<PersonSummary | null>(null);
  const [parentAutoSpouse, setParentAutoSpouse] = useState<PersonSummary | null>(null);
  const [spousePerson, setSpousePerson] = useState<PersonSummary | null>(null);
  const [siblingPerson, setSiblingPerson] = useState<PersonSummary | null>(null);
  const [siblingDetectedParents, setSiblingDetectedParents] = useState<PersonSummary[]>([]);

  // Form states for Relationship (add_relationship)
  const [relType, setRelType] = useState<'parent_child' | 'spouse' | 'sibling'>('parent_child');
  const [relPersonA, setRelPersonA] = useState<PersonSummary | null>(null);
  const [relPersonB, setRelPersonB] = useState<PersonSummary | null>(null);
  const [relSecondParent, setRelSecondParent] = useState<PersonSummary | null>(null);
  const [alsoLinkSecondParent, setAlsoLinkSecondParent] = useState<boolean>(true);
  const [isSecondParentAutoSpouse, setIsSecondParentAutoSpouse] = useState<boolean>(false);
  const [relStartYear, setRelStartYear] = useState('');
  const [relStartDate, setRelStartDate] = useState('');
  const [relStartPlace, setRelStartPlace] = useState('');
  const [relNotes, setRelNotes] = useState('');

  // Common parent details for sibling relationship (when neither has a parent in DB)
  const [relPersonAParents, setRelPersonAParents] = useState<PersonSummary[]>([]);
  const [relPersonBParents, setRelPersonBParents] = useState<PersonSummary[]>([]);
  const [relCommonParentFirstNames, setRelCommonParentFirstNames] = useState('');
  const [relCommonParentLastName, setRelCommonParentLastName] = useState('');
  const [relCommonParentGender, setRelCommonParentGender] = useState<'M' | 'F'>('M');

  // Sources & explanations (shared across all forms)
  const [sourceTitle, setSourceTitle] = useState('');
  const [archiveReference, setArchiveReference] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [uncertaintyNotes, setUncertaintyNotes] = useState('');
  const [userExplanation, setUserExplanation] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function populateFormWithPerson(p: Record<string, unknown>) {
    setSelectedPerson({
      id: String(p.id),
      first_names: String(p.first_names || ''),
      last_name: String(p.last_name || ''),
    });
    setSelectedPersonId(String(p.id));
    setProposalType('update_person');

    setFirstNames(p.first_names ? String(p.first_names) : '');
    setLastName(p.last_name ? String(p.last_name) : '');
    if (Array.isArray(p.name_variants)) {
      setNameVariants(p.name_variants.join(', '));
    } else if (p.name_variants) {
      setNameVariants(String(p.name_variants));
    } else {
      setNameVariants('');
    }
    setGender((p.gender as 'M' | 'F' | 'other' | 'unknown') || 'unknown');
    setProfession(p.profession ? String(p.profession) : '');
    setBiography(p.biography ? String(p.biography) : '');

    setBirthYear(p.birth_year ? String(p.birth_year) : '');
    setBirthDate(p.birth_date ? String(p.birth_date) : '');
    setBirthDatePrecision((p.birth_date_precision as DatePrecision) || 'unknown');
    setBirthPlace(p.birth_place ? String(p.birth_place) : '');

    setDeathYear(p.death_year ? String(p.death_year) : '');
    setDeathDate(p.death_date ? String(p.death_date) : '');
    setDeathDatePrecision((p.death_date_precision as DatePrecision) || 'unknown');
    setDeathPlace(p.death_place ? String(p.death_place) : '');
    setLifeStatus((p.life_status as LifeStatus) || 'deceased');
  }

  // Load existing person data when prefillTargetPersonId is provided in URL
  useEffect(() => {
    if (!prefillTargetPersonId || editProposalId) return;

    let isMounted = true;
    async function loadTargetPerson() {
      setIsLoadingPerson(true);
      setError(null);
      try {
        const p = await getPersonForCorrectionAction(prefillTargetPersonId!);
        if (!isMounted) return;
        if (p) {
          populateFormWithPerson(p as Record<string, unknown>);
        } else {
          setError('Impossible de trouver la fiche de la personne demandée pour correction.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Erreur lors du chargement des informations de la personne.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingPerson(false);
        }
      }
    }

    loadTargetPerson();
    return () => {
      isMounted = false;
    };
  }, [prefillTargetPersonId, editProposalId]);

  // Load Person A when personAId is provided in URL
  useEffect(() => {
    if (!personAParam || editProposalId) return;

    let isMounted = true;
    async function loadPersonA() {
      try {
        const summary = await getPersonSummaryAction(personAParam!);
        if (isMounted && summary) {
          setRelPersonA(summary);
          setProposalType('add_relationship');
          setRelCommonParentLastName(summary.last_name);
        }
      } catch {
        // Ignore error
      }
    }
    loadPersonA();
    return () => {
      isMounted = false;
    };
  }, [personAParam, editProposalId]);

  // Check parents of Person A when Person A changes
  useEffect(() => {
    if (!relPersonA) {
      setRelPersonAParents([]);
      return;
    }
    setRelCommonParentLastName(relPersonA.last_name);
    let isMounted = true;
    getPersonParentsAction(relPersonA.id).then((parents) => {
      if (isMounted) setRelPersonAParents(parents);
    });
    return () => { isMounted = false; };
  }, [relPersonA]);

  // Check parents of Person B when Person B changes
  useEffect(() => {
    if (!relPersonB) {
      setRelPersonBParents([]);
      return;
    }
    let isMounted = true;
    getPersonParentsAction(relPersonB.id).then((parents) => {
      if (isMounted) setRelPersonBParents(parents);
    });
    return () => { isMounted = false; };
  }, [relPersonB]);

  // Check parents when siblingPerson is selected in add_person
  useEffect(() => {
    if (!siblingPerson) {
      setSiblingDetectedParents([]);
      return;
    }
    let isMounted = true;
    getPersonParentsAction(siblingPerson.id).then((parents) => {
      if (isMounted) {
        setSiblingDetectedParents(parents);
        if (parents.length > 0 && !parentPerson) {
          setParentPerson(parents[0]);
        }
      }
    });
    return () => { isMounted = false; };
  }, [siblingPerson, parentPerson]);

  // Detect spouse of parentPerson in add_person to automatically suggest as second parent
  useEffect(() => {
    if (!parentPerson) {
      setParentAutoSpouse(null);
      return;
    }
    let isMounted = true;
    getPersonSpousesAction(parentPerson.id).then((spouses) => {
      if (!isMounted) return;
      if (spouses && spouses.length > 0) {
        const sp = spouses[0];
        setParentAutoSpouse(sp);
        setParent2Person((current) => current || sp);
      } else {
        setParentAutoSpouse(null);
      }
    });
    return () => { isMounted = false; };
  }, [parentPerson]);

  // Detect spouse of relPersonA in add_relationship when relType is parent_child
  useEffect(() => {
    if (relType !== 'parent_child' || !relPersonA) {
      if (relType !== 'parent_child') {
        setRelSecondParent(null);
        setAlsoLinkSecondParent(false);
        setIsSecondParentAutoSpouse(false);
      }
      return;
    }
    let isMounted = true;
    getPersonSpousesAction(relPersonA.id).then((spouses) => {
      if (!isMounted) return;
      if (spouses && spouses.length > 0) {
        const sp = spouses[0];
        setRelSecondParent(sp);
        setAlsoLinkSecondParent(true);
        setIsSecondParentAutoSpouse(true);
      } else {
        setIsSecondParentAutoSpouse(false);
      }
    });
    return () => { isMounted = false; };
  }, [relType, relPersonA]);

  async function handleSearchPersons(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchPersonsForCorrectionAction(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }

  // Load existing proposal data when editProposalId is set
  useEffect(() => {
    if (!editProposalId) return;

    let isMounted = true;
    async function loadProposal() {
      setIsLoadingProposal(true);
      setError(null);
      try {
        const p = await getProposalForEditAction(editProposalId!);
        if (!isMounted) return;

        if (!p) {
          setError('Impossible de charger cette proposition. Elle a peut-être été supprimée ou vous n’avez pas les droits nécessaires.');
          setIsLoadingProposal(false);
          return;
        }

        const pType = p.proposal_type as ProposalType;
        setProposalType(pType);
        setEditTargetPersonId(p.target_person_id || null);
        if (p.review_comment) {
          setAdminComment(p.review_comment);
        }

        const payload = (p.payload || {}) as Record<string, unknown>;
        const sources = (p.sources_info || {}) as Record<string, unknown>;

        if (pType === 'add_relationship') {
          setRelType((payload.relationship_type as 'parent_child' | 'spouse' | 'sibling') || 'parent_child');
          setRelStartYear(payload.start_year ? String(payload.start_year) : '');
          setRelStartDate(payload.start_date ? String(payload.start_date) : '');
          setRelStartPlace(payload.start_place ? String(payload.start_place) : '');
          setRelNotes(payload.notes ? String(payload.notes) : '');
          setRelCommonParentFirstNames(payload.common_parent_first_names ? String(payload.common_parent_first_names) : '');
          setRelCommonParentLastName(payload.common_parent_last_name ? String(payload.common_parent_last_name) : '');
          setRelCommonParentGender((payload.common_parent_gender as 'M' | 'F') || 'M');

          if (payload.person_a_id) {
            getPersonSummaryAction(String(payload.person_a_id)).then((res) => {
              if (isMounted && res) setRelPersonA(res);
            });
          }
          if (payload.person_b_id) {
            getPersonSummaryAction(String(payload.person_b_id)).then((res) => {
              if (isMounted && res) setRelPersonB(res);
            });
          }
          if (payload.second_parent_id) {
            getPersonSummaryAction(String(payload.second_parent_id)).then((res) => {
              if (isMounted && res) {
                setRelSecondParent(res);
                setAlsoLinkSecondParent(true);
              }
            });
          }
        } else {
          setFirstNames(payload.first_names ? String(payload.first_names) : '');
          setLastName(payload.last_name ? String(payload.last_name) : '');
          if (Array.isArray(payload.name_variants)) {
            setNameVariants(payload.name_variants.join(', '));
          } else if (payload.name_variants) {
            setNameVariants(String(payload.name_variants));
          }
          setGender((payload.gender as 'M' | 'F' | 'other' | 'unknown') || 'unknown');
          setProfession(payload.profession ? String(payload.profession) : '');
          setBiography(payload.biography ? String(payload.biography) : '');

          setBirthYear(payload.birth_year ? String(payload.birth_year) : '');
          setBirthDate(payload.birth_date ? String(payload.birth_date) : '');
          setBirthDatePrecision((payload.birth_date_precision as DatePrecision) || 'unknown');
          setBirthPlace(payload.birth_place ? String(payload.birth_place) : '');

          setDeathYear(payload.death_year ? String(payload.death_year) : '');
          setDeathDate(payload.death_date ? String(payload.death_date) : '');
          setDeathDatePrecision((payload.death_date_precision as DatePrecision) || 'unknown');
          setDeathPlace(payload.death_place ? String(payload.death_place) : '');
          setLifeStatus((payload.life_status as LifeStatus) || 'deceased');

          if (payload.parent_id) {
            getPersonSummaryAction(String(payload.parent_id)).then((res) => {
              if (isMounted && res) setParentPerson(res);
            });
          }
          if (payload.parent_2_id) {
            getPersonSummaryAction(String(payload.parent_2_id)).then((res) => {
              if (isMounted && res) setParent2Person(res);
            });
          }
          if (payload.sibling_id) {
            getPersonSummaryAction(String(payload.sibling_id)).then((res) => {
              if (isMounted && res) setSiblingPerson(res);
            });
          }
          if (payload.spouse_id) {
            getPersonSummaryAction(String(payload.spouse_id)).then((res) => {
              if (isMounted && res) setSpousePerson(res);
            });
          }
        }

        setSourceTitle(sources.title ? String(sources.title) : '');
        setArchiveReference(sources.archive_reference ? String(sources.archive_reference) : '');
        setSourceUrl(sources.url ? String(sources.url) : '');
        setSourceDescription(sources.description ? String(sources.description) : '');
        setUncertaintyNotes(sources.uncertainty_notes ? String(sources.uncertainty_notes) : '');
        setUserExplanation(payload.user_explanation ? String(payload.user_explanation) : '');
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Erreur lors du chargement de la proposition.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingProposal(false);
        }
      }
    }

    loadProposal();
    return () => {
      isMounted = false;
    };
  }, [editProposalId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const sources_info = sourceTitle.trim()
      ? {
          title: sourceTitle.trim(),
          archive_reference: archiveReference.trim() || undefined,
          url: sourceUrl.trim() || undefined,
          description: sourceDescription.trim() || undefined,
          uncertainty_notes: uncertaintyNotes.trim() || undefined,
          is_approximate: birthDatePrecision === 'approximate' || deathDatePrecision === 'approximate',
        }
      : undefined;

    // Handle ADD_RELATIONSHIP
    if (proposalType === 'add_relationship') {
      if (!relPersonA) {
        setError('Veuillez sélectionner la première personne (Personne A).');
        return;
      }
      if (!relPersonB) {
        setError('Veuillez sélectionner la seconde personne (Personne B).');
        return;
      }
      if (relPersonA.id === relPersonB.id) {
        setError('Une personne ne peut pas être liée à elle-même.');
        return;
      }

      const relPayload: Record<string, unknown> = {
        relationship_type: relType,
        person_a_id: relPersonA.id,
        person_b_id: relPersonB.id,
        second_parent_id: (relType === 'parent_child' && alsoLinkSecondParent && relSecondParent) ? relSecondParent.id : null,
        start_year: relStartYear ? parseInt(relStartYear, 10) : null,
        start_date: relStartDate || null,
        start_place: relStartPlace.trim() || null,
        notes: relNotes.trim() || null,
        common_parent_first_names: relCommonParentFirstNames.trim() || null,
        common_parent_last_name: relCommonParentLastName.trim() || null,
        common_parent_gender: relCommonParentGender,
      };

      startTransition(async () => {
        let res;
        if (editProposalId) {
          res = await updateProposalAction(editProposalId, {
            proposal_type: 'add_relationship',
            payload: relPayload,
            sources_info,
            user_explanation: userExplanation.trim() || undefined,
          });
        } else {
          res = await submitProposalAction({
            proposal_type: 'add_relationship',
            payload: relPayload,
            sources_info,
            user_explanation: userExplanation.trim() || undefined,
          });
        }

        if (res.success) {
          setSuccess(true);
        } else {
          setError(res.error || 'Une erreur est survenue lors de l\'envoi de la proposition.');
        }
      });
      return;
    }

    // Handle ADD_PERSON & UPDATE_PERSON
    const variantsArray = nameVariants
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const payload: Record<string, unknown> = {
      first_names: firstNames.trim(),
      last_name: lastName.trim(),
      name_variants: variantsArray,
      gender: gender === 'unknown' ? null : gender,
      birth_year: birthYear ? parseInt(birthYear, 10) : null,
      birth_date: birthDate || null,
      birth_date_precision: birthDatePrecision,
      birth_place: birthPlace.trim() || null,
      death_year: deathYear ? parseInt(deathYear, 10) : null,
      death_date: deathDate || null,
      death_date_precision: deathDatePrecision,
      death_place: deathPlace.trim() || null,
      life_status: lifeStatus,
      visibility: 'public',
      profession: profession.trim() || null,
      biography: biography.trim() || null,
      parent_id: parentPerson ? parentPerson.id : null,
      parent_2_id: parent2Person ? parent2Person.id : null,
      spouse_id: spousePerson ? spousePerson.id : null,
      sibling_id: siblingPerson ? siblingPerson.id : null,
    };

    const targetPersonId = editProposalId
      ? (editTargetPersonId || prefillTargetPersonId || selectedPersonId || null)
      : (selectedPersonId || prefillTargetPersonId || null);

    if (proposalType === 'update_person' && !targetPersonId) {
      setError('Veuillez sélectionner la personne dont vous souhaitez proposer la correction.');
      return;
    }

    startTransition(async () => {
      let res;
      if (editProposalId) {
        res = await updateProposalAction(editProposalId, {
          proposal_type: proposalType,
          target_person_id: targetPersonId,
          payload,
          sources_info,
          user_explanation: userExplanation.trim() || undefined,
        });
      } else {
        res = await submitProposalAction({
          proposal_type: proposalType,
          target_person_id: targetPersonId,
          payload,
          sources_info,
          user_explanation: userExplanation.trim() || undefined,
        });
      }

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Une erreur est survenue lors de l\'envoi de la proposition.');
      }
    });
  }

  if (isLoadingProposal || isLoadingPerson) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-heritage-600 animate-spin mx-auto" />
        <p className="text-sm text-heritage-600 font-serif">
          {isLoadingProposal ? 'Chargement de votre proposition en cours...' : 'Chargement des informations de la personne...'}
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-heritage-950">
          {editProposalId ? 'Proposition mise à jour avec succès !' : 'Proposition envoyée avec succès !'}
        </h1>
        <p className="text-sm text-heritage-700 leading-relaxed font-serif">
          {editProposalId
            ? 'Vos modifications et précisions ont bien été transmises. Votre proposition est repassée en attente de modération auprès de l’administrateur.'
            : 'Votre proposition a été enregistrée en attente de modération. Conformément aux règles du projet, elle sera examinée par l’administrateur avant toute intégration officielle aux données du village.'}
        </p>
        <div className="pt-4 flex justify-center space-x-3">
          <Link
            href="/compte/propositions"
            className="px-5 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 text-sm font-semibold hover:bg-heritage-900 transition-colors"
          >
            Suivre mes propositions
          </Link>
          {!editProposalId && (
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setFirstNames('');
                setLastName('');
                setNameVariants('');
                setProfession('');
                setBiography('');
                setBirthYear('');
                setDeathYear('');
                setParentPerson(null);
                setSiblingPerson(null);
                setSpousePerson(null);
                setRelPersonA(null);
                setRelPersonB(null);
                setRelStartYear('');
                setRelStartDate('');
                setRelStartPlace('');
                setRelNotes('');
                setRelCommonParentFirstNames('');
                setRelCommonParentLastName('');
                setSourceTitle('');
                setArchiveReference('');
                setSourceUrl('');
                setSourceDescription('');
                setUncertaintyNotes('');
                setUserExplanation('');
              }}
              className="px-5 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-sm font-medium hover:bg-heritage-100 transition-colors"
            >
              Faire une autre proposition
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
          Espace de contribution
        </span>
        <h1 className="font-serif text-3xl font-bold text-heritage-950">
          {editProposalId ? 'Modifier ma proposition' : 'Proposer un ajout ou une correction'}
        </h1>
        <p className="text-sm text-heritage-700 leading-relaxed">
          {editProposalId
            ? 'Apportez vos précisions ou corrections à la fiche ci-dessous. Dès enregistrement, la proposition sera transmise à l’administrateur pour réexamen.'
            : 'Participez à la mémoire du village. Aucune modification ne modifie directement les données officielles sans validation préalable par l’administrateur.'}
        </p>
      </div>

      {/* Admin clarification banner if editing */}
      {adminComment && (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1.5 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-800">
            <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Précisions demandées par l’administrateur</span>
          </div>
          <p className="font-serif italic text-sm pl-6 leading-relaxed text-sky-950">
            « {adminComment} »
          </p>
          <p className="text-xs text-sky-700 pl-6">
            Complétez ou rectifiez les informations ci-dessous puis validez pour renvoyer votre fiche.
          </p>
        </div>
      )}

      {/* Type Selector Tabs (hidden if editing existing proposal) */}
      {!editProposalId && (
        <div className="flex flex-wrap border-b border-heritage-200 gap-2">
          <button
            type="button"
            onClick={() => {
              setProposalType('add_person');
              setError(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              proposalType === 'add_person'
                ? 'border-heritage-800 text-heritage-950'
                : 'border-transparent text-heritage-500 hover:text-heritage-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter une personne</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProposalType('add_relationship');
              setError(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              proposalType === 'add_relationship'
                ? 'border-heritage-800 text-heritage-950'
                : 'border-transparent text-heritage-500 hover:text-heritage-800'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Relier 2 personnes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProposalType('update_person');
              setError(null);
            }}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors ${
              proposalType === 'update_person'
                ? 'border-heritage-800 text-heritage-950'
                : 'border-transparent text-heritage-500 hover:text-heritage-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Corriger une fiche existante</span>
          </button>
        </div>
      )}

      {/* Target person banner when a person is loaded for correction */}
      {proposalType === 'update_person' && selectedPerson && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 space-y-2 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-amber-800 shrink-0" />
              <span className="font-serif font-bold text-base text-amber-950">
                Correction de la fiche : {selectedPerson.first_names} {selectedPerson.last_name}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <Link
                href={`/genealogie/${selectedPerson.id}`}
                target="_blank"
                className="text-amber-800 underline hover:text-amber-950 inline-flex items-center space-x-1 font-semibold"
              >
                <span>Consulter la fiche actuelle</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              {!prefillTargetPersonId && !editProposalId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPerson(null);
                    setSelectedPersonId(null);
                    setFirstNames('');
                    setLastName('');
                    setNameVariants('');
                    setProfession('');
                    setBiography('');
                    setBirthYear('');
                    setDeathYear('');
                    setBirthDate('');
                    setDeathDate('');
                    setBirthPlace('');
                    setDeathPlace('');
                  }}
                  className="text-amber-700 hover:text-red-700 underline font-medium"
                >
                  Changer de personne
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-amber-800 font-serif leading-relaxed">
            Les données officielles de cette personne ont été automatiquement chargées dans le formulaire ci-dessous. Modifiez directement les champs que vous souhaitez rectifier, puis indiquez vos sources et justificatifs.
          </p>
        </div>
      )}

      {/* Search picker to select a person to correct if none chosen yet */}
      {proposalType === 'update_person' && !selectedPerson && !editProposalId && (
        <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold text-heritage-900">
              Rechercher la personne à corriger
            </h2>
            <p className="text-xs text-heritage-600 font-serif">
              Saisissez un prénom ou un nom de famille pour pré-remplir automatiquement le formulaire avec les données officielles de la personne.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-heritage-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchPersons(e.target.value)}
              placeholder="Rechercher par prénom ou nom (ex: Yildiz, Pierre...)"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-heritage-500 animate-spin absolute right-3 top-3.5" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="divide-y divide-heritage-100 border border-heritage-200 rounded-lg max-h-60 overflow-y-auto">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="p-3 flex items-center justify-between hover:bg-heritage-50 transition-colors"
                >
                  <div>
                    <p className="font-serif font-bold text-sm text-heritage-950">
                      {p.first_names} {p.last_name}
                    </p>
                    <p className="text-xs text-heritage-500">
                      {p.birth_year ? `° ${p.birth_year}` : '° ?'} — {p.death_year ? `† ${p.death_year}` : '† ?'}
                      {p.profession ? ` • ${p.profession}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoadingPerson(true);
                      try {
                        const fullPerson = await getPersonForCorrectionAction(p.id);
                        if (fullPerson) populateFormWithPerson(fullPerson as Record<string, unknown>);
                      } finally {
                        setIsLoadingPerson(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors"
                  >
                    Sélectionner et pré-remplir
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
            <p className="text-xs text-heritage-500 italic">
              Aucune personne trouvée pour « {searchQuery} ».
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start space-x-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Erreur de validation :</span> {error}
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================= */}
        {/* VIEW A: ADD_RELATIONSHIP (RELATION ENTRE 2 PERSONNES)      */}
        {/* ========================================================= */}
        {proposalType === 'add_relationship' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-6">
              <div className="pb-3 border-b border-heritage-100">
                <h2 className="font-serif text-lg font-bold text-heritage-900">
                  1. Définir le lien familial entre deux personnes
                </h2>
                <p className="text-xs text-heritage-600 font-serif mt-1">
                  Sélectionnez les deux fiches individuelles existantes dans l’arbre, puis indiquez leur relation (filiation, fratrie ou mariage).
                </p>
              </div>

              {/* Person A picker */}
              <PersonPicker
                label={
                  relType === 'parent_child'
                    ? "Personne A : Parent (Père ou Mère) *"
                    : relType === 'sibling'
                    ? "Personne A : Frère ou Sœur *"
                    : "Personne A : Premier Conjoint *"
                }
                description={
                  relType === 'parent_child'
                    ? "Sélectionnez le parent (père ou mère)."
                    : "Sélectionnez la première personne concernée."
                }
                selectedPerson={relPersonA}
                onSelect={(p) => setRelPersonA(p)}
                onRemove={() => {
                  setRelPersonA(null);
                  setRelSecondParent(null);
                  setAlsoLinkSecondParent(false);
                  setIsSecondParentAutoSpouse(false);
                }}
                placeholder="Rechercher la personne A par prénom ou nom..."
              />

              {/* Relationship Type Selector */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800">
                  Nature de la relation *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Filiation */}
                  <button
                    type="button"
                    onClick={() => setRelType('parent_child')}
                    className={`p-3.5 rounded-xl border text-left transition-colors flex items-start space-x-2.5 ${
                      relType === 'parent_child'
                        ? 'border-heritage-800 bg-heritage-50/80 ring-2 ring-heritage-800/20'
                        : 'border-heritage-200 hover:border-heritage-400 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-heritage-200 text-heritage-800 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-serif font-bold text-xs sm:text-sm text-heritage-950">
                        Filiation
                      </p>
                      <p className="text-[11px] text-heritage-600 mt-0.5">
                        Parent ➔ Enfant
                      </p>
                    </div>
                  </button>

                  {/* Frères & Sœurs */}
                  <button
                    type="button"
                    onClick={() => setRelType('sibling')}
                    className={`p-3.5 rounded-xl border text-left transition-colors flex items-start space-x-2.5 ${
                      relType === 'sibling'
                        ? 'border-heritage-800 bg-heritage-50/80 ring-2 ring-heritage-800/20'
                        : 'border-heritage-200 hover:border-heritage-400 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-heritage-200 text-heritage-800 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-serif font-bold text-xs sm:text-sm text-heritage-950">
                        Frères & Sœurs
                      </p>
                      <p className="text-[11px] text-heritage-600 mt-0.5">
                        Fratrie commune
                      </p>
                    </div>
                  </button>

                  {/* Conjoints */}
                  <button
                    type="button"
                    onClick={() => setRelType('spouse')}
                    className={`p-3.5 rounded-xl border text-left transition-colors flex items-start space-x-2.5 ${
                      relType === 'spouse'
                        ? 'border-heritage-800 bg-heritage-50/80 ring-2 ring-heritage-800/20'
                        : 'border-heritage-200 hover:border-heritage-400 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-heritage-200 text-heritage-800 flex items-center justify-center shrink-0">
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-serif font-bold text-xs sm:text-sm text-heritage-950">
                        Conjoints
                      </p>
                      <p className="text-[11px] text-heritage-600 mt-0.5">
                        Mariage / Union
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Person B picker */}
              <PersonPicker
                label={
                  relType === 'parent_child'
                    ? "Personne B : Enfant *"
                    : relType === 'sibling'
                    ? "Personne B : Frère ou Sœur *"
                    : "Personne B : Second Conjoint *"
                }
                description={
                  relType === 'parent_child'
                    ? "La Personne B est l'enfant de la Personne A."
                    : relType === 'sibling'
                    ? "La Personne B est le frère ou la sœur de la Personne A."
                    : "La Personne B est l'époux ou l'épouse de la Personne A."
                }
                selectedPerson={relPersonB}
                onSelect={(p) => setRelPersonB(p)}
                onRemove={() => setRelPersonB(null)}
                excludePersonId={relPersonA?.id}
                placeholder="Rechercher la personne B par prénom ou nom..."
              />

              {/* Second parent section for parent_child */}
              {relType === 'parent_child' && relPersonA && (
                <div className="space-y-3 pt-2">
                  {relSecondParent && isSecondParentAutoSpouse ? (
                    <div className="p-4 rounded-xl bg-purple-50/90 border border-purple-200 text-xs text-purple-950 space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-200/70">
                        <div className="flex items-center space-x-2">
                          <HeartHandshake className="w-4 h-4 text-purple-700 shrink-0" />
                          <span className="font-serif font-bold text-sm text-purple-950">
                            Conjoint(e) marié(e) détecté(e) : {relSecondParent.first_names} {relSecondParent.last_name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full w-fit">
                          {relSecondParent.gender === 'F' ? 'Épouse ➔ Mère' : 'Époux ➔ Père'}
                        </span>
                      </div>

                      <label className="flex items-start space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={alsoLinkSecondParent}
                          onChange={(e) => setAlsoLinkSecondParent(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-purple-300 text-heritage-800 focus:ring-heritage-600 cursor-pointer"
                        />
                        <div>
                          <p className="font-semibold text-purple-900 text-xs sm:text-sm">
                            Ajouter simultanément {relSecondParent.first_names} {relSecondParent.last_name} comme second parent ({relSecondParent.gender === 'F' ? 'Mère' : 'Père'})
                          </p>
                          <p className="text-[11px] text-purple-700 mt-0.5">
                            {alsoLinkSecondParent
                              ? `Les deux parents (${relPersonA.first_names} et ${relSecondParent.first_names}) seront rattachés à l'enfant en une seule validation.`
                              : `Seul(e) ${relPersonA.first_names} sera rattaché(e) comme parent.`}
                          </p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {!alsoLinkSecondParent && !relSecondParent ? (
                        <button
                          type="button"
                          onClick={() => setAlsoLinkSecondParent(true)}
                          className="inline-flex items-center space-x-2 text-xs font-semibold text-heritage-700 hover:text-heritage-950 px-3.5 py-2 rounded-lg border border-dashed border-heritage-300 hover:border-heritage-500 bg-heritage-50/50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-heritage-600" />
                          <span>Ajouter également le second parent (Mère ou Père)</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl bg-heritage-50/70 border border-heritage-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-heritage-800">
                              Second parent (Optionnel)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRelSecondParent(null);
                                setAlsoLinkSecondParent(false);
                              }}
                              className="text-xs text-red-600 hover:text-red-800 hover:underline font-medium"
                            >
                              Ne pas associer de second parent
                            </button>
                          </div>
                          <PersonPicker
                            label="Second parent (Mère ou Père)"
                            description="Sélectionnez le second parent de l'enfant pour relier les deux en même temps."
                            selectedPerson={relSecondParent}
                            onSelect={(p) => {
                              setRelSecondParent(p);
                              setAlsoLinkSecondParent(true);
                              setIsSecondParentAutoSpouse(false);
                            }}
                            onRemove={() => {
                              setRelSecondParent(null);
                            }}
                            excludePersonId={relPersonA.id}
                            placeholder="Rechercher le second parent par prénom ou nom..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sibling parent resolution helper */}
              {relType === 'sibling' && relPersonA && relPersonB && (
                <div className="space-y-3 pt-2">
                  {relPersonAParents.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">
                          Parent commun identifié : {relPersonAParents[0].first_names} {relPersonAParents[0].last_name} ({relPersonAParents[0].gender === 'F' ? 'Mère' : 'Père'})
                        </p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          {relPersonB.first_names} sera automatiquement rattaché(e) à ce parent pour former la fratrie dans l&apos;arbre généalogique.
                        </p>
                      </div>
                    </div>
                  ) : relPersonBParents.length > 0 ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">
                          Parent commun identifié : {relPersonBParents[0].first_names} {relPersonBParents[0].last_name} ({relPersonBParents[0].gender === 'F' ? 'Mère' : 'Père'})
                        </p>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          {relPersonA.first_names} sera automatiquement rattaché(e) à ce parent pour former la fratrie dans l&apos;arbre généalogique.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                        <Info className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Création du parent commun pour l&apos;arbre</span>
                      </div>
                      <p className="text-xs text-amber-800 font-serif leading-relaxed">
                        Pour que deux personnes apparaissent comme frères et sœurs dans l&apos;arbre généalogique, elles doivent partager un parent commun. Ni {relPersonA.first_names} ni {relPersonB.first_names} n&apos;ont encore de parent enregistré. Indiquez le prénom de leur père ou mère ci-dessous :
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1">Rôle</label>
                          <select
                            value={relCommonParentGender}
                            onChange={(e) => setRelCommonParentGender(e.target.value as 'M' | 'F')}
                            className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="M">Père</option>
                            <option value="F">Mère</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1">Prénom du parent</label>
                          <input
                            type="text"
                            value={relCommonParentFirstNames}
                            onChange={(e) => setRelCommonParentFirstNames(e.target.value)}
                            placeholder={relCommonParentGender === 'F' ? "Ex: Marie" : "Ex: Pierre"}
                            className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1">Nom de famille</label>
                          <input
                            type="text"
                            value={relCommonParentLastName}
                            onChange={(e) => setRelCommonParentLastName(e.target.value)}
                            placeholder="Ex: Yildiz"
                            className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-700 italic">
                        Ce parent sera créé lors de la validation pour relier directement la fratrie dans l&apos;arbre généalogique.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Optional details for spouse (marriage dates) */}
              {relType === 'spouse' && (
                <div className="pt-4 border-t border-heritage-100 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
                    Informations sur le mariage (optionnel)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-heritage-700 mb-1">Année de mariage</label>
                      <input
                        type="number"
                        value={relStartYear}
                        onChange={(e) => setRelStartYear(e.target.value)}
                        placeholder="Ex: 1905"
                        min="800"
                        max="2100"
                        className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-heritage-700 mb-1">Date exacte</label>
                      <input
                        type="date"
                        value={relStartDate}
                        onChange={(e) => setRelStartDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-heritage-700 mb-1">Lieu de célébration</label>
                      <input
                        type="text"
                        value={relStartPlace}
                        onChange={(e) => setRelStartPlace(e.target.value)}
                        placeholder="Ex: Habses"
                        className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Relationship notes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                  Précisions sur ce lien (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={relNotes}
                  onChange={(e) => setRelNotes(e.target.value)}
                  placeholder="Ex: Frères attestés par le recensement de 1910, ou mariage religieux documenté..."
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW B: ADD_PERSON & UPDATE_PERSON (FICHE INDIVIDUELLE)    */}
        {/* ========================================================= */}
        {proposalType !== 'add_relationship' && (
          <>
            {/* Section 1: Identité */}
            <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
              <h2 className="font-serif text-lg font-bold text-heritage-900 pb-2 border-b border-heritage-100">
                1. Identité de la personne
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstNames}
                    onChange={(e) => setFirstNames(e.target.value)}
                    placeholder="Ex: Pierre François"
                    className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: DUPONT"
                    className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    Variantes orthographiques
                  </label>
                  <input
                    type="text"
                    value={nameVariants}
                    onChange={(e) => setNameVariants(e.target.value)}
                    placeholder="Ex: Dupond, De Pont (séparées par virgules)"
                    className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    Genre
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  >
                    <option value="unknown">Non précisé</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    Métier / Profession
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex: Tisserand, Cultivateur, Maçon..."
                    className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                    Notice biographique / Notes complémentaires
                  </label>
                  <textarea
                    rows={3}
                    value={biography}
                    onChange={(e) => setBiography(e.target.value)}
                    placeholder="Informations sur la vie de la personne, parcours, contexte historique ou familial..."
                    className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm focus:ring-2 focus:ring-heritage-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Naissance & Décès */}
            <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
              <h2 className="font-serif text-lg font-bold text-heritage-900 pb-2 border-b border-heritage-100">
                2. Événements et Dates
              </h2>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
                  Naissance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-heritage-700 mb-1">Année connue</label>
                    <input
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="Ex: 1842"
                      min="800"
                      max="2100"
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-heritage-700 mb-1">Date exacte (si connue)</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        if (e.target.value) setBirthDatePrecision('exact');
                      }}
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-heritage-700 mb-1">Précision</label>
                    <select
                      value={birthDatePrecision}
                      onChange={(e) => setBirthDatePrecision(e.target.value as DatePrecision)}
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                    >
                      <option value="unknown">Inconnue</option>
                      <option value="exact">Date exacte documentée</option>
                      <option value="year_only">Année seule</option>
                      <option value="approximate">Approximative (vers)</option>
                      <option value="before">Avant</option>
                      <option value="after">Après</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs text-heritage-700 mb-1">Lieu de naissance</label>
                    <input
                      type="text"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="Ex: Habses, paroisse Saint-Pierre"
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-heritage-100 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-heritage-600">
                  Décès & Statut vital
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-heritage-700 mb-1">Statut vital</label>
                    <select
                      value={lifeStatus}
                      onChange={(e) => setLifeStatus(e.target.value as LifeStatus)}
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                    >
                      <option value="deceased">Décédé(e)</option>
                      <option value="living">Vivant(e)</option>
                      <option value="unknown">Inconnu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-heritage-700 mb-1">Année de décès</label>
                    <input
                      type="number"
                      disabled={lifeStatus === 'living'}
                      value={deathYear}
                      onChange={(e) => setDeathYear(e.target.value)}
                      placeholder="Ex: 1912"
                      min="800"
                      max="2100"
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm disabled:bg-heritage-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-heritage-700 mb-1">Précision de décès</label>
                    <select
                      disabled={lifeStatus === 'living'}
                      value={deathDatePrecision}
                      onChange={(e) => setDeathDatePrecision(e.target.value as DatePrecision)}
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm disabled:bg-heritage-100"
                    >
                      <option value="unknown">Inconnue</option>
                      <option value="exact">Date exacte documentée</option>
                      <option value="year_only">Année seule</option>
                      <option value="approximate">Approximative (vers)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs text-heritage-700 mb-1">Lieu de décès</label>
                    <input
                      type="text"
                      disabled={lifeStatus === 'living'}
                      value={deathPlace}
                      onChange={(e) => setDeathPlace(e.target.value)}
                      placeholder="Ex: Habses"
                      className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm disabled:bg-heritage-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Liens familiaux optionnels à la création (uniquement add_person) */}
            {proposalType === 'add_person' && (
              <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-heritage-100">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-heritage-900">
                      3. Liens familiaux dans l&apos;arbre
                    </h2>
                    <p className="text-xs text-heritage-600 font-serif mt-0.5">
                      Rattachez directement cette personne à sa famille déjà présente dans l&apos;arbre généalogique.
                    </p>
                  </div>
                  <span className="text-xs text-heritage-500 font-medium">Optionnel</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Premier Parent picker */}
                  <PersonPicker
                    label="Premier parent (Père ou Mère)"
                    description="Le lien de filiation sera créé automatiquement."
                    selectedPerson={parentPerson}
                    onSelect={(p) => setParentPerson(p)}
                    onRemove={() => {
                      setParentPerson(null);
                      setParentAutoSpouse(null);
                    }}
                    placeholder="Rechercher père ou mère..."
                  />

                  {/* Second Parent picker */}
                  <PersonPicker
                    label="Second parent (Mère ou Père)"
                    description="Permet d'ajouter les deux parents simultanément."
                    selectedPerson={parent2Person}
                    onSelect={(p) => setParent2Person(p)}
                    onRemove={() => setParent2Person(null)}
                    excludePersonId={parentPerson?.id}
                    placeholder="Rechercher second parent..."
                  />

                  {/* Sibling picker */}
                  <PersonPicker
                    label="Frère ou Sœur"
                    description="Rattache la personne à la même fratrie."
                    selectedPerson={siblingPerson}
                    onSelect={(p) => setSiblingPerson(p)}
                    onRemove={() => setSiblingPerson(null)}
                    placeholder="Rechercher frère ou sœur..."
                  />

                  {/* Spouse picker */}
                  <PersonPicker
                    label="Époux ou Épouse"
                    description="Le lien de mariage sera créé automatiquement."
                    selectedPerson={spousePerson}
                    onSelect={(p) => setSpousePerson(p)}
                    onRemove={() => setSpousePerson(null)}
                    placeholder="Rechercher conjoint(e)..."
                  />
                </div>

                {parentPerson && parentAutoSpouse && parent2Person?.id === parentAutoSpouse.id && (
                  <div className="p-3 rounded-xl bg-purple-50/90 border border-purple-200 text-xs text-purple-950 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HeartHandshake className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>
                        Conjoint(e) détecté(e) : <strong>{parentAutoSpouse.first_names} {parentAutoSpouse.last_name}</strong> ({parentAutoSpouse.gender === 'F' ? 'épouse' : 'époux'} de {parentPerson.first_names}). Pré-rempli(e) automatiquement comme second parent.
                      </span>
                    </div>
                  </div>
                )}

                {siblingPerson && siblingDetectedParents.length > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Parent commun associé : <strong>{siblingDetectedParents[0].first_names} {siblingDetectedParents[0].last_name}</strong> (père/mère de {siblingPerson.first_names}).
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* SECTION COMMUNE: SOURCES & JUSTIFICATIFS                  */}
        {/* ========================================================= */}
        <div className="p-6 rounded-2xl bg-white border border-heritage-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-heritage-100">
            <h2 className="font-serif text-lg font-bold text-heritage-900">
              {proposalType === 'add_relationship'
                ? '2. Justificatifs & Sources d’archives'
                : proposalType === 'update_person'
                ? '3. Justificatifs & Sources d’archives'
                : '4. Justificatifs & Sources d’archives'}
            </h2>
            <span className="text-xs text-heritage-500">Recommandé</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-800 mb-1">
                Intitulé de la source / document
              </label>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="Ex: Registre paroissial des baptêmes (1840-1845), Acte de mariage..."
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-heritage-700 mb-1">Cote d&apos;archive / Référence</label>
                <input
                  type="text"
                  value={archiveReference}
                  onChange={(e) => setArchiveReference(e.target.value)}
                  placeholder="Ex: 5E 123/4 vue 18"
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-heritage-700 mb-1">Lien web vers l&apos;archive numérisée</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://archives.departement.fr/..."
                  className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-heritage-700 mb-1">
                Signaler une incertitude ou expliquer la démarche
              </label>
              <textarea
                rows={2}
                value={uncertaintyNotes}
                onChange={(e) => setUncertaintyNotes(e.target.value)}
                placeholder="Précisez si certains liens sont hypothétiques ou déduits d'un recensement..."
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-heritage-700 mb-1">
                Remarque ou message pour l’administrateur (optionnel)
              </label>
              <input
                type="text"
                value={userExplanation}
                onChange={(e) => setUserExplanation(e.target.value)}
                placeholder="Ex: Branche retrouvée grâce aux souvenirs de famille..."
                className="w-full px-3.5 py-2 rounded-lg border border-heritage-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Link
            href={editProposalId ? '/compte/propositions' : '/genealogie'}
            className="px-5 py-2.5 rounded-lg border border-heritage-300 text-heritage-800 text-sm font-medium hover:bg-heritage-100 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-heritage-800 text-heritage-50 font-semibold text-sm hover:bg-heritage-900 transition-colors disabled:opacity-50"
          >
            {isPending
              ? 'Enregistrement en cours...'
              : editProposalId
              ? 'Enregistrer et renvoyer pour modération'
              : 'Soumettre pour modération'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProposerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-heritage-600 font-serif">
          Chargement du formulaire de proposition...
        </div>
      }
    >
      <ProposerForm />
    </Suspense>
  );
}
