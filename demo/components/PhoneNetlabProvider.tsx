import type { ComponentProps } from 'react';
import { NetlabProvider as LibraryNetlabProvider } from '../../src/components/NetlabProvider';
import type { NetworkTopology } from '../../src/types/topology';
import { usePhoneTopology } from './LessonPanel';

const EMPTY: NetworkTopology = { nodes: [], edges: [], areas: [], routeTables: new Map() };
const EMPTY_SNAPSHOT: NonNullable<ComponentProps<typeof LibraryNetlabProvider>['defaultTopology']> =
  { nodes: [], edges: [], areas: [] };

/**
 * The library's provider, with the lesson's devices standing three to a row
 * on a phone (`usePhoneTopology`) so their names and addresses are drawn at a
 * size that can be read. Keyed by the arrangement: turning the phone between
 * the two layouts starts the lesson afresh on the new one, as the lessons
 * with their own phone positions already did.
 */
export function NetlabProvider(props: ComponentProps<typeof LibraryNetlabProvider>) {
  const phone = usePhoneTopology(props.topology ?? EMPTY);
  const phoneDefault = usePhoneTopology(props.defaultTopology ?? EMPTY_SNAPSHOT);
  if (props.topology) {
    return <LibraryNetlabProvider key={phone.layout} {...props} topology={phone.topology} />;
  }
  if (props.defaultTopology) {
    return (
      <LibraryNetlabProvider
        key={phoneDefault.layout}
        {...props}
        defaultTopology={phoneDefault.topology}
      />
    );
  }
  return <LibraryNetlabProvider {...props} />;
}
