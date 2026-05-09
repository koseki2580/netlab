import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetSubstituteWarnings, substitute } from './substitute';

describe('substitute', () => {
  beforeEach(() => {
    _resetSubstituteWarnings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns template unchanged when no params provided', () => {
    expect(substitute('hello world')).toBe('hello world');
  });

  it('returns template unchanged when params is empty', () => {
    expect(substitute('hello world', {})).toBe('hello world');
  });

  it('substitutes a single named placeholder', () => {
    expect(substitute('hello {{name}}', { name: 'world' })).toBe('hello world');
  });

  it('substitutes multiple distinct placeholders', () => {
    expect(substitute('{{greeting}}, {{name}}!', { greeting: 'hi', name: 'sam' })).toBe('hi, sam!');
  });

  it('substitutes the same placeholder name multiple times', () => {
    expect(substitute('{{x}} and {{x}} again', { x: 'foo' })).toBe('foo and foo again');
  });

  it('coerces numeric param values to strings', () => {
    expect(substitute('count: {{n}}', { n: 42 })).toBe('count: 42');
  });

  it('leaves unmatched placeholder text intact', () => {
    expect(substitute('hello {{name}}', { other: 'x' })).toBe('hello {{name}}');
  });

  it('warns once per (template, placeholder name) for missing param', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    substitute('hello {{name}}', {});
    substitute('hello {{name}}', {});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("missing placeholder param 'name'");
  });

  it('warns again when the same placeholder appears in a different template', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    substitute('a {{name}}', {});
    substitute('b {{name}}', {});
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('handles consecutive placeholders without separators', () => {
    expect(substitute('{{a}}{{b}}', { a: '1', b: '2' })).toBe('12');
  });

  it('ignores placeholder-like syntax without word characters', () => {
    expect(substitute('literal {{ }} stays', { ' ': 'x' })).toBe('literal {{ }} stays');
  });

  it('does not mutate the params object', () => {
    const params = { name: 'world' };
    substitute('hi {{name}}', params);
    expect(params).toEqual({ name: 'world' });
  });
});
