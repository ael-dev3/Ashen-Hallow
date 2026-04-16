import type { Screen } from '../Screen';
import type { Race } from '../../../engine/game/types';
import { Button } from '../atoms/Button';
import { Tooltip } from '../atoms/Tooltip';
import { CURRENT_VERSION } from '../../../engine/config/versionCatalog';
import { getSoundEnabled, toggleSound } from '../audio';

export interface MainMenuOptions {
  onStartRace: (race: Race) => void;
  onShowcase: () => void;
}

export class MainMenu implements Screen {
  private readonly container: HTMLDivElement;
  private readonly tooltip: Tooltip;
  private readonly subtitle: HTMLParagraphElement;
  private readonly actions: HTMLDivElement;
  private readonly options: MainMenuOptions;
  private soundTooltipUnsub: (() => void) | null = null;

  constructor(options: MainMenuOptions) {
     this.options = options;
    this.container = document.createElement('div');
    this.container.className = 'screen screen--start';
    this.tooltip = new Tooltip();

    const menu = document.createElement('div');
    menu.className = 'menu';

    const title = document.createElement('h1');
    title.className = 'menu__title';
    title.textContent = 'Ashen-Hallow';

    this.subtitle = document.createElement('p');
    this.subtitle.className = 'menu__subtitle';
    this.subtitle.textContent = 'Command your warhost and survive the haunted battlefield.';

    let soundButton: Button;
    const updateSoundUi = (enabled: boolean): void => {
      soundButton.setText(enabled ? 'Audio: On' : 'Audio: Off');
      soundButton.toggleClass('btn--sound-on', enabled);
      soundButton.toggleClass('btn--sound-off', !enabled);
      soundButton.getElement().setAttribute('aria-pressed', enabled ? 'true' : 'false');
      if (this.soundTooltipUnsub) {
        this.soundTooltipUnsub();
      }
      this.soundTooltipUnsub = this.tooltip.bind(soundButton.getElement(), {
        text: enabled ? 'Audio is on. Click to mute.' : 'Enable music and sound effects.',
        placement: 'bottom',
      });
    };
    soundButton = new Button({
      text: 'Audio: Off',
      variant: 'ghost',
      className: 'btn--sound',
      onClick: () => {
        const enabled = toggleSound();
        updateSoundUi(enabled);
      },
    });
    soundButton.getElement().setAttribute('aria-label', 'Toggle audio');

    this.actions = document.createElement('div');
    this.actions.className = 'menu__actions menu__actions--stack';

    menu.appendChild(title);
    menu.appendChild(this.subtitle);
    const soundRow = document.createElement('div');
    soundRow.className = 'menu__sound';
    soundRow.appendChild(soundButton.getElement());
    menu.appendChild(soundRow);
    menu.appendChild(this.actions);
    updateSoundUi(getSoundEnabled());
    this.renderLandingActions();

    this.container.appendChild(menu);
  }

  private renderLandingActions(): void {
    this.subtitle.textContent = 'Command your warhost and survive the haunted battlefield.';
    this.actions.replaceChildren();
    this.actions.className = 'menu__actions menu__actions--stack';

    const play = new Button({
      text: `Play v${CURRENT_VERSION}`,
      variant: 'primary',
      className: 'btn--start btn--start-play',
      onClick: () => this.renderRaceActions(),
    });

    this.actions.appendChild(play.getElement());
  }

  private renderRaceActions(): void {
    this.subtitle.textContent = 'Choose your race, command your warhost, and survive the haunted battlefield.';
    this.actions.replaceChildren();
    this.actions.className = 'menu__actions menu__actions--stack';

    const humanStart = new Button({
      text: 'Humans',
      variant: 'primary',
      className: 'btn--start btn--start-human',
      onClick: () => this.options.onStartRace('HUMAN'),
    });
    const orcStart = new Button({
      text: 'Orcs',
      variant: 'secondary',
      className: 'btn--start btn--start-orc',
      onClick: () => this.options.onStartRace('ORC'),
    });
    const showcase = new Button({
      text: 'Mobile AI Showcase',
      variant: 'ghost',
      className: 'btn--showcase',
      onClick: this.options.onShowcase,
    });
    const back = new Button({
      text: 'Back',
      variant: 'ghost',
      className: 'btn--showcase btn--menu-back',
      onClick: () => this.renderLandingActions(),
    });

    this.actions.appendChild(humanStart.getElement());
    this.actions.appendChild(orcStart.getElement());
    this.actions.appendChild(showcase.getElement());
    this.actions.appendChild(back.getElement());
  }

  public getElement(): HTMLDivElement {
    return this.container;
  }

  public destroy(): void {
    if (this.soundTooltipUnsub) {
      this.soundTooltipUnsub();
      this.soundTooltipUnsub = null;
    }
    this.tooltip.destroy();
  }
}
