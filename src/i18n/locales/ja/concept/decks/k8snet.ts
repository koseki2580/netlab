import type { Catalog } from '../../../../types';

/** The `k8snet` deck's questions (ja); its name is in the core chunk. */
export const k8snet: Catalog = {
  'learning.concept.k8snet.q1.prompt':
    'node-a（10.0.0.1）上の Pod 10.244.1.5 が Service の ClusterIP 10.96.0.10:80 を呼びます。唯一のバックエンド Pod 10.244.2.7:8080 は node-b にあります。kube-proxy は iptables モードで設定は既定のままです。バックエンドに見える送信元アドレスは？',
  'learning.concept.k8snet.q1.a': '10.96.0.10（ClusterIP）',
  'learning.concept.k8snet.q1.b': '10.0.0.1（node-a）',
  'learning.concept.k8snet.q1.c': '10.244.1.5（呼び出した Pod）',
  'learning.concept.k8snet.q1.why':
    'kube-proxy が書き換えるのは宛先だけで、ClusterIP からバックエンド Pod へ DNAT します。Pod 同士は NAT なしで届くので、送信元はそのままです。',
  'learning.concept.k8snet.q1.a.why':
    'ClusterIP はクライアントが指定した宛先です。行きの途中でそれが送信元に入ることはありません。',
  'learning.concept.k8snet.q1.b.why':
    'ノードのアドレスが見えるのは SNAT したときだけですが、kube-proxy は既定では Pod から ClusterIP への通信を SNAT しません。',
  'learning.concept.k8snet.q2.prompt':
    '同じ呼び出し（Pod 10.244.1.5 から ClusterIP 10.96.0.10:80 へ、10.244.2.7:8080 に DNAT）でバックエンドが返信します。呼び出した Pod には、返信がどのアドレスから来たように見える？',
  'learning.concept.k8snet.q2.a': '10.96.0.10:80（自分が尋ねたアドレス）',
  'learning.concept.k8snet.q2.b': '10.244.2.7:8080（バックエンド Pod）',
  'learning.concept.k8snet.q2.c': '10.0.0.2:8080（node-b）',
  'learning.concept.k8snet.q2.why':
    '呼び出した Pod のノードの conntrack が DNAT を覚えていて返信で元に戻すので、送信元は ClusterIP に戻り、接続とも一致します。',
  'learning.concept.k8snet.q2.b.why':
    'それはバックエンドを出たときの返信です。呼び出し元に届く前に書き戻されます。そうしないと呼び出し元は知らない相手からのパケットとして捨ててしまいます。',
  'learning.concept.k8snet.q2.c.why':
    'SNAT はしていないので、ノードのアドレスは出てきません。conntrack は ClusterIP に戻します。',
  'learning.concept.k8snet.q3.prompt':
    'externalTrafficPolicy: Cluster の NodePort Service で、kube-proxy は iptables モードです。203.0.113.9 のクライアントが、唯一のバックエンド Pod が動く node-b（10.0.0.2）に接続します。マスカレード後の送信元はノード自身のアドレスとします。バックエンドに見える送信元は？',
  'learning.concept.k8snet.q3.a': '203.0.113.9（余分なホップがないので SNAT しない）',
  'learning.concept.k8snet.q3.b': '10.0.0.2（Cluster はノードへ SNAT する）',
  'learning.concept.k8snet.q3.c': '10.0.0.1（もう一方のノード）',
  'learning.concept.k8snet.q3.why':
    'Cluster では、kube-proxy はどのバックエンドを選んでも外からの NodePort の通信をマスカレードします。ローカルにバックエンドがあっても、送信元は入口のノード 10.0.0.2 になります。クライアントのアドレスを残すのは Local だけです。',
  'learning.concept.k8snet.q3.a.why':
    'このルールは選んだバックエンドの場所を見ません。Cluster では送信元は常に書き換えられます。',
  'learning.concept.k8snet.q3.c.why':
    'SNAT に使うのは要求が入ったノード node-b です。node-a はこの経路にありません。',
  'learning.concept.k8snet.q4.prompt':
    'externalTrafficPolicy: Local の NodePort Service で、kube-proxy は iptables モードです。唯一のバックエンド Pod は node-b（10.0.0.2）で動いています。クライアントが、バックエンドのない node-a（10.0.0.1）の NodePort に接続します。どうなる？',
  'learning.concept.k8snet.q4.a': 'node-a へ SNAT して node-b へ転送',
  'learning.concept.k8snet.q4.b': 'クライアントのアドレスのまま node-b へ転送',
  'learning.concept.k8snet.q4.c': 'node-a で破棄（バックエンドがない）',
  'learning.concept.k8snet.q4.why':
    'Local では、ノードは NodePort の通信を自分の上のバックエンドにしか送りません。だからクライアントのアドレスを残せます。node-a にはバックエンドがないので要求を破棄します。LoadBalancer 型の Service ならヘルスチェック（node-a は 503）でロードバランサが node-a を避けます。',
  'learning.concept.k8snet.q4.a.why':
    'それは Cluster の動きです。Local はほかのノードへ送らないので、SNAT も必要ありません。',
  'learning.concept.k8snet.q4.b.why':
    'node-b がクライアントへ直接返すと、返信は node-a の conntrack を通らず DNAT が戻りません。Local はそもそも転送しないことでこれを避けます。',
};
