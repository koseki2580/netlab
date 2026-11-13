// @vitest-environment jsdom
/**
 * Lessons true to their screens and to the standards: the fixes for what the
 * second persona run found (REQ-340 to REQ-345).
 */
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { simulation as enCatalog } from '../src/i18n/locales/en/simulation';
import { simulation as jaCatalog } from '../src/i18n/locales/ja/simulation';
import { planTcpTransfer } from '../src/layers/l4-transport/TcpFlowControl';
import { COURSE_STEPS } from './course/courseSteps';
import { LESSONS } from './lessonManifest';
import { GalleryLocaleProvider } from './localeContext';
import { SubnetStarter } from './learning/SubnetStarter';
import HttpsDemo from './networking/HttpsDemo';
import Ipv6Demo from './networking/Ipv6Demo';
import { p3Df } from './packet-lab/templates/level3/p3-df';
import DynamicRoutingDemo from './routing/DynamicRoutingDemo';
import OspfAreasDemo from './routing/OspfAreasDemo';
import TcpCongestionDemo, { CONGESTION_IW_SEGMENTS } from './simulation/TcpCongestionDemo';
import TcpFlowControlDemo from './simulation/TcpFlowControlDemo';
import { tcpArpNote } from './simulation/TcpHandshakeDemo';
import { FLOW_IW_SEGMENTS } from './simulation/tcpFlowLesson';

/** The page's text as a reader sees it, in `locale` (lessons inside `DemoShell` read it from storage). */
const render = (element: ReactElement, locale: 'en' | 'ja', path = '/') => {
  window.localStorage.setItem('netlab-locale', locale);
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <GalleryLocaleProvider locale={locale}>{element}</GalleryLocaleProvider>
    </MemoryRouter>,
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
};

const step = (id: string) => COURSE_STEPS.find((entry) => entry.id === id)!;
const copyText = (id: string, locale: 'en' | 'ja') => {
  const copy = step(id).copy[locale];
  return [copy.task, copy.headline, ...copy.points, ...copy.more].join('\n');
};

describe('a hop is a router crossed (TC-1380, TC-1381)', () => {
  it('TC-1380: no course step counts a switch as a hop, and the router step says 1 hop', () => {
    for (const entry of COURSE_STEPS) {
      expect(copyText(entry.id, 'en'), entry.id).not.toMatch(/\b[2-9] hops?\b|1 hop; this time/);
      expect(copyText(entry.id, 'ja'), entry.id).not.toMatch(/[2-9]\s?ホップ|1ホップ、今回/);
    }
    expect(copyText('add-a-router', 'en')).toContain('1 hop');
    expect(copyText('add-a-router', 'ja')).toContain('1 ホップ');
  });

  it('TC-1381: the shared step, timeline and summary strings say steps, not hops', () => {
    const keys = [
      'simulation.timeline.hopsShown',
      'simulation.timeline.hops',
      'simulation.steps.logLoaded',
      'simulation.hop.position',
      'simulation.summary.hops',
    ];
    for (const key of keys) {
      expect(enCatalog[key], key).not.toMatch(/hop/i);
      expect(enCatalog[key], key).toMatch(/step/i);
      expect(jaCatalog[key], key).not.toContain('ホップ');
      expect(jaCatalog[key], key).toContain('ステップ');
    }
  });
});

describe('the course says what its picture does not draw (TC-1382, TC-1383)', () => {
  it('TC-1382: step 3 says in its points that the question and its copy are not drawn', () => {
    expect(step('three-machines').copy.en.points[0]).toMatch(/does not draw that question/);
    expect(step('three-machines').copy.ja.points[0]).toContain('描いていません');
  });

  it('TC-1383: step 4 says first that the picture marks where the way ends', () => {
    expect(step('another-network').copy.en.points[0]).toMatch(/A real PC-A would not send it/);
    expect(step('another-network').copy.ja.points[0]).toContain('本物の PC-A は');
  });
});

describe('the subnetting page teaches what stage 1 asks (TC-1385, TC-1386)', () => {
  const page = (locale: 'en' | 'ja') => render(<SubnetStarter />, locale);

  it('TC-1385: 254 machines in a /24, before the line that the path may stop', () => {
    const en = page('en');
    expect(en).toMatch(/254 machines/);
    expect(en.indexOf('254 machines')).toBeLessThan(en.indexOf('optional for the beginner path'));
    const ja = page('ja');
    expect(ja.indexOf('254 台')).toBeGreaterThan(-1);
    expect(ja.indexOf('254 台')).toBeLessThan(ja.indexOf('ここまでで十分です'));
  });

  it('TC-1386: "/24" counts bits, not machines, and 255.248.0.0 reads as /13', () => {
    expect(page('en')).toMatch(/"\/24" is not "24 machines"/);
    expect(page('en')).toContain('/13');
    expect(page('ja')).toContain('「24 台」ではありません');
    expect(page('ja')).toContain('/13');
  });
});

