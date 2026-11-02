import { describe, expect, it } from 'vitest';
import { electDesignatedRouters } from './designatedRouter';

const r = (routerId: string, priority = 1) => ({ routerId, priority });

// RFC 2328 §9.4.
describe('DR and BDR election', () => {
  it('TC-1097: the highest priority is DR and the next BDR, from a cold start', () => {
    expect(electDesignatedRouters([r('1.1.1.1', 1), r('2.2.2.2', 200), r('3.3.3.3', 100)])).toEqual(
      {
        dr: '2.2.2.2',
        bdr: '3.3.3.3',
      },
    );
  });

  it('TC-1097: equal priorities fall to the highest router id, as a number', () => {
    expect(electDesignatedRouters([r('9.0.0.9'), r('10.0.0.10'), r('10.0.0.9')])).toEqual({
      dr: '10.0.0.10',
      bdr: '10.0.0.9',
    });
  });

  it('TC-1097: priority 0 never stands, even alone', () => {
    expect(electDesignatedRouters([r('9.9.9.9', 0), r('1.1.1.1')])).toEqual({
      dr: '1.1.1.1',
      bdr: null,
    });
    expect(electDesignatedRouters([r('9.9.9.9', 0)])).toEqual({ dr: null, bdr: null });
  });

  it('TC-1098: a better router joining takes neither role', () => {
    const before = electDesignatedRouters([r('1.1.1.1', 10), r('2.2.2.2', 5)]);
    const after = electDesignatedRouters(
      [r('1.1.1.1', 10), r('2.2.2.2', 5), r('9.9.9.9', 255)],
      before,
    );
    expect(after).toEqual({ dr: '1.1.1.1', bdr: '2.2.2.2' });
  });

  it('TC-1098: a better router that joins takes BDR only when BDR is empty', () => {
    const before = electDesignatedRouters([r('1.1.1.1', 10)]);
    expect(before).toEqual({ dr: '1.1.1.1', bdr: null });
    expect(electDesignatedRouters([r('1.1.1.1', 10), r('9.9.9.9', 255)], before)).toEqual({
      dr: '1.1.1.1',
      bdr: '9.9.9.9',
    });
  });

  it('TC-1099: when the DR goes the BDR takes over and the best of the rest becomes BDR', () => {
    const before = { dr: '1.1.1.1', bdr: '2.2.2.2' };
    expect(
      electDesignatedRouters([r('2.2.2.2', 5), r('3.3.3.3', 1), r('4.4.4.4', 50)], before),
    ).toEqual({ dr: '2.2.2.2', bdr: '4.4.4.4' });
  });

  it('TC-1099: when the BDR goes the DR stays and a new BDR is elected', () => {
    expect(
      electDesignatedRouters([r('1.1.1.1', 1), r('3.3.3.3', 9)], {
        dr: '1.1.1.1',
        bdr: '2.2.2.2',
      }),
    ).toEqual({ dr: '1.1.1.1', bdr: '3.3.3.3' });
  });

  it('TC-1099: a holder whose priority was set to 0 gives the role up', () => {
    expect(
      electDesignatedRouters([r('1.1.1.1', 0), r('2.2.2.2'), r('3.3.3.3')], {
        dr: '1.1.1.1',
        bdr: '2.2.2.2',
      }),
    ).toEqual({ dr: '2.2.2.2', bdr: '3.3.3.3' });
  });
});
