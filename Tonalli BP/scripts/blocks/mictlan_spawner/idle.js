/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
export function handleIdle(block, dimension, context) {
	const { getNearbyPlayers, convertToTrialOmen, hasLineOfSight, saveData } = context;

	const players = getNearbyPlayers(block, dimension);

	if (players.length === 0) return;

	const player = players[0];

	const from = {
		...player.location,
		y: player.location.y + 1,
	};

	if (!hasLineOfSight(dimension, from, block.center())) {
		return;
	}

	convertToTrialOmen(players);

	const isOminous = players.some((player) => player.getEffect("trial_omen"));

	const baseMobs = isOminous ? 8 : 6;
	const extraMobs = isOminous ? 3 : 2;

	const data = {
		totalSpawned: 0,
		aliveIds: [],
		maxTotal: baseMobs + (players.length - 1) * extraMobs,

		nextSpawnTick: 0,

		cooldownEnd: 0,
	};

	saveData(block, data);

	block.setPermutation(
		block.permutation.withState("to:is_ominouse", isOminous).withState("to:state", "active"),
	);

	dimension.playSound("trial_spawner.detect_player", block.location);

	dimension.spawnParticle("minecraft:trial_spawner_detection", block.center());
}
