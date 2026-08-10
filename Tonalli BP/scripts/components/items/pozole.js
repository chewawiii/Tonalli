/** @type {import("@minecraft/server").ItemCustomComponent} */
export const PozoleComponent = {
	onConsume({ source }, { params }) {
		const { name, duration, amplifier } = params;
		source.addEffect(name, duration, { amplifier });
	},
};
