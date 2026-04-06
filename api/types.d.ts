export interface YouTrackUser {
  id?: string | null;
  login?: string | null;
  name?: string | null;
  fullName?: string | null;
  $type?: string | null;
}

export interface YouTrackFieldValue {
  id?: string | null;
  name?: string | null;
  localizedName?: string | null;
  login?: string | null;
  fullName?: string | null;
  presentation?: string | null;
  minutes?: number | null;
  text?: string | null;
  isResolved?: boolean | null;
  $type?: string | null;
}

export interface YouTrackCustomField {
  id?: string | null;
  name: string;
  $type?: string | null;
  value: YouTrackFieldValue | YouTrackFieldValue[] | string | number | null;
}

export interface YouTrackComment {
  id: string;
  text: string | null;
  created?: number | null;
  updated?: number | null;
  author?: YouTrackUser | null;
}

export interface YouTrackIssueSummary {
  id: string;
  idReadable: string;
  summary: string | null;
  status?: string | null;
}

export interface YouTrackIssue {
  id: string;
  idReadable: string;
  summary: string | null;
  description: string | null;
  created?: number | null;
  updated?: number | null;
  resolved?: number | null;
  project?: {
    id?: string | null;
    name?: string | null;
    shortName?: string | null;
  } | null;
  reporter?: YouTrackUser | null;
  assignee?: YouTrackUser | null;
  priority?: string | null;
  status?: string | null;
  estimate?: unknown;
  timeSpent?: unknown;
  customFields: Record<string, unknown>;
  comments?: YouTrackComment[];
  parent?: YouTrackIssueSummary | null;
  subtasks?: YouTrackIssueSummary[];
  raw?: unknown;
}

export interface CreateSubtaskInput {
  summary: string;
  description?: string | null;
  projectName?: string;
  priority?: string | null;
  status?: string | null;
  assignee?: YouTrackUser | null;
  estimate?: number | null;
  rawCustomFields?: Record<string, unknown>;
}

export interface UpdateStatusResult {
  issueId: string;
  status: string;
  command: string;
}

export interface SearchIssuesOptions {
  top?: number;
  skip?: number;
}

export interface YouTrackArticleSummary {
  id: string;
  idReadable: string;
  summary: string | null;
}

export interface YouTrackArticle {
  id: string;
  idReadable: string;
  summary: string | null;
  content: string | null;
  created?: number | null;
  updated?: number | null;
  project?: {
    id?: string | null;
    name?: string | null;
    shortName?: string | null;
  } | null;
  reporter?: YouTrackUser | null;
  updatedBy?: YouTrackUser | null;
  parentArticle?: YouTrackArticleSummary | null;
  childArticles?: YouTrackArticleSummary[];
  hasChildren?: boolean;
}

export interface CreateArticleInput {
  summary: string;
  content?: string | null;
  projectName?: string;
  parentArticle?: string | null;
}

export interface UpdateArticleInput {
  summary?: string | null;
  content?: string | null;
}

export interface ListArticlesOptions {
  top?: number;
  skip?: number;
}
