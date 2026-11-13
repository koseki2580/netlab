import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { routerLsdb } from '../../src/routing/ospf/OspfLsdb';
import type { OspfPathType } from '../../src/types/routing';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { LESSON_CARD, LESSON_LABEL, LESSON_TEAL_BUTTON } from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  describeLsa,
  initialLan,
  labelOfRouterId,
  LAN_ROUTERS,
  lanRestarted,
  lanToggled,
  LESSON_ROUTER_IDS,
  lessonLsdb,
  lessonRoutes,
  lessonTopology,
  type LanState,
} from './ospfAreasLesson';

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
  overflowY: 'auto',
};

const TEXT: React.CSSProperties = {
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.6,
};

const NOTE: React.CSSProperties = { ...TEXT, color: 'var(--netlab-text-secondary)' };

function AreasPanel({ lan, onLan }: { lan: LanState; onLan: (next: LanState) => void }) {
  const t = useT();
  const [routerId, setRouterId] = useState('r2');
  const lsdb = useMemo(() => lessonLsdb(lan), [lan]);
  const routes = useMemo(
    () => lessonRoutes(lan).filter((route) => route.nodeId === routerId),
    [lan, routerId],
  );
  const held = routerLsdb(lsdb, routerId);
  const standing = lsdb.routers.find((router) => router.nodeId === routerId);

  const pathWord = (type: OspfPathType | undefined) =>
    type === 'intra-area'
      ? t('intra-area', 'エリア内')
      : type === 'inter-area'
        ? t('inter-area', 'エリア間')
        : type === 'external-1'
          ? 'E1'
          : 'E2';

  return (
    <>
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Calculated, not exchanged', '計算した表です')}</div>
        <div data-testid="ospf-calculated-note" style={NOTE}>
          {t(
            'Everything on this page is calculated from the network as drawn. The simulator sends no OSPF packets: no Hello, no flooding, so an LSA here is what flooding would have settled on, and nothing here takes time.',
            'このページの表はすべて、図のネットワークから計算したものです。シミュレータは OSPF のパケットを送りません。Hello もフラッディングもないので、ここの LSA はフラッディングが落ち着いたときの姿で、時間の経過はありません。',
          )}
        </div>
      </div>

      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Areas', 'エリア')}</div>
        <div style={NOTE}>
          {t(
            'A router keeps a full map only of the areas it stands in. An ABR stands in the backbone and another area, and tells each side a short summary of the other. A route inside the area is always preferred to one through another area, whatever the cost; external routes come last. Two non-backbone areas meet only through the backbone.',
            'ルータが地図全体を持つのは、自分がいるエリアの分だけです。ABR はバックボーンと別のエリアの両方にいて、それぞれへ相手側の短いまとめを伝えます。経路は、コストに関係なくエリア内のものが優先され、外部の経路は最後です。バックボーン以外のエリアどうしは、必ずバックボーンを通ります。',
          )}
        </div>
        <label style={{ ...TEXT, display: 'grid', gap: 4, marginTop: 8 }}>
          {t('Router', 'ルータ')}
          <select
            data-testid="ospf-router-select"
            value={routerId}
            onChange={(event) => setRouterId(event.target.value)}
            style={{ minHeight: 32, fontFamily: 'monospace', fontSize: 12 }}
          >
            {LESSON_ROUTER_IDS.map((id) => (
              <option key={id} value={id}>
                {id.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <div data-testid="ospf-router-role" style={{ ...TEXT, marginTop: 6 }}>
          {standing?.abr ? t('ABR', 'ABR') : null}
          {standing?.abr && standing.asbr ? ' · ' : null}
          {standing?.asbr ? t('ASBR', 'ASBR') : null}
          {!standing?.abr && !standing?.asbr ? t('Inside one area', '1 つのエリアの中') : null}
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="ospf-lsdb">
        <div style={LESSON_LABEL}>{t('Link-state database', 'リンクステートデータベース')}</div>
        {held.length === 0 ? (
          <div style={NOTE}>{t('This router is stopped.', 'このルータは止まっています。')}</div>
        ) : null}
        {held.map((area) => (
          <div key={area.areaId} data-testid={`ospf-lsdb-area-${area.areaId}`} style={TEXT}>
            <strong>{t(`Area ${area.areaId}`, `エリア ${area.areaId}`)}</strong>
            <ul style={{ margin: '4px 0 8px', paddingLeft: 16 }}>
              {area.lsas.map((lsa) => (
                <li key={`${lsa.type}-${lsa.lsId}-${lsa.advertisingRouter}`}>
                  {describeLsa(lsa, t)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div style={NOTE}>
          {t(
            'Type 1: each router’s links, inside one area. Type 2: the DR’s list of a LAN. Type 3: an ABR’s summary. Type 5: an ASBR’s network from outside, carried into every normal area but not into stub or NSSA areas. Real OSPF also has Type 4, which says how to reach an ASBR in another area; it is not modelled here.',
            'Type 1：各ルータのリンク。1 つのエリアの中だけ。Type 2：DR がまとめる LAN の一覧。Type 3：ABR のまとめ。Type 5：ASBR が持ち込む外部のネットワークで、ふつうのエリアにはすべて入りますが、スタブエリアには入りません（NSSA も同じです）。実際の OSPF には、別のエリアの ASBR への行き方を伝える Type 4 もありますが、ここでは扱いません。',
          )}
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="ospf-routes">
        <div style={LESSON_LABEL}>{t('Its routes', 'このルータの経路')}</div>
        <div style={TEXT}>
          {routes.map((route) => (
            <div
              key={route.destination}
              data-testid={`ospf-route-${route.destination}`}
            >{`${route.destination} — ${pathWord(route.ospfPathType)} — ${route.metric}`}</div>
          ))}
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="ospf-lan">
        <div style={LESSON_LABEL}>{t('DR and BDR on the LAN', 'LAN の DR と BDR')}</div>
        <div style={NOTE}>
          {t(
            'On a LAN every router would otherwise exchange maps with every other, so they elect a DR, with a BDR ready to take over, and speak to those two. The highest priority wins, then the highest router id; priority 0 never stands. Once elected, a router keeps the role: a better router that joins later waits. R1 has priority 1, R3 50, R2 100, R7 255.',
            'LAN では全員が全員と地図を交換することになるので、DR と、その控えの BDR を選び、その 2 台とだけやり取りします。プライオリティの大きいルータ、同じならルータ ID の大きいルータが選ばれ、プライオリティ 0 は立候補しません。いったん選ばれると役を譲りません。後からよりよいルータが来ても待たされます。プライオリティは R1 が 1、R3 が 50、R2 が 100、R7 が 255 です。',
          )}
        </div>
        <div data-testid="ospf-lan-dr" style={{ ...TEXT, marginTop: 8 }}>
          {`DR: ${labelOfRouterId(lan.dr)}`}
        </div>
        <div data-testid="ospf-lan-bdr" style={TEXT}>
          {`BDR: ${labelOfRouterId(lan.bdr)}`}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {LAN_ROUTERS.map((router) => {
            const stopped = lan.stopped.includes(router.id);
            return (
              <button
                key={router.id}
                type="button"
                data-testid={`ospf-lan-toggle-${router.id}`}
                style={LESSON_TEAL_BUTTON}
                onClick={() => onLan(lanToggled(lan, router.id))}
              >
                {stopped
                  ? t(`start ${router.label}`, `${router.label} を起動`)
                  : t(`stop ${router.label}`, `${router.label} を停止`)}
              </button>
            );
          })}
          <button
            type="button"
            data-testid="ospf-lan-restart"
            style={LESSON_TEAL_BUTTON}
            onClick={() => onLan(lanRestarted())}
          >
            {t('restart all together', '全台を同時に再起動')}
          </button>
        </div>
      </div>
    </>
  );
}

export default function OspfAreasDemo() {
  const [lan, setLan] = useState(initialLan);
  const topology = useMemo(() => lessonTopology(lan), [lan]);

  return (
    <DemoShell
      title="OSPF Areas and DR/BDR"
      desc="Read the link-state database by area, and try the DR election"
    >
      <NetlabProvider topology={topology}>
        <LessonSplit>
          <LessonCanvas canvas={<NetlabCanvas />} />
          <LessonPanel defaultWidth={460} maxWidth={760} style={PANEL_STYLE}>
            <AreasPanel lan={lan} onLan={setLan} />
          </LessonPanel>
        </LessonSplit>
      </NetlabProvider>
    </DemoShell>
  );
}
