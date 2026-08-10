import { GameMode, ItemStack, Player, system } from "@minecraft/server";
import { randomOffset } from "../index";

const DETECT_RADIUS = 14;
const BASE_MOBS = 6;
const MOBS_PER_EXTRA_PLAYER = 2;
const MAX_CONCURRENT_MOBS = 2;
const SPAWN_ATTEMPT_TICKS = 40;
const COOLDOWN_SECONDS = 60 * 30;
const LOOT_TABLE = "chests/mictlan_spawner/mictlan_spawner";
const OMINOUS_LOOT_TABLE = "chests/mictlan_spawner/mictlan_spawner_ominous";

/** @type {import("@minecraft/server").BlockCustomComponent} */
export const MictlanSpawnerComponent = {
	onPlayerInteract({ player, block, dimension }) {
		if (block.permutation.getState("to:state") !== "none") return;
		const inventory = player.getComponent("inventory").container;
		const item = inventory.getItem(player.selectedSlotIndex);
		if (!item?.typeId.includes("spawn_egg")) return;

		block.setPermutation(block.permutation.withState("to:state", "idle"));
		const entity = dimension.spawnEntity("to:dummy", block.location);
		entity.setDynamicProperty("to:summon", JSON.stringify(item.typeId));
	},
	onTick({ block, dimension }) {
		const state = block.permutation.getState("to:state");

		if (state === "idle") {
			handleIdle(block, dimension);
		} else if (state === "active") {
			handleActive(block, dimension);
		} else if (state === "ejected") {
			handleEjected(block, dimension);
		} else if (state === "cooldown") {
			handleCooldown(block, dimension);
		}
	},
	onPlayerBreak: ({ block, dimension }) => {
		const dummy = dimension
			.getEntities({
				location: block.location,
				type: "to:dummy",
				maxDistance: 1,
			})[0]
			?.remove();
	},
};

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
function handleIdle(block, dimension) {
	const players = dimension.getEntities({
		location: block.location,
		type: "minecraft:player",
		gameMode: GameMode.Survival,
		maxDistance: DETECT_RADIUS,
	});
	if (players.length === 0) return;
	if (
		!hasLineOfSight(
			dimension,
			{ ...players[0].location, y: players[0].location.y + 1 },
			block.location,
		)
	)
		return;

	convertToTrialOmen(players);

	const isOminous = players.some((p) => p.getEffect("minecraft:trial_omen"));
	const newPermutation = block.permutation
		.withState("to:is_ominouse", isOminous)
		.withState("to:state", "active");
	block.setPermutation(newPermutation);
	dimension.playSound("trial_spawner.detect_player", block.location);
	dimension.spawnParticle("minecraft:trial_spawner_detection", block.location);

	const dummy = dimension.getEntities({
		location: block.location,
		type: "to:dummy",
		maxDistance: 1,
	})[0];
	if (!dummy) return;

	const baseMobs = isOminous ? 8 : 6;
	const mobsPerExtraPlayer = isOminous ? 3 : 2;
	const maxTotal = baseMobs + (players.length - 1) * mobsPerExtraPlayer;

	saveRecord(dummy, {
		totalSpawned: 0,
		aliveIds: [],
		nextAttemptTick: 0,
		cooldownExpire: null,
		maxTotal,
	});
}

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
function handleActive(block, dimension) {
	const dummy = dimension.getEntities({
		location: block.location,
		type: "to:dummy",
		maxDistance: 1,
	})[0];
	const record = getEntities(dummy);
	record.aliveIds = record.aliveIds.filter((id) => {
		const entity = dimension
			.getEntities({ location: block.location, maxDistance: 64 })
			.find((e) => e.id === id);
		return entity?.isValid;
	});

	const players = dimension.getEntities({
		location: block.location,
		type: "minecraft:player",
		gameMode: GameMode.Survival,
		maxDistance: DETECT_RADIUS,
	});

	convertToTrialOmen(players);

	let permutation = block.permutation;
	const isOminous = players.some((p) => p.getEffect("minecraft:trial_omen"));
	const wasOminous = permutation.getState("to:is_ominouse");

	if (isOminous && !wasOminous) {
		permutation = permutation.withState("to:is_ominouse", isOminous);
		record.totalSpawned = 0;

		const baseMobs = isOminous ? 8 : 6;
		const mobsPerExtraPlayer = isOminous ? 3 : 2;
		const playerCount = Math.max(players.length, 1);
		record.maxTotal = baseMobs + (playerCount - 1) * mobsPerExtraPlayer;
	}

	const canSpawnMore = record.totalSpawned < record.maxTotal;
	const hasRoom = record.aliveIds.length < MAX_CONCURRENT_MOBS;
	const readyToAttempt = system.currentTick >= record.nextAttemptTick;
	if (canSpawnMore && hasRoom && readyToAttempt) {
		const raw = dummy.getDynamicProperty("to:summon");
		const id = JSON.parse(raw);
		const typeId = id.replace("_spawn_egg", "");
		spawnMob(typeId, block, dimension, record, wasOminous);
		record.nextAttemptTick = system.currentTick + SPAWN_ATTEMPT_TICKS;
	}

	if (record.totalSpawned >= record.maxTotal && record.aliveIds.length === 0) {
		record.cooldownExpire = system.currentTick + COOLDOWN_SECONDS * 20;
		saveRecord(dummy, record);
		block.setPermutation(permutation.withState("to:state", "ejected"));
		dimension.playSound("trial_spawner.open_shutter", block.location);
		return;
	}

	block.setPermutation(permutation);
	saveRecord(dummy, record);
}

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
function handleEjected(block, dimension) {
	const dummy = dimension.getEntities({
		location: block.location,
		type: "to:dummy",
		maxDistance: 1,
	})[0];
	if (!dummy) return;

	const record = getEntities(dummy);
	if (record.ejecting) return;

	record.ejecting = true;
	saveRecord(dummy, record);

	const players = dimension.getEntities({
		location: block.location,
		type: "minecraft:player",
		gameMode: GameMode.Survival,
		maxDistance: DETECT_RADIUS,
	});
	const totalRolls = Math.max(players.length, 1);

	const location = {
		x: block.center().x,
		y: block.location.y + 1.2,
		z: block.center().z,
	};
	let rolls = 0;
	let keyRolls = 0;
	let keyChancePassed = null;
	const permutation = block.permutation;
	const wasOminous = permutation.getState("to:is_ominouse");

	const interval = system.runInterval(() => {
		if (rolls >= totalRolls) {
			if (keyChancePassed === null) {
				keyChancePassed = Math.random() < 0.25;
			}

			if (keyChancePassed && keyRolls < totalRolls) {
				dimension.playSound("trial_spawner.eject_item", block.location);
				dimension.spawnItem(
					new ItemStack(wasOminous ? "to:jade_key" : "to:mictlan_key", 1),
					location,
				);
				keyRolls++;
				return;
			}

			system.clearRun(interval);
			dimension.playSound("trial_spawner.close_shutter", block.location);
			const newPermutation = block.permutation
				.withState("to:is_ominouse", false)
				.withState("to:state", "cooldown");
			block.setPermutation(newPermutation);
			return;
		}

		dimension.playSound("trial_spawner.eject_item", block.location);
		dimension.runCommand(
			`loot spawn ${location.x} ${location.y} ${location.z} loot "${wasOminous ? OMINOUS_LOOT_TABLE : LOOT_TABLE}"`,
		);
		rolls++;
	}, 20);
}

