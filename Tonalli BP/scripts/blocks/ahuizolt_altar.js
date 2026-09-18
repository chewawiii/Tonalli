import { ItemStack, system } from "@minecraft/server";
import * as Lib from "../lib/index.js";

Lib.registry.blockComponent("tonalli:ahuizotl_altar", {
	onPlayerInteract: ({ player, block, dimension }, { params }) => {
		const { entityId, itemId, cooldown } = params;

		const inventory = player.getComponent("inventory").container;
		let item = inventory.getItem(player.selectedSlotIndex);
		if (item?.typeId !== itemId) return;
		if (block.permutation.getState("to:is_active")) return;

		block.setPermutation(block.permutation.withState("to:is_active", true));
		block.getComponent("dynamic_properties").set("cooldown", system.currentTick + 20 * 60 * cooldown);

		item = item.amount > 1 ? new ItemStack(item.typeId, item.amount - 1) : undefined;
		inventory.setItem(player.selectedSlotIndex, item);

		dimension.setWeather("Thunder");
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

			const offset = Lib.utils.randomOffset(8);
			dimension.spawnEntity("lightning_bolt", {
				x: block.location.x + 0.5 + offset.x,
				y: block.location.y,
				z: block.location.z + 0.5 + offset.z,
			});

			if (times >= 6) {
				system.clearRun(interval);
				const newOffset = Lib.utils.randomOffset(4);
				dimension.spawnEntity(entityId, {
					x: block.location.x + 0.5 + newOffset.x,
					y: block.location.y,
					z: block.location.z + 0.5 + newOffset.z,
				});
			}
		}, 10);
	},
	onTick: ({ block }) => {
		const cooldown = block.getComponent("dynamic_properties").get("cooldown");
		if (!cooldown || system.currentTick < cooldown) return;
		block.setPermutation(block.permutation.withState("to:is_active", false));
		block.getComponent("dynamic_properties").set("cooldown", undefined);
	},
});
