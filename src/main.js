import './style.css';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 180,
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: true } },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene],
};

new Phaser.Game(config);