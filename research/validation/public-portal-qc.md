# Planner and hash-menu release verification · 21 November 2026

GitHub Pages is live at https://gujingchenscut.github.io/ONE_MORE_PERSON/ and the existing Sites URL now serves the same planner entry. GitHub workflow 44898526589 completed successfully for commit a9b70eb768e4d1b4c0f078f43d0546f62ce2b89e; Sites version 10 deployed successfully. Exact Sites identifiers are in config/site.json.

38 automated tests passed, including share-payload Unicode round trips, malformed data and date/time rejection, adjacent-versus-overlapping schedules, UTC+8 calendar conversion, calendar line escaping/folding, and the existing real-contract and three-person state-machine tests. Static checks passed for 12 required pages, 104 local links and 46 public assets.

Browser checks passed for creating a plan, refreshing without losing it, editing it, rejecting an end time earlier than the start, generating an event invitation and QR code, opening its share page in another tab, adding it to the recipient's itinerary and displaying a time conflict. The create/share/join path was repeated on the actual GitHub Pages URL. Removal and immediate undo worked; the temporary production-origin QC event and plan were then removed through the UI.

The home entry QR points to the GitHub Pages home, and event links stay under the repository subdirectory. QR images were generated locally using qrcode; no third-party QR service received event contents. No physical-phone scan was performed.

The small # opens a native dialog with Alice / Bob / Charlie choices. Switching from the planner into Alice and then Bob retained the selected shared demo room. The existing roles, host names, room state machine and local contract service were preserved.

Desktop and the actual 602-CSS-pixel browser layout were inspected. A decoration overflow at intermediate width was fixed; both public hosts then reported scrollWidth equal to clientWidth at 602 px. The requested 390 px viewport override did not apply in this browser, so a true 390 px or physical-phone check is not claimed.

Evidence screenshots: public-planner-home.jpg and hash-role-dialog.jpg. Entry QR: output/qr/One_More_Person_GitHub_Pages.png.

Boundary: personal plans are local to one browser/origin; invitations carry public event snapshots. They do not create confirmed registrations, inventory, verified organizer identities, participant notifications or cloud-synchronized personal calendars. The real local EVM and public Monad evidence remain separate. MOJO API synchronization still returned 403 (Agent has not been claimed); project 471 was not altered in this release.
