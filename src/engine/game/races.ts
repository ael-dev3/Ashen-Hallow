import type { BuildingType, Race, UnitType } from './types';

const HUMAN_UNIT_TYPES: UnitType[] = ['KNIGHT', 'ARCHER', 'SNIPER', 'MAGE'];
const ORC_UNIT_TYPES: UnitType[] = ['GOBLIN', 'GOLEM', 'BLOOD_MAGE', 'HOBGOBLIN'];

const HUMAN_BUILDING_TYPES: BuildingType[] = ['GOLD_MINE', 'ARCHER_TOWER'];
const ORC_BUILDING_TYPES: BuildingType[] = ['GOLD_MINE', 'GOBLIN_CAVE'];

export const getRaceUnitTypes = (race: Race): UnitType[] => (race === 'HUMAN' ? [...HUMAN_UNIT_TYPES] : [...ORC_UNIT_TYPES]);

export const getRaceBuildingTypes = (race: Race): BuildingType[] =>
  race === 'HUMAN' ? [...HUMAN_BUILDING_TYPES] : [...ORC_BUILDING_TYPES];

export const isUnitAvailableForRace = (race: Race, unitType: UnitType): boolean => getRaceUnitTypes(race).includes(unitType);

export const isBuildingAvailableForRace = (race: Race, buildingType: BuildingType): boolean =>
  getRaceBuildingTypes(race).includes(buildingType);

export const getDefaultUnitTypeForRace = (race: Race): UnitType => getRaceUnitTypes(race)[0] ?? 'KNIGHT';

export const getDefaultBuildingTypeForRace = (race: Race): BuildingType => getRaceBuildingTypes(race)[0] ?? 'GOLD_MINE';

export const pickEnemyRace = (playerRace: Race, _rand: number): Race =>
  playerRace === 'HUMAN' ? 'ORC' : 'HUMAN';
