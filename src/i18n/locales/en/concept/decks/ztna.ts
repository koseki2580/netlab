import type { Catalog } from '../../../../types';

/** The `ztna` deck's questions (en); its name is in the core chunk. */
export const ztna: Catalog = {
  'learning.concept.ztna.q1.prompt':
    'A contractor, allowed only the code repository, connects to the full-tunnel VPN (ACL permit 10.0.0.0/8), and malware takes over the laptop. Which of the five internal apps can it reach?',
  'learning.concept.ztna.q1.a': 'All five: the ACL opens all of 10.0.0.0/8 to every user',
  'learning.concept.ztna.q1.b': 'Only the code repository, the one app they are allowed',
  'learning.concept.ztna.q1.c': 'None: the VPN tunnel encrypts the traffic',
  'learning.concept.ztna.q1.why':
    'The VPN puts the device on the network and gives everyone the same ACL, so it can send packets to all 16,777,216 addresses of 10.0.0.0/8 and every app in them. Identity and posture play no part in what it can reach.',
  'learning.concept.ztna.q1.b.why':
    'Being “allowed” one app is not enforced by this VPN: its single ACL ignores who connected, so the whole 10.0.0.0/8 is reachable.',
  'learning.concept.ztna.q1.c.why':
    'Encryption protects the traffic on the way; it does not limit where a connected device may send packets, and the malware sends them from inside the tunnel.',
  'learning.concept.ztna.q2.prompt':
    'The same compromised laptop, but under ZTNA. What can it reach?',
  'learning.concept.ztna.q2.a': 'All five again, once it gets past the access proxy',
  'learning.concept.ztna.q2.b': 'Nothing at all: unmanaged devices are refused everything',
  'learning.concept.ztna.q2.c': 'Only the code repository, and no internal address directly',
  'learning.concept.ztna.q2.why':
    'Under ZTNA the laptop has no route to the apps; it talks only to the access proxy, and the policy engine allows each request by identity, app and posture. The contractor’s rule allows only the code repository, so that is the one app; no internal address is reachable.',
  'learning.concept.ztna.q2.a.why':
    'There is no “getting past” the proxy: it decides every request separately, so passing one check grants one app, not the network behind it.',
  'learning.concept.ztna.q2.b.why':
    'Posture rules are per app. The code repository accepts a personal device whose OS is up to date, so the contractor still reaches it, and so could the malware.',
  'learning.concept.ztna.q3.prompt':
    'Mid-session, an engineer’s laptop falls behind on OS updates. What happens under ZTNA?',
  'learning.concept.ztna.q3.a': 'Nothing until the next login; the session stays allowed',
  'learning.concept.ztna.q3.b': 'Next request denied; allowed again after updating',
  'learning.concept.ztna.q3.c': 'The laptop is cut off from the internet until it updates',
  'learning.concept.ztna.q3.why':
    'The policy engine decides every request, so the changed posture counts at once: the next request is refused as “OS out of date”, and once the laptop is updated the next request is allowed again.',
  'learning.concept.ztna.q3.a.why':
    'Checking only at login is what a VPN posture check does. ZTNA re-evaluates the policy on each request.',
  'learning.concept.ztna.q3.c.why':
    'ZTNA decides access to company apps through its proxy; it does not take the laptop off the internet. Only the requests to protected apps are refused.',
};
