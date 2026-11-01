import { getCollection } from 'astro:content';

export const sources = {
  htb: { label: 'HTB' },
  hsm: { label: 'Hack Smarter Labs' },
  malice: { label: 'Malice' },
} as const;
export type Source = keyof typeof sources;

export interface Post {
  source: Source;
  id: string;
  href: string;
  title: string;
  date: Date;
  difficulty?: string;
  os?: string;
  tags: string[];
  summary?: string;
  part?: number;
  draft?: boolean;
}

export async function getAllPosts(): Promise<Post[]> {
  const base = import.meta.env.BASE_URL;
  const [htb, hsm, malice] = await Promise.all([getCollection('htb'), getCollection('hsm'), getCollection('malice')]);
  const posts: Post[] = [
    ...htb.map((p) => ({ source: 'htb' as const, id: p.id, ...p.data })),
    ...hsm.map((p) => ({ source: 'hsm' as const, id: p.id, ...p.data })),
    ...malice
      .filter((p) => !p.data.draft || !import.meta.env.PROD)
      .map((p) => ({ source: 'malice' as const, id: p.id, ...p.data })),
  ].map((p) => ({ ...p, href: `${base}blog/${p.source}/${p.id}/` }));
  return posts.sort((a, b) => +b.date - +a.date);
}
