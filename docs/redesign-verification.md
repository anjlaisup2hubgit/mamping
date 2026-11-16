# Approved-concept rebuild

This redesign was rebuilt in the Windows checkout from the approved desktop and phone concepts; it was not recovered from the inaccessible `/workspace/mamping` workspace.

## Implementation

- Warm ivory `#f8f7f2`, forest green `#174b3b`, charcoal `#242c27`, muted sage, fine borders, serif headings and shared line icons.
- Explore uses the existing interactive map, a 350px desktop contribution sidebar, visible place search, live building counts, capture and missing-building actions, base layers, zoom, location and building details.
- Phones use a full-width map, floating search, a collapsible contribution panel and Explore / My edits / Videos / Guide tabs. Outline editing and scan-area selection keep their existing dedicated controls.
- Shared styling covers capture, saved confirmation, analysis, editable review with its existing 3D preview, video library, contributions, grouped settings, outlines, drive results, scan preferences, training and illustrated guides.
- Video filters and settings counts read device recordings rather than treating neighbours' shared contributions as the user's videos. Weekly contribution totals use existing edit history and pending-edit storage. Missing, loading and unavailable data have explicit states.
- A failed local video save is shown as unsaved rather than claiming a successful save.
- API handlers, the shared Vercel router, development server and worker routing remain unchanged. The API routing fix from `bc8e820` remains in the branch history.

## Checks

- `npm test`: 60 passing checks, including shared API dispatch, storage, queued edits, scan cancellation, training persistence and authenticated worker forwarding.
- `npm run test:training`: six passing Python checks.
- Fourteen browser checks use installed Chrome via `CHROMIUM_EXECUTABLE_PATH`. They exercise desktop 1440×900 and phones 390×844, 390×568 and 390×400, search, layer changes, zoom, location, actual building facts from service fixtures, panel collapse, navigation, filters, capture → private save → analysis → review → keep offline, scan cancellation, outline handles/undo and training-label persistence.
- The training activation test fixture uses platform-native paths so it can run on Windows; API handlers were not changed for that fixture correction.
- Camera checks use Chrome's synthetic camera and microphone; external services use fixtures for repeatable workflow checks and never publish to OpenStreetMap.
- An additional local smoke check used live OpenFreeMap and OpenStreetMap services: 33 buildings loaded in the desktop view, map tiles responded successfully, and no page errors or failed requests were observed in that run. Counts depend on the current map view and current upstream data.
- Desktop and phone screenshots were inspected for Explore, capture, saved confirmation, review, settings and the illustrated guide. Additional layout checks covered contributions, videos, outlines, scan preferences, training and outline guides with no horizontal overflow or page errors.

## Limits

No physical phone camera, real driving capture, live paid AI inference, authenticated OpenStreetMap writes, real contribution uploads, or full model fitting/export was exercised. Browser capture uses a synthetic device; the analysis response is a fixture. Deployment verification checks release status, commit identity, served redesign assets and read-only API responses; it does not establish that production credentials or remote training workers can perform every operation.

Untracked design references that appeared during the work were preserved and excluded from the implementation commit.
