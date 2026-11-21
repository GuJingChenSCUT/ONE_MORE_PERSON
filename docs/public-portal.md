# Public planner and event entry

The default page now opens a Chinese planner, with two focused actions: add a personal plan or create an event invitation. The previous English product story remains at about.html, and the Chinese product explanation remains at zh.html.

## Visitor flow

1. Open the homepage or scan its entry QR code.
2. Add a title, date, start/end time and optional place to save a personal plan. Times are Beijing time (UTC+8).
3. Edit, remove/undo, or export plans as an ICS calendar file. Overlapping plans display a warning.
4. Select Create event, add the event details and generate a share page. Copy its link or download its QR code.
5. A recipient opens the event on another device and can add it to their own browser's itinerary or download it to their calendar.
6. The small # button at the top right opens the Alice / Bob / Charlie chooser. Demo roles use the existing shared-browser simulation room and do not authenticate real people.

## Persistence and sharing limits

Personal plans and the creator's event list are stored only in the current browser and origin. GitHub Pages and Sites do not share browser storage. Clearing browser data removes these records, so export calendar files when needed. Plan removal can be undone immediately.

An invitation URL contains a bounded, versioned snapshot of the event in its fragment. Recipients do not need access to the creator's browser or a backend database. Anyone holding the link can read its contents. It has no registration count, reservation, notification to the organizer, verified organizer identity or central event listing. Removing the creator's local record does not revoke an existing invitation. These boundaries are shown in the interface.

The planner does not send blockchain transactions. The separate three-person room remains a labeled same-browser simulation, the original local service remains real isolated EVM 31337, and Monad Testnet 10143 evidence stays separate.

## Hosting

The existing Sites publication is retained. GitHub Pages uses the existing repository's main branch via the Verify seat relay workflow: tests, build and public asset checks must pass before the deploy-pages job runs. GitHub Pages source is set to GitHub Actions. All page and asset routes are relative, including event invitation links, to support the repository subdirectory.

Expected public entry: https://gujingchenscut.github.io/ONE_MORE_PERSON/

The build generates entry-qr.png for that entry. The page's Share entry control also generates a QR code for whichever host the visitor is using.
