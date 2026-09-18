import { ItemStack, system } from "@minecraft/server";

/**
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").Dimension} dimension
 */
export function handleEjecting(block, dimension, context, params) {
	const { getData, saveData } = context;

	const { lootTable, ominousLootTable, cooldown } = params;

	const data = getData(block);

	if (!data?.eject) return;

	const eject = data.eject;

	if (system.currentTick < eject.nextTick) {
		return;
	}

	const isOminous = block.permutation.getState("to:is_ominouse");

	const location = {
		x: block.center().x,
		y: block.location.y + 1.5,
		z: block.center().z,
	};

	/*
	 * Primero expulsa el loot normal.
	 */
	if (eject.lootLeft > 0) {
		dimension.playSound("trial_spawner.eject_item", block.location);

		dimension.runCommand(
			`loot spawn ${location.x} ${location.y} ${location.z} loot "${isOminous ? ominousLootTable : lootTable}"`,
		);

		eject.lootLeft--;
		eject.nextTick = system.currentTick + 20;

		saveData(block, data);

		return;
	}

	/*
	 * Después expulsa las llaves.
	 */
	if (eject.keysLeft > 0) {
		dimension.playSound("trial_spawner.eject_item", block.location);

		dimension.spawnItem(
			new ItemStack(isOminous ? "tonalli:jade_key" : "tonalli:mictlan_key"),
			location,
		);

		eject.keysLeft--;
		eject.nextTick = system.currentTick + 20;

		saveData(block, data);

		return;
	}

	/*
	 * Terminó completamente el reward.
	 */
	delete data.eject;

	data.cooldownEnd = system.currentTick + 20 * 60 * cooldown;
	data.lastWasOminous = isOminous;

	saveData(block, data);

	block.setPermutation(
		block.permutation.withState("to:is_ominouse", false).withState("to:state", "cooldown"),
	);

	dimension.playSound("trial_spawner.close_shutter", block.location);
}
