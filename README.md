# Hometown Map

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
