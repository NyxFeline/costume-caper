import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        const { width, height } = this.scale;

        // Thanh tiến trình
        const barBg = this.add.rectangle(width / 2, height / 2, 160, 8, 0x2a2238);
        const bar = this.add.rectangle(width / 2 - 80, height / 2, 0, 8, 0xf29e3d).setOrigin(0, 0.5);

        this.load.on('progress', (value) => {
            bar.width = 160 * value;
        });

        // Asset
        this.load.image('dungeon-tiles', 'assets/tiles/dungeon-tiles.png');
    }

    create() {
        this.scene.start('MenuScene');
    }
}