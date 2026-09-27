// In-memory only — intentionally NOT localStorage/sessionStorage/cookies.
// This module is re-evaluated on a full page refresh (so the intro replays),
// but stays alive across client-side route navigations (so it won't replay
// when the user just clicks between pages).
export const introSession = {
  played: false,
}