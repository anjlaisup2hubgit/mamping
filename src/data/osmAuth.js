// Log in to OpenStreetMap with OAuth 2 (PKCE). No password or secret is stored by us.
import { OSM_SITE, OSM_API, OSM_CLIENT_ID } from "./config.js";

const TOKEN = "osm_token", VERIFIER = "osm_verifier", NAME = "osm_name";
const redirect = () => location.origin + location.pathname;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const osmReady = () => !!OSM_CLIENT_ID;
export const getToken = () => { try { return localStorage.getItem(TOKEN); } catch (e) { return null; } };
export const isLoggedIn = () => !!getToken();
export const logout = () => { try { localStorage.removeItem(TOKEN); localStorage.removeItem(NAME); } catch (e) { /* nothing to clear */ } };

export async function login() {
  const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem(VERIFIER, verifier);
  const challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({
    response_type: "code", client_id: OSM_CLIENT_ID, redirect_uri: redirect(), scope: "read_prefs write_api",
    code_challenge: challenge, code_challenge_method: "S256"
  });
  location.href = `${OSM_SITE}/oauth2/authorize?${q}`;
}

// Call once at start-up: finishes the login when OpenStreetMap sends the user back.
export async function finishLogin() {
  const code = new URLSearchParams(location.search).get("code");
  const verifier = sessionStorage.getItem(VERIFIER);
  if (!code || !verifier) return false;
  const r = await fetch(`${OSM_SITE}/oauth2/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect(), client_id: OSM_CLIENT_ID, code_verifier: verifier })
  });
  history.replaceState(null, "", location.pathname + location.hash);
  sessionStorage.removeItem(VERIFIER);
  if (!r.ok) throw new Error("login failed");
  const token = (await r.json()).access_token;
  localStorage.setItem(TOKEN, token);
  await accountName(); // remember the username for the account picture
  return true;
}

// The logged-in OpenStreetMap username, asked once and then remembered on this phone. "" if unknown.
export async function accountName() {
  try {
    if (localStorage.getItem(NAME)) return localStorage.getItem(NAME);
    const d = await (await fetch(`${OSM_API}/api/0.6/user/details.json`, { headers: { Authorization: "Bearer " + getToken() } })).json();
    localStorage.setItem(NAME, d.user.display_name);
    return d.user.display_name;
  } catch (e) { return ""; }
}
