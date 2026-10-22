import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Chỉ để kiểm tra asset nạp đúng, sẽ xóa sau
        this.add.image(0, 0, 'dungeon-tiles').setOrigin(0, 0);
    }
}