describe('BGP is findable and says what its list says (TC-1387..TC-1389)', () => {
  it('TC-1387: ?protocol=bgp opens the BGP view', () => {
    const html = render(<DynamicRoutingDemo />, 'en', '/?protocol=bgp');
    expect(html).toMatch(/LOCAL_PREF is compared before AS_PATH/);
  });

  it('TC-1388: the BGP summary puts LOCAL_PREF before AS_PATH, in both languages', () => {
    expect(render(<DynamicRoutingDemo />, 'ja', '/?protocol=bgp')).toContain(
      'AS_PATH より先に LOCAL_PREF を比べます',
    );
  });

  it('TC-1389: the lesson title names BGP', () => {
    const lesson = LESSONS.find((entry) => entry.path === '/routing/dynamic')!;
    expect(lesson.title.en).toContain('BGP');
    expect(lesson.title.ja).toContain('BGP');
  });
});

describe('lesson text agrees with the run (TC-1390..TC-1396)', () => {
  it('TC-1390: HTTPS: the normal run accepts http/1.1, the mismatch run only h2', () => {
    const en = render(<HttpsDemo />, 'en');
    expect(en).not.toContain('This server accepts only h2');
    expect(en).toMatch(/normal run the server accepts http\/1\.1/);
    const ja = render(<HttpsDemo />, 'ja');
    expect(ja).not.toContain('このサーバが受け付けるのは h2 だけです');
    expect(ja).toContain('サーバは http/1.1 を受け付けます');
  });

  it('TC-1391: the handshake asks ARP only before the SYN', () => {
    expect(tcpArpNote.en).toMatch(/Only the first message \(the SYN\) asks/);
    expect(tcpArpNote.en).not.toMatch(/every message/);
    expect(tcpArpNote.ja).toContain('尋ねるのは最初の SYN のときだけです');
  });

  it('TC-1392: flow control says the window reopens in steps of at least min(buffer / 2, MSS)', () => {
    expect(render(<TcpFlowControlDemo />, 'en')).toMatch(/min\(half its buffer, one MSS\)/);
    expect(render(<TcpFlowControlDemo />, 'ja')).toContain('バッファの半分と 1 MSS の小さいほう');
  });

  it('TC-1393: both TCP lessons start at the same initial window, within RFC 5681', () => {
    expect(FLOW_IW_SEGMENTS).toBe(CONGESTION_IW_SEGMENTS);
    const plan = planTcpTransfer({
      bytes: 8000,
      mss: 1000,
      receiveBuffer: 4000,
      readBytes: () => Number.POSITIVE_INFINITY,
      initialCwndSegments: FLOW_IW_SEGMENTS,
    });
    expect(plan.steps[0]?.cwnd).toBe(2000);
    expect(render(<TcpFlowControlDemo />, 'en')).toMatch(/RFC 5681/);
  });

  it('TC-1394: OSPF keeps type 5 out of stub areas', () => {
    expect(render(<OspfAreasDemo />, 'en')).not.toMatch(/Type 5[^.]*in every area/);
    expect(render(<OspfAreasDemo />, 'en')).toMatch(/not into stub/);
    expect(render(<OspfAreasDemo />, 'ja')).toContain('スタブエリアには入りません');
  });

  it('TC-1395: IPv6 says a host usually uses the router’s link-local address', () => {
    expect(render(<Ipv6Demo />, 'en')).toMatch(/link-local address \(fe80::/);
    expect(render(<Ipv6Demo />, 'ja')).toContain('リンクローカルアドレス（fe80::');
  });

  it('TC-1396: p3-df’s title names no cable it is not about', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const exercise = p3Df.generate(seed);
      expect(exercise.title.en, `seed ${seed}`).not.toMatch(/narrow cable before/);
      expect(exercise.title.ja, `seed ${seed}`).not.toContain('の手前の細い回線');
    }
  });
});

describe('the congestion rules are visible (TC-1397)', () => {
  it('lists slow start, avoidance, fast retransmit and the timeout without the slider', () => {
    const en = render(<TcpCongestionDemo />, 'en');
    for (const rule of [
      'Slow start',
      'Congestion avoidance',
      'Three duplicate ACKs',
      'A timeout',
    ]) {
      expect(en).toContain(rule);
    }
    const ja = render(<TcpCongestionDemo />, 'ja');
    for (const rule of ['スロースタート', '輻輳回避', '重複 ACK が 3 つ', 'タイムアウト']) {
      expect(ja).toContain(rule);
    }
  });
});
