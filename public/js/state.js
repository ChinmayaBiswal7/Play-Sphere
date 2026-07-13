// Shared mutable state object for gradual migration off global window namespace
export const state = {
  scene: null,
  camera: null,
  renderer: null,

  MATCH: {},
  SETTINGS: {},
  PROFILE: {},

  gameState: "MENU"
};
