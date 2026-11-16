// Icons for the building editor: rounded lines, no fill, same style as icons.js.
const svg = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const editIcons = {
  square: svg('<rect x="5" y="5" width="14" height="14" rx="1.5"/><path d="M5 9h4V5M19 15h-4v4"/>'),
  undo: svg('<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 010 10h-2"/>'),
  redo: svg('<path d="M15 7l4.5 4.5L15 16"/><path d="M19 11.5h-9a5 5 0 000 10h2"/>'),
  checkNext: svg('<path d="M3.5 12.5l4 4 8-9"/><path d="M15 16.5h5.5M18 14l2.5 2.5L18 19"/>'),
  lineUp: svg('<path d="M3 20h18"/><rect x="6" y="7" width="10" height="9" rx="1"/><path d="M11 3v3M9.5 4.5L11 3l1.5 1.5"/>'),
  snap: svg('<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M3 7h2M3 17h2M19 7h2M19 17h2M7 3v2M17 3v2M7 19v2M17 19v2"/>'),
  street: svg('<path d="M8 21L10 3M16 21L14 3"/><path d="M12 6v2.5M12 12v2.5M12 18v2"/>'),
  turnLeft: svg('<path d="M4 4v5h5"/><path d="M4.5 9A8 8 0 1112 20"/>'),
  turnRight: svg('<path d="M20 4v5h-5"/><path d="M19.5 9A8 8 0 1012 20"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 00-1.5-1.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5"/>'),
  remove: svg('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5l1-12.5M10 11v6M14 11v6"/>'),
  prev: svg('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
  next: svg('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
  grip: svg('<circle cx="9" cy="6" r=".9"/><circle cx="15" cy="6" r=".9"/><circle cx="9" cy="12" r=".9"/><circle cx="15" cy="12" r=".9"/><circle cx="9" cy="18" r=".9"/><circle cx="15" cy="18" r=".9"/>'),
  details: svg('<path d="M4 6h16M4 12h10M4 18h7"/><path d="M15.5 19.5l.6-2.6 4-4a1.3 1.3 0 012 2l-4 4z"/>'),
  send: svg('<path d="M4 12L20 4l-5 16-3.5-6.5z"/><path d="M11.5 13.5L20 4"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>'),
  close: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  select: svg('<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M12 4h2M4 12v2M4 18v.5A1.5 1.5 0 005.5 20H6"/><path d="M11 11l9 3.5-4 1.5-1.5 4z"/>'),
  more: svg('<circle cx="5.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/>')
};
