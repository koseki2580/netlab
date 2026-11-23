import type { Catalog } from '../../../../types';

/** The `mptcp` deck's questions (en); its name is in the core chunk. */
export const mptcp: Catalog = {
  'learning.concept.mptcp.q1.prompt':
    'A phone downloads 50 MB with MPTCP over Wi-Fi (40 Mbit/s, 20 ms) and LTE (20 Mbit/s, 60 ms), both kept full. About how long does it take?',
  'learning.concept.mptcp.q1.a': '10 s: it goes at the speed of the faster path',
  'learning.concept.mptcp.q1.b': 'About 6.7 s: the two capacities add up to 60 Mbit/s',
  'learning.concept.mptcp.q1.c': '20 s: the slower path holds the whole transfer back',
  'learning.concept.mptcp.q1.why':
    'Both subflows carry data at once, so the connection gets 40 + 20 = 60 Mbit/s: 400 Mbit ÷ 60 ≈ 6.7 s, with Wi-Fi carrying about 33 MB and LTE about 17 MB. Over Wi-Fi alone it would take 10 s.',
  'learning.concept.mptcp.q1.a.why':
    '10 s is plain TCP over Wi-Fi alone. MPTCP keeps LTE busy as well, so its 20 Mbit/s is added on top.',
  'learning.concept.mptcp.q1.c.why':
    'The scheduler fills each subflow’s window separately, so the slow path does not set the pace; it only adds its own share.',
  'learning.concept.mptcp.q2.prompt':
    'With a min-RTT scheduler and empty windows, the app sends a 64 KB request. Full, Wi-Fi’s window holds 100 KB. Where do the segments go?',
  'learning.concept.mptcp.q2.a': 'All over Wi-Fi: it has the lowest RTT and room left',
  'learning.concept.mptcp.q2.b': 'Split 2 : 1 between Wi-Fi and LTE, by bandwidth',
  'learning.concept.mptcp.q2.c': 'Alternately, one segment per subflow',
  'learning.concept.mptcp.q2.why':
    'min-RTT sends each segment on the lowest-RTT subflow that has room in its window, and only then on the next. 64 KB fits in Wi-Fi’s 100 KB window, so LTE carries nothing; a 200 KB burst would spill 100 KB onto LTE.',
  'learning.concept.mptcp.q2.b.why':
    'The common scheduler does not split by bandwidth; it fills the lowest-RTT subflow first, and LTE gets data only when Wi-Fi’s window is full.',
  'learning.concept.mptcp.q2.c.why':
    'Round-robin would put half the segments on the 60 ms path and slow the request down; min-RTT uses LTE only when Wi-Fi has no room.',
  'learning.concept.mptcp.q3.prompt':
    'A middlebox stripped MP_CAPABLE from the SYN. Three seconds into the download the phone leaves Wi-Fi. What happens?',
  'learning.concept.mptcp.q3.a': 'It carries on over LTE, more slowly',
  'learning.concept.mptcp.q3.b': 'It pauses until Wi-Fi comes back',
  'learning.concept.mptcp.q3.c': 'It breaks: the connection fell back to plain TCP',
  'learning.concept.mptcp.q3.why':
    'MPTCP is agreed only if MP_CAPABLE survives in both the SYN and the SYN/ACK. Without it the handshake completes as ordinary TCP over Wi-Fi with no extra subflow, so losing Wi-Fi breaks the connection and the app must start again.',
  'learning.concept.mptcp.q3.a.why':
    'Carrying on over LTE needs an LTE subflow, and subflows can be added only to an MPTCP connection. Here the handshake fell back to TCP.',
  'learning.concept.mptcp.q3.b.why':
    'A plain TCP connection is bound to Wi-Fi’s address; once that address is gone, the connection fails rather than waiting.',
  'learning.concept.mptcp.q4.prompt':
    'Two MPTCP subflows and one regular TCP flow share one bottleneck. With coupled congestion control (LIA), what share does MPTCP get?',
  'learning.concept.mptcp.q4.a': 'About half: together its subflows act as one flow',
  'learning.concept.mptcp.q4.b': 'About two thirds: each subflow counts as one flow',
  'learning.concept.mptcp.q4.c': 'About a third: the two subflows split one flow’s share',
  'learning.concept.mptcp.q4.why':
    'LIA links the subflows’ increases so that, together, they settle at the window one TCP flow would have: 50 % each. Uncoupled, every subflow is a TCP flow of its own and MPTCP takes about 67 %.',
  'learning.concept.mptcp.q4.b.why':
    'Two thirds is what uncoupled subflows take, each behaving like its own TCP flow. Coupling exists to stop exactly that.',
  'learning.concept.mptcp.q4.c.why':
    'The subflows do share one flow’s window between them, but that is the whole of MPTCP’s share, equal to the TCP flow’s: half, not a third.',
};
