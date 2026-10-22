import Phaser from 'phaser';
import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1b1426');
        this.player = new Player(this, 160, 90);
    }

    update(time, delta) {
        this.player.update(time, delta);
    }
}