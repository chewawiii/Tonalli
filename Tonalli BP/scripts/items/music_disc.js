import { world, ItemStack, system } from "@minecraft/server";
import * as Lib from "../lib/index.js";

const MUSIC_DISC_TRACKS = {
	"tonalli:music_disc_huitzilopochtli": "huitzilopochtli.music",
	"tonalli:music_disc_quetzalcoatl": "quetzalcoatl.music",
	"tonalli:music_disc_tezcatlipoca": "tezcatlipoca.music",
};

const activeSounds = new Map();

Lib.registry.beforeEvent("playerInteractWithBlock", ({ player, block, itemStack }) => {
	if (block.typeId !== "minecraft:jukebox") return;

	const key = getJukeboxKey(block);
	const currentDiscTypeId = world.getDynamicProperty(key);

	if (currentDiscTypeId) {
		system.run(() => {
			block.dimension.spawnItem(new ItemStack(currentDiscTypeId, 1), {
				...block.location,
				y: block.location.y + 1,
			});

			const sound = activeSounds.get(key);
			if (sound) {
				sound.stop();
				activeSounds.delete(key);
			}
		});
		world.setDynamicProperty(key, undefined);
		return;
	}

	if (!itemStack) return;

	const track = MUSIC_DISC_TRACKS[itemStack.typeId];
	if (!track) return;

	world.setDynamicProperty(key, itemStack.typeId);
	system.run(() => {
		const inventory = player.getComponent("inventory").container;
		inventory.setItem(player.selectedSlotIndex, undefined);

		const trackName = track.replace(".music", "");
		player.onScreenDisplay.setActionBar({
			rawtext: [
				{ text: "§d" },
				{
					translate: "record.nowPlaying",
					with: [`${trackName} - The Mesoamerican Orchestra`],
				},
			],
		});

		const sound = block.dimension.playSound(track, block.location);
		activeSounds.set(key, sound);
	});
});

function getJukeboxKey(block) {
	return `tonalli:jukebox_${block.location.x}_${block.location.y}_${block.location.z}`;
}
