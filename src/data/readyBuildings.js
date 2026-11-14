// Ready-made building outlines (found by Microsoft's and Google's AI) for the visible map, from our server.
// The server splits the world into small squares (zoom 16 map tiles, about 600 m wide here), so we ask for each square in view.
const Z = 16, MAX_SQUARES = 16;

const tileOf = (lat, lng) => {
  const n = 2 ** Z, r = lat * Math.PI / 180;
  return [Math.floor((lng + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
};

// bounds = the map's visible area. Returns [{ coords, center, from }]; fails if the server cannot be reached.
export async function readyIn(bounds) {
  const [x0, y0] = tileOf(bounds.getNorth(), bounds.getWest()), [x1, y1] = tileOf(bounds.getSouth(), bounds.getEast());
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_SQUARES) throw new Error("zoom in closer");
  const asks = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    asks.push(fetch(`/api/ready?x=${x}&y=${y}`).then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status)))));
  }
  return (await Promise.all(asks)).flat();
}
