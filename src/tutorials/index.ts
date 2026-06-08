import { TutorialRegistry } from './TutorialRegistry';
import { arpBasics } from './builtin/arp-basics';
import { fragmentationRoundtrip } from './builtin/fragmentation-roundtrip';
import { natTranslation } from './builtin/nat-translation';
import { ospfReconverge } from './builtin/ospf-reconverge';
import { tcpThreeWay } from './builtin/tcp-three-way';

export { TutorialRunner } from './TutorialRunner';
export { TutorialRegistry } from './TutorialRegistry';
export { TutorialProvider } from './TutorialContext';
export { useTutorialRunner } from './useTutorialRunner';
export * from './types';
export { arpBasics, fragmentationRoundtrip, natTranslation, ospfReconverge, tcpThreeWay };

export const tutorialRegistry = new TutorialRegistry();

const BUILTIN_TUTORIALS = [
  arpBasics,
  fragmentationRoundtrip,
  tcpThreeWay,
  ospfReconverge,
  natTranslation,
] as const;

for (const tutorial of BUILTIN_TUTORIALS) {
  if (!tutorialRegistry.get(tutorial.id)) {
    tutorialRegistry.register(tutorial);
  }
}
