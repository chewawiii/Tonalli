import { ItemStack, system } from "@minecraft/server";

const DETECT_RADIUS = 4;
const LOOT_TABLE = "chests/mictlan_vault/mictlan_vault";
const OMINOUS_LOOT_TABLE = "chests/mictlan_vault/mictlan_vault_ominous";
const VAULT_KEYS = {
	"to:mictlan_vault": "to:mictlan_key",
	"to:mictlan_vault_ominous": "to:jade_key",
};

/** @type {import("@minecraft/server").BlockCustomComponent} */
export const MictlanVaultComponent = {
	onPlace: ({ block, dimension }) => {
		const entity = dimension.spawnEntity("to:dummy", {
			...block.location,
			x: block.location.x + 0.5,
			z: block.location.z + 0.5,
		});
	},
	onPlayerBreak: ({ block, dimension }) => {
		const dummy = dimension
			.getEntities({
				location: block.location,
				type: "to:dummy",
				maxDistance: 1,
			})[0]
			?.remove();
	},
	onTick({ block, dimension }) {
		const players = dimension.getEntities({
			location: block.location,
			type: "minecraft:player",
			maxDistance: DETECT_RADIUS,
		});
		const dummy = dimension.getEntities({
			location: block.location,
			type: "to:dummy",
			maxDistance: 1,
		})[0];

		const vaultState = block.permutation.getState("to:state");

		if (vaultState === "active" && players.length === 0) {
			block.setPermutation(block.permutation.withState("to:state", "idle"));
			dimension.playSound("vault.deactivate", block.location);
			return;
		}
		if (players.length === 0) return;

		const raw = dummy?.getDynamicProperty("to:looted_by");
		const looted = raw ? JSON.parse(raw) : [];

		const lootedBy = players.some((p) => !looted.includes(p.nameTag));
		if (lootedBy && vaultState === "idle") {
			block.setPermutation(block.permutation.withState("to:state", "active"));
			dimension.playSound("vault.activate", block.location);
			return;
		}
	},
	onPlayerInteract: ({ player, block, dimension }) => {
		const dummy = dimension.getEntities({
			location: block.location,
			type: "to:dummy",
			maxDistance: 1,
		})[0];
		if (!dummy) return;

		const raw = dummy.getDynamicProperty("to:looted_by");
		const looted = raw ? JSON.parse(raw) : [];

		if (looted.includes(player.nameTag)) return;

		const inventory = player.getComponent("inventory").container;
		const item = inventory.getItem(player.selectedSlotIndex);

		const requiredKey = VAULT_KEYS[block.typeId];
		if (!requiredKey) return;

		if (item?.typeId !== requiredKey) return;

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
			y: block.location.y + 1.2,
			z: block.center().z,
		};

		const totalRolls = Math.floor(Math.random() * 4) + 2;
		const lootTable = block.typeId.includes("ominous") ? OMINOUS_LOOT_TABLE : LOOT_TABLE;
		let rolls = 0;

		const interval = system.runInterval(() => {
			if (rolls >= totalRolls) {
				system.clearRun(interval);
				looted.push(player.nameTag);
				dummy.setDynamicProperty("to:looted_by", JSON.stringify(looted));
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
};
