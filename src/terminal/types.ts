import type { SimulationEnginePort } from '../simulation/enginePort';
import type { SandboxResult } from './serverApp/appSandbox';

/** What one web page answers with. */
export interface WebPage {
  readonly status?: number;
  readonly contentType?: string;
  readonly body: string;
}

/** A web server's pages, by path. */
export interface WebSite {
  readonly port?: number;
  readonly pages: Readonly<Record<string, WebPage>>;
}

/** The web sites of a network, by the id of the server device that serves each. */
export type WebSites = Readonly<Record<string, WebSite>>;

/**
 * A learner-written server app listening on port 80 (REQ-416): it answers an
 * HTTP/1.1 request string with its response, or says why it could not.
 */
export interface ServerApp {
  handle(raw: string): Promise<SandboxResult>;
}

/** The parts of the engine the terminal uses: sends go through it, so they are traces. */
export type TerminalEngine = Pick<
  SimulationEnginePort,
  | 'getTopology'
  | 'getState'
  | 'ping'
  | 'traceroute'
  | 'simulateDns'
  | 'simulateDhcp'
  | 'tcpConnect'
  | 'tcpDisconnect'
  | 'sendTransfer'
  | 'getRuntimeNodeIp'
  | 'getDhcpLeaseState'
  | 'getTcpConnectionsForNode'
>;

export interface TerminalContext {
  readonly engine: TerminalEngine;
  /** The device the terminal is open on. */
  readonly nodeId: string;
  /** The language of errors, usage and `help`; command output stays as the real tool prints it. */
  readonly locale?: 'en' | 'ja';
  /** What the web servers of the network answer `curl` with. */
  readonly web?: WebSites;
  /** Running learner-written apps, by server device id; they take the place of a static site. */
  readonly apps?: Readonly<Record<string, ServerApp>>;
}

export interface TerminalResult {
  /** The lines to print, in order. */
  readonly lines: readonly string[];
  /** `clear`: the terminal empties its screen. */
  readonly clear?: boolean;
}
