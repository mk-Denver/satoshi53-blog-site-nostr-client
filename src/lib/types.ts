export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface Article {
  id: string;
  pubkey: string;
  npub: string;
  d: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  bodyMarkdown: string;
  tags: string[];
  publishedAt: number;
  createdAt: number;
  readingTime: number;
}

export interface Author {
  pubkey: string;
  npub: string;
  name: string | null;
  about: string | null;
  picture: string | null;
  nip05: string | null;
  website: string | null;
}

export interface CommentItem {
  id: string;
  pubkey: string;
  npub: string;
  authorName: string | null;
  authorPicture: string | null;
  content: string;
  createdAt: number;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
}

export type ArticleWithMeta = Article & {
  author: Author;
  commentCount: number;
  reactions: ReactionSummary[];
};
