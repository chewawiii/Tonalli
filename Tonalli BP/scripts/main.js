import { system } from "@minecraft/server";

/** @type {import("@minecraft/server").ItemCustomComponent} */
const PozoleComponent = {
	onConsume({ source }, { params }) {
		const { name, duration, amplifier } = params;
		source.addEffect(name, duration, { amplifier });
	},
};

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("to:pozole_effect", PozoleComponent);
});
