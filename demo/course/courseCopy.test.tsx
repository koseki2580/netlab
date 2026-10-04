import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CourseCaption, CourseRouteTable, StepResult, type CourseRouteRow } from './CourseParts';
import { diagramCss, diagramText, localizedTopology } from './courseDiagram';
import { COURSE_STEPS, type CourseLocale, type CourseStep } from './courseSteps';
import { journeyMs } from './usePacketTravel';

const LOCALES: CourseLocale[] = ['en', 'ja'];

function step(id: string): CourseStep {
  const found = COURSE_STEPS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no step ${id}`);
  return found;
}

/** Everything a step says before the toggle is opened, in reading order. */
function visibleText(target: CourseStep, locale: CourseLocale): string {
  const copy = target.copy[locale];
  return [copy.goal, copy.task, copy.headline, ...copy.points].join('\n');
}

/** The first step, and the sentence in it, where a term is said. */
function firstUse(term: string): { stepIndex: number; sentence: string } | null {
  for (const [stepIndex, target] of COURSE_STEPS.entries()) {
    const copy = target.copy.ja;
    for (const sentence of [copy.goal, copy.task, copy.headline, ...copy.points]) {
      if (sentence.includes(term)) return { stepIndex, sentence };
    }
  }
  return null;
}

describe('what a course step says once its packet has run', () => {
  /**
   * TC-330 — the idea comes first, in one short line. Two learners in five
   * skipped a result that opened as a block of prose, and lost the term the
   * step existed for with it.
   */
  it('opens with one short line and follows it with short sentences', () => {
    const problems: string[] = [];
    for (const target of COURSE_STEPS) {
      const ja = target.copy.ja;
      if (ja.headline.length > 30) problems.push(`${target.id}: headline is ${ja.headline.length}`);
      if (!ja.headline.endsWith('。')) problems.push(`${target.id}: headline is not a sentence`);
      if (ja.points.length < 2 || ja.points.length > 5) problems.push(`${target.id}: points`);
      for (const point of ja.points) {
        if (point.length > 90) problems.push(`${target.id}: a point runs to ${point.length}`);
      }
      for (const locale of LOCALES) {
        const copy = target.copy[locale];
        if (copy.more.length === 0) problems.push(`${target.id}.${locale}: nothing behind more`);
        if (copy.points.length !== ja.points.length || copy.more.length !== ja.more.length) {
          problems.push(`${target.id}.${locale}: a sentence is missing in one language`);
        }
      }
      if (ja.headline === target.copy.en.headline) problems.push(`${target.id}: untranslated`);
    }
    expect(problems).toEqual([]);
  });

  /**
   * TC-331 — a term is glossed where it is first said, one new term to a
   * sentence, and what a beginner does not need yet waits behind the toggle.
   */
  it('introduces its terms one at a time, each with a plain gloss', () => {
    const glossed: [term: string, gloss: RegExp, stepNumber: number][] = [
      ['パケット', /送るデータのひとかたまり/, 1],
      ['IP アドレス', /住所/, 1],
      ['ホップ', /1回渡る/, 2],
      ['MAC アドレス', /番号/, 3],
      ['ポート', /差し込み口（ポート）/, 3],
      ['フレーム', /封筒/, 3],
      ['デフォルトゲートウェイ', /外への出口/, 5],
      ['経路表', /表/, 6],
    ];
    for (const [term, gloss, stepNumber] of glossed) {
      const use = firstUse(term);
      expect(use, term).not.toBeNull();
      expect(use!.stepIndex + 1, `${term} is first said in step ${stepNumber}`).toBe(stepNumber);
      expect(use!.sentence, `${term} is glossed where it is first said`).toMatch(gloss);
    }
    for (const target of COURSE_STEPS) {
      for (const locale of LOCALES) {
        for (const sentence of target.copy[locale].points) {
          const marked = sentence.split('**').length - 1;
          expect(marked, `${target.id}: one new term to a sentence`).toBeLessThanOrEqual(2);
        }
        // Mask notation and administrative distance are not needed to follow
        // the step; a later lesson needs them, so they are kept, behind more.
        expect(visibleText(target, locale)).not.toMatch(/255\.255\.255\.0|\bAD\b|管理距離/);
      }
    }
    expect(step('two-machines').copy.ja.more.join('')).toMatch(/\/24.*255\.255\.255\.0/s);
    expect(step('two-machines').copy.en.more.join('')).toMatch(/\/24.*255\.255\.255\.0/s);
    expect(step('how-it-decides').copy.ja.more.join('')).toMatch(/AD は管理距離/);
    expect(step('how-it-decides').copy.en.more.join('')).toMatch(/administrative distance/);
    // Step 2 draws two PCs, and no longer says a switch is for three or more.
    expect(step('add-a-switch').copy.ja.goal).not.toMatch(/3台以上/);
    expect(step('add-a-switch').copy.ja.goal).toMatch(/同じ2台/);
    // What the test's first level asks about is still taught.
    const all = COURSE_STEPS.map((target) => visibleText(target, 'ja')).join('\n');
    for (const idea of ['同じネットワーク', '宛先の1台にだけ', 'ネットワークどうしをつなぎます']) {
      expect(all).toContain(idea);
    }
  });

  /**
   * TC-332 — a learner who checks the text against the picture finds every
   * address there, and the boxes carry the names the text uses.
   */
  it('puts on the diagram what the text mentions', () => {
    const missing: string[] = [];
    for (const target of COURSE_STEPS) {
      const routes = target.topology.nodes.flatMap(
        (node) => node.data.staticRoutes?.map((route) => route.destination) ?? [],
      );
      const shown = `${diagramText(target)} ${target.id === 'how-it-decides' ? routes.join(' ') : ''}`;
      for (const locale of LOCALES) {
        const addresses = visibleText(target, locale).match(/\d+\.\d+\.\d+\.\d+/g) ?? [];
        for (const address of addresses) {
          if (!shown.includes(address)) missing.push(`${target.id}.${locale}: ${address}`);
        }
      }
    }
    expect(missing).toEqual([]);

    const router = diagramCss(step('add-a-router'));
    expect(router).toContain('[data-id="router"]');
    expect(router).toContain('10.0.0.1');
    expect(router).toContain('192.168.1.1');
    expect(diagramCss(step('three-machines'))).toContain('MAC aa:00:00:00:00:02');

    for (const target of COURSE_STEPS) {
      const labels = localizedTopology(target, 'ja').nodes.map((node) => node.data.label);
      expect(labels.join(' '), target.id).not.toMatch(/Switch|Router/);
      // PC-D is a PC like the others, not drawn as a server.
      for (const node of target.topology.nodes) {
        if (node.data.label.startsWith('PC-')) expect(node.type, node.id).toBe('client');
      }
    }
    expect(localizedTopology(step('add-a-switch'), 'ja').nodes[1]?.data.label).toBe('スイッチ');
    expect(localizedTopology(step('add-a-switch'), 'en').nodes[1]?.data.label).toBe('Switch');
  });
});

describe('the result box', () => {
  function render(id: string, tone: 'success' | 'planned-failure', moreOpen: boolean): string {
    return renderToStaticMarkup(
      <StepResult
        copy={step(id).copy.ja}
        locale="ja"
        arrived={tone === 'success'}
        tone={tone}
        moreOpen={moreOpen}
        onToggleMore={() => {}}
      />,
    );
  }

  /** TC-333 — headline first and largest, the rest after, more closed until asked for. */
  it('shows the headline first and keeps the detail closed', () => {
    const html = render('add-a-router', 'success', false);
    const headline = html.indexOf('data-testid="course-headline"');
    const points = html.indexOf('data-testid="course-points"');
    expect(headline).toBeGreaterThan(-1);
    expect(points).toBeGreaterThan(headline);
    expect(html).toContain('ルータは、ネットワークどうしをつなぎます。');
    expect(html).toMatch(/data-testid="course-headline" style="[^"]*font-size:18px/);
    expect(html).toMatch(/data-testid="course-points" style="[^"]*font-size:14px/);
    expect(html).toContain('<strong');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('もう少し詳しく');
    expect(html).not.toContain('data-testid="course-more"');
    expect(html).not.toContain('ネットワーク設定');

    const open = render('add-a-router', 'success', true);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('data-testid="course-more"');
    expect(open).toContain('ネットワーク設定');
  });

  /** TC-334 — a failure the step announced is framed as planned, not as a success. */
  it('does not frame the planned failure in green', () => {
    const failed = render('another-network', 'planned-failure', false);
    expect(failed).toContain('data-tone="planned-failure"');
    expect(failed).toContain('届きませんでした（想定どおり）');
    expect(failed).not.toContain('--netlab-accent-green');
    expect(render('add-a-router', 'success', false)).toContain('--netlab-accent-green');
  });
});

describe('the routing table of the last step', () => {
  const rows: CourseRouteRow[] = [
    {
      destination: '10.0.0.0/24',
      nextHop: 'direct',
      side: '10.0.0.1',
      adminDistance: 0,
      used: false,
    },
    {
      destination: '192.168.1.0/24',
      nextHop: 'direct',
      side: '192.168.1.1',
      adminDistance: 0,
      used: true,
    },
  ];

  /** TC-335 — only the two columns the explanation uses, until more is asked for. */
  it('shows the range and where to send it, and the rest only on request', () => {
    const plain = renderToStaticMarkup(
      <CourseRouteTable rows={rows} locale="ja" detailed={false} />,
    );
    expect(plain.match(/<th /g)).toHaveLength(2);
    expect(plain).toContain('宛先の範囲');
    expect(plain).toContain('送り先');
    expect(plain).toContain('直結（192.168.1.1 側）');
    expect(plain).not.toMatch(/>AF<|>AD<|次ホップ/);
    expect(plain).toMatch(/font-size:13px/);
    expect(plain.match(/data-used="true"/g)).toHaveLength(1);

    const detailed = renderToStaticMarkup(<CourseRouteTable rows={rows} locale="en" detailed />);
    expect(detailed.match(/<th /g)).toHaveLength(4);
    expect(detailed).toMatch(/>AF<.*>AD</s);
    expect(detailed).toContain('Direct (10.0.0.1 side)');
  });
});

describe('the line over the diagram', () => {
  function caption(phase: 'idle' | 'travelling' | 'arrived', delivered: boolean, at: string) {
    return renderToStaticMarkup(
      <CourseCaption
        phase={phase}
        delivered={delivered}
        from="PC-A"
        to="PC-D"
        at={at}
        locale="ja"
      />,
    );
  }

  /** TC-336 — it says what the packet is doing, and how it ended only once it has. */
  it('says the packet is on its way, then where it came to rest', () => {
    expect(caption('idle', false, 'PC-D')).not.toMatch(/[ぁ-ん]/);
    expect(caption('travelling', true, 'PC-D')).toContain('PC-A から PC-D へ送っています…');
    expect(caption('travelling', true, 'PC-D')).not.toContain('届きました');
    expect(caption('arrived', true, 'PC-D')).toContain('PC-D に届きました。');
    expect(caption('arrived', false, 'スイッチ1')).toContain('スイッチ1 で止まりました。');
  });

  it('gives the packet long enough to be followed', () => {
    expect(journeyMs(1)).toBeGreaterThanOrEqual(1500);
    expect(journeyMs(4)).toBeGreaterThan(journeyMs(1));
    expect(journeyMs(40)).toBeLessThanOrEqual(3200);
  });
});
