import { COSTUMES, COSTUME_ORDER } from '../systems/CostumeSystem.js';

const SLOT = 22;
const GAP = 4;
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

            const icon = scene.add
                .image(x, y, 'dungeon-sheet', def.icon)
                .setScrollFactor(0)
                .setDepth(DEPTH + 1)
                .setTint(0x000000)
                .setAlpha(0.35);

            scene.add.text(x - SLOT / 2 + 3, y - SLOT / 2 + 3, def.key, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#a795c7',
            }).setScrollFactor(0).setDepth(DEPTH + 2);

            this.slots[name] = { x, y, bg, icon, unlocked: false };
        });

        this.keyIcon = scene.add
            .image(12, 10, 'key_icon')
            .setScrollFactor(0)
            .setDepth(DEPTH + 1);
        this.keyText = scene.add.text(22, 6, 'x0', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#ffd166',
        }).setScrollFactor(0).setDepth(DEPTH + 1);

        this.staminaBg = scene.add
            .rectangle(6, 21, 40, 3, 0x1b1426, 0.85)
            .setOrigin(0, 0.5)
            .setStrokeStyle(1, COLOR_LOCKED)
            .setScrollFactor(0)
            .setDepth(DEPTH + 1)
            .setAlpha(0);
        this.staminaFill = scene.add
            .rectangle(6, 21, 40, 3, 0x57f287)
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(DEPTH + 2)
            .setAlpha(0);
    }

    setStamina(ratio, exhausted) {
        const visible = ratio < 0.999 ? 1 : 0;
        this.staminaBg.setAlpha(visible);
        this.staminaFill
            .setAlpha(visible)
            .setSize(Math.max(0, 40 * ratio), 3)
            .setFillStyle(exhausted ? 0xff4d6d : ratio < 0.35 ? 0xffd166 : 0x57f287);
    }

    setKeys(count) {
        this.keyText.setText(`x${count}`);
        this.scene.tweens.add({
            targets: this.keyIcon,
            scale: { from: 1.6, to: 1 },
            duration: 220,
            ease: 'Back.Out',
        });
    }

    slotPosition(name) {
        const s = this.slots[name];
        return { x: s.x, y: s.y };
    }

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

    select(name) {
        Object.entries(this.slots).forEach(([n, s]) => {
            if (n === name) s.bg.setStrokeStyle(2, COLOR_EQUIPPED);
            else if (s.unlocked) s.bg.setStrokeStyle(1, COLOR_UNLOCKED);
            else s.bg.setStrokeStyle(1, COLOR_LOCKED);
        });
    }
}