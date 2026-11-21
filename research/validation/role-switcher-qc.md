# Role switching and shared-room QC · 21 November 2026

Follow-up, Sites version 7: removed the duplicate participant links from the page body. All three live role pages have zero body role-nav elements and three top-right role links, with matching shared-room revision. Switching Alice to Bob and back preserves the room and language. The original local contract service remains active. Syntax/build/static checks passed; the change does not modify the shared-room state machine. Screenshot: compact-role-controls.jpg.

Sites version 6 was published successfully. Three actual Edge tabs on the production URL, room `roles-qc`, passed host approval, plan creation, three independent approvals, Bob withdrawal, rejection of the old plan without moving seats, fresh plan, fresh approvals and successful execution. All three displayed shared update 13 and Charlie / Alice / Bob. Before/after seats were correct for every role; the screenshot's duplicate current/destination display is no longer present.

The top-right role links change only the current tab and keep the room and Chinese language. The refreshed Bob page retained the completed result and update 13. The selected role has a name, checkmark and distinct color. Public interaction remains clearly labeled a same-browser simulation. The original isolated-EVM server on port 4180 remains running and unchanged.

Validation: JavaScript syntax, existing shared-room state-machine test, static build and explicit public asset checks passed (10 required pages, 75 local links, 35 public assets). Desktop layout was visually inspected. `role-switcher-public.jpg` shows the released top-right controls, blue Bob identity, correct before/after ticket and 3/3 result.
