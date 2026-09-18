import { system } from "@minecraft/server";

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
export function handleCooldown(block, dimension, context) {
	const { getData, saveData, clearData, getNearbyPlayers, convertToTrialOmen } = context;

	const data = getData(block);

	if (!data) {
		block.setPermutation(block.permutation.withState("to:state", "idle"));

		return;
	}

	/*
	 * Solo una ronda NORMAL puede ser
	 * reactivada por Bad Omen.
	 */
	if (!data.lastWasOminous) {
		const players = getNearbyPlayers(block, dimension);

		if (players.length > 0) {
			convertToTrialOmen(players);

			const hasTrialOmen = players.some((player) => player.getEffect("trial_omen"));

			if (hasTrialOmen) {
				const playerCount = players.length;

				saveData(block, {
					totalSpawned: 0,
					aliveIds: [],

					maxTotal: 8 + (playerCount - 1) * 3,

					nextSpawnTick: 0,
					cooldownEnd: 0,

					/*
					 * Esta nueva ronda ya es ominous.
					 */
					lastWasOminous: true,
				});

				block.setPermutation(
					block.permutation.withState("to:is_ominouse", true).withState("to:state", "active"),
				);

				dimension.playSound("trial_spawner.detect_player", block.location);

				dimension.spawnParticle("minecraft:trial_spawner_detection", block.center());

				return;
			}
		}
	}

	/*
	 * Cooldown normal.
	 */
	if (system.currentTick >= data.cooldownEnd) {
		clearData(block);

		block.setPermutation(block.permutation.withState("to:state", "idle"));

		return;
	}

	if (Math.random() > 0.25) return;

	dimension.spawnParticle("minecraft:basic_smoke_particle", {
		x: block.location.x + 0.25 + Math.random() * 0.5,

		y: block.location.y + 1,

		z: block.location.z + 0.25 + Math.random() * 0.5,
	});
}
