import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const fail = (message) => {
  throw new Error(message);
};

const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const lineCount = (relativePath) => read(relativePath).split('\n').length;

const assertFile = (relativePath) => {
  if (!existsSync(join(root, relativePath))) {
    fail(`Missing required architecture module: ${relativePath}`);
  }
};

const assertMaxLines = (relativePath, maxLines) => {
  const actual = lineCount(relativePath);
  if (actual > maxLines) {
    fail(`${relativePath} is ${actual} lines; expected <= ${maxLines}`);
  }
};

const assertContains = (relativePath, text) => {
  if (!read(relativePath).includes(text)) {
    fail(`${relativePath} must contain ${JSON.stringify(text)}`);
  }
};

const assertNotContains = (relativePath, text) => {
  if (read(relativePath).includes(text)) {
    fail(`${relativePath} must not contain ${JSON.stringify(text)}`);
  }
};

const requiredModules = [
  'src/engine/domain/primitives.ts',
  'src/engine/domain/entities.ts',
  'src/engine/domain/state.ts',
  'src/engine/domain/events.ts',
  'src/engine/catalog/units.ts',
  'src/engine/catalog/buildings.ts',
  'src/engine/battle/simulationSupport.ts',
  'src/engine/game/reducerHelpers.ts',
  'src/engine/ai/enemy/enemySpawner.ts',
  'src/app/audio/AudioService.ts',
  'src/app/ui/screens/game/gameText.ts',
  'src/presentation/input/inputTypes.ts',
  'src/presentation/input/GameCanvasInteractor.ts',
  'src/presentation/rendering/CanvasViewport.ts',
  'src/presentation/rendering/renderTheme.ts',
];

for (const modulePath of requiredModules) {
  assertFile(modulePath);
}

const lineBudgets = new Map([
  ['src/engine/game/types.ts', 25],
  ['src/engine/game/unitCatalog.ts', 25],
  ['src/engine/game/buildingCatalog.ts', 25],
  ['src/engine/game/enemySpawner.ts', 20],
  ['src/app/ui/audio.ts', 40],
  ['src/engine/game/reducer.ts', 680],
  ['src/engine/game/simulateBattle.ts', 640],
  ['src/presentation/rendering/CanvasRenderer.ts', 610],
  ['src/app/ui/screens/GameScreen.ts', 1850],
]);

for (const [relativePath, maxLines] of lineBudgets) {
  assertMaxLines(relativePath, maxLines);
}

assertContains('src/engine/game/types.ts', "from '../domain/");
assertContains('src/engine/game/unitCatalog.ts', "from '../catalog/units'");
assertContains('src/engine/game/buildingCatalog.ts', "from '../catalog/buildings'");
assertContains('src/engine/game/enemySpawner.ts', "from '../ai/enemy/enemySpawner'");
assertContains('src/app/ui/audio.ts', "defaultAudioService");
assertNotContains('src/app/ui/audio.ts', 'new AudioContext');

console.log('[pass] architecture contracts satisfied');
