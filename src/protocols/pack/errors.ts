import { NetlabError } from '../../errors/NetlabError';

/**
 * Trial-period error helper. Descriptor and registry misuse use the existing
 * `protocol/invalid-request` code, header values `protocol/invalid-packet`; the
 * precise rule rides in `context.reason` (`pack/...`) and the field in
 * `context.path`. Dedicated `protocol-pack/*` codes are added at the freeze.
 */
export function packError(
  code: 'protocol/invalid-request' | 'protocol/invalid-packet',
  reason: string,
  message: string,
  path?: string,
): NetlabError {
  return new NetlabError({
    code,
    message: path === undefined ? message : `${message} (at ${path})`,
    context: path === undefined ? { reason } : { reason, path },
  });
}

export const descriptorError = (reason: string, message: string, path?: string) =>
  packError('protocol/invalid-request', reason, message, path);

export const valueError = (reason: string, message: string, path: string) =>
  packError('protocol/invalid-packet', reason, message, path);