function handleCooldown(block, dimension) {
	const dummy = dimension.getEntities({
		location: block.location,
		type: "to:dummy",
		maxDistance: 1,
	})[0];
	if (!dummy) return;

	const record = getEntities(dummy);
	if (record.cooldownExpire === null || system.currentTick < record.cooldownExpire) return;

	clearRecord(dummy);
	block.setPermutation(block.permutation.withState("to:state", "idle"));
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 */
function hasLineOfSight(dimension, from, to) {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const dz = to.z - from.z;
	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
	if (distance === 0) return true;

	const direction = { x: dx / distance, y: dy / distance, z: dz / distance };

	const hit = dimension.getBlockFromRay(from, direction, {
		maxDistance: distance,
	});

	return hit === undefined;
}

/** @param {import("@minecraft/server").Entity} entity */
function getEntities(entity) {
	const raw = entity.getDynamicProperty("to:alive_mobs");
	if (raw) return JSON.parse(raw);
	return {
		totalSpawned: 0,
		aliveIds: [],
		nextAttemptTick: 0,
		cooldownExpire: null,
		maxTotal: BASE_MOBS,
	};
}

/** @param {import("@minecraft/server").Entity} entity */
function saveRecord(entity, record) {
	entity.setDynamicProperty("to:alive_mobs", JSON.stringify(record));
}

/** @param {import("@minecraft/server").Entity} entity */
function clearRecord(entity) {
	entity.setDynamicProperty("to:alive_mobs", undefined);
}

function spawnMob(typeId, block, dimension, record, isOminous) {
	const offset = randomOffset(4);
	const location = {
		x: block.location.x + 0.5 + offset.x,
		y: block.location.y,
		z: block.location.z + 0.5 + offset.z,
	};
	const mob = dimension.spawnEntity(typeId, location);
	record.aliveIds.push(mob.id);
	record.totalSpawned++;
	dimension.playSound("trial_spawner.spawn_mob", block.location);
	dimension.spawnParticle("minecraft:trial_spawner_detection", block.location);

	if (isOminous) {
		mob.addEffect("strength", 20 * 60 * 30, { amplifier: 0 });
	}
}

function convertToTrialOmen(players) {
	for (const player of players) {
		if (!(player instanceof Player)) continue;

		const badOmen = player.getEffect("bad_omen");
		if (badOmen) {
			const duration = badOmen.duration;
			const amplifier = badOmen.amplifier;
			player.removeEffect("bad_omen");
			player.addEffect("trial_omen", duration, { amplifier, showParticles: false });
		}

		const hasTrialOmen = player.getEffect("trial_omen") !== undefined;
		player.runCommand(`title @s title "badOmen:${hasTrialOmen ? 1 : 0}"`);
	}
}
