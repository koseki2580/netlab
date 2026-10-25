// @vitest-environment node
/**
 * Five different tasks of every packet template, as the learner reads them. A
 * change here is a change to what learners get: read the diff (a native read
 * of the Japanese is part of review), then bump `PACKET_GENERATOR_VERSION`.
 * The check itself is the shared harness's.
 */

import { verifyGolden } from '../exercises/verify/harness';
import { PACKET_FAMILY } from './templates/family';

verifyGolden(PACKET_FAMILY);
