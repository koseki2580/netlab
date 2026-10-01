import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EXAM_LEVEL_3 } from '../course/examLevel3';
import HttpsDemo from './HttpsDemo';

describe('HttpsDemo', () => {
  it('renders the HTTPS TLS demo controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HttpsDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('HTTPS TLS 1.3');
    expect(html).toContain('Run HTTPS handshake');
    expect(html).toContain('Force ALPN mismatch');
  });

  it('says the server names its ALPN choice in EncryptedExtensions (TC-243)', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HttpsDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('EncryptedExtensions');
  });

  it('is not contradicted by the exam explanation of the ALPN mismatch (TC-243)', () => {
    const question = EXAM_LEVEL_3.questions.find((q) => q.id === 'tls-alpn-mismatch');

    expect(question?.answer).toBe(2);
    for (const text of [question?.explanation.en, question?.explanation.ja]) {
      expect(text).toContain('EncryptedExtensions');
      expect(text).not.toMatch(/chosen in the ServerHello|ServerHello で決まる/);
    }
  });
});
