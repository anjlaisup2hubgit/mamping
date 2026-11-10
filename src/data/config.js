// Fixed settings used across the app.
export const HAI_PHONG = [20.8449, 106.6881]; // city centre
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";
export const ONE_MILE = 1609; // metres

// OpenStreetMap editing. This starts on OpenStreetMap's practice server so test edits never reach the real map.
// To go live: use https://www.openstreetmap.org and https://api.openstreetmap.org, and a client id made on the real site.
export const OSM_SITE = "https://master.apis.dev.openstreetmap.org";
export const OSM_API = "https://master.apis.dev.openstreetmap.org";
export const OSM_CLIENT_ID = ""; // paste the client id from your OpenStreetMap app here
