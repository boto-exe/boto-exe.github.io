// Edit this file to change names, links and nav.
// In socials, entries with no handle and no href are hidden on the live site
// and shown dimmed in `npm run dev`, so you can see what is left to fill in.
export const site = {
  handle: 'boto',
  host: 'redteam',
  title: 'boto',
  description:
    'Red team notes, retired HackTheBox writeups, Hack Smarter Labs writeups, and Malice, a series on malware development for adversary simulation.',
  nav: [
    { label: 'blog', path: 'blog/' },
    { label: 'achievements', path: 'achievements/' },
    { label: 'connect', path: 'connect/' },
  ],
};

export type Social = { group: string; label: string; handle: string; href: string; note?: string };

export const socials: Social[] = [
  // Profiles
  { group: 'Profiles', label: 'GitHub', handle: 'boto-exe', href: 'https://github.com/boto-exe' },
  { group: 'Profiles', label: 'LinkedIn', handle: 'Mohamed Aboulfottouh', href: 'https://www.linkedin.com/in/mohamed-aboulfottouh-19086537a/' },
  { group: 'Profiles', label: 'Hack The Box', handle: 'botoo', href: 'https://app.hackthebox.com/public/users/3154018' },
  { group: 'Profiles', label: 'Bugcrowd', handle: 'botoo', href: 'https://bugcrowd.com/h/botoo' },
  // Community
  {
    group: 'Community',
    label: 'BotoBytes',
    handle: '@botobytes',
    href: 'https://instagram.com/botobytes',
    note: 'An Arabic-language Instagram page that teaches security fundamentals for free.',
  },
];
