import { describe, expect, it } from 'vitest';

import { generateChangelog, parseCommitLine } from './changelog-gen.mjs';

describe('changelog generator', () => {
  it('parses conventional plan-aware commit lines', () => {
    expect(parseCommitLine('feat(plan-81o): 🌐 : add Japanese locale')).toEqual({
      type: 'feat',
      scope: 'plan-81o',
      breaking: false,
      summary: 'add Japanese locale',
      planId: '81o',
    });
  });

  it('detects breaking commits', () => {
    expect(parseCommitLine('feat(api)!: ✨ : remove legacy export')?.breaking).toBe(true);
  });

  it('does not mistake ordinary scopes for plan ids', () => {
    expect(parseCommitLine('feat(i18n): 🌐 : add sandbox localization')?.planId).toBeUndefined();
  });

  it('groups commits into release sections', () => {
    const markdown = generateChangelog({
      version: '0.2.0',
      commits: [
        'feat(plan-81o): 🌐 : add Japanese locale',
        'fix(sandbox): 🐛 : keep trace filter URL state',
        'docs(plan-81p): 📝 : document cross-plan policy',
        'chore(ci): 🔧 : add soak gate',
      ],
    });

    expect(markdown).toContain('## 0.2.0');
    expect(markdown).toContain('### Features');
    expect(markdown).toContain('add Japanese locale (plan/81o)');
    expect(markdown).toContain('### Fixes');
    expect(markdown).toContain('### Internal');
  });
});
