import type { DeploymentUnit, GameState } from './types';
import { getUnitBlueprint } from './unitCatalog';
import { xpRequiredForTier } from './xp';

export const getDeploymentUpgradeGroup = (
  deployments: readonly DeploymentUnit[],
  deployment: DeploymentUnit
): DeploymentUnit[] => {
  if (deployment.type !== 'GOBLIN' || deployment.squadId === undefined) return [deployment];
  return deployments.filter(candidate => candidate.type === deployment.type && candidate.squadId === deployment.squadId);
};

export const getUpgradeAllSummary = (state: Pick<GameState, 'deployments' | 'turn'>): { cost: number; readyCount: number } => {
  let cost = 0;
  let readyCount = 0;
  const seenGroupKeys = new Set<string>();

  for (const deployment of state.deployments) {
    const group = getDeploymentUpgradeGroup(state.deployments, deployment);
    const groupKey =
      deployment.type === 'GOBLIN' && deployment.squadId !== undefined ? `GOBLIN:${deployment.squadId}` : `UNIT:${deployment.id}`;
    if (seenGroupKeys.has(groupKey)) continue;
    seenGroupKeys.add(groupKey);

    const currentTier = deployment.tier ?? 1;
    const requiredXp = xpRequiredForTier(deployment.type, currentTier);
    const ready = group.every(item => (item.xp ?? 0) >= requiredXp && item.lastUpgradeTurn !== state.turn);
    if (!ready) continue;

    readyCount += 1;
    cost += getUnitBlueprint(deployment.type).placementCost;
  }

  return { cost, readyCount };
};
