export interface Release {
  id: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    id: '2026-10-15',
    items: [
      'The Search tab is now called Home.',
      'Copy a link to any card, Codex entry, FAQ or rulebook section with the link button at the top.',
      'After each app update, this window shows what’s new.',
    ],
  },
];
