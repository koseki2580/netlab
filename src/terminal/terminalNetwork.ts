import type { NetworkTopology } from '../types/topology';
import type { WebSites } from './types';

/**
 * The network of the terminal page and its tests (REQ-360): a client and a
 * laptop that asks DHCP for its address share a LAN with the DHCP server; the
 * DNS and web servers sit one router away.
 */
export function terminalNetwork(): NetworkTopology {
  const port = (switchIndex: number, n: number) => ({
    id: `p${n}`,
    name: `fa0/${n}`,
    macAddress: `00:00:00:10:0${switchIndex}:0${n}`,
  });
  return {
    nodes: [
      {
        id: 'client',
        type: 'client',
        position: { x: 80, y: 120 },
        data: {
          label: 'client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.1.10',
          mac: '02:00:00:00:01:10',
        },
      },
      {
        id: 'laptop',
        type: 'client',
        position: { x: 80, y: 260 },
        data: {
          label: 'laptop',
          role: 'client',
          layerId: 'l7',
          mac: '02:00:00:00:01:20',
          dhcpClient: { enabled: true },
        },
      },
      {
        id: 'dhcp',
        type: 'server',
        position: { x: 80, y: 400 },
        data: {
          label: 'dhcp',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.1.67',
          mac: '02:00:00:00:01:67',
          dhcpServer: {
            leasePool: '10.0.1.100/30',
            subnetMask: '255.255.255.0',
            defaultGateway: '10.0.1.1',
            dnsServer: '10.0.2.53',
            leaseTime: 86400,
          },
        },
      },
      {
        id: 'sw-a',
        type: 'switch',
        position: { x: 260, y: 260 },
        data: {
          label: 'sw-a',
          role: 'switch',
          layerId: 'l2',
          ports: [port(0, 0), port(0, 1), port(0, 2), port(0, 3)],
        },
      },
      {
        id: 'router',
        type: 'router',
        position: { x: 440, y: 260 },
        data: {
          label: 'router',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:00:01',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:00:02',
            },
          ],
        },
      },
      {
        id: 'sw-b',
        type: 'switch',
        position: { x: 620, y: 260 },
        data: {
          label: 'sw-b',
          role: 'switch',
          layerId: 'l2',
          ports: [port(1, 0), port(1, 1), port(1, 2)],
        },
      },
      {
        id: 'dns',
        type: 'server',
        position: { x: 800, y: 160 },
        data: {
          label: 'dns',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.2.53',
          mac: '02:00:00:00:02:53',
          dnsServer: { zones: [{ name: 'www.example.test', address: '10.0.2.80' }] },
        },
      },
      {
        id: 'www',
        type: 'server',
        position: { x: 800, y: 360 },
        data: {
          label: 'www',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.2.80',
          mac: '02:00:00:00:02:80',
        },
      },
    ],
    edges: [
      { id: 'e-client', source: 'client', target: 'sw-a', targetHandle: 'p0' },
      { id: 'e-laptop', source: 'laptop', target: 'sw-a', targetHandle: 'p1' },
      { id: 'e-dhcp', source: 'dhcp', target: 'sw-a', targetHandle: 'p2' },
      { id: 'e-up-a', source: 'sw-a', target: 'router', sourceHandle: 'p3', targetHandle: 'eth0' },
      { id: 'e-up-b', source: 'router', target: 'sw-b', sourceHandle: 'eth1', targetHandle: 'p0' },
      { id: 'e-dns', source: 'sw-b', target: 'dns', sourceHandle: 'p1' },
      { id: 'e-www', source: 'sw-b', target: 'www', sourceHandle: 'p2' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

/** The pages the web server `www` answers with (REQ-360). */
export const TERMINAL_WEB_SITES: WebSites = {
  www: {
    pages: {
      '/': {
        contentType: 'text/html',
        body: '<!doctype html>\n<title>example</title>\n<h1>Hello from www</h1>',
      },
      '/about': { contentType: 'text/plain', body: 'A web server inside the simulator.' },
    },
  },
};
