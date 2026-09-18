import { system, world } from "@minecraft/server";

import * as Lib from "../../lib/index.js";

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
export function handleActive(block, dimension, context) {
	const {
		getData,
		saveData,
		getProperties,
		getNearbyPlayers,
		convertToTrialOmen,

		maxConcurrentMobs,
		spawnAttemptTicks,
	} = context;

	const data = getData(block);

	if (!data) return;

	/*
	 * Elimina del registro los mobs que ya no existen.
	 */
	data.aliveIds = data.aliveIds.filter((id) => {
		try {
			return world.getEntity(id)?.isValid;
		} catch {
			return false;
		}
	});

	const players = getNearbyPlayers(block, dimension);

	convertToTrialOmen(players);

	let permutation = block.permutation;

	const playerHasOmen = players.some((player) => player.getEffect("trial_omen"));

	const wasOminous = permutation.getState("to:is_ominouse");

	/*
	 * Una vez que el spawner se vuelve ominous,
	 * sigue siendo ominous durante esta batalla.
	 */
	const isOminous = wasOminous || playerHasOmen;

	if (playerHasOmen && !wasOminous) {
		permutation = permutation.withState("to:is_ominouse", true);

		data.totalSpawned = 0;

		data.maxTotal = 8 + (Math.max(players.length, 1) - 1) * 3;
	}

	const canSpawn =
		data.totalSpawned < data.maxTotal &&
		data.aliveIds.length < maxConcurrentMobs &&
		system.currentTick >= data.nextSpawnTick;

	if (canSpawn) {
		/*
		 * Aunque falle el lugar de spawn, esperamos
		 * antes de volver a intentarlo.
		 */
		data.nextSpawnTick = system.currentTick + spawnAttemptTicks;

		const typeId = getProperties(block).get("summon_entity");

		if (typeof typeId === "string") {
			const mob = spawnMob(typeId, block, dimension, isOminous);

			if (mob) {
				data.aliveIds.push(mob.id);
				data.totalSpawned++;
			}
		}
	}

	/*
	 * Todos fueron generados y todos murieron.
	 */
	if (data.totalSpawned >= data.maxTotal && data.aliveIds.length === 0) {
		const rewardCount = Math.max(players.length, 1);

		data.eject = {
			lootLeft: rewardCount,

			/*
			 * Mantiene tu lógica original:
			 * 30% de posibilidad.
			 *
			 * Si pasa, entrega una llave por jugador.
			 */
			keysLeft: Math.random() < 0.35 ? rewardCount : 0,

			nextTick: system.currentTick,
		};

		saveData(block, data);

		block.setPermutation(permutation.withState("to:state", "ejected"));

		dimension.playSound("trial_spawner.open_shutter", block.location);

		return;
	}

	block.setPermutation(permutation);

	saveData(block, data);
}

/**
 * @param {string} typeId
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
function spawnMob(typeId, block, dimension, isOminous) {
	const offset = Lib.utils.randomOffset(4);

	const location = {
		x: block.location.x + 0.5 + offset.x,
		y: block.location.y,
		z: block.location.z + 0.5 + offset.z,
	};

	const spawnBlock = dimension.getBlock(location);

	if (!spawnBlock) return;

	if (spawnBlock.typeId !== "minecraft:air" || spawnBlock.above()?.typeId !== "minecraft:air") {
		return;
	}

	const mob = dimension.spawnEntity(typeId, location);

	if (isOminous) {
		mob.addEffect("strength", 20 * 60 * 30);
	}

	dimension.playSound("trial_spawner.spawn_mob", block.location);

	dimension.spawnParticle("minecraft:trial_spawner_detection", block.center());

	return mob;
}
