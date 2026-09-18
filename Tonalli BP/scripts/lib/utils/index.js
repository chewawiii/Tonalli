export function randomOffset(radius) {
	const angle = Math.random() * Math.PI * 2;
	const distance = Math.sqrt(Math.random()) * radius;
	return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
}

export function generateBlockId(id, location) {
	return `${id}_${location.x}_${location.y}_${location.z}`;
}

export function shortPlayerId(id) {
	let hash = 0x811c9dc5;

	for (let i = 0; i < id.length; i++) {
		hash ^= id.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}

	return (hash >>> 0).toString(36);
}
