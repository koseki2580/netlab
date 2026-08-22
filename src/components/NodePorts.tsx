import { createContext, useContext } from 'react';

/**
 * The connection anchors a device draws, owned by whichever engine is mounted.
 *
 * React Flow attaches edges to DOM anchors inside the node, so it supplies a
 * renderer that draws them. maxGraph attaches edges to the vertex itself and
 * needs none, so it supplies nothing and the default renders nothing. That is
 * what keeps the device components free of any graph library: they say where
 * anchors belong, not what an anchor is.
 */
export interface NodePortsProps {
  /** `device` = the four connectable sides; `cluster` = the hidden pair a collapsed area needs. */
  variant?: 'device' | 'cluster';
  /** How the engine should paint the anchors, when it paints them at all. */
  style?: React.CSSProperties;
}

export type NodePortsRenderer = (props: NodePortsProps) => React.ReactNode;

const NodePortsContext = createContext<NodePortsRenderer>(() => null);

export const NodePortsProvider = NodePortsContext.Provider;

export function NodePorts(props: NodePortsProps) {
  const renderPorts = useContext(NodePortsContext);
  return <>{renderPorts(props)}</>;
}
