// @vitest-environment node
/**
 * Five instances of every template, one set in each place, as the learner
 * reads them (TC-478, TC-795). A change here is a change to what learners get:
 * read the diff (a native read of the Japanese is part of review), then bump
 * `GENERATOR_VERSION`. The check itself is the shared harness's.
 */

import { verifyGolden } from '../verify/harness';
import { DEVICE_FAMILY } from './family';

verifyGolden(DEVICE_FAMILY);
