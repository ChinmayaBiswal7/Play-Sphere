class GameState {
  static STATE = {
    MENU: 0,
    DROP_PHASE: 1,
    ACTIVE: 2,
    GAME_OVER: 3
  };
  
  constructor() {
    this.currentState = GameState.STATE.MENU;
  }
  
  set(state) {
    this.currentState = state;
  }
  
  is(state) {
    return this.currentState === state;
  }
}

window.GameStateManager = new GameState();
