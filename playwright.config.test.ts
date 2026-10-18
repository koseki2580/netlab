import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The suite was configured for three engines and only one of them had ever
 * been installed, so two thirds of it had never run. Both halves of that have
 * to agree, and nothing else checks it: the configuration names the engines,
 * and the install script is what puts them on the machine.
 */
const ENGINES = ['chromium', 'firefox', 'webkit'];

const read = (path: string) => readFileSync(path, 'utf8');
const PR_WORKFLOW = read('.github/workflows/test.yml');
const NIGHTLY_WORKFLOW = read('.github/workflows/nightly.yml');

/** The text of one top-level job (two-space indented key) in a workflow. */
function job(workflow: string, name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  if (start === -1) return '';
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[\w-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

/** Lines that run the browser suite (not installs or report merges). */
const e2eRuns = (text: string) =>
  text
    .split('\n')
    .filter((line) => /npm run e2e\b|playwright test\b/.test(line) && !/install/.test(line));

const installed = (text: string) =>
  text
    .split('\n')
    .filter((line) => /playwright install/.test(line))
    .join(' ');

describe('the browser suite covers the engines it names', () => {
  /** TC-135 */
  it('configures a project per engine, and installs each of them', () => {
    const config = read('playwright.config.ts');
    const installScript = (
      JSON.parse(read('package.json')) as {
        scripts?: Record<string, string>;
      }
    ).scripts?.['e2e:install'];

    const unconfigured = ENGINES.filter((engine) => !config.includes(`name: '${engine}'`));
    const uninstalled = ENGINES.filter((engine) => !(installScript ?? '').includes(engine));

    expect(unconfigured, 'every engine has a project').toEqual([]);
    expect(uninstalled, 'every engine is installed by e2e:install').toEqual([]);
  });
});

describe('the CI workflows run the engines they install', () => {
  const prJob = job(PR_WORKFLOW, 'e2e');
  const nightlyJob = job(NIGHTLY_WORKFLOW, 'e2e');
  const nightlyEngines = (nightlyJob.match(/browser: \[([^\]]*)\]/)?.[1] ?? '')
    .split(',')
    .map((engine) => engine.trim())
    .filter(Boolean);

  it('runs the PR suite on named projects only, each of them installed', () => {
    const runs = e2eRuns(prJob);
    expect(runs.length, 'the PR e2e job runs the suite').toBeGreaterThan(0);

    const projects = runs.map((line) => line.match(/--project=(\S+)/)?.[1]);
    expect(projects, 'every PR run names its project').not.toContain(undefined);
    const notInstalled = projects.filter((project) => !installed(prJob).includes(project ?? ''));
    expect(notInstalled, 'every PR project is installed').toEqual([]);
  });

  it('runs the whole suite nightly on firefox and webkit, sharded, installing each', () => {
    expect(nightlyEngines).toEqual(expect.arrayContaining(['firefox', 'webkit']));

    const runs = e2eRuns(nightlyJob);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run, 'runs the matrix engine').toContain('--project=${{ matrix.browser }}');
      expect(run, 'is sharded').toMatch(/--shard=\S+/);
      expect(run, 'writes a blob report').toContain('--reporter=blob');
      expect(run, 'runs the whole suite, not one spec').not.toMatch(/\.spec\.ts/);
    }
    expect(installed(nightlyJob)).toContain('${{ matrix.browser }}');
  });

  it('covers every configured engine between PR and nightly runs', () => {
    const prProjects = e2eRuns(job(PR_WORKFLOW, 'e2e')).map(
      (line) => line.match(/--project=(\S+)/)?.[1],
    );
    const covered = new Set([...prProjects, ...nightlyEngines]);
    expect(ENGINES.filter((engine) => !covered.has(engine))).toEqual([]);
  });

  it('merges the nightly shards into one report', () => {
    const merge = job(NIGHTLY_WORKFLOW, 'e2e-report');
    expect(merge).toContain('needs: e2e');
    expect(merge).toContain('playwright merge-reports');
    expect(merge).toMatch(/--reporter=\S*html/);
    expect(merge).toMatch(/--reporter=\S*junit/);
  });

  it('always uploads the HTML report and JUnit file, and writes a step summary', () => {
    for (const reportJob of [prJob, job(NIGHTLY_WORKFLOW, 'e2e-report')]) {
      const upload = reportJob.slice(reportJob.lastIndexOf('if: always()'));
      expect(upload).toContain('actions/upload-artifact');
      expect(upload).toContain('playwright-report/');
      expect(upload).toContain('test-results/junit.xml');
      expect(reportJob).toContain('scripts/e2e-summary.mjs test-results/junit.xml');
    }
  });

  it('sets no MODE variable, which nothing reads', () => {
    expect(PR_WORKFLOW).not.toMatch(/\bMODE=/);
    expect(NIGHTLY_WORKFLOW).not.toMatch(/\bMODE=/);
  });
});
