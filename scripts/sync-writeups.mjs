#!/usr/bin/env node
// Pulls writeups from other repos at build time and converts them for the site.
//
//  - htb  (private repo): only notes whose frontmatter says `status: retired` are published.
//                         Anything else is skipped. Default is deny.
//  - hsm  (public repo):  every note is published unless it has `publish: false`.
//
// Auth: set CONTENT_PAT (fine-grained token, Contents: read-only on those repos).
// Local testing without a token: HTB_LOCAL_DIR=/path/to/repo HSM_LOCAL_DIR=/path/to/repo

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'content-sources.json'), 'utf8'));
const base = (process.env.SITE_BASE || '/').replace(/\/?$/, '/');
const strict = process.env.SYNC_STRICT === '1';
const token = process.env.CONTENT_PAT || '';
const IMG = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const SKIP_DIRS = new Set(['.git', '.github', '.obsidian', '.trash', 'node_modules']);
const SKIP_FILES = new Set(['readme.md', 'license.md']);

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
const cleanName = (s) => s.replace(/[^A-Za-z0-9._-]+/g, '-');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else out.push(path.join(dir, e.name));
  }
  return out;
}

function fetchRepo(name, cfg) {
  const local = process.env[`${name.toUpperCase()}_LOCAL_DIR`];
  if (local) return { dir: path.resolve(local), temp: false };
  if (!token && !cfg.public) {
    const msg = `[sync:${name}] CONTENT_PAT is not set, skipping ${cfg.repo}`;
    if (strict) throw new Error(msg);
    console.warn(msg);
    return null;
  }
  const tmp = path.join(root, '.sync-tmp', name);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  try {
    execFileSync('git', ['clone', '--quiet', token ? `https://x-access-token:${token}@github.com/${cfg.repo}.git` : `https://github.com/${cfg.repo}.git`, tmp], { stdio: 'pipe' });
  } catch {
    // Never echo the command: it contains the token.
    throw new Error(`[sync:${name}] could not clone ${cfg.repo}. Check the token has Contents: read on that repo.`);
  }
  return { dir: tmp, temp: true };
}

function gitDate(dir, file) {
  try {
    const out = execFileSync('git', ['-C', dir, 'log', '--diff-filter=A', '--format=%cI', '--', path.relative(dir, file)], { stdio: 'pipe' })
      .toString().trim().split('\n').filter(Boolean);
    return out.length ? out[out.length - 1] : null;
  } catch { return null; }
}

function sync(name, cfg) {
  const repo = fetchRepo(name, cfg);
  if (!repo) return;
  const outDir = path.join(root, 'src/content', cfg.out);
  const assetRoot = path.join(root, 'public/writeup-assets', cfg.out);
  for (const f of fs.existsSync(outDir) ? fs.readdirSync(outDir) : []) if (f !== '.gitkeep') fs.rmSync(path.join(outDir, f), { recursive: true, force: true });
  fs.rmSync(assetRoot, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const all = walk(repo.dir);
  const images = new Map();
  for (const f of all) if (IMG.has(path.extname(f).toLowerCase())) images.set(path.basename(f).toLowerCase(), f);

  const used = new Set();
  const published = [];
  const skipped = [];

  for (const file of all.filter((f) => f.endsWith('.md') && !SKIP_FILES.has(path.basename(f).toLowerCase()))) {
    const rel = path.relative(repo.dir, file);
    const { data: fm, content } = matter(fs.readFileSync(file, 'utf8'));

    if (fm.publish === false) { skipped.push([rel, 'publish: false']); continue; }
    if (cfg.requireStatus) {
      const status = String(fm.status ?? '').trim().toLowerCase();
      if (status !== cfg.requireStatus) { skipped.push([rel, `status is "${status || 'missing'}", need "${cfg.requireStatus}"`]); continue; }
    }

    let body = content;
    const stem = path.basename(file, '.md');
    const generic = ['readme', 'index', 'writeup', 'notes'].includes(stem.toLowerCase());
    const title = String(fm.title || (generic ? path.basename(path.dirname(file)) : stem)).trim();

    let slug = slugify(String(fm.slug || title));
    for (let n = 2; used.has(slug); n++) slug = `${slugify(title)}-${n}`;
    used.add(slug);

    const copyImage = (src, label) => {
      const clean = decodeURIComponent(src.trim().replace(/^<|>$/g, '').split(/[?#]/)[0]);
      let found = path.resolve(path.dirname(file), clean);
      if (!fs.existsSync(found)) found = images.get(path.basename(clean).toLowerCase()) || '';
      if (!found || !fs.existsSync(found)) { console.warn(`[sync:${name}] missing image "${clean}" in ${rel}`); return null; }
      const fname = cleanName(path.basename(found));
      const dest = path.join(assetRoot, slug, fname);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(found, dest);
      return `![${label}](${base}writeup-assets/${cfg.out}/${slug}/${fname})`;
    };

    body = body
      .replace(/%%[\s\S]*?%%/g, '')
      // Obsidian image embeds: ![[shot.png]] or ![[shot.png|500]]
      .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (m, target) =>
        IMG.has(path.extname(target.trim()).toLowerCase()) ? (copyImage(target, '') ?? '') : '')
      // Standard markdown images with local paths
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) =>
        /^(https?:|data:)/i.test(src.trim()) || src.startsWith(`${base}writeup-assets/`) ? m : (copyImage(src, alt) ?? m))
      // Wikilinks become plain text
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (m, t, alias) => alias || t);

    const tags = Array.isArray(fm.tags) ? fm.tags : fm.tags ? String(fm.tags).split(/[,\s]+/) : [];
    const date = fm.date || fm.published || gitDate(repo.dir, file) || fs.statSync(file).mtime.toISOString();
    const data = {
      title,
      date: new Date(date).toISOString(),
      ...(fm.difficulty && { difficulty: String(fm.difficulty) }),
      ...((fm.os || fm.platform) && { os: String(fm.os || fm.platform) }),
      tags: tags.filter((t) => t && !['retired', 'active'].includes(String(t).toLowerCase())),
      ...((fm.summary || fm.description) && { summary: String(fm.summary || fm.description) }),
    };
    fs.writeFileSync(path.join(outDir, `${slug}.md`), matter.stringify(body.trim() + '\n', data));
    published.push(slug);
  }

  console.log(`[sync:${name}] ${cfg.repo}: published ${published.length}, skipped ${skipped.length}`);
  // On a public repo the CI log is public, so never print skipped note names there.
  if (!process.env.CI) for (const [rel, why] of skipped) console.log(`   skipped ${rel} (${why})`);
  if (repo.temp) fs.rmSync(repo.dir, { recursive: true, force: true });
}

for (const [name, cfg] of Object.entries(sources)) sync(name, cfg);
fs.rmSync(path.join(root, '.sync-tmp'), { recursive: true, force: true });