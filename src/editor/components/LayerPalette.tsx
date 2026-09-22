import { NodeGlyph } from '../../components/NodeGlyph';
import { useI18n } from '../../i18n/useI18n';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { paletteByLayer, type PaletteItem } from '../palette';
import { randomPosition } from '../utils/nodeFactory';
import type { LayerId } from '../../types/layers';

export interface LayerPaletteProps {
  /** Scope the palette to these layers. Omit for every layer. */
  layers?: readonly LayerId[];
  /** Layers currently painted on the canvas. */
  visibleLayers: ReadonlySet<LayerId>;
  onToggleLayer: (layerId: LayerId) => void;
  /** Where the canvas is looking, so a new element lands in view. */
  viewCentre?: { x: number; y: number };
}

const PANEL_STYLE: React.CSSProperties = {
  width: 208,
  flexShrink: 0,
  overflowY: 'auto',
  padding: '10px 10px 16px',
  background: 'var(--netlab-bg-surface)',
  borderRight: '1px solid var(--netlab-border)',
  fontFamily: 'monospace',
  fontSize: 12,
  color: 'var(--netlab-text-primary)',
};

/**
 * Left sidebar: the elements a learner can place, grouped by the layer they
 * belong to, each group with a switch that shows or hides that layer on the
 * canvas.
 *
 * The visibility switches are the point, not a convenience: viewing L2 alone and
 * then L3 alone is how a learner sees that the same physical wiring carries two
 * different connection graphs.
 */
export function LayerPalette({
  layers,
  visibleLayers,
  onToggleLayer,
  viewCentre,
}: LayerPaletteProps) {
  const { t } = useI18n();
  const { addNode } = useTopologyEditorContext();
  const groups = paletteByLayer(layers);

  const place = (item: PaletteItem) => addNode(item.create(randomPosition(viewCentre)));

  return (
    <aside style={PANEL_STYLE} data-testid="editor-palette" aria-label={t('editor.palette.label')}>
      {groups.length === 0 ? (
        <p data-testid="editor-palette-empty" style={{ color: 'var(--netlab-text-secondary)' }}>
          {t('editor.palette.empty')}
        </p>
      ) : (
        groups.map((group) => {
          const shown = visibleLayers.has(group.layerId);
          // Shown text is looked up by layer and element id; the English in
          // palette.ts is the catalog's source and must stay in step with it.
          const layerLabel = t(`editor.palette.layer.${group.layerId}`);
          return (
            <section key={group.layerId} style={{ marginBottom: 14 }}>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: 'var(--netlab-text-secondary)', letterSpacing: 0.4 }}>
                  {layerLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleLayer(group.layerId)}
                  aria-pressed={shown}
                  data-testid={`editor-layer-toggle-${group.layerId}`}
                  title={
                    shown
                      ? t('editor.palette.hideLayer', { layer: layerLabel })
                      : t('editor.palette.showLayer', { layer: layerLabel })
                  }
                  style={{
                    border: '1px solid var(--netlab-border)',
                    background: shown ? 'var(--netlab-border)' : 'transparent',
                    color: shown ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    font: 'inherit',
                    padding: '1px 6px',
                  }}
                >
                  {shown ? t('editor.palette.shown') : t('editor.palette.hidden')}
                </button>
              </header>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => place(item)}
                  data-testid={`editor-palette-${item.id}`}
                  title={t(`editor.palette.item.${item.id}.hint`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: 4,
                    padding: '6px 8px',
                    background: 'var(--netlab-bg-primary)',
                    border: '1px solid var(--netlab-border)',
                    borderRadius: 4,
                    color: 'var(--netlab-text-primary)',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                >
                  {/* The same glyph the canvas paints, so what you pick is what appears. */}
                  <NodeGlyph kind={item.glyph} size={26} />
                  <span style={{ minWidth: 0 }}>
                    {t(`editor.palette.item.${item.id}.label`)}
                    <span
                      style={{
                        display: 'block',
                        color: 'var(--netlab-text-secondary)',
                        fontSize: 10.5,
                      }}
                    >
                      {t(`editor.palette.item.${item.id}.hint`)}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          );
        })
      )}
    </aside>
  );
}
