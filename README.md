# Mamping

Record a video of a building. The app tracks your GPS, matches the building to OpenStreetMap, and shares it on a map.

## Where things are
- `index.html` is the page shell.
- `src/pages/` has one file per screen.
- `src/components/` has shared pieces such as the map and bottom panels.
- `src/data/` has saving, loading, GPS, camera and server calls.
- `api/` has the server functions that run on Vercel.
- `CLAUDE.md` lists the rules for keeping this tidy.

## Set up on Vercel
Add `ANTHROPIC_API_KEY` and a public Blob store (this adds `BLOB_READ_WRITE_TOKEN`). Optional: `CLAUDE_MODEL`.

## OpenStreetMap editing
Edits start on the practice server. Register an app at `https://master.apis.dev.openstreetmap.org/oauth2/applications/new` (not confidential, redirect = your site address, permissions: read user preferences and modify the map), paste its client id into `OSM_CLIENT_ID` in `src/data/config.js`, then log in from the Home page. To edit the real map, swap the two addresses in the same file and use a client id from openstreetmap.org.
