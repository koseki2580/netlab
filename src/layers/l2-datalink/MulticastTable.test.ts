import { beforeEach, describe, expect, it } from "vitest";
import { MulticastTable } from "./MulticastTable";

describe("MulticastTable", () => {
  let table: MulticastTable;

  beforeEach(() => {
    table = new MulticastTable();
  });

  describe("addMembership", () => {
    it("creates a group on first add", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      expect(table.hasLearnedGroup(1, "01:00:5e:00:00:05")).toBe(true);
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05")).toEqual(
        new Set(["port-1"]),
      );
    });

    it("is idempotent for the same port", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05").size).toBe(1);
    });

    it("tracks multiple ports on the same group", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.addMembership(1, "01:00:5e:00:00:05", "port-2");
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05")).toEqual(
        new Set(["port-1", "port-2"]),
      );
    });
  });

  describe("removeMembership", () => {
    it("removes the port and cleans up empty group for flood fallback", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.removeMembership(1, "01:00:5e:00:00:05", "port-1");
      expect(table.hasLearnedGroup(1, "01:00:5e:00:00:05")).toBe(false);
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05").size).toBe(0);
    });

    it("is a no-op when the port was not joined", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.removeMembership(1, "01:00:5e:00:00:05", "port-99");
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05")).toEqual(
        new Set(["port-1"]),
      );
    });
  });

  describe("getJoinedPorts", () => {
    it("returns empty for an unlearned group", () => {
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05").size).toBe(0);
    });

    it("returns the full set for a learned group", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.addMembership(1, "01:00:5e:00:00:05", "port-2");
      expect(table.getJoinedPorts(1, "01:00:5e:00:00:05")).toEqual(
        new Set(["port-1", "port-2"]),
      );
    });
  });

  describe("hasLearnedGroup", () => {
    it("returns false for an unlearned group", () => {
      expect(table.hasLearnedGroup(1, "01:00:5e:00:00:05")).toBe(false);
    });

    it("returns false after all ports leave (enables flood fallback)", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.removeMembership(1, "01:00:5e:00:00:05", "port-1");
      expect(table.hasLearnedGroup(1, "01:00:5e:00:00:05")).toBe(false);
    });
  });

  describe("snapshot", () => {
    it("returns sorted rows", () => {
      table.addMembership(2, "01:00:5e:00:00:05", "port-2");
      table.addMembership(1, "01:00:5e:10:00:01", "port-1");
      table.addMembership(1, "01:00:5e:00:00:05", "port-3");
      const snap = table.snapshot();
      expect(snap).toEqual([
        { vlanId: 1, multicastMac: "01:00:5e:00:00:05", ports: ["port-3"] },
        { vlanId: 1, multicastMac: "01:00:5e:10:00:01", ports: ["port-1"] },
        { vlanId: 2, multicastMac: "01:00:5e:00:00:05", ports: ["port-2"] },
      ]);
    });
  });

  describe("clear", () => {
    it("empties the table", () => {
      table.addMembership(1, "01:00:5e:00:00:05", "port-1");
      table.clear();
      expect(table.hasLearnedGroup(1, "01:00:5e:00:00:05")).toBe(false);
      expect(table.snapshot()).toEqual([]);
    });
  });
});
