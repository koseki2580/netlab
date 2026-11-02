import { describe, expect, it } from 'vitest';
import { routerLsdb } from '../../src/routing/ospf/OspfLsdb';
import {
  describeLsa,
  initialLan,
  lanToggled,
  lessonLsdb,
  lessonRoutes,
  lessonTopology,
  lanRestarted,
} from './ospfAreasLesson';

const en = (english: string) => english;
const ja = (_english: string, japanese: string) => japanese;

describe('the OSPF areas lesson', () => {
  it('TC-1102: R2 holds area 1 only and R1, an ABR, two areas', () => {
    const lsdb = lessonLsdb(initialLan());
    expect(routerLsdb(lsdb, 'r2').map((area) => area.areaId)).toEqual(['0.0.0.1']);
    expect(routerLsdb(lsdb, 'r1').map((area) => area.areaId)).toEqual(['0.0.0.0', '0.0.0.1']);
  });

  it('TC-1102: every LSA type is in area 1, and the backbone sees the range, not its parts', () => {
    const lsdb = lessonLsdb(initialLan());
    const list = (areaId: string) => lsdb.areas.find((area) => area.areaId === areaId)?.lsas ?? [];
    expect(new Set(list('0.0.0.1').map((lsa) => lsa.type))).toEqual(new Set([1, 2, 3, 5]));
    const summaries = list('0.0.0.0').flatMap((lsa) => (lsa.type === 3 ? [lsa.lsId] : []));
    expect(summaries).toContain('10.1.0.0/16');
    expect(summaries).not.toContain('10.1.0.0/24');
  });

  it('TC-1102: R6 reaches area 1 by the range, inter-area, and the outside as E2', () => {
    const routes = lessonRoutes(initialLan()).filter((route) => route.nodeId === 'r6');
    expect(routes.find((route) => route.destination === '10.1.0.0/16')?.ospfPathType).toBe(
      'inter-area',
    );
    expect(routes.find((route) => route.destination === '203.0.113.0/24')).toMatchObject({
      metric: 20,
      ospfPathType: 'external-2',
    });
    expect(routes.find((route) => route.destination === '10.2.0.0/24')?.ospfPathType).toBe(
      'intra-area',
    );
  });

  it('TC-1103: routers starting together elect by priority, and R7 is not there yet', () => {
    expect(initialLan()).toMatchObject({ stopped: ['r7'], dr: '2.2.2.2', bdr: '3.3.3.3' });
  });

  it('TC-1103: R7, with the highest priority, joins and takes nothing', () => {
    expect(lanToggled(initialLan(), 'r7')).toMatchObject({
      stopped: [],
      dr: '2.2.2.2',
      bdr: '3.3.3.3',
    });
  });

  it('TC-1103: the DR stops: the BDR takes over, and R7 takes BDR', () => {
    const joined = lanToggled(initialLan(), 'r7');
    expect(lanToggled(joined, 'r2')).toMatchObject({ dr: '3.3.3.3', bdr: '7.7.7.7' });
  });

  it('TC-1103: the old DR coming back takes nothing either', () => {
    const joined = lanToggled(initialLan(), 'r7');
    const stopped = lanToggled(joined, 'r2');
    expect(lanToggled(stopped, 'r2')).toMatchObject({ dr: '3.3.3.3', bdr: '7.7.7.7' });
  });

  it('TC-1103: only restarting them all together gives R7 the DR', () => {
    expect(lanRestarted()).toMatchObject({ stopped: [], dr: '7.7.7.7', bdr: '2.2.2.2' });
  });

  it('TC-1103: the Type 2 comes from the DR of the moment', () => {
    const joined = lanToggled(initialLan(), 'r7');
    const area1 = lessonLsdb(lanToggled(joined, 'r2')).areas.find(
      (area) => area.areaId === '0.0.0.1',
    );
    expect(area1?.lsas.find((lsa) => lsa.type === 2)?.advertisingRouter).toBe('3.3.3.3');
  });

  it('TC-1102: a stopped router’s cable is down in the lesson topology', () => {
    const edge = lessonTopology(initialLan()).edges.find((entry) => entry.id === 'e-lan-r7');
    expect(edge?.data?.state).toBe('down');
  });

  it('TC-1102: an LSA reads in both languages', () => {
    const type3 = { type: 3, lsId: '10.1.0.0/16', advertisingRouter: '1.1.1.1', cost: 4 } as const;
    expect(describeLsa(type3, en)).toBe('Type 3 · summary 10.1.0.0/16 from 1.1.1.1, cost 4');
    expect(describeLsa(type3, ja)).toBe('Type 3・サマリ 10.1.0.0/16（1.1.1.1 から、コスト 4）');
  });
});
