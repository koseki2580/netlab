import type { Catalog } from '../../../../types';

/** The `ech` deck's questions (en); its name is in the core chunk. */
export const ech: Catalog = {
  'learning.concept.ech.q1.prompt':
    'Without ECH, you open https://clinic.example/ over TLS 1.3 on a café’s Wi-Fi. Can someone on the Wi-Fi read “clinic.example”?',
  'learning.concept.ech.q1.a': 'Yes: the ClientHello names it before any key exists',
  'learning.concept.ech.q1.b': 'No: TLS 1.3 encrypts all that follows the TCP handshake',
  'learning.concept.ech.q1.c': 'Only if they also break the server’s certificate',
  'learning.concept.ech.q1.why':
    'The ClientHello carries the site’s name (SNI) so that a server hosting many sites knows which certificate to show — and it is sent before there is any key.',
  'learning.concept.ech.q1.b.why':
    'TLS 1.3 encrypts from the ServerHello on, even the certificate, but the ClientHello goes first, in the clear, with the name in SNI.',
  'learning.concept.ech.q1.c.why':
    'No attack is needed: the name is plain text in the ClientHello, readable by anyone on the path.',
  'learning.concept.ech.q2.prompt':
    'With ECH, which site name can the café’s Wi-Fi read in the first bytes?',
  'learning.concept.ech.q2.a': 'The real name, but only as a hash',
  'learning.concept.ech.q2.b': 'None: the whole ClientHello is encrypted',
  'learning.concept.ech.q2.c': 'Only the provider’s shared public name',
  'learning.concept.ech.q2.why':
    'The outer ClientHello names cdn.example, the public name every site at that provider shares; clinic.example travels sealed inside it.',
  'learning.concept.ech.q2.a.why':
    'A hash of a known name could be matched against a list; ECH encrypts the real hello instead.',
  'learning.concept.ech.q2.b.why':
    'The outer ClientHello is still in the clear and names cdn.example; only the inner, real one is sealed.',
  'learning.concept.ech.q3.prompt':
    'Who can open the sealed inner ClientHello and learn the real site?',
  'learning.concept.ech.q3.a': 'Anyone who sees the key share in the outer hello',
  'learning.concept.ech.q3.b': 'The provider, with the key it published in DNS',
  'learning.concept.ech.q3.c': 'Nobody; the server never learns the real name',
  'learning.concept.ech.q3.why':
    'The browser seals the inner hello to the key in the site’s DNS HTTPS record; only the provider, holding the matching private key, can open it.',
  'learning.concept.ech.q3.a.why':
    'The seal is made to the provider’s published key; seeing the outer hello gives an observer nothing that opens it.',
  'learning.concept.ech.q3.c.why':
    'The provider has to learn the site to choose its certificate, so it opens the inner hello with its private key.',
  'learning.concept.ech.q4.prompt':
    'Someone on the path changes one byte of the outer ClientHello. What happens when the provider opens the inner one?',
  'learning.concept.ech.q4.a': 'Opening fails: the outer hello is bound into the seal',
  'learning.concept.ech.q4.b': 'It opens as usual; only the inner hello is protected',
  'learning.concept.ech.q4.c': 'It opens, but now names a site the attacker chose',
  'learning.concept.ech.q4.why':
    'The whole outer hello is the seal’s associated data: not hidden, but authenticated by AES-GCM, so one changed byte makes opening fail.',
  'learning.concept.ech.q4.b.why':
    'The outer hello is not encrypted, but it is authenticated as associated data, so any change breaks decryption.',
  'learning.concept.ech.q4.c.why':
    'Without the key an attacker cannot make a valid seal at all; a changed byte just makes the authentication check fail.',
};
