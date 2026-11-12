// Asks OpenStreetMap who owns the login token sent by the app, so we can trust the username.
const HOSTS = { real: "https://api.openstreetmap.org", practice: "https://master.apis.dev.openstreetmap.org" };

export async function osmUser(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return null;
  const site = req.headers["x-osm-practice"] === "1" ? "practice" : "real";
  const r = await fetch(`${HOSTS[site]}/api/0.6/user/details.json`, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  return { site, id: (await r.json()).user.id };
}
