import { describe, expect, it } from 'vitest';
import { respondToPathChallenge, startPathValidation } from './QuicPathValidation';

describe('QUIC path validation', () => {
  it('echoes PATH_CHALLENGE data in PATH_RESPONSE', () => {
    const challenge = startPathValidation({ seed: 81, oldPort: 4433, newPort: 53333 });
    const response = respondToPathChallenge(challenge);

    expect(challenge.validated).toBe(false);
    expect(response.data).toEqual(challenge.data);
    expect(response.validated).toBe(true);
  });
});
