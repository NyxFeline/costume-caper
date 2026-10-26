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
        this.load.tilemapTiledJSON('mansion', 'assets/maps/mansion.json');

        const frame = { frameWidth: 24, frameHeight: 24 };
        this.load.spritesheet('body', 'assets/characters/body_tan.png', frame);
        this.load.spritesheet('outfit_robe', 'assets/costumes/outfits/outfit_robe.png', frame);
        this.load.spritesheet('hair_short', 'assets/costumes/hair/short/hair_short_brown.png', frame);
        this.load.spritesheet('hat_wizard', 'assets/costumes/hats/hat_wizard_hat.png', frame);
    }

    create() {
        if (document.fonts && document.fonts.load) {
            document.fonts.load('10px "Press Start 2P"').then(() => {
                this.scene.start('MenuScene');
            }).catch(() => {
                this.scene.start('MenuScene');
            });
        } else {
            this.scene.start('MenuScene');
        }
    }
}