// =====================================================================
// Logic ngẫu nhiên hoá đồ trong màn chơi. KHÔNG biết gì về sprite hay Phaser:
// nhận vào một bộ random (rng) và dữ liệu thuần, trả về kết quả.
//
// rng cần có: pick(array), shuffle(array), frac()
// (Phaser.Math.RandomDataGenerator có sẵn cả ba, và dùng được seed.)
// =====================================================================

function permutations(list) {
    if (list.length <= 1) return [list];
    return list.flatMap((item, i) =>
        permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [item, ...rest]),
    );
}

// Chia trang phục vào các rương một cách ngẫu nhiên nhưng LUÔN thắng được.
//
//   chests: [{ gate, fallback }, ...]
//     gate     : trang phục cần có để TỚI ĐƯỢC rương này (vd rương sau cửa phép có gate = 'witch').
//                Trang phục đó không bao giờ được đặt chính trong rương đó,
//                nếu không người chơi sẽ bị kẹt (cần Witch để lấy Witch).
//     fallback : trang phục mặc định nếu không có cách chia hợp lệ.
//
// Trả về mảng tên trang phục, cùng thứ tự với chests.
export function assignCostumes(rng, chests, costumeNames) {
    const valid = permutations(costumeNames).filter((perm) =>
        chests.every((chest, i) => !chest.gate || chest.gate !== perm[i]),
    );
    if (valid.length === 0) return chests.map((c) => c.fallback);
    return rng.pick(valid).slice(0, chests.length);
}

// Chọn vị trí các chìa khoá, rải ra KHÁC KHU VỰC nhau.
//
//   slots: [{ x, y, zone, gated }, ...]
//     zone  : tên khu vực (south, north, annex, inner...)
//     gated : true nếu điểm này nằm sau cửa phép (cần Witch mới tới được)
//
// Quy tắc để luôn thắng được:
//   - mỗi chìa nằm ở một khu vực khác nhau (nếu đủ khu vực)
//   - tối đa 1 chìa nằm sau cửa. Còn lại luôn đủ để mở 2 rương ở ngoài cửa,
//     lấy được Witch, rồi vào trong lấy chìa cuối cùng.
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

    // Không đủ khu vực khác nhau: bù thêm từ các điểm thường còn lại
    if (result.length < count) {
        const spare = rng.shuffle(slots.filter((s) => !s.gated && !result.includes(s)));
        result.push(...spare.slice(0, count - result.length));
    }
    return result;
}