export class KurukshetraAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.karma = 5;
    this.lastActionTime = Date.now();
  }

  makeDecision(gameState) {
    const now = Date.now();
    let delay = 4000;
    if (this.difficulty === 'easy') delay = Math.random() * 2000 + 3000;
    if (this.difficulty === 'medium') delay = 3000;
    if (this.difficulty === 'hard') delay = 2000;

    if (now - this.lastActionTime > delay && this.karma >= 3) {
      this.lastActionTime = now;
      this.karma -= 3;
      return { cardId: 'mock_card', x: Math.random() * 800, y: Math.random() * 200 + 100 };
    }
    return null;
  }
}
