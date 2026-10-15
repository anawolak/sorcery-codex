export interface Release {
  id: string;
  date: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    id: '2026-10-15-2',
    date: '2026-10-15',
    items: ['Copy a link to any card, Codex entry, FAQ or rulebook section with the link button at the top.'],
  },
];
