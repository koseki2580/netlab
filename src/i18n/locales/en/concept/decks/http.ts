import type { Catalog } from '../../../../types';

/** The `http` deck's questions (en); its name is in the core chunk. */
export const http: Catalog = {
  'learning.concept.http.q1.prompt': 'HTTP follows which model?',
  'learning.concept.http.q1.a': 'Request/response',
  'learning.concept.http.q1.b': 'Publish/subscribe',
  'learning.concept.http.q1.c': 'Broadcast',
  'learning.concept.http.q1.why':
    'A client sends a request (method + URL) and the server returns a response with a status and body.',
  'learning.concept.http.q2.prompt': 'Which is a safe, read-only HTTP method?',
  'learning.concept.http.q2.a': 'POST',
  'learning.concept.http.q2.b': 'GET',
  'learning.concept.http.q2.c': 'DELETE',
  'learning.concept.http.q2.why':
    'GET retrieves a resource without side effects; POST/PUT/DELETE modify state.',
  'learning.concept.http.q3.prompt': 'An HTTP 404 status means…',
  'learning.concept.http.q3.a': 'The request succeeded',
  'learning.concept.http.q3.b': 'The server hit an error',
  'learning.concept.http.q3.c': 'The resource was not found',
  'learning.concept.http.q3.why':
    '4xx are client errors; 404 means the requested resource does not exist (2xx success, 5xx server error).',
  'learning.concept.http.q1.b.why':
    'Publish/subscribe is a messaging pattern (e.g. MQTT); HTTP is a client request → server response exchange.',
  'learning.concept.http.q1.c.why':
    'HTTP is not broadcast; a client sends a request and the server returns a response to that client.',
  'learning.concept.http.q2.a.why':
    'POST submits/creates data and changes server state; the safe, read-only method is GET.',
  'learning.concept.http.q2.c.why':
    'DELETE removes a resource — anything but read-only; GET is the safe method that only reads.',
  'learning.concept.http.q3.a.why':
    'Success is 2xx (e.g. 200); 404 is a client error meaning the resource was not found.',
  'learning.concept.http.q3.b.why':
    'Server errors are 5xx (e.g. 500); 404 is a 4xx client error, not a server error.',
};
