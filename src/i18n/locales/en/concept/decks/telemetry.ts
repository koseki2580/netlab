import type { Catalog } from '../../../../types';

/** The `telemetry` deck's questions (en); its name is in the core chunk. */
export const telemetry: Catalog = {
  'learning.concept.telemetry.q1.prompt':
    'A 1 Gbit/s link runs at a steady 15 %, then a 20-second burst fills it to 100 %. What peak does a five-minute SNMP graph show?',
  'learning.concept.telemetry.q1.a': 'About 100 %',
  'learning.concept.telemetry.q1.b': 'About 20 %',
  'learning.concept.telemetry.q1.c': '15 %, the same as always',
  'learning.concept.telemetry.q1.why':
    'Utilisation is the bytes counted between two readings divided by what the line could carry in that time. Over 300 s the burst adds only a few points: about 20.7 %.',
  'learning.concept.telemetry.q1.a.why':
    'Each point is the counter difference over five minutes, so 20 seconds at 100 % are averaged with 280 seconds at 15 %.',
  'learning.concept.telemetry.q1.c.why':
    'The burst’s bytes are still counted; they raise the five-minute average a little, to about 20 %.',
  'learning.concept.telemetry.q2.prompt':
    'Why does a gNMI SAMPLE stream every ten seconds show that same burst at 100 %?',
  'learning.concept.telemetry.q2.a': 'It reads a more accurate counter than SNMP does',
  'learning.concept.telemetry.q2.b': 'Pushing delivers the bytes that polling misses',
  'learning.concept.telemetry.q2.c': 'Its 10-second intervals fit inside the burst',
  'learning.concept.telemetry.q2.why':
    'With a reading every 10 s, some intervals lie wholly inside the 20-second burst, so their counter difference is the full line rate.',
  'learning.concept.telemetry.q2.a.why':
    'Both read the same in-octets counter; only the time between two readings differs.',
  'learning.concept.telemetry.q2.b.why':
    'Polling misses no bytes — the counter keeps counting; a longer interval just averages them over more time.',
  'learning.concept.telemetry.q3.prompt':
    'At 6:40 the link goes down for 30 seconds. The SNMP poller reads its status at 5:00 and 10:00. What does it record?',
  'learning.concept.telemetry.q3.a': 'Up both times; the outage fell between polls',
  'learning.concept.telemetry.q3.b': 'Down at 10:00, the first poll after it',
  'learning.concept.telemetry.q3.c': 'Down, since the counter stopped meanwhile',
  'learning.concept.telemetry.q3.why':
    'A poll sees the state only at the moment it asks, so a 30-second outage between two five-minute polls leaves no trace (only a separate SNMP trap could report it).',
  'learning.concept.telemetry.q3.b.why':
    'A poll reports the state at that moment, and by 10:00 the link has long been up again.',
  'learning.concept.telemetry.q3.c.why':
    'The status is read on its own, not from the counter, and it is up at both polls; the paused counter only lowers the average slightly.',
  'learning.concept.telemetry.q4.prompt':
    'A gNMI ON_CHANGE subscription watches the same status. What does it send for the outage?',
  'learning.concept.telemetry.q4.a': 'An update every ten seconds while it is down',
  'learning.concept.telemetry.q4.b': 'Two: one as it goes down, one as it comes back',
  'learning.concept.telemetry.q4.c': 'Nothing; subscriptions stream only counters',
  'learning.concept.telemetry.q4.why':
    'ON_CHANGE pushes one update each time the value changes: DOWN at 6:40 and UP at 7:10, the second each happens.',
  'learning.concept.telemetry.q4.a.why':
    'Updates at a fixed interval are SAMPLE mode; ON_CHANGE sends only when the value changes.',
  'learning.concept.telemetry.q4.c.why':
    'gNMI can subscribe to any path, oper-status included, and ON_CHANGE is made for state like this.',
};
