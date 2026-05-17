# Hub

An L1 hub is a physical repeater. It does not learn MAC addresses, does not
inspect VLANs, and does not choose a single destination the way a switch does.

When a frame arrives on port `P`, the hub retransmits the signal to every other
active port. The ingress port is excluded so the frame is not immediately sent
back to the sender.
