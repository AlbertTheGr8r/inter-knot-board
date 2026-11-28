export interface ParsedItem {
  id?: string;
  title: string;
  link?: string;
  publishedAt?: string;
  author?: string;
  html?: string;
  text?: string;
  image?: string;
  imageAspect?: number;
  categories: string[];
}

export interface ParsedFeed {
  title: string;
  siteUrl?: string;
  description?: string;
  format: "rss" | "atom" | "rdf" | "json";
  items: ParsedItem[];
}
