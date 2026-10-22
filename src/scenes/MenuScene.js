import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor('#0d0a14');

        this.add.text(width / 2, 40, 'COSTUME CAPER', {
            fontFamily: 'monospace', fontSize: '20px', color: '#f29e3d',
        }).setOrigin(0.5);

        this.add.text(width / 2, 75, 'Lay lai chiec mat na bi danh cap!', {
            fontFamily: 'monospace', fontSize: '8px', color: '#c9b8e8',
        }).setOrigin(0.5);

        const play = this.add.text(width / 2, 110, '[ PLAY ]', {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        play.on('pointerover', () => play.setColor('#f29e3d'));
        play.on('pointerout', () => play.setColor('#ffffff'));
        play.on('pointerdown', () => this.startGame());

        this.add.text(width / 2, 145, 'WASD / Mui ten: di chuyen   |   ENTER: choi', {
            fontFamily: 'monospace', fontSize: '8px', color: '#8a7aa8',
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    }

    startGame() {
        this.scene.start('GameScene');
    }
}