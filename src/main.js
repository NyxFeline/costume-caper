import './style.css';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import EndScene from './scenes/EndScene.js'; // [MỚI]

const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 180,
    pixelArt: true,
    // Khung hitbox chỉ hiện khi chạy `npm run dev`, tự tắt trong bản build (`npm run build`)
    physics: { default: 'arcade', arcade: { debug: import.meta.env.DEV } },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, EndScene],
};

new Phaser.Game(config);