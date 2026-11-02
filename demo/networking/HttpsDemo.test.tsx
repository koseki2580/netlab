import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EXAM_STAGE_7 } from '../course/examStage7';
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

  it('is not contradicted by the exam explanation of ALPN (TC-243)', () => {
    const question = EXAM_STAGE_7.questions.find((q) => q.id === 's7-tls-alpn-hidden');

    expect(question).toBeDefined();
    for (const text of [question?.explanation.en, question?.explanation.ja]) {
      expect(text).toContain('EncryptedExtensions');
      expect(text).not.toMatch(/chosen in the ServerHello|ServerHello で決まる/);
    }
  });
});
