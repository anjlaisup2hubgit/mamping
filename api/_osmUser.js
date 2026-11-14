// Asks OpenStreetMap who owns the login token sent by the app, so we can trust the username.

export async function osmUser(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) return null;
  const r = await fetch("https://api.openstreetmap.org/api/0.6/user/details.json", { headers: { Authorization: "Bearer " + token } });
  if (r.status === 401 || r.status === 403) return null; // the login really is bad
  if (!r.ok) throw new Error("OpenStreetMap did not answer (" + r.status + ")"); // a hiccup: the app tries again
  return { site: "real", id: (await r.json()).user.id };
}
