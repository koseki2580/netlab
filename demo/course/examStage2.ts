import { lessonPath } from '../lessonManifest';
import type { ExamLevel } from './examQuestions';

/**
 * The test of stage 2 (LAN): a switch, ARP and VLANs. Every answer is what the
 * named lesson shows when run, and what a real LAN does (IEEE 802.1D/802.1Q,
 * RFC 826).
 */
export const EXAM_STAGE_2: ExamLevel = {
  level: 6,
  title: { en: 'Stage 2 · LAN', ja: '段階 2・LAN' },
  summary: {
    en: 'One local network: how a switch passes frames, how ARP finds a MAC address, and VLANs.',
    ja: '1 つのローカルネットワーク。スイッチの渡し方、ARP による MAC アドレスの調べ方、VLAN。',
  },
  path: [
    {
      id: 'star',
      path: lessonPath('/basic/star'),
      title: { en: 'Star topology', ja: 'スター型' },
      teaches: {
        en: 'Several machines on one switch',
        ja: '1 台のスイッチにつながる何台もの機器',
      },
    },
    {
      id: 'arp',
      path: lessonPath('/networking/arp'),
      title: { en: 'ARP basics', ja: 'ARP の基本' },
      teaches: {
        en: 'Finding the MAC address to hand a packet to',
        ja: 'パケットを渡す相手の MAC アドレスを調べること',
      },
    },
    {
      id: 'vlan',
      path: lessonPath('/networking/vlan'),
      title: { en: 'VLAN segmentation', ja: 'VLAN による分離' },
      teaches: {
        en: 'Splitting one switch into separate networks',
        ja: '1 台のスイッチを別々のネットワークに分けること',
      },
    },
  ],
  questions: [
    {
      id: 's2-arp-broadcast',
      prompt: {
        en: 'A device needs the MAC address that goes with an IP address on its own network, and it has never asked before. To which MAC address does it send its ARP question?',
        ja: '自分のネットワークにある IP アドレスに対応する MAC アドレスが必要で、まだ一度も聞いていません。ARP の質問は、どの MAC アドレスあてに送りますか？',
      },
      options: [
        { en: 'The router’s MAC address, as usual', ja: 'いつもどおりルータの MAC アドレス' },
        { en: 'ff:ff:ff:ff:ff:ff, to everyone', ja: 'ff:ff:ff:ff:ff:ff（全員あて）' },
        { en: '00:00:00:00:00:00, to no one', ja: '00:00:00:00:00:00（だれでもない）' },
        { en: 'Its own MAC address, to itself', ja: '自分あての、自分の MAC アドレス' },
      ],
      answer: 1,
      explanation: {
        en: 'It does not know whom to ask, so the question goes to the broadcast address ff:ff:ff:ff:ff:ff and every device on the network hears it (RFC 826). The ARP lesson’s "a little more detail" names this destination.',
        ja: 'だれに聞けばよいか分からないので、質問はブロードキャストの ff:ff:ff:ff:ff:ff あてに送り、ネットワークの全員が受け取ります（RFC 826）。ARP のレッスンの「もう少し詳しく」に、この宛先が書いてあります。',
      },
      taughtBy: 'arp',
    },
    {
      id: 's2-arp-who-answers',
      prompt: {
        en: 'An ARP question asks "who has 203.0.113.10?". Four devices on the network hear it. Which of them answers?',
        ja: '「203.0.113.10 の持ち主は？」という ARP の質問を、ネットワークの 4 台が受け取りました。答えるのはどれですか？',
      },
      options: [
        { en: 'Every device that heard the question', ja: '質問を受け取った全員' },
        { en: 'The switch, on their behalf', ja: '全員の代わりにスイッチ' },
        { en: 'Only the owner of that address', ja: 'その住所の持ち主だけ' },
        { en: 'The first device to hear it', ja: '最初に受け取った 1 台' },
      ],
      answer: 2,
      explanation: {
        en: 'Every device reads the question, but only the owner of the address answers, with its own MAC address; the rest stay silent. In the ARP lesson only the Server answers the Router’s question for 203.0.113.10.',
        ja: '質問は全員が読みますが、答えるのはその住所の持ち主だけで、自分の MAC アドレスを返します。ほかの機器は黙っています。ARP のレッスンでは、Router の 203.0.113.10 についての質問に答えるのは Server だけです。',
      },
      taughtBy: 'arp',
    },
    {
      id: 's2-arp-reply-unicast',
      prompt: {
        en: 'The Server answers the Router’s ARP question. Where does the answer go?',
        ja: 'Server が Router の ARP の質問に答えます。答えはどこへ送られますか？',
      },
      options: [
        { en: 'Straight back to the Router alone', ja: 'Router だけへ、まっすぐ返す' },
        { en: 'To everyone, like the question', ja: '質問と同じように全員へ' },
        { en: 'To the Client, who sent the packet', ja: 'パケットを出した Client へ' },
        { en: 'Nowhere; the Router reads it itself', ja: 'どこへも。Router が自分で読み取る' },
      ],
      answer: 0,
      explanation: {
        en: 'The question carried the Router’s own addresses, so the Server can answer it directly: the reply goes to the Router alone, not to everyone (RFC 826). The ARP lesson’s ARP-REP row runs from the Server to the Router.',
        ja: '質問には Router 自身の住所が書いてあるので、Server は Router だけに直接答えられます。答えは全員には送りません（RFC 826）。ARP のレッスンでは、ARP-REP の行が Server から Router への 1 本です。',
      },
      taughtBy: 'arp',
    },
    {
      id: 's2-arp-who-asks',
      prompt: {
        en: 'The Client (10.0.0.10) sends to the Server (203.0.113.10), which is on another network behind the Router. Which device asks ARP for the Server’s MAC address?',
        ja: 'Client（10.0.0.10）から、Router の向こうの別のネットワークにある Server（203.0.113.10）へ送ります。Server の MAC アドレスを ARP で聞くのはどの機器ですか？',
      },
      options: [
        { en: 'The Client, before it sends', ja: '送る前に、Client 自身が' },
        { en: 'The Router, near the Server', ja: 'Router が、向こう側で' },
        { en: 'The Server, about itself', ja: '自分について Server が' },
        { en: 'No one; ARP is not used here', ja: 'だれも聞かない。ここでは使わない' },
      ],
      answer: 1,
      explanation: {
        en: 'ARP only works inside one network, so the Client never asks for an address behind the router; it hands the packet to the Router. The Router is on the Server’s network and asks there. The ARP lesson’s trace shows the Router asking for the Server on the way out.',
        ja: 'ARP は 1 つのネットワークの中でしか使えないので、Client はルータの向こうの住所については聞きません。パケットは Router に渡します。Server のネットワークにいる Router が、そこで聞きます。ARP のレッスンの記録で、行きは Router が Server について聞いています。',
      },
      taughtBy: 'arp',
    },
    {
      id: 's2-first-frame-mac',
      prompt: {
        en: 'The Client already knows the Router’s MAC address and sends a packet for the Server (203.0.113.10, another network). Which destination MAC address does the Client write on its frame?',
        ja: 'Client はもう Router の MAC アドレスを知っていて、別のネットワークの Server（203.0.113.10）あてのパケットを送ります。Client がフレームに書く宛先の MAC アドレスはどれですか？',
      },
      options: [
        { en: 'The Server’s MAC address', ja: 'Server の MAC アドレス' },
        { en: 'ff:ff:ff:ff:ff:ff', ja: 'ff:ff:ff:ff:ff:ff' },
        { en: 'The Client’s own MAC address', ja: 'Client 自身の MAC アドレス' },
        { en: 'The Router’s MAC address', ja: 'Router の MAC アドレス' },
      ],
      answer: 3,
      explanation: {
        en: 'A frame only crosses one network, so it is addressed to the next device on the way, the Router, while the packet inside keeps the Server’s IP address as its destination. In the ARP lesson the first hop leaves the Client addressed to the Router, which is why the Client never has to ask.',
        ja: 'フレームは 1 つのネットワークしか渡らないので、宛先は途中の次の機器である Router です。中のパケットの宛先 IP アドレスは Server のままです。ARP のレッスンでも、最初のホップは Router あてで Client から出るので、Client は聞かずに済みます。',
      },
      taughtBy: 'arp',
    },
    {
      id: 's2-star-first-send',
      prompt: {
        en: 'Four clients and a server hang off one switch that has just started. Client-1 sends its first packet to the Server. Which devices does the packet reach?',
        ja: '起動したばかりのスイッチに、クライアント 4 台とサーバがつながっています。Client-1 がサーバへ最初のパケットを送ります。パケットはどの機器に届きますか？',
      },
      options: [
        { en: 'Only the Server, nothing else', ja: 'サーバ 1 台だけに届く' },
        { en: 'The Server and the three others', ja: 'サーバと残りの 3 台' },
        { en: 'None, until the switch learns the way', ja: 'スイッチが道を覚えるまで、どこにも' },
        { en: 'Only back to Client-1 itself', ja: 'Client-1 に戻るだけ' },
      ],
      answer: 1,
      explanation: {
        en: 'The switch does not yet know which port leads to the Server, so it copies the frame out of every port but the one it came in on; the three other clients receive it and discard it (IEEE 802.1D flooding). The star lesson shows those copies on its first send.',
        ja: 'スイッチはサーバにつながるポートをまだ知らないので、届いたポート以外のすべてのポートにコピーします。ほかのクライアント 3 台は受け取って捨てます（IEEE 802.1D のフラッディング）。スター型のレッスンで、最初の送信のときにこのコピーが見られます。',
      },
      taughtBy: 'star',
    },
    {
      id: 's2-vlan-same',
      prompt: {
        en: 'A1 and A2 are both in VLAN 10 on switch SW1. A1 sends to A2. Which way does the packet go?',
        ja: 'A1 と A2 は、どちらもスイッチ SW1 の VLAN 10 にいます。A1 から A2 へ送ります。パケットはどう進みますか？',
      },
      options: [
        { en: 'Up the trunk to R1 and back down', ja: 'トランクで R1 へ行き、戻ってくる' },
        { en: 'Out of every port of SW1', ja: 'SW1 のすべてのポートから出る' },
        { en: 'Nowhere, a router is needed', ja: '届かない。ルータが要る' },
        { en: 'Through SW1 straight to A2', ja: 'SW1 を通ってそのまま A2 へ' },
      ],
      answer: 3,
      explanation: {
        en: 'A1 and A2 share a VLAN, so they are on one network and SW1 delivers the frame itself; the router is needed only between VLANs. In the VLAN lesson a1→a2 goes A1 → SW1 → A2.',
        ja: 'A1 と A2 は同じ VLAN、つまり同じネットワークなので、SW1 がそのまま届けます。ルータが要るのは VLAN の間だけです。VLAN のレッスンで a1→a2 を送ると、A1 → SW1 → A2 と進みます。',
      },
      taughtBy: 'vlan',
    },
    {
      id: 's2-vlan-trunk-cut',
      prompt: {
        en: 'The trunk between SW1 and the router R1 is cut. Which of these still arrives?',
        ja: 'SW1 とルータ R1 の間のトランクが切れました。次のうち、まだ届くのはどれですか？',
      },
      options: [
        { en: 'A1 (VLAN 10) to A2 (VLAN 10)', ja: 'A1（VLAN 10）から A2（VLAN 10）' },
        { en: 'A1 (VLAN 10) to B1 (VLAN 20)', ja: 'A1（VLAN 10）から B1（VLAN 20）' },
        { en: 'B2 (VLAN 20) to A2 (VLAN 10)', ja: 'B2（VLAN 20）から A2（VLAN 10）' },
        { en: 'None of the three arrive', ja: 'この 3 つはどれも届かない' },
      ],
      answer: 0,
      explanation: {
        en: 'Traffic inside one VLAN never uses the trunk, so A1 to A2 still arrives. Between VLANs the only way is through R1, so A1 to B1 and B2 to A2 now stop at SW1. The VLAN lesson’s "Break trunk" shows both.',
        ja: '同じ VLAN の中の通信はトランクを使わないので、A1 から A2 は届きます。VLAN の間は R1 を通るしかないので、A1 から B1、B2 から A2 は SW1 で止まります。VLAN のレッスンの「トランクを切る」で両方が見られます。',
      },
      taughtBy: 'vlan',
    },
    {
      id: 's2-vlan-access-reach',
      prompt: {
        en: 'B2 is on an access port of VLAN 20. With no router in use, which machine can B2 reach?',
        ja: 'B2 は VLAN 20 のアクセスポートにつながっています。ルータを使わないとき、B2 が届けられるのはどの機器ですか？',
      },
      options: [
        { en: 'A1, in VLAN 10', ja: 'VLAN 10 の A1' },
        { en: 'B1, in VLAN 20', ja: 'VLAN 20 の B1' },
        { en: 'Every machine on SW1', ja: 'SW1 のすべての機器' },
        { en: 'No machine at all', ja: 'どの機器にも届かない' },
      ],
      answer: 1,
      explanation: {
        en: 'An access port belongs to one VLAN, and a frame stays inside its VLAN, so without a router B2 reaches only the other VLAN 20 machine, B1. The VLAN lesson defines an access port this way.',
        ja: 'アクセスポートは 1 つの VLAN に属し、フレームは自分の VLAN の中だけを流れます。だからルータなしで B2 が届けられるのは、同じ VLAN 20 の B1 だけです。VLAN のレッスンで、アクセスポートはこう定義されています。',
      },
      taughtBy: 'vlan',
    },
    {
      id: 's2-trunk-tag',
      prompt: {
        en: 'Frames of VLAN 10 and VLAN 20 travel to R1 over the same trunk cable, fa0/24. How does R1 tell which VLAN a frame belongs to?',
        ja: 'VLAN 10 と VLAN 20 のフレームが、同じトランクのケーブル fa0/24 で R1 へ届きます。R1 は、フレームがどの VLAN のものかをどうやって見分けますか？',
      },
      options: [
        { en: 'By the sender’s IP address', ja: '送り主の IP アドレスで' },
        { en: 'By which port of SW1 it came from', ja: 'SW1 のどのポートから来たかで' },
        { en: 'By the VLAN tag on each frame', ja: 'フレームごとの VLAN タグで' },
        { en: 'By the time it arrives', ja: 'フレームが届いた時刻で' },
      ],
      answer: 2,
      explanation: {
        en: 'On a trunk each frame carries an 802.1Q tag holding its VLAN number, so one cable can carry several VLANs and R1 reads the tag to pick its sub-interface for that VLAN. The VLAN lesson defines a trunk this way, and R1’s sub-interfaces are per VLAN.',
        ja: 'トランクでは、フレームごとに VLAN 番号を書いた 802.1Q タグが付きます。だから 1 本のケーブルで複数の VLAN を運べ、R1 はタグを読んで、その VLAN のサブインタフェースを選びます。VLAN のレッスンでトランクはこう定義され、R1 のサブインタフェースは VLAN ごとにあります。',
      },
      taughtBy: 'vlan',
    },
  ],
};
