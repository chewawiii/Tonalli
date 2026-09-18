import { ItemStack } from "@minecraft/server";
import * as Lib from "../lib/index.js";

Lib.registry.itemComponent("tonalli:aztec_whistle", {
	onUse: ({ source, itemStack: item }, { params }) => {
		const { sound, effect, duration, amplifier, radius } = params;
		source.dimension.playSound(sound, source.location);

		source.dimension
			.getEntities({
				location: source.location,
				maxDistance: radius,
			})
			.forEach((e) => (e !== source ? e.addEffect(effect, duration * 20, { amplifier }) : undefined));

		const inventory = source.getComponent("minecraft:inventory").container;
		const durability = item.getComponent("minecraft:durability");
		if (durability.damage + 1 >= durability.maxDurability) {
			inventory.setItem(source.selectedSlotIndex, undefined);
		} else {
			durability.damage += 1;
			inventory.setItem(source.selectedSlotIndex, item);
		}
	},
});
