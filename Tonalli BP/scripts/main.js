import { system, world } from "@minecraft/server";
import "./components/index.js";

let cache = null;
const hadTrialOmen = new Set();

export function getDynamic(key) {
	if (cache === null) {
		const raw = world.getDynamicProperty(key);
		cache = raw ? JSON.parse(raw) : [];
	}
	return cache;
}

export function addCooldown(key, location, tick) {
	const cooldowns = getDynamic(key);
	cooldowns.push({ x: location.x, y: location.y, z: location.z, tick });
	world.setDynamicProperty(key, JSON.stringify(cooldowns));
}

system.runInterval(() => {
	const ahuizolt_cooldowns = getDynamic("to:ahuizolt_cooldowns");
	const ahuizolt_actives = [];
	if (ahuizolt_cooldowns.length > 0) {
		for (const entry of ahuizolt_cooldowns) {
			const { x, y, z, tick } = entry;
			if (system.currentTick > tick) {
				const dimension = world.getDimension("overworld");
				const block = dimension.getBlock({ x, y, z });
				if (block.typeId === "to:ahuizolt_altar") {
					block.setPermutation(block.permutation.withState("to:is_active", false));
				}
			} else {
				ahuizolt_actives.push(entry);
			}
		}

		if (ahuizolt_actives.length !== ahuizolt_cooldowns.length) {
			world.setDynamicProperty("to:ahuizolt_cooldowns", JSON.stringify(ahuizolt_actives));
		}
	}
	for (const player of world.getPlayers()) {
		const hasTrialOmen = player.getEffect("trial_omen") !== undefined;

		if (hasTrialOmen) {
			hadTrialOmen.add(player.name);
		} else if (hadTrialOmen.has(player.name)) {
			// justo se le acabo el trial_omen (o se lo quitaron con leche, etc.)
			hadTrialOmen.delete(player.name);

			player.runCommand(`title @s title "badOmen:0"`);
			// aqui agregas cualquier otra logica que necesites al momento
			// exacto en que se le acaba, sin importar si esta cerca de un spawner
		}
	}
}, 10);
