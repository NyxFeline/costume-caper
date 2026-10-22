import Phaser from 'phaser';

const COLS = 9;                 // số cột mỗi hàng trên sprite sheet
const SPEED = 60;               // pixel / giây

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

        // Các layer trang phục, thứ tự = thứ tự vẽ (cái sau đè lên cái trước)
        this.layers = {
            outfit: scene.add.sprite(x, y, 'outfit_robe', 0),
            hair: scene.add.sprite(x, y, 'hair_short', 0),
            hat: scene.add.sprite(x, y, 'hat_wizard', 0),
        };

        this.facing = 'down';
        this.state = 'idle';
        this.animTime = 0;

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    }

    update(time, delta) {
        this.handleMovement();
        this.handleAnimation(delta);
    }

    handleMovement() {
        const left = this.cursors.left.isDown || this.keys.A.isDown;
        const right = this.cursors.right.isDown || this.keys.D.isDown;
        const up = this.cursors.up.isDown || this.keys.W.isDown;
        const down = this.cursors.down.isDown || this.keys.S.isDown;

        const vx = (right ? 1 : 0) - (left ? 1 : 0);
        const vy = (down ? 1 : 0) - (up ? 1 : 0);

        this.setVelocity(vx, vy);
        this.body.velocity.normalize().scale(SPEED);

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

    handleAnimation(delta) {
        const anim = ANIMS[this.state];
        this.animTime += delta;

        const step = Math.floor(this.animTime / (1000 / anim.fps)) % anim.count;
        const frame = DIR_ROW[this.facing] * COLS + anim.start + step;

        this.setFrame(frame);
        Object.values(this.layers).forEach((layer) => {
            layer.setPosition(this.x, this.y);
            layer.setFrame(frame);
        });
    }
}