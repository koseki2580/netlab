import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

function html(source: string): string {
  return renderToStaticMarkup(renderMarkdown(source));
}

function escaped(source: string): string {
  return source.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}

describe('renderMarkdown', () => {
  it('renders an empty span for empty input', () => {
    expect(html('')).toBe('<span></span>');
  });

  it('renders bold text', () => {
    expect(html('say **hello**')).toBe('<span>say <strong>hello</strong></span>');
  });

  it('renders italic text', () => {
    expect(html('say _hello_')).toBe('<span>say <em>hello</em></span>');
  });

  it('renders code spans', () => {
    expect(html('use `ttl`')).toBe('<span>use <code>ttl</code></span>');
  });

  it('renders mixed markdown markers', () => {
    expect(html('_a_ **b** `c`')).toBe('<span><em>a</em> <strong>b</strong> <code>c</code></span>');
  });

  it('renders nested supported markers', () => {
    expect(html('**_b_**')).toBe('<span><strong><em>b</em></strong></span>');
  });

  it('renders bold inside italic text', () => {
    expect(html('_a **b** c_')).toBe('<span><em>a <strong>b</strong> c</em></span>');
  });

  it('renders newlines as br elements', () => {
    expect(html('one\ntwo')).toBe('<span>one<br/>two</span>');
  });

  it('renders unclosed bold markers literally', () => {
    expect(html('**hello')).toBe('<span>**hello</span>');
  });

  it('renders unclosed italic markers literally', () => {
    expect(html('_hello')).toBe('<span>_hello</span>');
  });

  it('renders unclosed code markers literally', () => {
    expect(html('`hello')).toBe('<span>`hello</span>');
  });

  it('does not parse markdown markers inside code spans', () => {
    expect(html('`**ttl**`')).toBe('<span><code>**ttl**</code></span>');
  });

  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=y>',
    'javascript:alert(1)',
    '<a href=javascript:alert(1)>x</a>',
    '<svg/onload=x>',
    '&#x27;onload=alert(1)',
  ])('renders XSS vector literally: %s', (source) => {
    const rendered = html(source);

    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<a ');
    expect(rendered).not.toContain('<svg');
    expect(rendered).toContain(escaped(source));
  });

  it('does not autolink URLs', () => {
    expect(html('https://example.test')).toBe('<span>https://example.test</span>');
  });

  it('does not use raw HTML for supported markdown content', () => {
    expect(html('**<b>x</b>**')).toBe('<span><strong>&lt;b&gt;x&lt;/b&gt;</strong></span>');
  });
});
