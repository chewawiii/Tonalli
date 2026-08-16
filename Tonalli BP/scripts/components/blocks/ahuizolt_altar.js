import { ItemStack, system } from "@minecraft/server";
import { addCooldown } from "../../main";
import { randomOffset } from "../index";

/** @type {import("@minecraft/server").BlockCustomComponent} */
export const AhuizotlAltarComponent = {
	onPlayerInteract: ({ player, block, dimension }) => {
		const inventory = player.getComponent("inventory").container;
		let item = inventory.getItem(player.selectedSlotIndex);
		if (item?.typeId !== "to:tlaloc_jewel") return;
		if (block.permutation.getState("to:is_active")) return;

		block.setPermutation(block.permutation.withState("to:is_active", true));
		addCooldown("to:ahuizolt_cooldowns", block.location, system.currentTick + 20 * 60 * 30);

		item = item.amount > 1 ? new ItemStack(item.typeId, item.amount - 1) : undefined;
		inventory.setItem(player.selectedSlotIndex, item);

		dimension.runCommand("weather thunder");
		dimension
			.getEntities({
				location: block.location,
				type: "minecraft:player",
				maxDistance: 25,
			})
			.forEach((p) => p.addEffect("minecraft:blindness", 20 * 4, { showParticles: false }));
		let times = 0;
		const interval = system.runInterval(() => {
			times++;
			const offset = randomOffset(8);
			dimension.spawnEntity("lightning_bolt", {
				x: block.location.x + 0.5 + offset.x,
				y: block.location.y,
				z: block.location.z + 0.5 + offset.z,
			});

			if (times >= 6) {
				system.clearRun(interval);
				const newOffset = randomOffset(4);
				dimension.spawnEntity("to:ahuizotl", {
					x: block.location.x + 0.5 + newOffset.x,
					y: block.location.y,
					z: block.location.z + 0.5 + newOffset.z,
				});
			}
		}, 10);
	},
};
