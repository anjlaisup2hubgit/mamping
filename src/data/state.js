// The app's shared memory. Pages read and write it; it is lost on reload.
export const state = {
  me: null,            // {lat, lng, acc} from GPS
  clip: null,          // the video being worked on
  drive: null,         // pictures from a drive, until they are read
  ai: null,            // AI answer for that video
  match: null,         // building matched to that video
  selectedId: null,    // building the user tapped
  needsHeight: true,   // map filter: highlight buildings with no height or floors
  drawing: false,      // true while the user taps corners of a building the AI missed
  picking: false,      // true while the user chooses the area to scan
  buildings: new Map(),// OpenStreetMap buildings by id
  contribs: [],        // local and shared contributions
  shared: []           // contributions loaded from the server
};
