import { GameMode, ItemStack } from "@minecraft/server";
import * as Lib from "../lib/index.js";

Lib.registry.blockComponent("tonalli:protection_altar", {
	onTick: ({ block, dimension }, { params }) => {
		const { effectId, radius, amplifier } = params;
		dimension
			.getEntities({
				location: block.location,
				type: "minecraft:player",
				maxDistance: radius,
				gameMode: GameMode.Survival,
			})
			.forEach((p) => p.addEffect(effectId, 20 * 10, { amplifier: amplifier }));
	},
	onPlayerInteract: ({ player, block, dimension }, { params }) => {
		const { itemId } = params;
		const inventory = player.getComponent("inventory").container;
		let item = inventory.getItem(player.selectedSlotIndex);
		if (item?.typeId !== itemId) return;

		item = item.amount > 1 ? new ItemStack(item.typeId, item.amount - 1) : undefined;
		inventory.setItem(player.selectedSlotIndex, item);

		block.setType("minecraft:air");
		dimension.spawnEntity("minecraft:lightning_bolt", block.location);
	},
});
