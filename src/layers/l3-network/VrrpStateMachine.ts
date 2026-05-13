import type { VrrpConfig, VrrpEvent, VrrpMember, VrrpState } from '../../types/vrrp';

const DEFAULT_ADVERT_MS = 1000;

function hexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function compareIp(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true });
}

export function masterDownIntervalMs(config: VrrpConfig): number {
  if (config.hsrpMode) return 10_000;
  const advert = config.advertIntervalMs ?? DEFAULT_ADVERT_MS;
  const skew = ((256 - config.priority) / 256) * advert;
  return Math.round(3 * advert + skew);
}

export function virtualRouterMac(config: VrrpConfig): string {
  const suffix = hexByte(config.vrid);
  if (config.hsrpMode) return `00:00:0c:07:ac:${suffix}`;
  return config.virtualIp.includes(':') ? `00:00:5e:00:02:${suffix}` : `00:00:5e:00:01:${suffix}`;
}

export function electVrrpMaster(members: readonly VrrpMember[]): VrrpMember | null {
  const active = members.filter((member) => member.config.priority > 0);
  if (active.length === 0) return null;
  return (
    [...active].sort((left, right) => {
      if (left.config.priority !== right.config.priority) {
        return right.config.priority - left.config.priority;
      }
      return compareIp(right.realIp, left.realIp);
    })[0] ?? null
  );
}

export function transitionVrrpState(
  state: VrrpState,
  event: VrrpEvent,
  config: VrrpConfig,
): VrrpState {
  if (event.type === 'startup') {
    return config.priority === 255
      ? { role: 'master', remainingMs: config.advertIntervalMs ?? DEFAULT_ADVERT_MS }
      : { role: 'backup', remainingMs: masterDownIntervalMs(config) };
  }

  if (event.type === 'shutdown' || event.type === 'interfaceDown') {
    return { role: 'init', remainingMs: 0 };
  }

  if (state.role === 'backup') {
    if (event.type === 'helloRecv') {
      return {
        role: 'backup',
        remainingMs: event.priority === 0 ? 1 : masterDownIntervalMs(config),
      };
    }
    if (event.type === 'masterDownTimerExpire') {
      return { role: 'master', remainingMs: config.advertIntervalMs ?? DEFAULT_ADVERT_MS };
    }
  }

  if (state.role === 'master') {
    if (event.type === 'adverTimerExpire') {
      return { role: 'master', remainingMs: config.advertIntervalMs ?? DEFAULT_ADVERT_MS };
    }
    if (event.type === 'helloRecv' && event.priority > config.priority) {
      return { role: 'backup', remainingMs: masterDownIntervalMs(config) };
    }
  }

  return state;
}
