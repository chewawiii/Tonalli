import { ItemStack } from "@minecraft/server";
import * as Lib from "../lib/index.js";

Lib.registry.itemComponent("tonalli:pozole_effect", {
	onConsume({ source }, { params }) {
		const { name, duration, amplifier } = params;
		source.addEffect(name, duration, { amplifier });
		const inventory = source.getComponent("minecraft:inventory").container;
		inventory.setItem(source.selectedSlotIndex, new ItemStack("minecraft:bowl", 1));
	},
});
