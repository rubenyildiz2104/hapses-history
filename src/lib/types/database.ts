export type UserRole = 'user' | 'admin';

export type LifeStatus = 'living' | 'deceased' | 'unknown';

export type VisibilityStatus = 'public' | 'private';

export type DatePrecision = 
  | 'exact' 
  | 'year_only' 
  | 'month_year' 
  | 'approximate' 
  | 'before' 
  | 'after' 
  | 'unknown';

export type RelationshipType = 'parent_child' | 'spouse';

export type ProposalType = 
  | 'add_person' 
  | 'update_person' 
  | 'add_relationship' 
  | 'update_relationship';

export type ProposalStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'needs_information';

export type ArticleType = 'village_history' | 'family';

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  first_names: string;
  last_name: string;
  name_variants: string[];
  gender: 'M' | 'F' | 'other' | 'unknown' | null;
  
  birth_date: string | null;
  birth_date_precision: DatePrecision;
  birth_year: number | null;
  birth_place: string | null;
  
  death_date: string | null;
  death_date_precision: DatePrecision;
  death_year: number | null;
  death_place: string | null;
  
  life_status: LifeStatus;
  visibility: VisibilityStatus;
  
  profession: string | null;
  biography: string | null;
  notes: string | null; // Admin/internal only
  portrait_url?: string | null;
  
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Relationship {
  id: string;
  relationship_type: RelationshipType;
  person_a_id: string; // If parent_child: Parent
  person_b_id: string; // If parent_child: Child
  
  start_date: string | null;
  start_date_precision: DatePrecision;
  start_year: number | null;
  start_place: string | null;
  
  end_date: string | null;
  end_date_precision: DatePrecision;
  end_year: number | null;
  end_place: string | null;
  
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface Source {
  id: string;
  title: string;
  source_type: string;
  author_or_organization: string | null;
  source_date: string | null;
  archive_reference: string | null;
  url: string | null;
  document_image_url?: string | null;
  description: string | null;
  private_notes: string | null; // Sensitive: non-public
  is_public: boolean;
  rights_status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonSource {
  person_id: string;
  source_id: string;
  description: string | null;
  created_at: string;
}

export interface Proposal<TPayload = Record<string, unknown>> {
  id: string;
  submitted_by: string;
  proposal_type: ProposalType;
  target_person_id: string | null;
  target_relationship_id: string | null;
  payload: TPayload;
  sources_info?: Record<string, unknown> | null;
  status: ProposalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoricalArticle {
  id: string;
  article_type: ArticleType;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  period_start: number | null;
  period_end: number | null;
  period_description: string | null;
  family_name: string | null;
  status: ArticleStatus;
  featured_image_url: string | null;
  featured_image_credit: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// Composite Family Entourage model for individual person view
export interface FamilyEntourage {
  person: Person;
  parents: Array<{ person: Person; relationId: string }>;
  spouses: Array<{ person: Person; relationship: Relationship }>;
  children: Array<{ person: Person; relationId: string }>;
  siblings: Array<{ person: Person; relationId: string }>;
  sources: Source[];
  relatedArticles: Array<Pick<HistoricalArticle, 'id' | 'title' | 'slug' | 'summary' | 'article_type'>>;
}

export interface VisualFamilyTreeData {
  focusPerson: Person;
  paternalGrandparents: Person[];
  maternalGrandparents: Person[];
  parents: Person[];
  spouses: Array<{ person: Person; relationship: Relationship }>;
  children: Array<{ person: Person; grandchildren: Person[] }>;
  siblings: Person[];
}

