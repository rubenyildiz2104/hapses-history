import { Person, Relationship, Source, DatePrecision } from '@/lib/types/database';
import { isPersonPublic, sanitizeSourceForPublic } from './privacy';

const GEDCOM_MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * Formats a date according to GEDCOM 5.5.1 standard.
 * Examples: "14 JUL 1842", "1842", "ABT 1840", "BEF 1915", "AFT 1900"
 */
export function formatGedcomDate(
  dateStr: string | null,
  year: number | null,
  precision: DatePrecision
): string | null {
  if (precision === 'unknown') {
    return null;
  }

  // Exact date format: YYYY-MM-DD
  if (precision === 'exact' && dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
        return `${d} ${GEDCOM_MONTHS[m]} ${y}`;
      }
    }
  }

  // Month + Year format: YYYY-MM
  if (precision === 'month_year' && dateStr) {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m) && m >= 0 && m < 12) {
        return `${GEDCOM_MONTHS[m]} ${y}`;
      }
    }
  }

  // Fallback to year if present
  if (year !== null && year !== undefined) {
    switch (precision) {
      case 'approximate':
        return `ABT ${year}`;
      case 'before':
        return `BEF ${year}`;
      case 'after':
        return `AFT ${year}`;
      case 'year_only':
      default:
        return `${year}`;
    }
  }

  return null;
}

/**
 * Clean text for GEDCOM (escape and single-line format)
 */
function cleanGedcomText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Generates standard GEDCOM 5.5.1 string from public deceased persons,
 * bilateral public relationships and public sources.
 */
