// Combines two lists of found roofs (in picture pixels) so each AI checks the other.
// A roof both agree on gets the tight on-device box and a high confidence; a roof only one found is kept with a low confidence.
const AGREED = 0.9, ALONE = 0.5, MAX_SIZE_GAP = 6; // a box this many times bigger than the other is not the same roof

const boxOf = pts => ({ x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) });
const areaOf = b => (b.x1 - b.x0) * (b.y1 - b.y0);

// Do two roofs sit on the same spot? The small one's middle must be inside the big one, and they must be a similar size.
function same(a, b) {
  const [small, big] = areaOf(a) <= areaOf(b) ? [a, b] : [b, a];
  const cx = (small.x0 + small.x1) / 2, cy = (small.y0 + small.y1) / 2;
  return cx >= big.x0 && cx <= big.x1 && cy >= big.y0 && cy <= big.y1 && areaOf(big) <= areaOf(small) * MAX_SIZE_GAP;
}

// online / device: [{ points, confidence }]. Returns one list: [{ points, confidence }].
export function crossCheck(online, device) {
  const used = new Set();
  const result = device.map(d => {
    const i = online.findIndex((o, k) => !used.has(k) && same(boxOf(o.points), boxOf(d.points)));
    if (i < 0) return { ...d, confidence: Math.min(d.confidence, ALONE) };
    used.add(i);
    return { ...d, confidence: AGREED };
  });
  online.forEach((o, k) => { if (!used.has(k)) result.push({ ...o, confidence: Math.min(o.confidence ?? ALONE, ALONE) }); });
  return result;
}
