import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const box = z.object({
  title: z.string(),
  date: z.coerce.date(),
  difficulty: z.string().optional(),
  os: z.string().optional(),
  tags: z.array(z.string()).default([]),
  summary: z.string().optional(),
});

// Filled by scripts/sync-writeups.mjs at build time (not committed).
const htb = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/htb' }),
  schema: box,
});
const hsm = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/hsm' }),
  schema: box,
});

// Written by hand in this repo.
const malice = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/malice' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    part: z.number(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { htb, hsm, malice };
