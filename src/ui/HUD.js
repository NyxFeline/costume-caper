import { COSTUMES, COSTUME_ORDER } from '../systems/CostumeSystem.js';

const SLOT = 22;   // kích thước mỗi ô
const GAP = 4;     // khoảng cách giữa các ô

// Depth của HUD phải lớn hơn mọi sprite trong thế giới (depth của chúng = toạ độ y, tối đa ~450)
const DEPTH = 1000;

const COLOR_LOCKED = 0x4a3b6b;
const COLOR_UNLOCKED = 0xf29e3d;
const COLOR_EQUIPPED = 0xffffff;

export default class HUD {
    constructor(scene) {
        this.scene = scene;
        this.slots = {};

        const { width, height } = scene.scale;
        const total = COSTUME_ORDER.length * SLOT + (COSTUME_ORDER.length - 1) * GAP;
        const startX = (width - total) / 2 + SLOT / 2;
        const y = height - SLOT / 2 - 4;

        COSTUME_ORDER.forEach((name, i) => {
            const x = startX + i * (SLOT + GAP);
            const def = COSTUMES[name];

            const bg = scene.add
                .rectangle(x, y, SLOT, SLOT, 0x1b1426, 0.85)
                .setStrokeStyle(1, COLOR_LOCKED)
                .setScrollFactor(0)
                .setDepth(DEPTH);

            // Chưa mở khoá: icon bị tô đen mờ (hình bóng)
            const icon = scene.add
                .image(x, y, 'dungeon-sheet', def.icon)
                .setScrollFactor(0)
                .setDepth(DEPTH + 1)
                .setTint(0x000000)
                .setAlpha(0.35);

            scene.add
                .text(x - SLOT / 2 + 2, y - SLOT / 2 + 1, def.key, {
                    fontFamily: 'monospace',
                    fontSize: '6px',
                    color: '#8a7aa8',
                })
                .setScrollFactor(0)
                .setDepth(DEPTH + 2);

            this.slots[name] = { x, y, bg, icon, unlocked: false };
        });
    }

    // Toạ độ ô trên màn hình, để vật phẩm bay tới
    slotPosition(name) {
        const s = this.slots[name];
        return { x: s.x, y: s.y };
    }

    // Mở khoá một ô: hiện đủ màu, viền cam, nảy nhẹ
    unlock(name) {
        const s = this.slots[name];
        s.unlocked = true;
        s.icon.clearTint().setAlpha(1);
        s.bg.setStrokeStyle(1, COLOR_UNLOCKED);
        this.scene.tweens.add({
            targets: s.icon,
            scale: { from: 1.6, to: 1 },
            duration: 250,
            ease: 'Back.Out',
        });
    }

    // Đánh dấu ô đang mặc (viền trắng dày). name = null: không mặc gì.
    select(name) {
        Object.entries(this.slots).forEach(([n, s]) => {
            if (n === name) s.bg.setStrokeStyle(2, COLOR_EQUIPPED);
            else if (s.unlocked) s.bg.setStrokeStyle(1, COLOR_UNLOCKED);
            else s.bg.setStrokeStyle(1, COLOR_LOCKED);
        });
    }
}