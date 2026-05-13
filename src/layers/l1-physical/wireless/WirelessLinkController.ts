import type { LinkQosConfig } from '../../../types/link';
import type { WirelessLinkConfig } from '../../../types/wireless';
import { lossPctFromRssi, rssiDbm, wirelessLinkQosFromRssi } from '../../../utils/pathLoss';

export class WirelessLinkController {
  constructor(private readonly config: WirelessLinkConfig) {}

  rssiForDistance(distanceMeters: number): number {
    return rssiDbm({
      distanceMeters,
      frequencyMhz: this.config.bandMhz,
      txPowerDbm: this.config.txPowerDbm,
      ...(this.config.antennaGainDbi !== undefined
        ? { antennaGainDbi: this.config.antennaGainDbi }
        : {}),
    });
  }

  lossPctForDistance(distanceMeters: number): number {
    return lossPctFromRssi(this.rssiForDistance(distanceMeters));
  }

  linkQosForDistance(distanceMeters: number): LinkQosConfig {
    return wirelessLinkQosFromRssi(this.rssiForDistance(distanceMeters), this.config.lossSeed ?? 0);
  }
}
