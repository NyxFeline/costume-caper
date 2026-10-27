import './style.css';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import EndScene from './scenes/EndScene.js';

const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 180,
    pixelArt: true,
    render: {
        pixelArt: true,
        roundPixels: true,
        antialias: false,
    },
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, EndScene],
};

new Phaser.Game(config);