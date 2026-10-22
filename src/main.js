import './style.css';
import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 180,
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: true } },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
};

new Phaser.Game(config);