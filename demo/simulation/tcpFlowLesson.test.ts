import { describe, expect, it } from 'vitest';
import { readerBytes, RESUME_ROUND } from './tcpFlowLesson';

describe('the reader speeds of the flow-control lesson', () => {
  it('reads nothing until the round it resumes', () => {
    const stops = readerBytes('stops');
    expect(stops(RESUME_ROUND - 1)).toBe(0);
    expect(stops(RESUME_ROUND)).toBe(Number.POSITIVE_INFINITY);
    expect(readerBytes('slow')(0)).toBe(500);
  });
});
