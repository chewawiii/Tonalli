import { GameMode, ItemStack } from "@minecraft/server";

/** @type {import("@minecraft/server").BlockCustomComponent} */
export const ProtectionAltarComponent = {
	onTick: ({ block, dimension }) => {
		dimension
			.getEntities({
				location: block.location,
				type: "minecraft:player",
				maxDistance: 40,
				gameMode: GameMode.Survival,
			})
			.forEach((p) => p.addEffect("minecraft:mining_fatigue", 20 * 10, { amplifier: 5 }));
	},
	onPlayerInteract: ({ player, block, dimension }) => {
		const inventory = player.getComponent("inventory").container;
		let item = inventory.getItem(player.selectedSlotIndex);
		if (item?.typeId !== "to:sun_stone") return;

		item = item.amount > 1 ? new ItemStack(item.typeId, item.amount - 1) : undefined;
		inventory.setItem(player.selectedSlotIndex, item);

		block.setType("minecraft:air");
		dimension.spawnEntity("minecraft:lightning_bolt", block.location);
	},
};
