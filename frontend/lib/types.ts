export interface Paper {
  title: string;
  authors: string[];
  venue?: string;
  year?: number;
  citation_count?: number;
  doi?: string;
  abstract?: string;
  url?: string;
  pdf_url?: string;
  source: string;
  publisher?: string;
  relevance_score: number;
  is_seminal: boolean;
  fields_of_study: string[];
}

export interface Dataset {
  name: string;
  description?: string;
  num_samples?: string;
  modalities: string[];
  license?: string;
  download_url?: string;
  url?: string;
  source: string;
  tasks: string[];
  downloads?: number;
}

export interface Grant {
  title: string;
  agency: string;
  eligibility?: string;
  amount?: string;
  deadline?: string;
  url?: string;
  match_score: number;
  source: string;
}

export interface Conference {
  name: string;
  acronym?: string;
  submission_deadline?: string;
  notification_date?: string;
  rank?: string;
  acceptance_rate?: string;
  location?: string;
  url?: string;
  source: string;
}

export interface Repository {
  name: string;
  full_name?: string;
  description?: string;
  url: string;
  stars?: number;
  framework?: string;
  language?: string;
  reproducibility_score: number;
  source: string;
}

export interface Patent {
  title: string;
  patent_number?: string;
  inventors: string[];
  assignee?: string;
  year?: number;
  abstract?: string;
  url?: string;
  source: string;
}

export interface Collaborator {
  name: string;
  affiliation?: string;
  h_index?: number;
  paper_count?: number;
  citation_count?: number;
  interests: string[];
  url?: string;
  match_score: number;
}

export interface LiteratureReview {
  summary: string;
  methodologies: string[];
  research_gaps: string[];
  strengths: string[];
  weaknesses: string[];
  future_directions: string[];
  comparison_table: Record<string, any>[];
}

export interface ResearchGapResult {
  opportunities: Record<string, any>[];
  thesis_topics: string[];
}

export interface SearchResponse {
  query: string;
  intent: Record<string, any>;
  agents_run: string[];
  papers: Paper[];
  datasets: Dataset[];
  grants: Grant[];
  conferences: Conference[];
  repositories: Repository[];
  patents: Patent[];
  collaborators: Collaborator[];
  literature_review?: LiteratureReview;
  research_gaps?: ResearchGapResult;
  elapsed_ms: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  research_interests: string;
  affiliation: string;
  role?: string;
  institution?: string;
  department?: string;
  country?: string;
  bio?: string;
  orcid?: string;
  google_scholar?: string;
  website?: string;
  github?: string;
}

export interface Deadline {
  kind: "grant" | "conference";
  title: string;
  org?: string;
  date: string | null; // ISO yyyy-mm-dd, or null for rolling/undated
  raw?: string | null;
  days_left: number | null;
  url?: string;
}

export interface FeedResponse {
  topics: string[];
  papers: Paper[];
  grants: Grant[];
  deadlines: Deadline[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  color: string;
  updated_at: string;
  item_count: number;
  task_count: number;
  open_tasks: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  item_type: string;
  title: string;
  payload: any;
  notes: string;
  collection_id: string | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  color: string;
  notes: string;
  created_at: string;
  updated_at: string;
  tasks: ProjectTask[];
  items: ProjectItem[];
}

export interface SavedItemRow {
  id: string;
  item_type: string;
  title: string;
  payload: any;
  notes: string;
  collection_id: string | null;
  project_id: string | null;
}

export interface GraphNode {
  id: string;
  type: "paper" | "author";
  label: string;
  citations?: number;
  year?: number;
  seminal?: boolean;
  url?: string;
  venue?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}
