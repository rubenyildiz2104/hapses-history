import { createServerSupabaseClient } from '../supabase/server';
import { Person, Relationship, Source, HistoricalArticle, FamilyEntourage, VisualFamilyTreeData } from '../types/database';
import { isPersonPublic, isRelationshipPublic, sanitizeSourceForPublic } from './privacy';

export interface SearchPersonsFilters {
  query?: string;
  lastName?: string;
  firstNames?: string;
  birthYear?: number;
  deathYear?: number;
  page?: number;
  limit?: number;
}

export interface SearchPersonsResult {
  persons: Person[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Searches public deceased persons with pagination and privacy enforcement.
 * Compliant with Section 5.1 & 6.2.
 */
export async function searchPersonsPublic(
  filters: SearchPersonsFilters
): Promise<SearchPersonsResult> {
  const supabase = await createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(10, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  // Try using the optimized database function search_public_persons
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_public_persons', {
      p_query: filters.query || null,
      p_last_name: filters.lastName || null,
      p_first_names: filters.firstNames || null,
      p_birth_year: filters.birthYear || null,
      p_death_year: filters.deathYear || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (!rpcError && rpcData) {
      // Cast and return
      const persons = rpcData as unknown as Person[];
      return {
        persons,
        totalCount: persons.length < limit ? offset + persons.length : offset + limit + 1,
        currentPage: page,
        totalPages: Math.ceil((offset + persons.length) / limit),
      };
    }
  } catch {
    // Fallback to direct query below
  }

  // Fallback direct table query strictly enforcing privacy rules
  let query = supabase
    .from('persons')
    .select('*', { count: 'exact' })
    .is('archived_at', null)
    .eq('life_status', 'deceased')
    .eq('visibility', 'public');

  if (filters.lastName?.trim()) {
    query = query.ilike('last_name', `%${filters.lastName.trim()}%`);
  }

  if (filters.firstNames?.trim()) {
    query = query.ilike('first_names', `%${filters.firstNames.trim()}%`);
  }

  if (filters.birthYear) {
    query = query.eq('birth_year', filters.birthYear);
  }

  if (filters.deathYear) {
    query = query.eq('death_year', filters.deathYear);
  }

  if (filters.query?.trim()) {
    const q = filters.query.trim();
    query = query.or(`last_name.ilike.%${q}%,first_names.ilike.%${q}%`);
  }

  query = query
    .order('last_name', { ascending: true })
    .order('first_names', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error || !data) {
    return { persons: [], totalCount: 0, currentPage: page, totalPages: 0 };
  }

  const safePersons = (data as Person[]).filter((p) => isPersonPublic(p));
  const totalCount = count ?? safePersons.length;

  return {
    persons: safePersons,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Retrieves a person's detailed record with their family entourage.
 * Strictly filters out living persons, unknown status persons, and non-public relations.
 * Compliant with Section 5.2, 5.3 & 6.3.
 */
export async function getPersonWithFamily(id: string): Promise<FamilyEntourage | null> {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch target person
  const { data: personData, error: personError } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .single();

  if (personError || !personData) {
    return null;
  }

  const person = personData as Person;
  // Privacy check: only deceased public non-archived persons can be displayed
  if (!isPersonPublic(person)) {
    return null;
  }

  // 2. Fetch parents (person_b_id = id and relationship_type = 'parent_child')
  const { data: parentRelations } = await supabase
    .from('relationships')
    .select(`
      id,
      relationship_type,
      start_date,
      start_date_precision,
      start_year,
      notes,
      parent:persons!relationships_person_a_id_fkey (*)
    `)
    .eq('person_b_id', id)
    .eq('relationship_type', 'parent_child')
    .is('archived_at', null);

  const parents: Array<{ person: Person; relationId: string }> = [];
  const parentIds: string[] = [];

  if (parentRelations) {
    for (const rel of parentRelations as any[]) {
      if (rel.parent && isPersonPublic(rel.parent)) {
        parents.push({ person: rel.parent, relationId: rel.id });
        parentIds.push(rel.parent.id);
      }
    }
  }

  // 3. Fetch spouses (spouse relation with id as person_a or person_b)
  const { data: spouseRelations } = await supabase
    .from('relationships')
    .select(`
      *,
      person_a:persons!relationships_person_a_id_fkey (*),
      person_b:persons!relationships_person_b_id_fkey (*)
    `)
    .eq('relationship_type', 'spouse')
    .or(`person_a_id.eq.${id},person_b_id.eq.${id}`)
    .is('archived_at', null);

  const spouses: Array<{ person: Person; relationship: Relationship }> = [];
  if (spouseRelations) {
    for (const rel of spouseRelations as any[]) {
      const spousePerson = rel.person_a_id === id ? rel.person_b : rel.person_a;
      if (spousePerson && isPersonPublic(spousePerson)) {
        spouses.push({
          person: spousePerson,
          relationship: {
            id: rel.id,
            relationship_type: rel.relationship_type,
            person_a_id: rel.person_a_id,
            person_b_id: rel.person_b_id,
            start_date: rel.start_date,
            start_date_precision: rel.start_date_precision,
            start_year: rel.start_year,
            start_place: rel.start_place,
            end_date: rel.end_date,
            end_date_precision: rel.end_date_precision,
            end_year: rel.end_year,
            end_place: rel.end_place,
            notes: rel.notes,
            created_by: rel.created_by,
            created_at: rel.created_at,
            updated_at: rel.updated_at,
            archived_at: rel.archived_at,
          },
        });
      }
    }
  }

  // 4. Fetch children (person_a_id = id and relationship_type = 'parent_child')
  const { data: childRelations } = await supabase
    .from('relationships')
    .select(`
      id,
      child:persons!relationships_person_b_id_fkey (*)
    `)
    .eq('person_a_id', id)
    .eq('relationship_type', 'parent_child')
    .is('archived_at', null);

  const children: Array<{ person: Person; relationId: string }> = [];
  if (childRelations) {
    for (const rel of childRelations as any[]) {
      if (rel.child && isPersonPublic(rel.child)) {
        children.push({ person: rel.child, relationId: rel.id });
      }
    }
  }

  // 5. Fetch siblings (children of person's parents, excluding self)
  const siblings: Array<{ person: Person; relationId: string }> = [];
  if (parentIds.length > 0) {
    const { data: siblingRelations } = await supabase
      .from('relationships')
      .select(`
        id,
        person_b_id,
        sibling:persons!relationships_person_b_id_fkey (*)
      `)
      .in('person_a_id', parentIds)
      .eq('relationship_type', 'parent_child')
      .neq('person_b_id', id)
      .is('archived_at', null);

    const seenSiblingIds = new Set<string>();
    if (siblingRelations) {
      for (const rel of siblingRelations as any[]) {
        if (
          rel.sibling &&
          !seenSiblingIds.has(rel.sibling.id) &&
          isPersonPublic(rel.sibling)
        ) {
          seenSiblingIds.add(rel.sibling.id);
          siblings.push({ person: rel.sibling, relationId: rel.id });
        }
      }
    }
  }

  // 6. Fetch linked sources (public only, without private notes)
  const { data: sourceLinks } = await supabase
    .from('person_sources')
    .select(`
      description,
      source:sources (*)
    `)
    .eq('person_id', id);

  const sources: Source[] = [];
  if (sourceLinks) {
    for (const link of sourceLinks as any[]) {
      if (link.source && link.source.is_public) {
        const sanitized = sanitizeSourceForPublic(link.source);
        if (sanitized) {
          sources.push(sanitized as Source);
        }
      }
    }
  }

  // 7. Fetch linked historical articles (published only)
  const { data: articleLinks } = await supabase
    .from('historical_article_links')
    .select(`
      article:historical_articles (
        id,
        title,
        slug,
        summary,
        article_type,
        status
      )
    `)
    .eq('person_id', id);

  const relatedArticles: Array<Pick<HistoricalArticle, 'id' | 'title' | 'slug' | 'summary' | 'article_type'>> = [];
  if (articleLinks) {
    for (const link of articleLinks as any[]) {
      if (link.article && link.article.status === 'published') {
        relatedArticles.push({
          id: link.article.id,
          title: link.article.title,
          slug: link.article.slug,
          summary: link.article.summary,
          article_type: link.article.article_type,
        });
      }
    }
  }

  return {
    person,
    parents,
    spouses,
    children,
    siblings,
    sources,
    relatedArticles,
  };
}

/**
 * Retrieves multi-generational pedigree tree data (grandparents, parents, spouses, children, grandchildren)
 * with strict privacy filter (only deceased public persons).
 */
export async function getVisualFamilyTree(id: string): Promise<VisualFamilyTreeData | null> {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch focus person
  const { data: focusPersonData } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .single();

  if (!focusPersonData || !isPersonPublic(focusPersonData as Person)) {
    return null;
  }

  const focusPerson = focusPersonData as Person;

  // 2. Parents of focus person
  const { data: parentRelations } = await supabase
    .from('relationships')
    .select(`
      id,
      parent:persons!relationships_person_a_id_fkey (*)
    `)
    .eq('person_b_id', id)
    .eq('relationship_type', 'parent_child')
    .is('archived_at', null);

  const parents: Person[] = [];
  let father: Person | null = null;
  let mother: Person | null = null;

  if (parentRelations) {
    for (const rel of parentRelations as any[]) {
      if (rel.parent && isPersonPublic(rel.parent)) {
        parents.push(rel.parent);
        if (rel.parent.gender === 'M' && !father) father = rel.parent;
        else if (rel.parent.gender === 'F' && !mother) mother = rel.parent;
      }
    }
  }

  // 3. Grandparents
  const paternalGrandparents: Person[] = [];
  const maternalGrandparents: Person[] = [];

  if (father) {
    const { data: pgData } = await supabase
      .from('relationships')
      .select('parent:persons!relationships_person_a_id_fkey (*)')
      .eq('person_b_id', father.id)
      .eq('relationship_type', 'parent_child')
      .is('archived_at', null);

    if (pgData) {
      for (const rel of pgData as any[]) {
        if (rel.parent && isPersonPublic(rel.parent)) {
          paternalGrandparents.push(rel.parent);
        }
      }
    }
  }

  if (mother) {
    const { data: mgData } = await supabase
      .from('relationships')
      .select('parent:persons!relationships_person_a_id_fkey (*)')
      .eq('person_b_id', mother.id)
      .eq('relationship_type', 'parent_child')
      .is('archived_at', null);

    if (mgData) {
      for (const rel of mgData as any[]) {
        if (rel.parent && isPersonPublic(rel.parent)) {
          maternalGrandparents.push(rel.parent);
        }
      }
    }
  }

  // 4. Spouses
  const { data: spouseRelations } = await supabase
    .from('relationships')
    .select(`
      *,
      person_a:persons!relationships_person_a_id_fkey (*),
      person_b:persons!relationships_person_b_id_fkey (*)
    `)
    .eq('relationship_type', 'spouse')
    .or(`person_a_id.eq.${id},person_b_id.eq.${id}`)
    .is('archived_at', null);

  const spouses: Array<{ person: Person; relationship: Relationship }> = [];
  if (spouseRelations) {
    for (const rel of spouseRelations as any[]) {
      const spousePerson = rel.person_a_id === id ? rel.person_b : rel.person_a;
      if (spousePerson && isPersonPublic(spousePerson)) {
        spouses.push({ person: spousePerson, relationship: rel });
      }
    }
  }

  // 5. Siblings (children of same parents, excluding focusPerson)
  const siblings: Person[] = [];
  const parentIds = parents.map((p) => p.id);
  if (parentIds.length > 0) {
    const { data: sibData } = await supabase
      .from('relationships')
      .select('child:persons!relationships_person_b_id_fkey (*)')
      .in('person_a_id', parentIds)
      .eq('relationship_type', 'parent_child')
      .neq('person_b_id', id)
      .is('archived_at', null);

    if (sibData) {
      const seenSibIds = new Set<string>();
      for (const rel of sibData as any[]) {
        if (rel.child && isPersonPublic(rel.child) && !seenSibIds.has(rel.child.id)) {
          seenSibIds.add(rel.child.id);
          siblings.push(rel.child);
        }
      }
    }
  }

  // 6. Children & Grandchildren
  const { data: childRelations } = await supabase
    .from('relationships')
    .select(`
      id,
      child:persons!relationships_person_b_id_fkey (*)
    `)
    .eq('person_a_id', id)
    .eq('relationship_type', 'parent_child')
    .is('archived_at', null);

  const children: Array<{ person: Person; grandchildren: Person[] }> = [];
  const childIds: string[] = [];

  if (childRelations) {
    for (const rel of childRelations as any[]) {
      if (rel.child && isPersonPublic(rel.child)) {
        children.push({ person: rel.child, grandchildren: [] });
        childIds.push(rel.child.id);
      }
    }
  }

  // Fetch grandchildren
  if (childIds.length > 0) {
    const { data: gcData } = await supabase
      .from('relationships')
      .select(`
        person_a_id,
        grandchild:persons!relationships_person_b_id_fkey (*)
      `)
      .in('person_a_id', childIds)
      .eq('relationship_type', 'parent_child')
      .is('archived_at', null);

    if (gcData) {
      for (const rel of gcData as any[]) {
        if (rel.grandchild && isPersonPublic(rel.grandchild)) {
          const parentItem = children.find((c) => c.person.id === rel.person_a_id);
          if (parentItem) {
            parentItem.grandchildren.push(rel.grandchild);
          }
        }
      }
    }
  }

  return {
    focusPerson,
    paternalGrandparents,
    maternalGrandparents,
    parents,
    spouses,
    children,
    siblings,
  };
}
