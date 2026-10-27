import Phaser from 'phaser';

const COLS = 9;       // số cột mỗi hàng trên sprite sheet
const SPEED = 60;     // pixel / giây
const SPRINT_SPEED = 92;   // giữ SHIFT để chạy nhanh (nhanh hơn ma đuổi 50, ngang cú lao 95)

// Thể lực: chạy nhanh thì tốn, đứng yên hoặc đi bộ thì hồi dần
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 45;        // mỗi giây khi chạy nhanh (~2.2 giây là hết)
const STAMINA_REGEN = 22;        // mỗi giây khi hồi
const STAMINA_REGEN_DELAY = 600; // ms chờ sau khi thôi chạy rồi mới bắt đầu hồi
const STAMINA_RECOVER_AT = 30;   // kiệt sức thì phải hồi tới mức này mới chạy nhanh lại

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

        // Hitbox nhỏ ở chân, không phải cả frame 24x24
        this.body.setSize(10, 8);
        this.body.setOffset(7, 14);
        this.setCollideWorldBounds(true);

        // Các layer trang phục, thứ tự = thứ tự vẽ (cái sau đè lên cái trước).
        // Hình dạng thật được đặt bởi applyLook() từ GameScene.
        this.layers = {
            outfit: scene.add.sprite(x, y, 'outfit_tunic', 0),
            hair: scene.add.sprite(x, y, 'hair_short', 0),
            hat: scene.add.sprite(x, y, 'hat_wizard', 0).setVisible(false),
        };

        // [MỚI] Kiểu "hoá thân" (Ghost, Skeleton): ẩn người, hiện hẳn một sprite khác
        this.disguise = scene.add.sprite(x, y, 'dungeon-sheet', 0).setVisible(false);
        this.shadow = scene.add.ellipse(x, y + 8, 11, 4, 0x000000, 0.35).setVisible(false);
        this.aura = scene.add.circle(x, y + 2, 9, 0x57f287, 0.14).setVisible(false); // đánh dấu "đây là mình"
        this.bob = 0;

        this.facing = 'down';
        this.state = 'idle';
        this.animTime = 0;

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('W,A,S,D');
        this.shiftKey = scene.input.keyboard.addKey('SHIFT');

        // Thể lực và chạy nhanh
        this.staminaMax = STAMINA_MAX;
        this.stamina = STAMINA_MAX;
        this.sprinting = false;
        this.exhausted = false;      // hết thể lực: bị khoá chạy nhanh tới khi hồi đủ
        this.regenAt = 0;
    }

    // Đổi ngoại hình theo một "look" (dữ liệu thuần, không chứa logic gameplay)
    applyLook(look) {
        const disguised = look.sprite !== undefined;

        // Hoá thân: ẩn nhân vật gốc và các lớp đồ, hiện sprite thay thế
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

        // Ghép lớp
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

        // Chạy nhanh: giữ SHIFT, đang di chuyển, còn thể lực
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

    // Trừ thể lực khi chạy nhanh, hồi lại khi nghỉ
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

        // Chạy nhanh thì chân bước nhanh hơn
        const fps = this.sprinting ? anim.fps * 1.6 : anim.fps;
        const step = Math.floor(this.animTime / (1000 / fps)) % anim.count;
        const frame = DIR_ROW[this.facing] * COLS + anim.start + step;

        this.setFrame(frame);

        // Sắp xếp theo chiều sâu: đứng thấp hơn (y lớn hơn) thì được vẽ đè lên vật phía trên
        this.setDepth(this.y);

        Object.values(this.layers).forEach((layer, i) => {
            layer.setPosition(this.x, this.y);
            layer.setFrame(frame);
            layer.setDepth(this.y + 0.1 * (i + 1));
        });

        // [MỚI] Sprite hoá thân bám theo nhân vật
        if (this.disguise.visible) {
            const now = this.scene.time.now;
            let dy = this.y + 1;

            if (this.bob > 0) {
                dy += -3 + Math.sin(now * 0.006) * this.bob;          // ma lơ lửng, nhấp nhô
            } else if (this.state === 'walk') {
                dy += -Math.abs(Math.sin(now * 0.02)) * 1.5;          // bộ xương nhảy cóc khi bước
            }

            this.disguise.setPosition(this.x, dy).setDepth(this.y + 0.2);
            this.shadow.setPosition(this.x, this.y + 8).setDepth(this.y - 0.1);
            this.aura.setPosition(this.x, this.y + 2).setDepth(this.y - 0.2);
        }
    }
}