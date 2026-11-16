// Rounded line icons with no fill.
const svg = inner => `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const icons = {
  building: '<svg viewBox="0 0 48 48" stroke-linecap="round" stroke-linejoin="round">' + '<path d="M4 42V24l11-8 10 8v18M25 42V8l13 6v28M38 22l7 4v16H4M15 28v3m0 5v3M31 18v3m0 6v3m0 6v2"/></svg>',
  person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  locate: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>'),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="M16 8l-2 6-6 2 2-6z"/>'),
  book: svg('<path d="M12 6C9 3.5 5.5 3.5 3 4.5V19c2.5-1 6-1 9 1 3-2 6.5-2 9-1V4.5C18.5 3.5 15 3.5 12 6v14"/>'),
  home: svg('<path d="M3 11l9-8 9 8M5 9.5V20h5v-5.5h4V20h5V9.5"/>'),
  camera: svg('<path d="M3.5 8.5a2 2 0 012-2H7l1.6-2.2h6.8L17 6.5h1.5a2 2 0 012 2v9a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.5"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5"/>'),
  list: svg('<path d="M9 6h12M9 12h12M9 18h8M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
  scan: svg('<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16"/><path d="M12 10.5v4M10 12.5h4"/>'),
  outline: svg('<path d="M5 7l9-3 5 6-3 9-10-2z"/><circle cx="5" cy="7" r="1.6"/><circle cx="14" cy="4" r="1.6"/><circle cx="19" cy="10" r="1.6"/><circle cx="16" cy="19" r="1.6"/><circle cx="6" cy="17" r="1.6"/>'),
  sliders: svg('<path d="M3 7h9.5M17.5 7H21M3 17h3.5M11.5 17H21"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>'),
  photo: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 16l5-5 4 4 3-3 5 5"/><circle cx="15.5" cy="8.5" r="1.5"/>'),
  hand: svg('<path d="M11 11V4.5a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0V12m0-3a1.5 1.5 0 013 0v5a7 7 0 01-7 7h-1a6 6 0 01-5-2.7L4.3 14a1.6 1.6 0 012.6-1.8L8 13.5V6.5a1.5 1.5 0 013 0"/>'),
  edit: svg('<path d="M15 5l4 4-9.5 9.5L5 19l.5-4.5zM13 7l4 4"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12.2 2h-.4a2 2 0 00-2 2v.2a2 2 0 01-1 1.7l-.4.2a2 2 0 01-2 0l-.2-.1a2 2 0 00-2.7.7l-.2.4a2 2 0 00.7 2.7l.2.1a2 2 0 011 1.7v.5a2 2 0 01-1 1.7l-.2.1a2 2 0 00-.7 2.7l.2.4a2 2 0 002.7.7l.2-.1a2 2 0 012 0l.4.2a2 2 0 011 1.7V20a2 2 0 002 2h.4a2 2 0 002-2v-.2a2 2 0 011-1.7l.4-.2a2 2 0 012 0l.2.1a2 2 0 002.7-.7l.2-.4a2 2 0 00-.7-2.7l-.2-.1a2 2 0 01-1-1.7v-.5a2 2 0 011-1.7l.2-.1a2 2 0 00.7-2.7l-.2-.4a2 2 0 00-2.7-.7l-.2.1a2 2 0 01-2 0l-.4-.2a2 2 0 01-1-1.7V4a2 2 0 00-2-2z"/>'),
  video: svg('<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>')
};
