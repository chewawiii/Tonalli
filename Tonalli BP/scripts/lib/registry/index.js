import { system, world } from "@minecraft/server";

const pendingBlocks = new Map();
const pendingItems = new Map();

/** @param {import("@minecraft/server").BlockCustomComponent} handler */
export function blockComponent(id, handler) {
	pendingBlocks.set(id, handler);
}

/** @param {import("@minecraft/server").ItemCustomComponent} handler */
export function itemComponent(id, handler) {
	pendingItems.set(id, handler);
}

/** @param {(event: import("@minecraft/server").ScriptEventCommandMessageAfterEvent ) => void} callback */
export function scriptEvent(id, callback) {
	system.afterEvents.scriptEventReceive.subscribe((event) => {
		if (event.id !== id) return;
		callback(event);
	});
}

/**
 * @typedef {import("@minecraft/server").WorldBeforeEvents} WorldBeforeEvents
 * @typedef {import("@minecraft/server").WorldAfterEvents} WorldAfterEvents
 */

/**
 * @template {keyof WorldBeforeEvents} K
 * @param {K} eventName
 * @param {Parameters<WorldBeforeEvents[K]["subscribe"]>[0]} callback
 */
export function beforeEvent(eventName, callback) {
	world.beforeEvents[eventName].subscribe(callback);
}

/**
 * @template {keyof WorldAfterEvents} K
 * @param {K} eventName
 * @param {Parameters<WorldAfterEvents[K]["subscribe"]>[0]} callback
 */
export function afterEvent(eventName, callback) {
	world.afterEvents[eventName].subscribe(callback);
}

system.beforeEvents.startup.subscribe(({ itemComponentRegistry, blockComponentRegistry }) => {
	for (const [id, handler] of pendingBlocks) {
		blockComponentRegistry.registerCustomComponent(id, handler);
	}
	for (const [id, handler] of pendingItems) {
		itemComponentRegistry.registerCustomComponent(id, handler);
	}
});
