import { defineConfig } from 'astro/config';

// For a user site (username.github.io repo) leave SITE_BASE unset.
// For a project site (username.github.io/repo-name) set SITE_BASE=/repo-name
const site = process.env.SITE_URL || 'https://boto-exe.github.io';
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: false },
  },
});
