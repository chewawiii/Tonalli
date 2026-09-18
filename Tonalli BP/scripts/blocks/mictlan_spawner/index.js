import { GameMode } from "@minecraft/server";

import * as Lib from "../../lib/index.js";

import { handleIdle } from "./idle.js";
import { handleActive } from "./active.js";
import { handleEjecting } from "./ejecting.js";
import { handleCooldown } from "./cooldown.js";

const DETECT_RADIUS = 14;

const context = {
	detectRadius: DETECT_RADIUS,

	maxConcurrentMobs: 2,
	spawnAttemptTicks: 40,

	getData,
	saveData,
	clearData,
	getProperties,
	getNearbyPlayers,
	convertToTrialOmen,
	hasLineOfSight,
};

Lib.registry.blockComponent("tonalli:mictlan_spawner", {
	onPlayerInteract({ player, block }) {
		if (block.permutation.getState("to:state") !== "none") return;

		const inventory = player.getComponent("inventory").container;
		const item = inventory.getItem(player.selectedSlotIndex);

		if (!item?.typeId.endsWith("_spawn_egg")) return;

		const typeId = item.typeId.replace("_spawn_egg", "");

		getProperties(block).set("summon_entity", typeId);

		block.setPermutation(block.permutation.withState("to:state", "idle"));
	},

	onTick({ block, dimension }, { params }) {
		switch (block.permutation.getState("to:state")) {
			case "idle":
				handleIdle(block, dimension, context);
				break;

			case "active":
				handleActive(block, dimension, context);
				break;

			case "ejected":
				handleEjecting(block, dimension, context, params);
				break;

			case "cooldown":
				handleCooldown(block, dimension, context);
				break;
		}
	},
});

/**
 * @param {import("@minecraft/server").Block} block
 */
function getProperties(block) {
	return block.getComponent("dynamic_properties");
}

/**
 * @param {import("@minecraft/server").Block} block
 */
function getData(block) {
	const raw = getProperties(block).get("config");

	if (typeof raw !== "string") return;

	try {
		return JSON.parse(raw);
	} catch {
		return;
	}
}

/**
 * @param {import("@minecraft/server").Block} block
 * @param {object} data
 */
function saveData(block, data) {
	getProperties(block).set("config", JSON.stringify(data));
}

/**
 * @param {import("@minecraft/server").Block} block
 */
function clearData(block) {
	getProperties(block).set("config", undefined);
}

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
function getNearbyPlayers(block, dimension) {
	return dimension.getPlayers({
		location: block.location,
		gameMode: GameMode.Survival,
		maxDistance: DETECT_RADIUS,
	});
}

function convertToTrialOmen(players) {
	for (const player of players) {
		const badOmen = player.getEffect("bad_omen");

		if (badOmen) {
			player.addEffect("trial_omen", badOmen.duration, {
				amplifier: badOmen.amplifier,
				showParticles: false,
			});
			player.removeEffect("bad_omen");
		}

		const hasTrialOmen = player.getEffect("trial_omen") !== undefined;

		player.runCommand(`title @s title "badOmen:${hasTrialOmen ? 1 : 0}"`);
	}
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} from
 * @param {import("@minecraft/server").Vector3} to
 */
function hasLineOfSight(dimension, from, to) {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const dz = to.z - from.z;

	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

	if (distance <= 0.5) return true;

	const hit = dimension.getBlockFromRay(
		from,
		{
			x: dx / distance,
			y: dy / distance,
			z: dz / distance,
		},
		{
			maxDistance: distance - 0.5,
		},
	);

	return hit === undefined;
}
