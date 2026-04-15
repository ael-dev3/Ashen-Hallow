import type { Screen } from './Screen';
import type { Race } from '../../engine/game/types';
import { GameScreen } from './screens/GameScreen';
import { MainMenu } from './screens/MainMenu';
import { ShowcaseScreen } from './screens/ShowcaseScreen';

export class App {
  private readonly root: HTMLElement;
  private current: Screen | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public start(): void {
    this.showMenu();
  }

  private setScreen(screen: Screen): void {
    this.current?.destroy();
    this.root.innerHTML = '';
    this.current = screen;
    this.root.appendChild(screen.getElement());
  }

  private showMenu(): void {
    this.setScreen(
      new MainMenu({
        onStartRace: race => this.showGame(race),
        onShowcase: () => this.showShowcase(),
      })
    );
  }

  private showGame(race: Race): void {
    this.setScreen(
      new GameScreen({
        race,
        onExit: () => this.showMenu(),
      })
    );
  }

  private showShowcase(): void {
    this.setScreen(
      new ShowcaseScreen({
        onExit: () => this.showMenu(),
      })
    );
  }
}
