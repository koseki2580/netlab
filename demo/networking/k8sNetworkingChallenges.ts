/**
 * The Kubernetes networking lesson's challenges (REQ-449): goals reached with
 * the explore card's controls (request, entry node, externalTrafficPolicy).
 * Every `reached` and every address in `why` comes from the model in
 * k8sNetworking.ts.
 */
import type { Challenge } from '../components/LessonChallenges';
import {
  BACKEND_POD,
  SERVICE,
  healthCheck,
  trace,
  type NodeId,
  type Policy,
  type Target,
} from './k8sNetworking';

export interface ExploreState {
  readonly target: Target;
  readonly entry: NodeId;
  readonly policy: Policy;
}

const endpoint = (address: string, port: number) => `${address}:${port}`;

export function k8sNetworkingChallenges(state: ExploreState): Challenge[] {
  const result = trace(state.target, state.entry, state.policy);
  const nodePort = state.target === 'node-port';
  const health = nodePort ? healthCheck(state.entry, state.policy) : null;
  const backendReply = result.hops.find((hop) => hop.change === 'reply')?.packet;

  // 1. Cluster, delivered, and no extra hop: the request entered the backend's node.
  const clusterNoHop =
    nodePort && state.policy === 'Cluster' && result.delivered && result.extraHops === 0;

  // 2. A health check that takes a node out of the load balancer.
  const healthDown = health === 503;

  // 3. A reply from an address that neither a Pod nor a node holds.
  const virtualReply = result.reply?.src === SERVICE.clusterIp;

  return [
    {
      id: 'cluster-no-hop',
      goal: {
        en: 'Keep externalTrafficPolicy: Cluster and get a NodePort request to the backend with no extra node-to-node hop. Then look at the source the backend sees.',
        ja: 'externalTrafficPolicy: Cluster のまま、NodePort への要求を余分なノード間ホップなしでバックエンドへ届けてください。そのうえで、バックエンドに見える送信元を確かめてください。',
      },
      hint: {
        en: 'The extra hop is the trip from the node the request entered to the node that runs the backend.',
        ja: '余分なホップは、要求が入ったノードからバックエンドが動くノードまでの移動です。',
      },
      reached: clusterNoHop,
      why: {
        en: `Entering ${state.entry}, where the backend runs, the request needs ${result.extraHops} extra hops, yet the backend still sees ${result.backendSees}: under Cluster the entry node always rewrites the source to itself, because it cannot know in advance that the reply will not need to come back through it.`,
        ja: `バックエンドが動く ${state.entry} から入れば余分なホップは ${result.extraHops} ですが、それでもバックエンドに見える送信元は ${result.backendSees} です。Cluster では、入口のノードは返信が自分を通る必要があるかどうかに関係なく、いつも送信元を自分のアドレスに書き換えるからです。`,
      },
    },
    {
      id: 'health-503',
      goal: {
        en: 'Make the load balancer’s health check take a node out of service (a 503 answer).',
        ja: 'ロードバランサのヘルスチェックで、あるノードが外されるようにしてください（503 の応答）。',
      },
      hint: {
        en: 'Under which policy does a node refuse to send NodePort traffic to another node, and which node has nothing of its own to send to?',
        ja: 'どちらのポリシーで、ノードは NodePort の通信をほかのノードへ送らなくなりますか。自分の上に送り先がないのはどのノードでしょう。',
      },
      reached: healthDown,
      why: {
        en: `Under ${state.policy}, ${state.entry} runs no backend (the only one is on ${BACKEND_POD.node}), so a request entering it is ${result.delivered ? 'delivered' : 'dropped'} and its health-check port answers ${health}. The load balancer then sends only to ${BACKEND_POD.node}, which answers ${healthCheck(BACKEND_POD.node, state.policy)}.`,
        ja: `${state.policy} では ${state.entry} にバックエンドがない（唯一のバックエンドは ${BACKEND_POD.node}）ので、そこへ入った要求は${result.delivered ? '届き' : '破棄され'}、ヘルスチェック用のポートは ${health} を返します。ロードバランサは ${healthCheck(BACKEND_POD.node, state.policy)} を返す ${BACKEND_POD.node} にだけ送ります。`,
      },
    },
    {
      id: 'virtual-reply',
      goal: {
        en: 'Get a reply whose source address is held by no Pod and no node.',
        ja: 'どの Pod もどのノードも持っていないアドレスから返信が届くようにしてください。',
      },
      hint: {
        en: 'Which address in this cluster exists only as rules in the kernel, and what undoes the rewrite on the way back?',
        ja: 'このクラスタで、カーネルのルールの中にしか存在しないアドレスはどれですか。帰りに書き換えを戻すのは何でしょう。',
      },
      reached: virtualReply,
      why: {
        en: `The backend replies from ${backendReply ? endpoint(backendReply.src, backendReply.srcPort) : ''}, its own address. conntrack on the client’s node remembers the DNAT and rewrites the reply’s source back to ${result.reply ? endpoint(result.reply.src, result.reply.srcPort) : ''}, the ClusterIP the client asked for, which no interface holds.`,
        ja: `バックエンドは自分のアドレス ${backendReply ? endpoint(backendReply.src, backendReply.srcPort) : ''} から返信します。クライアントのノードの conntrack が DNAT を覚えていて、返信の送信元を、クライアントが尋ねた ClusterIP ${result.reply ? endpoint(result.reply.src, result.reply.srcPort) : ''} に戻します。このアドレスはどのインターフェースも持っていません。`,
      },
    },
  ];
}
