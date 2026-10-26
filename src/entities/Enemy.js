import Phaser from 'phaser';

const PATROL_SPEED = 30; // chậm hơn Player (60) để người chơi kịp phản ứng

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, frame, config) {
        super(scene, x, y, 'dungeon-sheet', frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyType = config.enemyType;
        this.waypoints = config.waypoints ?? [];
        this.wpIndex = 0;
        this.state = 'PATROL';
        this.home = { x, y }; // để RETURN về sau này

        this.body.setSize(10, 10); // hitbox nhỏ hơn frame 16x16
    }

    update() {
        switch (this.state) {
            case 'PATROL':
                this.patrol();
                break;
            // CHASE, SEARCH, RETURN: thêm ở bước 2
        }
        this.setDepth(this.y);
    }

    patrol() {
        if (this.waypoints.length === 0) {
            this.setVelocity(0, 0); // Skeleton Guard không có route -> đứng yên
            return;
        }

        const target = this.waypoints[this.wpIndex];
        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

        if (dist < 2) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
            return;
        }
        this.scene.physics.moveTo(this, target.x, target.y, PATROL_SPEED);
    }
}