export function generateGedcom(
  rawPersons: Person[],
  rawRelationships: Relationship[],
  rawSources: Source[] = []
): string {
  // 1. Strict Privacy Filter: only public deceased persons
  const publicPersons = rawPersons.filter((p) => isPersonPublic(p));
  const publicPersonIds = new Set(publicPersons.map((p) => p.id));

  // 2. Strict Relationship Filter: both individuals must be public
  const publicRelationships = rawRelationships.filter(
    (r) =>
      !r.archived_at &&
      publicPersonIds.has(r.person_a_id) &&
      publicPersonIds.has(r.person_b_id)
  );

  // 3. Public Sources Filter
  const publicSources = rawSources
    .map((s) => sanitizeSourceForPublic(s))
    .filter((s): s is Omit<Source, 'private_notes'> => Boolean(s));

  const lines: string[] = [];

  // --- GEDCOM HEADER ---
  const today = new Date();
  const dateFormatted = `${today.getDate()} ${GEDCOM_MONTHS[today.getMonth()]} ${today.getFullYear()}`;
  const timeFormatted = today.toTimeString().split(' ')[0];

  lines.push('0 HEAD');
  lines.push('1 SOUR HAPSES_HISTOIRE');
  lines.push('2 VERS 1.0');
  lines.push('2 NAME Habses — Histoire & Familles');
  lines.push('2 CORP Habses Heritage Project');
  lines.push('1 DEST ANY');
  lines.push(`1 DATE ${dateFormatted}`);
  lines.push(`2 TIME ${timeFormatted}`);
  lines.push('1 SUBM @SUBM1@');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('0 @SUBM1@ SUBM');
  lines.push('1 NAME Habses — Histoire & Familles');
  lines.push('1 NOTE Base de données patrimoniale et généalogique du village de Habses (Hapisnas / Mercimekli).');

  // --- SOURCES RECORDS ---
  for (const source of publicSources) {
    const sId = source.id.replace(/-/g, '').substring(0, 16);
    lines.push(`0 @S${sId}@ SOUR`);
    lines.push(`1 TITL ${cleanGedcomText(source.title)}`);
    if (source.author_or_organization) {
      lines.push(`1 AUTH ${cleanGedcomText(source.author_or_organization)}`);
    }
    if (source.archive_reference) {
      lines.push(`1 REPO ${cleanGedcomText(source.archive_reference)}`);
    }
    if (source.source_date) {
      lines.push(`1 DATE ${cleanGedcomText(source.source_date)}`);
    }
    if (source.description) {
      lines.push(`1 NOTE ${cleanGedcomText(source.description)}`);
    }
    if (source.url) {
      lines.push(`1 OBJE`);
      lines.push(`2 FILE ${cleanGedcomText(source.url)}`);
    }
  }

  // --- PREPARE FAMILY ASSOCIATIONS ---
  // A family in GEDCOM connects parents and children
  // Spouse relationships: relationship_type = 'spouse'
  // Parent-child relationships: relationship_type = 'parent_child' (person_a = parent, person_b = child)

  interface FamilyUnit {
    id: string;
    husbandId?: string;
    wifeId?: string;
    spouseRelation?: Relationship;
    childrenIds: Set<string>;
  }

  const families = new Map<string, FamilyUnit>();
  const personFamilyAsSpouse = new Map<string, Set<string>>();
  const personFamilyAsChild = new Map<string, string>();

  // Helper to get or create a family
  function getOrCreateFamily(key: string): FamilyUnit {
    let fam = families.get(key);
    if (!fam) {
      fam = {
        id: key,
        childrenIds: new Set<string>(),
      };
      families.set(key, fam);
    }
    return fam;
  }

  // 1. Process spouse pairs
  const spouseRels = publicRelationships.filter((r) => r.relationship_type === 'spouse');
  for (const rel of spouseRels) {
    const pA = publicPersons.find((p) => p.id === rel.person_a_id);
    const pB = publicPersons.find((p) => p.id === rel.person_b_id);
    if (!pA || !pB) continue;

    // Determine HUSB and WIFE by gender if known
    let husbId = pA.gender === 'F' ? pB.id : pA.id;
    let wifeId = pA.gender === 'F' ? pA.id : pB.id;

    const famKey = [rel.person_a_id, rel.person_b_id].sort().join('_').replace(/-/g, '').substring(0, 16);
    const fam = getOrCreateFamily(famKey);
    fam.husbandId = husbId;
    fam.wifeId = wifeId;
    fam.spouseRelation = rel;

    // Link individuals
    if (!personFamilyAsSpouse.has(husbId)) personFamilyAsSpouse.set(husbId, new Set());
    personFamilyAsSpouse.get(husbId)!.add(fam.id);

    if (!personFamilyAsSpouse.has(wifeId)) personFamilyAsSpouse.set(wifeId, new Set());
    personFamilyAsSpouse.get(wifeId)!.add(fam.id);
  }

  // 2. Process parent-child links
  const parentChildRels = publicRelationships.filter((r) => r.relationship_type === 'parent_child');
  // Group parents for each child
  const parentsByChild = new Map<string, string[]>();
  for (const rel of parentChildRels) {
    const parentId = rel.person_a_id;
    const childId = rel.person_b_id;
    const list = parentsByChild.get(childId) || [];
    list.push(parentId);
    parentsByChild.set(childId, list);
  }

  for (const [childId, parentIds] of parentsByChild.entries()) {
    if (parentIds.length >= 2) {
      // Look for a couple among parents
      const famKey = [parentIds[0], parentIds[1]].sort().join('_').replace(/-/g, '').substring(0, 16);
      const fam = getOrCreateFamily(famKey);
      fam.childrenIds.add(childId);
      personFamilyAsChild.set(childId, fam.id);
    } else if (parentIds.length === 1) {
      // Single parent family
      const parentId = parentIds[0];
      const parent = publicPersons.find((p) => p.id === parentId);
      const famKey = `FAM_${parentId.replace(/-/g, '').substring(0, 12)}`;
      const fam = getOrCreateFamily(famKey);
      if (parent?.gender === 'F') {
        fam.wifeId = parentId;
      } else {
        fam.husbandId = parentId;
      }
      fam.childrenIds.add(childId);
      personFamilyAsChild.set(childId, fam.id);

      if (!personFamilyAsSpouse.has(parentId)) personFamilyAsSpouse.set(parentId, new Set());
      personFamilyAsSpouse.get(parentId)!.add(fam.id);
    }
  }

  // --- INDIVIDUAL RECORDS (INDI) ---
  for (const person of publicPersons) {
    const indiId = person.id.replace(/-/g, '').substring(0, 16);
    lines.push(`0 @I${indiId}@ INDI`);

    // Name
    const firstName = cleanGedcomText(person.first_names);
    const lastName = cleanGedcomText(person.last_name).toUpperCase();
    lines.push(`1 NAME ${firstName} /${lastName}/`);
    lines.push(`2 GIVN ${firstName}`);
    lines.push(`2 SURN ${lastName}`);

    if (person.name_variants && person.name_variants.length > 0) {
      for (const variant of person.name_variants) {
        lines.push(`1 _AKAN ${cleanGedcomText(variant)}`);
      }
    }

    // Gender
    let sex = 'U';
    if (person.gender === 'M') sex = 'M';
    else if (person.gender === 'F') sex = 'F';
    lines.push(`1 SEX ${sex}`);

    // Birth
    const birthDate = formatGedcomDate(person.birth_date, person.birth_year, person.birth_date_precision);
    if (birthDate || person.birth_place) {
      lines.push('1 BIRT');
      if (birthDate) lines.push(`2 DATE ${birthDate}`);
      if (person.birth_place) lines.push(`2 PLAC ${cleanGedcomText(person.birth_place)}`);
    }

    // Death (since isPersonPublic is true, life_status is always 'deceased')
    const deathDate = formatGedcomDate(person.death_date, person.death_year, person.death_date_precision);
    lines.push('1 DEAT Y');
    if (deathDate) lines.push(`2 DATE ${deathDate}`);
    if (person.death_place) lines.push(`2 PLAC ${cleanGedcomText(person.death_place)}`);

    // Profession
    if (person.profession) {
      lines.push(`1 OCCU ${cleanGedcomText(person.profession)}`);
    }

    // Biography
    if (person.biography) {
      lines.push(`1 NOTE ${cleanGedcomText(person.biography)}`);
    }

    // Family links
    const famc = personFamilyAsChild.get(person.id);
    if (famc) {
      lines.push(`1 FAMC @F${famc}@`);
    }

    const famsSet = personFamilyAsSpouse.get(person.id);
    if (famsSet) {
      for (const fams of famsSet) {
        lines.push(`1 FAMS @F${fams}@`);
      }
    }
  }

  // --- FAMILY RECORDS (FAM) ---
  for (const fam of families.values()) {
    lines.push(`0 @F${fam.id}@ FAM`);

    if (fam.husbandId) {
      const hId = fam.husbandId.replace(/-/g, '').substring(0, 16);
      lines.push(`1 HUSB @I${hId}@`);
    }

    if (fam.wifeId) {
      const wId = fam.wifeId.replace(/-/g, '').substring(0, 16);
      lines.push(`1 WIFE @I${wId}@`);
    }

    // Marriage date / place
    if (fam.spouseRelation) {
      const marrDate = formatGedcomDate(
        fam.spouseRelation.start_date,
        fam.spouseRelation.start_year,
        fam.spouseRelation.start_date_precision
      );
      if (marrDate || fam.spouseRelation.start_place) {
        lines.push('1 MARR');
        if (marrDate) lines.push(`2 DATE ${marrDate}`);
        if (fam.spouseRelation.start_place) {
          lines.push(`2 PLAC ${cleanGedcomText(fam.spouseRelation.start_place)}`);
        }
      }
    }

    // Children
    for (const childId of fam.childrenIds) {
      const cId = childId.replace(/-/g, '').substring(0, 16);
      lines.push(`1 CHIL @I${cId}@`);
    }
  }

  // --- TRAILER ---
  lines.push('0 TRLR');

  return lines.join('\n') + '\n';
}

