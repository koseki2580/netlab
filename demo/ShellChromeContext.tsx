import type React from 'react';
import { createContext, useContext } from 'react';
import type { CommandPaletteItem } from '../src/components/CommandPalette';
import type { KeymapActions } from '../src/utils/keymap';

export interface ShellChromeContextValue {
  openPalette: () => void;
  togglePalette: () => void;
  openHelp: () => void;
  closeShellOverlays: () => void;
  registerKeymapActions: (actions: KeymapActions) => () => void;
  registerPaletteItems: (items: CommandPaletteItem[]) => () => void;
}

const ShellChromeContext = createContext<ShellChromeContextValue | null>(null);

export function ShellChromeProvider({
  value,
  children,
}: {
  value: ShellChromeContextValue;
  children: React.ReactNode;
}) {
  return <ShellChromeContext.Provider value={value}>{children}</ShellChromeContext.Provider>;
}

export function useShellChrome(): ShellChromeContextValue {
  const value = useContext(ShellChromeContext);
  if (value) return value;
  return {
    openPalette: () => {},
    togglePalette: () => {},
    openHelp: () => {},
    closeShellOverlays: () => {},
    registerKeymapActions: () => () => {},
    registerPaletteItems: () => () => {},
  };
}
