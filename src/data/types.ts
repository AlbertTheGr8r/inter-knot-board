export type Tag =
  | "Post"
  | "Commission"
  | "Help"
  | "Urgent"
  | "Important"
  | "Intel"
  | "Notice"
  | "Info"
  | "Release";

export interface Comment {
  id: string;
  author: string;
  color: string;
  text: string;
  likes: number;
}

export interface QuotedPost {
  feedTitle: string;
  tag: Tag;
  title: string;
  excerpt: string;
}

export interface Article {
  id: string;
  feedId: string;
  feedTitle: string;
  feedColor: string;
  author: string;
  authorColor: string;
  title: string;
  excerpt: string;
  content: string[];
  /** Sanitized feed HTML. Preferred over content when present. */
  contentHtml?: string;
  tag: Tag;
  publishedAt: string;
  unread: boolean;
  starred: boolean;
  picked?: boolean;
  pinned?: boolean;
  aspect: number;
  /** Aspect ratio of the lead image when the feed declares one. */
  imageAspect?: number;
  image?: string;
  minutes: number;
  likes?: number;
  systemNote?: string;
  quoted?: QuotedPost;
  comments?: Comment[];
  link?: string;
}

export type FeedErrorCode =
  | "cors"
  | "network"
  | "timeout"
  | "http"
  | "unsupported"
  | "too-large"
  | "parse"
  | "empty"
  | "invalid-url";

export interface FeedError {
  code: FeedErrorCode;
  message: string;
  at: string;
  status?: number;
}

export interface Feed {
  /** Stable hash of the normalized feed URL. */
  id: string;
  url: string;
  title: string;
  siteUrl?: string;
  color: string;
  /** Preserved from OPML imports; folders are not shown yet. */
  folder?: string;
  addedAt: string;
  lastFetchedAt?: string;
  lastCheckedAt?: string;
  lastError?: FeedError;
}
