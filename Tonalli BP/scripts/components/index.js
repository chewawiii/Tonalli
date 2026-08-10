import { system, world } from "@minecraft/server";
import { PozoleComponent } from "./items/pozole.js";
import { AhuizotlAltarComponent } from "./blocks/ahuizolt_altar.js";
import { MictlanSpawnerComponent } from "./blocks/mictlan_spawner.js";
import { MictlanVaultComponent } from "./blocks/mictlan_vault.js";

system.beforeEvents.startup.subscribe(({ itemComponentRegistry, blockComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("to:pozole_effect", PozoleComponent);
	blockComponentRegistry.registerCustomComponent("to:ahuizotl_altar", AhuizotlAltarComponent);
	blockComponentRegistry.registerCustomComponent("to:mictlan_spawner", MictlanSpawnerComponent);
	blockComponentRegistry.registerCustomComponent("to:mictlan_vault", MictlanVaultComponent);
});

world.beforeEvents.entityHurt.subscribe((init) => {
	if (init.hurtEntity.typeId === "to:dummy") init.cancel = true;
});

export function randomOffset(radius) {
	const angle = Math.random() * Math.PI * 2;
	const distance = Math.sqrt(Math.random()) * radius;
	return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
}
