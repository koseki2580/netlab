export type AreaType = 'private' | 'public' | 'dmz' | 'management' | (string & Record<never, never>);

export interface AreaVisualConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;   // CSS rgba/hex override
  label?: string;   // display label override
}

export interface NetworkArea {
  id: string;
  name: string;
  type: AreaType;
  subnet: string;          // CIDR notation
  devices: string[];       // nodeIds in this area
  visualConfig?: AreaVisualConfig;
}
