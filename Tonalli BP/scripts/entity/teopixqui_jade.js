import { system, EntityDamageCause } from "@minecraft/server";
import * as Lib from "../lib/index.js";

const DURATION = 20 * 5;
const INTERVAL = 5;
const DAMAGE_AMOUNT = 3;
const DAMAGE_INTERVAL = 15;
const PARTICLE_ID = "minecraft:basic_portal_particle";

const HEAL_AMOUNT = 5;
const HEAL_PARTICLE_ID = "minecraft:heart_particle";
const HEAL_ALLY_FAMILIES = ["jade", "the_constructor"];
const HEAL_RADIUS = 10;

Lib.registry.scriptEvent("tonalli:heal_allies", ({ sourceEntity: source }) => {
	const target = source?.target;

	if (!target?.isValid) return;

	const allies = source.dimension
		.getEntities({
			location: target.location,
			maxDistance: HEAL_RADIUS,
		})
		.filter((entity) =>
			HEAL_ALLY_FAMILIES.some((family) =>
				entity.matches({
					families: [family],
				}),
			),
		);

	for (const ally of allies) {
		const health = ally.getComponent("health");
		if (health.currentValue >= health.effectiveMax) continue;

		health.setCurrentValue(Math.min(health.currentValue + HEAL_AMOUNT, health.effectiveMax));

		const head = ally.getHeadLocation();

		source.dimension.spawnParticle(HEAL_PARTICLE_ID, {
			...head,
			y: head.y + 0.5,
		});
	}
});

Lib.registry.scriptEvent("tonalli:ranged_attack", ({ sourceEntity: source }) => {
	const target = source?.target;

	if (!target?.isValid) return;
	let elapsed = 0;

	const interval = system.runInterval(() => {
		if (elapsed >= DURATION || !source.isValid || !target.isValid) {
			system.clearRun(interval);
			return;
		}

		drawLine(source, target);

		if (elapsed % DAMAGE_INTERVAL === 0) {
			target.applyDamage(DAMAGE_AMOUNT, {
				cause: EntityDamageCause.magic,
				damagingEntity: source,
			});
		}

		elapsed += INTERVAL;
	}, INTERVAL);
});

function drawLine(source, target, spacing = 0.25) {
	const start = { ...source.location, y: source.location.y + 1 };

	const end = { ...target.location, y: target.location.y + 1 };

	const dx = end.x - start.x;
	const dy = end.y + 1 - (start.y + 1);
	const dz = end.z - start.z;

	const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
	const steps = Math.ceil(distance / spacing);

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;

		const location = {
			x: start.x + dx * t,
			y: start.y + dy * t,
			z: start.z + dz * t,
		};

		source.dimension.spawnParticle(PARTICLE_ID, location);
	}
}
