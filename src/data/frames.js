// Pulls a few still pictures out of a recorded video.
export function grabFrames(blob, secs, count = 3) {
  return new Promise((ok, no) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.src = URL.createObjectURL(blob);
    const out = []; let i = 0;
    const seek = () => { v.currentTime = Math.max(0.1, secs * (i + 1) / (count + 1)); };
    v.onloadeddata = seek;
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = 640; c.height = Math.round(v.videoHeight * 640 / Math.max(v.videoWidth, 1)) || 360;
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      out.push(c.toDataURL("image/jpeg", 0.6).split(",")[1]);
      i++;
      if (i < count) seek(); else { URL.revokeObjectURL(v.src); ok(out); }
    };
    v.onerror = () => no(new Error("video"));
  });
}
