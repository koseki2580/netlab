# Wireless 802.11 Teaching Subset

Netlab models wireless LANs as deterministic metadata on top of the existing
topology:

- `NetlabNodeData.wifi` describes an access point or station.
- `NetlabEdgeData.wireless` describes an AP-to-station radio link.
- RSSI is derived from node positions and converted into a seeded loss model.
- Association and WPA2 are pure state-machine steps, not live radio timers.

This slice does not replace wired forwarding with a full 802.11 MAC scheduler.
It provides the primitives, sandbox edits, and demo-visible state that future
pipeline integration can consume.

## Radio Link Model

The path-loss helper uses the free-space path loss teaching formula:

```text
PathLoss(dB) = 32.44 + 20*log10(distance_km) + 20*log10(freq_MHz)
RSSI(dBm) = txPowerDbm + antennaGainDbi - PathLoss(dB)
```

RSSI maps to loss percentage as follows:

- `>= -65 dBm`: 0% loss
- `<= -90 dBm`: 100% loss
- Between those values: linear interpolation

All random decisions use seeded primitives. Runtime code must not call
`Math.random`.

## Association

Stations move through:

```text
unassociated -> probing -> authenticated -> associated -> 4way -> connected
```

Supported events are Beacon, Probe Request/Response, Authentication,
Association Request/Response, EAPOL M1-M4, Deauthentication, and Timeout.

## WPA2 Four-Way Handshake

`WpaFourWayHandshake` reuses `CryptoProvider` from the TLS teaching subset. The
provider derives a PTK-shaped secret from:

- SSID
- AP MAC
- Station MAC
- ANonce
- SNonce
- PSK

With `FakeDeterministicProvider` the math is deterministic and replayable. A
future WebCrypto provider can improve the cryptographic correctness without
changing the wireless call sites.

## CSMA/CA And Hidden Nodes

`CsmaCa` assigns deterministic backoff slots per station and step. A hidden-node
collision is reported when two stations can hear the AP but cannot hear each
other and transmit in the same AP receive window.

## Sandbox Edits

- `node.wifi`: enables or updates AP/station settings on a node.
- `link.wireless`: enables or updates radio settings on a topology edge.

Both reducers are pure over the snapshot topology.

## Verification

- `src/utils/pathLoss.test.ts`
- `src/layers/l1-physical/wireless/WirelessStateMachine.test.ts`
- `src/layers/l1-physical/wireless/WpaFourWayHandshake.test.ts`
- `src/layers/l1-physical/wireless/CsmaCa.test.ts`
- `src/layers/l1-physical/wireless/WirelessLinkController.property.test.ts`
- `demo/networking/WirelessDemo.test.tsx`
- `e2e/wireless.spec.ts`
