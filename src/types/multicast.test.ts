import { describe, expect, it } from "vitest";
import { isLinkLocalMulticast, isMulticastIp } from "./multicast";

describe("isMulticastIp", () => {
  it("returns true for 224.0.0.0", () => {
    expect(isMulticastIp("224.0.0.0")).toBe(true);
  });

  it("returns true for 239.255.255.255", () => {
    expect(isMulticastIp("239.255.255.255")).toBe(true);
  });

  it("returns false for 223.255.255.255", () => {
    expect(isMulticastIp("223.255.255.255")).toBe(false);
  });

  it("returns false for 240.0.0.0", () => {
    expect(isMulticastIp("240.0.0.0")).toBe(false);
  });
});

describe("isLinkLocalMulticast", () => {
  it("returns true for 224.0.0.5 (OSPF all-routers)", () => {
    expect(isLinkLocalMulticast("224.0.0.5")).toBe(true);
  });

  it("returns false for 224.1.0.1", () => {
    expect(isLinkLocalMulticast("224.1.0.1")).toBe(false);
  });
});
