import { describe, expect, it } from 'vitest';
import { HTTP_PORT, HTTP_USER_AGENT, isHttpRequest, isHttpResponse } from './http';
import type { HttpMessage } from './packets';

describe('HttpMessage narrowing', () => {
  it('isHttpRequest returns true when method + url are set', () => {
    const msg: HttpMessage = {
      layer: 'L7',
      httpVersion: 'HTTP/1.1',
      method: 'GET',
      url: '/index.html',
      headers: {},
    };
    expect(isHttpRequest(msg)).toBe(true);
  });

  it('isHttpRequest returns false when statusCode is set (response)', () => {
    const msg: HttpMessage = {
      layer: 'L7',
      httpVersion: 'HTTP/1.1',
      statusCode: 200,
      reasonPhrase: 'OK',
      headers: {},
    };
    expect(isHttpRequest(msg)).toBe(false);
  });

  it('isHttpResponse returns true when statusCode + reasonPhrase are set', () => {
    const msg: HttpMessage = {
      layer: 'L7',
      httpVersion: 'HTTP/1.1',
      statusCode: 404,
      reasonPhrase: 'Not Found',
      headers: {},
    };
    expect(isHttpResponse(msg)).toBe(true);
  });

  it('isHttpResponse returns false when method is set (request)', () => {
    const msg: HttpMessage = {
      layer: 'L7',
      httpVersion: 'HTTP/1.1',
      method: 'POST',
      url: '/submit',
      headers: {},
    };
    expect(isHttpResponse(msg)).toBe(false);
  });
});

describe('HTTP constants', () => {
  it('HTTP_PORT is 80', () => {
    expect(HTTP_PORT).toBe(80);
  });

  it('HTTP_USER_AGENT is netlab/0.1', () => {
    expect(HTTP_USER_AGENT).toBe('netlab/0.1');
  });
});
