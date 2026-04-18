import { describe, expect, it } from "vitest";
import { ipToMulticastMac, isMulticastMac } from "./multicastMac";

describe("ipToMulticastMac", () => {
  it("maps 224.0.0.1 to 01:00:5e:00:00:01", () => {
    expect(ipToMulticastMac("224.0.0.1")).toBe("01:00:5e:00:00:01");
  });

  it("maps 224.0.0.5 to 01:00:5e:00:00:05", () => {
    expect(ipToMulticastMac("224.0.0.5")).toBe("01:00:5e:00:00:05");
  });

  it("maps 239.255.255.255 to 01:00:5e:7f:ff:ff", () => {
    expect(ipToMulticastMac("239.255.255.255")).toBe("01:00:5e:7f:ff:ff");
  });

  it("throws on a non-multicast IP", () => {
    expect(() => ipToMulticastMac("192.168.1.1")).toThrow("Not a multicast IP");
  });
});

describe("isMulticastMac", () => {
  it("returns true for 01:00:5e:00:00:01", () => {
    expect(isMulticastMac("01:00:5e:00:00:01")).toBe(true);
  });

  it("returns true for 01:00:5e:7f:ff:ff", () => {
    expect(isMulticastMac("01:00:5e:7f:ff:ff")).toBe(true);
  });

  it("returns false for ff:ff:ff:ff:ff:ff", () => {
    expect(isMulticastMac("ff:ff:ff:ff:ff:ff")).toBe(false);
  });

  it("returns false for 00:00:5e:00:00:00", () => {
    expect(isMulticastMac("00:00:5e:00:00:00")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isMulticastMac("01:00:5E:00:00:01")).toBe(true);
  });
});
