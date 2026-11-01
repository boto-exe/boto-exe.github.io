import type { APIRoute } from 'astro';
import { getAllPosts } from '../lib/posts';

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const origin = site!;
  const pages = ['', 'blog/', 'achievements/', 'connect/'].map((p) => ({ loc: new URL(base + p, origin).href, lastmod: '' }));
  const posts = (await getAllPosts()).map((p) => ({ loc: new URL(p.href, origin).href, lastmod: p.date.toISOString().slice(0, 10) }));
  const body = [...pages, ...posts]
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
