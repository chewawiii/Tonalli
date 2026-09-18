import { system, world } from "@minecraft/server";
import "./blocks/index.js";
import "./entity/index.js";
import "./items/index.js";

const hadTrialOmen = new Set();

system.runInterval(() => {
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
