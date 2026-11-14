// Fixed settings used across the app.
export const HAI_PHONG = [20.8449, 106.6881]; // city centre
export const OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"]; // tried in order
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const STREET_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"; // free map style, no key
export const SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";
export const ONE_MILE = 1609; // metres

// OpenStreetMap editing (client ids are public).
export const OSM_SITE = "https://www.openstreetmap.org", OSM_API = "https://api.openstreetmap.org", OSM_CLIENT_ID = "lz7S78OjzwzMw-0c_36G-_7B4biuUb-TF6jpmnWdJgc";