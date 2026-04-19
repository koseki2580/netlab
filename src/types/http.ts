import type { HttpMessage } from './packets';

/** An HTTP request is an HttpMessage with method + url required. */
export type HttpRequest = Omit<HttpMessage, 'statusCode' | 'reasonPhrase'> &
  Required<Pick<HttpMessage, 'method' | 'url'>>;

/** An HTTP response is an HttpMessage with statusCode + reasonPhrase required. */
export type HttpResponse = Omit<HttpMessage, 'method' | 'url'> &
  Required<Pick<HttpMessage, 'statusCode' | 'reasonPhrase'>>;

export type HttpVersion = 'HTTP/1.1';
export const HTTP_PORT = 80;
export const HTTP_USER_AGENT = 'netlab/0.1';

/** Narrows an HttpMessage to HttpRequest. */
export function isHttpRequest(msg: HttpMessage): msg is HttpRequest {
  return typeof msg.method === 'string' && typeof msg.url === 'string';
}

/** Narrows an HttpMessage to HttpResponse. */
export function isHttpResponse(msg: HttpMessage): msg is HttpResponse {
  return typeof msg.statusCode === 'number' && typeof msg.reasonPhrase === 'string';
}
