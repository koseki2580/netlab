import type { NetworkArea } from '../types/areas';
import type { NetlabNode } from '../types/topology';
import type { AreaBackgroundData } from './AreaBackground';

export function areasToNodes(areas: NetworkArea[]): NetlabNode[] {
  return areas.map((area) => {
    const areaData: AreaBackgroundData & Record<string, unknown> = {
      label: area.visualConfig?.label ?? area.name,
      layerId: 'l1' as const,
      role: 'area',
      name: area.name,
      type: area.type,
      width: area.visualConfig?.width ?? 300,
      height: area.visualConfig?.height ?? 400,
      ...(area.visualConfig?.color !== undefined ? { color: area.visualConfig.color } : {}),
    };

    return {
      id: `__area__${area.id}`,
      type: 'netlab-area',
      position: {
        x: area.visualConfig?.x ?? 0,
        y: area.visualConfig?.y ?? 0,
      },
      data: areaData,
      selectable: false,
      draggable: false,
      zIndex: -1,
    } as unknown as NetlabNode;
  });
}
