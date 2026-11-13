import { describe, expect, it } from 'vitest';
import {
  EMPTY_LEDGER,
  ledgerAfterDraw,
  ledgerAfterMarking,
  ledgerAfterStudy,
  ledgerFromMetadata,
  ledgerToMetadata,
  mayBegin,
  reviewOf,
  stopHref,
} from './examAttempt';
import { drawQuestions } from './examDraw';
import { examLevel } from './examLevels';
import { levelStop } from './examQuestions';
import { examStageName } from './stages';
import type { ExamQuestion } from './examQuestions';

const all = () => [1, 2, 3, 4, 5, 6, 7, 8].flatMap((level) => examLevel(level)!.slots!.flat());
const question = (id: string): ExamQuestion => all().find((q) => q.id === id)!;
const key = (id: string) => question(id).options[question(id).answer]!.en;

// TC-1429: keys agree with 802.1D learning, RFC 8446 §2 and a hop as a router crossed.
describe('keys that agree with the engine and the standards (TC-1429)', () => {
  it('a switch that learned from the ARP answer sends the packet to its destination only', () => {
    expect(key('s2-star-first-send')).toMatch(/^Only the server/i);
    expect(key('s1-copy-discard')).toMatch(/question/i);
  });

  it('the TLS 1.3 order names CertificateVerify', () => {
    expect(key('s7-tls-order')).toBe(
      'EncryptedExtensions → Certificate → CertificateVerify → Finished',
    );
  });

  it('a hop is a router crossed', () => {
    expect(key('s1-hops')).toMatch(/^1\b/);
    expect(key('s1-hops-one-switch')).toMatch(/^0\b/);
    expect(key('s1-hops-router-only')).toMatch(/^1\b/);
  });
});

// TC-1430: stage 4's DNS questions are not answered by their own wording or the topic list.
describe('no question answers itself (TC-1430)', () => {
  it('the caching question does not say the server remembers; the failing-name one lists no service names', () => {
    const cache = question('dns-second-lookup');
    expect(cache.prompt.ja).not.toMatch(/覚えて/);
    expect(cache.prompt.en).not.toMatch(/remember|keeps|cache/i);
    const name = question('name-fails');
    for (const option of name.options) expect(option.en).not.toMatch(/^(DNS|DHCP|ARP|NAT)$/);
  });
});

// TC-1420: the draw history is kept in the progress record, so Start in a fresh tab knows it.
describe('the draw history outlives the tab (TC-1420)', () => {
  it('a kept ledger round-trips, and a draw made knowing it avoids the last two attempts', () => {
    const level = examLevel(5)!;
    const first = drawQuestions(level, 1).map((q) => q.id);
    const second = drawQuestions(level, 2, first).map((q) => q.id);
    let ledger = ledgerAfterDraw(ledgerAfterDraw(EMPTY_LEDGER, first), second);
    ledger = ledgerFromMetadata(ledgerToMetadata(ledger));
    expect(ledger.lastIds).toEqual(second);
    expect(ledger.earlierIds).toEqual(first);
    const third = drawQuestions(level, 3, [...ledger.lastIds, ...ledger.earlierIds]).map(
      (q) => q.id,
    );
    expect(third.filter((id) => first.includes(id) || second.includes(id))).toEqual([]);
  });
});

// TC-1422: a failed attempt shows nothing about any answer.
describe('what a marked question shows (TC-1422)', () => {
  it('nothing after a fail, right or wrong; everything after a pass', () => {
    for (const correct of [true, false]) {
      expect(reviewOf({ passed: false, correct })).toEqual({
        marks: false,
        rightOption: false,
        explanation: false,
      });
    }
    expect(reviewOf({ passed: true, correct: false })).toEqual({
      marks: true,
      rightOption: true,
      explanation: true,
    });
  });
});

// TC-1424: every missed topic's lesson must be opened before another attempt.
describe('the review gate (TC-1424)', () => {
  it('waits for each missed topic, and survives being written and read back', () => {
    let ledger = ledgerAfterMarking(EMPTY_LEDGER, {
      passed: false,
      missedStops: ['arp', 'vlan', 'arp'],
    });
    expect(mayBegin(ledger)).toBe(false);
    ledger = ledgerFromMetadata(ledgerToMetadata(ledgerAfterStudy(ledger, 'arp')));
    expect(mayBegin(ledger)).toBe(false);
    ledger = ledgerAfterStudy(ledger, 'vlan');
    expect(mayBegin(ledger)).toBe(true);
    expect(mayBegin(ledgerAfterMarking(ledger, { passed: true, missedStops: [] }))).toBe(true);
    expect(mayBegin(EMPTY_LEDGER)).toBe(true);
  });
});

// TC-1427 (unit part): every test is named by its stage.
describe('test names (TC-1427)', () => {
  it('names each test by its stage, numbering a stage’s two', () => {
    expect(examStageName(5)).toEqual({ en: 'Stage 1 test', ja: '段階 1 のテスト' });
    expect(examStageName(1)).toEqual({ en: 'Stage 4 test', ja: '段階 4 のテスト' });
    expect(examStageName(4).ja).toBe('段階 6 のテスト 2');
  });
});

describe('a BGP question sends the learner to the BGP view of its lesson (TC-1432)', () => {
  it('every question about BGP is taught by a stop that opens Dynamic Routing on BGP', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const level = examLevel(n)!;
      for (const q of level.slots!.flat()) {
        if (!/\bBGP\b/.test(q.prompt.en)) continue;
        const stop = levelStop(level, q.taughtBy)!;
        expect(stopHref(stop, n), q.id).toBe(`/routing/dynamic?fromExam=${n}&protocol=bgp`);
      }
    }
  });

  it('a stop without a view opens its lesson as before', () => {
    const stop = levelStop(examLevel(2)!, 'dynamic')!;
    expect(stopHref(stop, 2)).toBe('/routing/dynamic?fromExam=2');
  });
});

describe('a stage 1 question the course teaches uses only what the course says (TC-1433)', () => {
  it('names no broadcast MAC and no mask but 255.255.255.0', () => {
    const level = examLevel(5)!;
    for (const q of level.slots!.flat().filter((one) => one.taughtBy === 'course')) {
      const text = [q.prompt.en, ...q.options.map((option) => option.en)].join(' ');
      expect(text, q.id).not.toMatch(/ff:ff/i);
      for (const mask of text.match(/255\.\d+\.\d+\.\d+/g) ?? []) {
        if (q.options.some((option) => option.en === mask)) continue;
        expect(mask, q.id).toBe('255.255.255.0');
      }
    }
  });
});
