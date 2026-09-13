import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The suite was configured for three engines and only one of them had ever
 * been installed, so two thirds of it had never run. Both halves of that have
 * to agree, and nothing else checks it: the configuration names the engines,
 * and the install script is what puts them on the machine.
 */
const ENGINES = ['chromium', 'firefox', 'webkit'];

describe('the browser suite covers the engines it names', () => {
  /** TC-135 */
  it('configures a project per engine, and installs each of them', () => {
    const config = readFileSync('playwright.config.ts', 'utf8');
    const installScript = (
      JSON.parse(readFileSync('package.json', 'utf8')) as {
        scripts?: Record<string, string>;
      }
    ).scripts?.['e2e:install'];

    const unconfigured = ENGINES.filter((engine) => !config.includes(`name: '${engine}'`));
    const uninstalled = ENGINES.filter((engine) => !(installScript ?? '').includes(engine));

    expect(unconfigured, 'every engine has a project').toEqual([]);
    expect(uninstalled, 'every engine is installed by e2e:install').toEqual([]);
  });
});
