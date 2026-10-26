import Phaser from 'phaser';
import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1b1426');

        // 1. Tạo tilemap
        const map = this.make.tilemap({ key: 'mansion' });
        const tileset = map.addTilesetImage('dungeon-tiles', 'dungeon-tiles');

        // 2. Hai layer tile
        map.createLayer('Floor', tileset);
        this.walls = map.createLayer('Walls', tileset);
        this.walls.setCollisionByExclusion([-1]);

        // 3. Người chơi tại điểm xuất phát lấy từ Tiled
        const start = map.findObject('Objects', (o) => o.name === 'player_start');
        this.player = new Player(this, start.x, start.y);

        // 4. Va chạm
        this.physics.add.collider(this.player, this.walls);

        // 5. Giới hạn thế giới và camera
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true);

        const g = this.add.graphics().setAlpha(0.6);
        this.walls.renderDebug(g, {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 120),
        });
    }

    update(time, delta) {
        this.player.update(time, delta);
    }
}