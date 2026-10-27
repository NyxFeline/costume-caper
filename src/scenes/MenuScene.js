import Phaser from 'phaser';
import Sfx, { setSoundEnabled } from '../systems/Sfx.js';

const FONT = '"Press Start 2P", monospace';

const FRAME_BAT = 120;
const FRAME_TORCH = 125;
const FRAME_TOMB_CROSS = 64;
const FRAME_TOMB_ARCH = 65;

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.selectedIndex = 0;
        this.isGuideOpen = false;
        this.leaving = false;
        this.soundOn = true;
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setRoundPixels(true);

        this.sfx = new Sfx();
        this.leaving = false;
        this.isGuideOpen = false;

        this.cameras.main.setBackgroundColor('#0d051a');
        this.cameras.main.fadeIn(350, 16, 5, 26);

        this.createPixelTextures();
        this.createAtmosphere(width, height);
        this.createHeaderArt(width);
        this.createTextHeader(width);
        this.createStoryCard(width);
        this.createMenuBox(width);
        this.createFooter(width, height);
        this.setupKeyboardControls();
        this.updateSelection();
    }

    createPixelTextures() {
        const PUMPKIN_GRID = [
            ".....SS.......",
            "....SSSS......",
            "...OOOOOOOO...",
            "..OooooooooO..",
            ".OooYYooYYooO.",
            ".OoYYYYYYYYoO.",
            ".OooYYYYYYooO.",
            ".OooooooooooO.",
            ".OooYYooYYooO.",
            ".OooYYYYYYooO.",
            "..OooooooooO..",
            "...OOOOOOOO..."
        ];
        this.drawPixelGrid('pumpkin_icon', PUMPKIN_GRID, {
            'S': '#38b000',
            'O': '#9a3412',
            'o': '#ff7518',
            'Y': '#ffea00',
        });
        this.drawPixelGrid('ember_orange', ["XX", "XX"], { 'X': '#ff9f1c' });
        this.drawPixelGrid('ember_purple', ["XX", "XX"], { 'X': '#c77dff' });
    }

    drawPixelGrid(key, grid, colorMap, pixelSize = 1) {
        if (this.textures.exists(key)) return;
        const h = grid.length;
        const w = grid[0].length;
        const canvas = this.textures.createCanvas(key, w * pixelSize, h * pixelSize);
        const ctx = canvas.getContext();

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const char = grid[y][x];
                if (char && colorMap[char]) {
                    ctx.fillStyle = colorMap[char];
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        canvas.refresh();
    }

    createAtmosphere(width, height) {
        const bgGrad = this.add.graphics().setDepth(0);
        bgGrad.fillGradientStyle(0x090314, 0x090314, 0x180a2b, 0x180a2b, 1);
        bgGrad.fillRect(0, 0, width, height);

        for (let i = 0; i < 20; i++) {
            const star = this.add.rectangle(
                Phaser.Math.Between(4, width - 4),
                Phaser.Math.Between(4, 75),
                1, 1, 0xffe8a3,
                Phaser.Math.FloatBetween(0.2, 0.7)
            ).setDepth(1);

            this.tweens.add({
                targets: star,
                alpha: { from: 0.1, to: 0.85 },
                duration: Phaser.Math.Between(900, 2400),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        for (let i = 0; i < 16; i++) {
            const ex = Phaser.Math.Between(10, width - 10);
            const isPurple = i % 3 === 0;
            const ember = this.add.image(
                ex,
                Phaser.Math.Between(115, height),
                isPurple ? 'ember_purple' : 'ember_orange'
            ).setAlpha(Phaser.Math.FloatBetween(0.3, 0.8)).setDepth(2);

            this.tweens.add({
                targets: ember,
                y: ember.y - Phaser.Math.Between(40, 85),
                x: ex + Phaser.Math.Between(-15, 15),
                alpha: 0,
                duration: Phaser.Math.Between(2200, 4200),
                delay: Phaser.Math.Between(0, 2000),
                repeat: -1,
                onRepeat: () => {
                    ember.x = Phaser.Math.Between(10, width - 10);
                    ember.y = Phaser.Math.Between(125, height);
                    ember.alpha = Phaser.Math.FloatBetween(0.4, 0.9);
                },
            });
        }

        this.add.image(24, height - 16, 'dungeon-sheet', FRAME_TOMB_ARCH)
            .setScale(1.2).setTint(0x73638c).setDepth(3);
        this.add.image(width - 24, height - 16, 'dungeon-sheet', FRAME_TOMB_CROSS)
            .setScale(1.2).setTint(0x73638c).setDepth(3);

        const torchY = 117;
        const torchLeft = this.add.image(38, torchY, 'dungeon-sheet', FRAME_TORCH).setScale(1.4).setDepth(4);
        const torchRight = this.add.image(width - 38, torchY, 'dungeon-sheet', FRAME_TORCH).setScale(1.4).setFlipX(true).setDepth(4);

        this.tweens.add({
            targets: [torchLeft, torchRight],
            alpha: { from: 0.75, to: 1 },
            duration: 160,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    createHeaderArt(width) {
        const artY = 18;

        const glow = this.add.circle(width / 2, artY, 14, 0xff7518, 0.25).setDepth(9);
        this.tweens.add({
            targets: glow,
            scale: { from: 1, to: 1.25 },
            alpha: { from: 0.15, to: 0.35 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const pumpkin = this.add.image(width / 2, artY, 'pumpkin_icon').setScale(1.3).setDepth(10);
        this.tweens.add({
            targets: pumpkin,
            y: artY - 2,
            duration: 950,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const batL = this.add.image(width / 2 - 42, artY + 1, 'dungeon-sheet', FRAME_BAT).setScale(1.3).setDepth(10);
        const batR = this.add.image(width / 2 + 42, artY + 1, 'dungeon-sheet', FRAME_BAT).setScale(1.3).setFlipX(true).setDepth(10);

        this.tweens.add({
            targets: [batL, batR],
            scaleY: { from: 1.3, to: 0.85 },
            duration: 180,
            yoyo: true,
            repeat: -1,
        });
    }

    createTextHeader(width) {
        this.titleText = this.add.text(width / 2, 42, 'COSTUME CAPER', {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#ff7518',
        }).setOrigin(0.5).setDepth(10);

        this.add.text(width / 2, 56, '~ HALLOWEEN ESCAPE ~', {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#c77dff',
        }).setOrigin(0.5).setDepth(10);
    }

    createStoryCard(width) {
        const cardY = 70;
        const cardW = 224;
        const cardH = 15;

        const badge = this.add.graphics().setDepth(8);
        badge.fillStyle(0x120722, 0.9);
        badge.fillRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 3);
        badge.lineStyle(1, 0x3d2b56, 0.9);
        badge.strokeRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 3);

        this.add.text(
            width / 2,
            cardY,
            'RECOVER THE PUMPKIN MASK',
            {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#ffd166',
            }
        ).setOrigin(0.5).setDepth(10);
    }

    createMenuBox(width) {
        this.menuOptions = [
            { id: 'play', label: 'START GAME' },
            { id: 'guide', label: 'HOW TO PLAY' },
            { id: 'sound', label: 'SOUND: ON' },
        ];

        const spacing = 16;
        const boxY = 117;
        const boxW = 196;
        const boxH = 62;

        this.firstY = boxY - ((this.menuOptions.length - 1) * spacing) / 2;
        this.spacing = spacing;

        const box = this.add.graphics().setDepth(5);
        box.fillStyle(0x110722, 0.94);
        box.fillRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        box.lineStyle(1, 0x3b2254, 1);
        box.strokeRoundedRect(width / 2 - boxW / 2 - 1, boxY - boxH / 2 - 1, boxW + 2, boxH + 2, 5);
        box.lineStyle(1, 0xff7518, 0.9);
        box.strokeRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        this.buttonTexts = this.menuOptions.map((opt, index) => {
            const btnY = this.firstY + index * spacing;
            const txt = this.add.text(width / 2, btnY, opt.label, {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#e2d5ff',
            }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

            txt.on('pointerover', () => {
                if (this.leaving || this.isGuideOpen) return;
                this.selectedIndex = index;
                this.updateSelection();
                this.sfx.hover();
            });

            txt.on('pointerdown', () => {
                if (this.leaving || this.isGuideOpen) return;
                this.selectedIndex = index;
                this.activateOption();
            });

            return txt;
        });

        this.cursorLeft = this.add.triangle(width / 2 - 68, this.firstY, 4, 0, -4, -5, -4, 5, 0xffea00).setDepth(10);
        this.cursorRight = this.add.triangle(width / 2 + 68, this.firstY, -4, 0, 4, -5, 4, 5, 0xffea00).setDepth(10);

        this.tweens.add({
            targets: this.cursorLeft,
            x: '-=3',
            duration: 380,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        this.tweens.add({
            targets: this.cursorRight,
            x: '+=3',
            duration: 380,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    createFooter(width, height) {
        this.add.text(width / 2, height - 8, 'W/S: NAVIGATE | ENTER: SELECT | H: GUIDE', {
            fontFamily: FONT,
            fontSize: '7px',
            color: '#9d8cd7',
        }).setOrigin(0.5).setDepth(10);
    }

    setupKeyboardControls() {
        const kb = this.input.keyboard;
        kb.on('keydown-UP', () => this.navigate(-1));
        kb.on('keydown-W', () => this.navigate(-1));
        kb.on('keydown-DOWN', () => this.navigate(1));
        kb.on('keydown-S', () => this.navigate(1));

        kb.on('keydown-ENTER', () => this.activateOption());
        kb.on('keydown-SPACE', () => this.activateOption());

        kb.on('keydown-H', () => {
            if (this.isGuideOpen) this.closeGuideModal();
            else this.openGuideModal();
        });

        kb.on('keydown-ESC', () => {
            if (this.isGuideOpen) this.closeGuideModal();
        });
    }

    navigate(direction) {
        if (this.leaving || this.isGuideOpen) return;
        this.selectedIndex = (this.selectedIndex + direction + this.menuOptions.length) % this.menuOptions.length;
        this.updateSelection();
        this.sfx.hover();
    }

    updateSelection() {
        this.buttonTexts.forEach((txt, i) => {
            txt.setColor(i === this.selectedIndex ? '#ffea00' : '#e2d5ff');
        });
        const y = this.firstY + this.selectedIndex * this.spacing;
        this.cursorLeft.setY(y);
        this.cursorRight.setY(y);
    }

    activateOption() {
        if (this.isGuideOpen) {
            this.closeGuideModal();
            return;
        }

        const selected = this.menuOptions[this.selectedIndex];

        if (selected.id === 'play') {
            if (this.leaving) return;
            this.leaving = true;
            this.sfx.chest();
            this.cameras.main.fade(320, 16, 5, 26);
            this.time.delayedCall(320, () => {
                this.scene.start('GameScene');
            });
        } else if (selected.id === 'guide') {
            this.sfx.select();
            this.openGuideModal();
        } else if (selected.id === 'sound') {
            this.soundOn = !this.soundOn;
            setSoundEnabled(this.soundOn);
            selected.label = this.soundOn ? 'SOUND: ON' : 'SOUND: OFF';
            this.buttonTexts[this.selectedIndex].setText(selected.label);
            if (this.soundOn) this.sfx.select();
        }
    }

    openGuideModal() {
        this.isGuideOpen = true;
        const { width, height } = this.scale;

        this.guideContainer = this.add.container(0, 0).setDepth(30);

        const dimmer = this.add.rectangle(width / 2, height / 2, width, height, 0x07020f, 0.88).setInteractive();
        dimmer.on('pointerdown', () => this.closeGuideModal());

        const modalW = 276;
        const modalH = 158;
        const modalX = (width - modalW) / 2;
        const modalY = (height - modalH) / 2;

        const modal = this.add.graphics();
        modal.fillStyle(0x110722, 0.98);
        modal.fillRoundedRect(modalX, modalY, modalW, modalH, 4);

        modal.lineStyle(1, 0x3b2254, 1);
        modal.strokeRoundedRect(modalX - 1, modalY - 1, modalW + 2, modalH + 2, 5);
        modal.lineStyle(1, 0xff7518, 0.95);
        modal.strokeRoundedRect(modalX, modalY, modalW, modalH, 4);

        const title = this.add.text(width / 2, 23, '[ HOW TO PLAY ]', {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#ff9f1c',
        }).setOrigin(0.5);

        const controls = this.add.text(width / 2, 41,
            "WASD / ARROWS : MOVE\n" +
            "SHIFT (HOLD)  : SPRINT\n" +
            "KEYS 1, 2, 3  : DISGUISES", {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5, 0);

        const line = this.add.line(0, 0, width / 2 - 90, 80, width / 2 + 90, 80, 0x3b2254).setOrigin(0);

        const objective = this.add.text(width / 2, 88,
            "Sneak past monsters,\n" +
            "find keys to unlock chests,\n" +
            "and escape with the mask!", {
            fontFamily: FONT,
            fontSize: '7px',
            color: '#e2d5ff',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5, 0);

        const closeBtn = this.add.text(width / 2, 144, '[ CLOSE / ESC ]', {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#57f287',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffea00'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#57f287'));
        closeBtn.on('pointerdown', () => this.closeGuideModal());

        this.guideContainer.add([dimmer, modal, title, controls, line, objective, closeBtn]);
    }

    closeGuideModal() {
        if (!this.isGuideOpen) return;
        this.sfx.select();
        this.isGuideOpen = false;
        if (this.guideContainer) {
            this.guideContainer.destroy();
            this.guideContainer = null;
        }
    }
}