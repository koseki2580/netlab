/**
 * REQ-426 — the starter www app answers `/` with a hint of its routes (TC-2351).
 */
import { describe, expect, it } from 'vitest';
import { runServerApp } from './serverApp';
import { starterApp } from './starter';

const GET = (path: string) => `GET ${path} HTTP/1.1\r\nHost: www.example.test\r\n\r\n`;

describe('TC-2351: the starter app answers GET / with 200 and a hint naming /hello', () => {
  for (const locale of ['en', 'ja'] as const) {
    it(`${locale}: GET / is 200 and names /hello; /hello still answers`, async () => {
      const root = await runServerApp(starterApp(locale), GET('/'), { timeoutMs: 1000 });
      expect(root.ok && root.response.status).toBe(200);
      expect(root.ok && root.response.body).toContain('/hello');
      const hello = await runServerApp(starterApp(locale), GET('/hello?name=Ada'), {
        timeoutMs: 1000,
      });
      expect(hello.ok && hello.response.body).toBe('Hello Ada (visit 1)');
    });
  }
});
