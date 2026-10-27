function permutations(list) {
    if (list.length <= 1) return [list];
    return list.flatMap((item, i) =>
        permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [item, ...rest]),
    );
}

export function assignCostumes(rng, chests, costumeNames) {
    const valid = permutations(costumeNames).filter((perm) =>
        chests.every((chest, i) => !chest.gate || chest.gate !== perm[i]),
    );
    if (valid.length === 0) return chests.map((c) => c.fallback);
    return rng.pick(valid).slice(0, chests.length);
}

export function pickKeySlots(rng, slots, count) {
    const byZone = new Map();
    slots.forEach((s) => {
        if (!byZone.has(s.zone)) byZone.set(s.zone, []);
        byZone.get(s.zone).push(s);
    });

    const zones = [...byZone.keys()];
    const isGated = (z) => byZone.get(z).some((s) => s.gated);
    const open = zones.filter((z) => !isGated(z));
    const gated = zones.filter(isGated);

    const useGated = gated.length > 0 && count - 1 <= open.length && rng.frac() < 0.5;
    const chosenZones = [
        ...rng.shuffle([...open]).slice(0, useGated ? count - 1 : count),
        ...(useGated ? [rng.pick(gated)] : []),
    ];

    const result = chosenZones.map((z) => rng.pick(byZone.get(z)));

    if (result.length < count) {
        const spare = rng.shuffle(slots.filter((s) => !s.gated && !result.includes(s)));
        result.push(...spare.slice(0, count - result.length));
    }
    return result;
}