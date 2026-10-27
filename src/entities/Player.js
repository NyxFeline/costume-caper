import Phaser from 'phaser';

const COLS = 9;
const SPEED = 60;
const SPRINT_SPEED = 92;

const STAMINA_MAX = 100;
const STAMINA_DRAIN = 45;
const STAMINA_REGEN = 22;
const STAMINA_REGEN_DELAY = 600;
const STAMINA_RECOVER_AT = 30;

const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

const ANIMS = {
    idle: { start: 0, count: 2, fps: 3 },
    walk: { start: 2, count: 4, fps: 8 },
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'body', 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setSize(10, 8);
        this.body.setOffset(7, 14);
        this.setCollideWorldBounds(true);

        this.layers = {
            outfit: scene.add.sprite(x, y, 'outfit_tunic', 0),
            hair: scene.add.sprite(x, y, 'hair_short', 0),
            hat: scene.add.sprite(x, y, 'hat_wizard', 0).setVisible(false),
        };

        this.disguise = scene.add.sprite(x, y, 'dungeon-sheet', 0).setVisible(false);
        this.shadow = scene.add.ellipse(x, y + 8, 11, 4, 0x000000, 0.35).setVisible(false);
        this.aura = scene.add.circle(x, y + 2, 9, 0x57f287, 0.14).setVisible(false);
        this.bob = 0;

        this.facing = 'down';
        this.state = 'idle';
        this.animTime = 0;

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('W,A,S,D');
        this.shiftKey = scene.input.keyboard.addKey('SHIFT');

        this.staminaMax = STAMINA_MAX;
        this.stamina = STAMINA_MAX;
        this.sprinting = false;
        this.exhausted = false;
        this.regenAt = 0;
    }

    applyLook(look) {
        const disguised = look.sprite !== undefined;

        this.setVisible(!disguised);
        this.layers.outfit.setVisible(!disguised);
        this.disguise.setVisible(disguised);
        this.shadow.setVisible(disguised);
        this.aura.setVisible(disguised);

        if (disguised) {
            this.layers.hair.setVisible(false);
            this.layers.hat.setVisible(false);
            this.disguise
                .setFrame(look.sprite)
                .setTint(look.tint ?? 0xffffff)
                .setAlpha(look.alpha);
            this.bob = look.bob ?? 0;
            return;
        }

        this.layers.outfit.setTexture(look.outfit);
        this.layers.hair.setVisible(look.hair);

        if (look.hat) {
            this.layers.hat.setTexture(look.hat).setVisible(true);
        } else {
            this.layers.hat.setVisible(false);
        }

        [this, ...Object.values(this.layers)].forEach((sprite) => {
            if (look.tint) sprite.setTint(look.tint);
            else sprite.clearTint();
            sprite.setAlpha(look.alpha);
        });
    }

    update(time, delta) {
        this.handleMovement(delta);
        this.handleAnimation(delta);
    }

    handleMovement(delta) {
        const left = this.cursors.left.isDown || this.keys.A.isDown;
        const right = this.cursors.right.isDown || this.keys.D.isDown;
        const up = this.cursors.up.isDown || this.keys.W.isDown;
        const down = this.cursors.down.isDown || this.keys.S.isDown;

        const vx = (right ? 1 : 0) - (left ? 1 : 0);
        const vy = (down ? 1 : 0) - (up ? 1 : 0);

        const moving = vx !== 0 || vy !== 0;

        this.sprinting = moving && this.shiftKey.isDown && !this.exhausted && this.stamina > 0;
        this.updateStamina(delta);

        this.setVelocity(vx, vy);
        this.body.velocity.normalize().scale(this.sprinting ? SPRINT_SPEED : SPEED);

        if (vx < 0) this.facing = 'left';
        else if (vx > 0) this.facing = 'right';
        else if (vy < 0) this.facing = 'up';
        else if (vy > 0) this.facing = 'down';

        const next = vx !== 0 || vy !== 0 ? 'walk' : 'idle';
        if (next !== this.state) {
            this.state = next;
            this.animTime = 0;
        }
    }

    updateStamina(delta) {
        const now = this.scene.time.now;
        const dt = delta / 1000;

        if (this.sprinting) {
            this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * dt);
            this.regenAt = now + STAMINA_REGEN_DELAY;
            if (this.stamina === 0) this.exhausted = true;
        } else if (now >= this.regenAt) {
            this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN * dt);
            if (this.exhausted && this.stamina >= STAMINA_RECOVER_AT) this.exhausted = false;
        }
    }

    handleAnimation(delta) {
        const anim = ANIMS[this.state];
        this.animTime += delta;

        const fps = this.sprinting ? anim.fps * 1.6 : anim.fps;
        const step = Math.floor(this.animTime / (1000 / fps)) % anim.count;
        const frame = DIR_ROW[this.facing] * COLS + anim.start + step;

        this.setFrame(frame);

        this.setDepth(this.y);

        Object.values(this.layers).forEach((layer, i) => {
            layer.setPosition(this.x, this.y);
            layer.setFrame(frame);
            layer.setDepth(this.y + 0.1 * (i + 1));
        });

        if (this.disguise.visible) {
            const now = this.scene.time.now;
            let dy = this.y + 1;

            if (this.bob > 0) {
                dy += -3 + Math.sin(now * 0.006) * this.bob;
            } else if (this.state === 'walk') {
                dy += -Math.abs(Math.sin(now * 0.02)) * 1.5;
            }

            this.disguise.setPosition(this.x, dy).setDepth(this.y + 0.2);
            this.shadow.setPosition(this.x, this.y + 8).setDepth(this.y - 0.1);
            this.aura.setPosition(this.x, this.y + 2).setDepth(this.y - 0.2);
        }
    }
}