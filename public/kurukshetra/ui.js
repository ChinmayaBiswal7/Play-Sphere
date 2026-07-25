export class KurukshetraUI {
  constructor(game) {
    this.game = game;
  }
  
  showMenu() {
    document.getElementById('menu').style.display = 'block';
  }
  
  hideMenu() {
    document.getElementById('menu').style.display = 'none';
  }
}
