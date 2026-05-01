import { describe, expect, it } from 'vitest';
import { normalizeParentOrigins, validateOrigin } from '../originValidator';

describe('embed origin validation', () => {
  it('accepts an exact whitelisted origin', () => {
    expect(validateOrigin('https://teacher.example', 'https://teacher.example')).toBe(true);
  });

  it('accepts one matching origin from an array', () => {
    expect(
      validateOrigin('https://teacher.example', [
        'https://course.example',
        'https://teacher.example',
      ]),
    ).toBe(true);
  });

  it('rejects suffix attacks', () => {
    expect(validateOrigin('https://teacher.example.evil.test', 'https://teacher.example')).toBe(
      false,
    );
  });

  it('rejects protocol mismatches', () => {
    expect(validateOrigin('http://teacher.example', 'https://teacher.example')).toBe(false);
  });

  it('rejects wildcard whitelists', () => {
    expect(validateOrigin('https://teacher.example', '*')).toBe(false);
  });

  it('rejects wildcard entries inside arrays', () => {
    expect(validateOrigin('https://teacher.example', ['*', 'https://course.example'])).toBe(false);
  });

  it('rejects malformed actual origins', () => {
    expect(validateOrigin('not a url', 'https://teacher.example')).toBe(false);
  });

  it('rejects whitelist entries with paths', () => {
    expect(validateOrigin('https://teacher.example', 'https://teacher.example/path')).toBe(false);
  });

  it('rejects non-http origins', () => {
    expect(validateOrigin('file://teacher.example', 'file://teacher.example')).toBe(false);
  });

  it('normalizes a trailing slash to the origin target', () => {
    expect(normalizeParentOrigins('https://teacher.example/')).toEqual(['https://teacher.example']);
  });

  it('drops invalid entries while preserving valid target origins', () => {
    expect(
      normalizeParentOrigins([
        '*',
        'https://teacher.example',
        'https://teacher.example/path',
        'https://course.example',
      ]),
    ).toEqual(['https://teacher.example', 'https://course.example']);
  });
});
