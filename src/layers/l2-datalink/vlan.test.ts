import { describe, expect, it } from 'vitest';
import type { EthernetFrame } from '../../types/packets';
import type { SwitchPort } from '../../types/topology';
import {
  DEFAULT_VLAN_ID,
  isValidVlanId,
  isVlanAllowedOnPort,
  prepareEgressFrame,
  resolveIngressVlan,
  stripTag,
  tagFrame,
} from './vlan';

function makeFrame(overrides: Partial<EthernetFrame> = {}): EthernetFrame {
  return {
    layer: 'L2',
    srcMac: '00:00:00:00:00:01',
    dstMac: '00:00:00:00:00:02',
    etherType: 0x0800,
    payload: {
      layer: 'L3',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      ttl: 64,
      protocol: 1,
      payload: {
        layer: 'L4',
        type: 8,
        code: 0,
        checksum: 0,
      },
    },
    ...overrides,
  };
}

function makePort(overrides: Partial<SwitchPort> = {}): SwitchPort {
  return {
    id: 'p1',
    name: 'fa0/1',
    macAddress: '00:00:00:10:00:01',
    ...overrides,
  };
}

describe('vlan', () => {
  describe('isValidVlanId', () => {
    it('accepts 1 through 4094', () => {
      expect(isValidVlanId(1)).toBe(true);
      expect(isValidVlanId(10)).toBe(true);
      expect(isValidVlanId(4094)).toBe(true);
    });

    it('rejects 0, 4095, negatives, non-integers', () => {
      expect(isValidVlanId(0)).toBe(false);
      expect(isValidVlanId(4095)).toBe(false);
      expect(isValidVlanId(-1)).toBe(false);
      expect(isValidVlanId(10.5)).toBe(false);
    });
  });

  describe('tagFrame / stripTag', () => {
    it('tagFrame adds a VlanTag with pcp=0, dei=0, tpid=0x8100', () => {
      const frame = tagFrame(makeFrame(), 10);

      expect(frame.vlanTag).toEqual({
        tpid: 0x8100,
        pcp: 0,
        dei: 0,
        vid: 10,
      });
    });

    it('tagFrame is idempotent when called twice with same vid', () => {
      const original = makeFrame();
      const once = tagFrame(original, 10);
      const twice = tagFrame(once, 10);

      expect(twice).toEqual(once);
      expect(twice).not.toBe(once);
      expect(original.vlanTag).toBeUndefined();
    });

    it('stripTag removes the vlanTag field', () => {
      const tagged = tagFrame(makeFrame(), 20);
      const stripped = stripTag(tagged);

      expect(stripped.vlanTag).toBeUndefined();
      expect(tagged.vlanTag?.vid).toBe(20);
    });

    it('stripTag on an untagged frame returns the frame as-is', () => {
      const frame = makeFrame();

      expect(stripTag(frame)).toBe(frame);
    });
  });

  describe('resolveIngressVlan', () => {
    it('access port + untagged frame → accessVlan', () => {
      expect(
        resolveIngressVlan(makePort({ vlanMode: 'access', accessVlan: 10 }), makeFrame()),
      ).toBe(10);
    });

    it('access port (accessVlan=10) + untagged → 10', () => {
      expect(resolveIngressVlan(makePort({ accessVlan: 10 }), makeFrame())).toBe(10);
    });

    it('access port + tagged frame → null (drop)', () => {
      expect(
        resolveIngressVlan(makePort({ accessVlan: 10 }), tagFrame(makeFrame(), 10)),
      ).toBeNull();
    });

    it('access port with no accessVlan set → DEFAULT_VLAN_ID', () => {
      expect(resolveIngressVlan(makePort({ vlanMode: 'access' }), makeFrame())).toBe(
        DEFAULT_VLAN_ID,
      );
    });

    it('trunk port + untagged frame → nativeVlan (default 1)', () => {
      expect(
        resolveIngressVlan(
          makePort({ vlanMode: 'trunk', trunkAllowedVlans: [10, 20] }),
          makeFrame(),
        ),
      ).toBe(DEFAULT_VLAN_ID);
    });

    it('trunk port + tagged allowed VID → that VID', () => {
      expect(
        resolveIngressVlan(
          makePort({ vlanMode: 'trunk', trunkAllowedVlans: [10, 20] }),
          tagFrame(makeFrame(), 20),
        ),
      ).toBe(20);
    });

    it('trunk port + tagged disallowed VID → null (drop)', () => {
      expect(
        resolveIngressVlan(
          makePort({ vlanMode: 'trunk', trunkAllowedVlans: [10, 20] }),
          tagFrame(makeFrame(), 30),
        ),
      ).toBeNull();
    });

    it('trunk port with empty trunkAllowedVlans → accepts native only', () => {
      const port = makePort({ vlanMode: 'trunk', trunkAllowedVlans: [] });

      expect(resolveIngressVlan(port, makeFrame())).toBe(DEFAULT_VLAN_ID);
      expect(resolveIngressVlan(port, tagFrame(makeFrame(), 10))).toBeNull();
    });
  });

  describe('isVlanAllowedOnPort', () => {
    it('access port allows only accessVlan', () => {
      const port = makePort({ vlanMode: 'access', accessVlan: 20 });

      expect(isVlanAllowedOnPort(port, 20)).toBe(true);
      expect(isVlanAllowedOnPort(port, 10)).toBe(false);
    });

    it('trunk port allows vid in trunkAllowedVlans OR equal to nativeVlan', () => {
      const port = makePort({
        vlanMode: 'trunk',
        trunkAllowedVlans: [10, 20],
        nativeVlan: 1,
      });

      expect(isVlanAllowedOnPort(port, 10)).toBe(true);
      expect(isVlanAllowedOnPort(port, 1)).toBe(true);
      expect(isVlanAllowedOnPort(port, 30)).toBe(false);
    });
  });

  describe('prepareEgressFrame', () => {
    it('access egress strips tag', () => {
      const tagged = tagFrame(makeFrame(), 10);

      expect(
        prepareEgressFrame(tagged, makePort({ vlanMode: 'access', accessVlan: 10 }), 10).vlanTag,
      ).toBeUndefined();
      expect(tagged.vlanTag?.vid).toBe(10);
    });

    it('trunk egress for nativeVlan leaves frame untagged', () => {
      const frame = prepareEgressFrame(
        tagFrame(makeFrame(), 1),
        makePort({ vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 1 }),
        1,
      );

      expect(frame.vlanTag).toBeUndefined();
    });

    it('trunk egress for non-native allowed VID tags the frame', () => {
      const frame = prepareEgressFrame(
        makeFrame(),
        makePort({ vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 1 }),
        20,
      );

      expect(frame.vlanTag).toEqual({
        tpid: 0x8100,
        pcp: 0,
        dei: 0,
        vid: 20,
      });
    });
  });
});
