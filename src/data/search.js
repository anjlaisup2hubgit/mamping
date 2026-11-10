// Looks up a place name and returns map points (OpenStreetMap Nominatim).
export async function searchPlaces(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=6&q=" + encodeURIComponent(query);
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(r.status);
  return (await r.json()).map(p => ({ label: p.display_name, lat: +p.lat, lng: +p.lon }));
}
