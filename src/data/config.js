// Fixed settings used across the app.
export const HAI_PHONG = [20.8449, 106.6881]; // city centre
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const STREET_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"; // free map style, no key
export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";
export const ONE_MILE = 1609; // metres

// OpenStreetMap editing. Real map by default; dev accounts can switch to OpenStreetMap's practice server (Settings/Home).
export const DEV_USERS = ["angela4maps"]; // OpenStreetMap usernames allowed to see the practice-server switch
const REAL = { site: "https://www.openstreetmap.org", api: "https://api.openstreetmap.org", id: "lz7S78OjzwzMw-0c_36G-_7B4biuUb-TF6jpmnWdJgc" };
const PRACTICE = { site: "https://master.apis.dev.openstreetmap.org", api: "https://master.apis.dev.openstreetmap.org", id: "Tmz21U6gVbnJnS41CV7bR3nvLf6evN6O0fBV12-QevY" };
export const OSM_PRACTICE = (() => { try { return localStorage.getItem("osm_practice") === "1" && localStorage.getItem("osm_dev") === "1"; } catch (e) { return false; } })();
const env = OSM_PRACTICE ? PRACTICE : REAL;
export const OSM_SITE = env.site, OSM_API = env.api, OSM_CLIENT_ID = env.id; // client ids are public