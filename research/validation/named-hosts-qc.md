# Named organizer labels

Verified on 21 November 2026. The display names are Dr. Alice and Dr. Bob. Participant identities remain Alice, Bob and Charlie, and host addresses, authorization rules and contract state are unchanged.

- `pnpm build:web`, JavaScript syntax checks and `git diff --check` passed. This text change adds no new tests.
- Public three-page demo: Chinese Alice approval displayed Dr. Alice, the Bob page received that approval, and its English Dr. Bob approval advanced the room to plan preparation. Host badges and seat labels used the same names. Participant approval labels remained separate.
- Local rehearsal: on a fresh isolated chain-31337 room, Alice's host approval succeeded and displayed Dr. Alice in English and Chinese status and activity. This is local EVM verification, not a Monad test.
- Sites version 8 deployed successfully. The published Chinese role page was inspected; `named-hosts-demo.jpg` records the full page and `named-hosts-seats.jpg` records the host/seat comparison.
- The four-page PDF guide was rebuilt as `output/pdf/One_More_Person_Demo_Guide_Named_Hosts.pdf` because the previous PDF was open and locked. Rendered pages 2 and 3 show the renamed hosts and matching button instructions without clipping. README and the public guide point to the new PDF.
- Existing MOJO entry #471 was verified as pending review with matching demo and repository links. Fresh screenshot upload was refused by the browser extension's local-file permission. No MOJO content was changed in this update; the linked public demo has the new names.

The expired deadline reminder was removed from AGENTS.md as required by its reminder rules.
