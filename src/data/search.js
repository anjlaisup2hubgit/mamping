// Looks up a place name and returns map points (Photon, an OpenStreetMap search made for type-as-you-go).
// near = [lat, lng]: places close to it come first.
export async function searchPlaces(query, near) {
  const q = new URLSearchParams({ q: query, limit: 6 });
  if (near) { q.set("lat", near[0].toFixed(3)); q.set("lon", near[1].toFixed(3)); }
  const r = await fetch("https://photon.komoot.io/api/?" + q);
  if (!r.ok) throw new Error(r.status);
  return (await r.json()).features.map(f => {
    const p = f.properties, street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const label = [...new Set([p.name, street, p.city || p.district, p.state, p.country].filter(Boolean))].join(", ");
    return { label, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  });
}
