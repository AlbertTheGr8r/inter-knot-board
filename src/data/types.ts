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
  tag: Tag;
  publishedAt: string;
  unread: boolean;
  starred: boolean;
  picked?: boolean;
  pinned?: boolean;
  aspect: number;
  minutes: number;
  likes?: number;
  systemNote?: string;
  quoted?: QuotedPost;
  comments?: Comment[];
  link?: string;
}