/**
 * Generates an open JSON export containing only public deceased persons,
 * bilateral public relations, and public sources.
 */
export function generatePublicJsonExport(
  rawPersons: Person[],
  rawRelationships: Relationship[],
  rawSources: Source[] = []
) {
  const publicPersons = rawPersons
    .filter((p) => isPersonPublic(p))
    .map((p) => ({
      id: p.id,
      first_names: p.first_names,
      last_name: p.last_name,
      name_variants: p.name_variants,
      gender: p.gender,
      birth_date: p.birth_date,
      birth_date_precision: p.birth_date_precision,
      birth_year: p.birth_year,
      birth_place: p.birth_place,
      death_date: p.death_date,
      death_date_precision: p.death_date_precision,
      death_year: p.death_year,
      death_place: p.death_place,
      profession: p.profession,
      biography: p.biography,
    }));

  const publicPersonIds = new Set(publicPersons.map((p) => p.id));

  const publicRelationships = rawRelationships
    .filter(
      (r) =>
        !r.archived_at &&
        publicPersonIds.has(r.person_a_id) &&
        publicPersonIds.has(r.person_b_id)
    )
    .map((r) => ({
      id: r.id,
      relationship_type: r.relationship_type,
      person_a_id: r.person_a_id,
      person_b_id: r.person_b_id,
      start_year: r.start_year,
      start_place: r.start_place,
      end_year: r.end_year,
    }));

  const publicSources = rawSources
    .map((s) => sanitizeSourceForPublic(s))
    .filter((s): s is Omit<Source, 'private_notes'> => Boolean(s));

  return {
    meta: {
      project: 'Habses — Histoire & Familles',
      village: 'Habses (Hapisnas / Mercimekli), Tur Abdin',
      format_version: '1.0',
      exported_at: new Date().toISOString(),
      privacy_policy: 'Strict: only public deceased individuals and bilateral confirmed relationships.',
      license: 'Open Heritage Data - Creative Commons Attribution (CC BY 4.0)',
    },
    counts: {
      persons: publicPersons.length,
      relationships: publicRelationships.length,
      sources: publicSources.length,
    },
    persons: publicPersons,
    relationships: publicRelationships,
    sources: publicSources,
  };
}
