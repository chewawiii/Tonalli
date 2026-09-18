import { ItemStack, system, world } from "@minecraft/server";
import * as Lib from "../lib/index.js";

const DETECT_RADIUS = 4;

Lib.registry.blockComponent("tonalli:mictlan_vault", {
	onTick({ block, dimension }) {
		const players = dimension.getEntities({
			location: block.location,
			type: "minecraft:player",
			maxDistance: DETECT_RADIUS,
		});

		const vaultState = block.permutation.getState("to:state");

		if (vaultState === "active" && players.length === 0) {
			block.setPermutation(block.permutation.withState("to:state", "idle"));
			dimension.playSound("vault.deactivate", block.location);
			return;
		}
		if (players.length === 0) return;

		const raw = block.getComponent("dynamic_properties").get("looted");
		const looted = raw ? JSON.parse(raw) : [];

		const lootedBy = players.some((p) => !looted.includes(Lib.utils.shortPlayerId(p.id)));
		if (lootedBy && vaultState === "idle") {
			block.setPermutation(block.permutation.withState("to:state", "active"));
			dimension.playSound("vault.activate", block.location);
			return;
		}
	},
	onPlayerInteract: ({ player, block, dimension }, { params }) => {
		const { requiredItemId, lootTable } = params;

		const raw = block.getComponent("dynamic_properties").get("looted");
		const looted = raw ? JSON.parse(raw) : [];

		const playerId = Lib.utils.shortPlayerId(player.id);
		if (looted.includes(playerId)) return;

		const inventory = player.getComponent("inventory").container;
		const item = inventory.getItem(player.selectedSlotIndex);

		if (item?.typeId !== requiredItemId) return;

		const vaultState = block.permutation.getState("to:state");
		if (vaultState !== "active") return;
		block.setPermutation(block.permutation.withState("to:state", "looting"));

		if (item.amount > 1) {
			inventory.setItem(player.selectedSlotIndex, new ItemStack(item.typeId, item.amount - 1));
		} else {
			inventory.setItem(player.selectedSlotIndex, undefined);
		}

		const location = {
			x: block.center().x,
			y: block.location.y + 1.5,
			z: block.center().z,
		};

		const totalRolls = Math.floor(Math.random() * 4) + 2;
		let rolls = 0;

		const interval = system.runInterval(() => {
			if (rolls >= totalRolls) {
				system.clearRun(interval);
				looted.push(playerId);
				block.getComponent("dynamic_properties").set("looted", JSON.stringify(looted));
				block.setPermutation(block.permutation.withState("to:state", "idle"));
				dimension.playSound("vault.close_shutter", block.location);
				return;
			}

			dimension.playSound("vault.eject_item", block.location);
			dimension.runCommand(
				`loot spawn ${location.x} ${location.y} ${location.z} loot "${lootTable}"`,
			);
			rolls++;
		}, 20);
	},
});
