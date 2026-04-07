// Side-effect imports — registers all built-in OSI layer plugins.
// Import order follows the OSI stack (L1 → L7).
// This module is used internally by NetlabApp so consumers do not need
// to register layers manually. Safe to import multiple times.
import './l1-physical/index';
import './l2-datalink/index';
import './l3-network/index';
import './l4-transport/index';
import './l7-application/index';
