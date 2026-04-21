import { TutorialRegistry } from './TutorialRegistry';
import { arpBasics } from './builtin/arp-basics';
import { fragmentationRoundtrip } from './builtin/fragmentation-roundtrip';
import { ospfReconverge } from './builtin/ospf-reconverge';
import { tcpThreeWay } from './builtin/tcp-three-way';

export { TutorialRunner } from './TutorialRunner';
export { TutorialRegistry } from './TutorialRegistry';
export { TutorialProvider } from './TutorialContext';
export { useTutorialRunner } from './useTutorialRunner';
export * from './types';
export { arpBasics, fragmentationRoundtrip, ospfReconverge, tcpThreeWay };

export const tutorialRegistry = new TutorialRegistry();

const BUILTIN_TUTORIALS = [arpBasics, fragmentationRoundtrip, tcpThreeWay, ospfReconverge] as const;

for (const tutorial of BUILTIN_TUTORIALS) {
  if (!tutorialRegistry.get(tutorial.id)) {
    tutorialRegistry.register(tutorial);
  }
}
