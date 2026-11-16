// Decorative line drawing, shared by the contribution panel and filming guide.
export const neighbourhoodArt = () => `<svg class="neighbourhoodArt" viewBox="0 0 220 170" aria-hidden="true">
  <path d="M12 131l96-49 99 48-95 36z" fill="#235d68"/>
  <g stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
    <path d="M48 61l62-31 61 31-61 31z" fill="#28616d"/>
    <path d="M48 61v69l62 30V92z" fill="#124b59"/><path d="M110 92l61-31v69l-61 30z" fill="#235d68"/>
    <path d="M89 38V22l24-12 24 12v16l-24 12z" fill="#124b59"/><path d="M89 22l24 12 24-12m-24 12v16" fill="none"/>
    ${[0, 1, 2].map(y => [0, 1, 2, 3].map(x => `<path d="M${57 + x * 12} ${77 + x * 6 + y * 17}v8l5 2v-8zM${119 + x * 12} ${99 - x * 6 + y * 17}v8l5-2v-8z" fill="#3b7880"/>`).join("")).join("")}
    <path d="M95 152v-22l9 4v22" fill="#3b7880"/><path d="M28 137v-24m-7 5c-18-4-9-22-2-23-4-17 20-21 22-5 15 1 17 24 1 27zM190 139v-25m-7 4c-17-4-11-22-2-23-3-15 19-18 21-3 13 2 16 22 1 25z" fill="#3b7880"/>
  </g></svg>`;
