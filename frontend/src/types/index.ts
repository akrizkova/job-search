export type WorkType = "remote" | "hybrid" | "onsite" | "any";

export interface SearchRequest {
  query: string;
  location?: string;
  work_type: WorkType;
  page: number;
  results_per_page: number;
  max_applicants?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  work_type?: string;
  description?: string;
  url: string;
  source: string;
  posted_at?: string;
  salary?: string;
  tags: string[];
  applicant_count?: number;
  applicant_count_label?: string;
  applicant_count_source?: string;
}

export interface SearchResponse {
  jobs: Job[];
  total: number;
  page: number;
  query: string;
  sources_searched: string[];
  errors: string[];
}
