import Phaser from 'phaser';
import Sfx from '../systems/Sfx.js';

const FONT = '"Press Start 2P", monospace';

const FRAME_CHEST_OPEN = 90;
const FRAME_BAT = 120;
const FRAME_GHOST = 121;
const FRAME_TORCH = 125;
const FRAME_TOMB_CROSS = 64;
const FRAME_TOMB_ARCH = 65;

const CONFETTI_COLORS = [0xff7518, 0xffd166, 0x57f287, 0xc77dff, 0xff4fd8];

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

export default class EndScene extends Phaser.Scene {
    constructor() {
        super('EndScene');
    }

    init(data) {
        this.result = data?.result ?? 'lose';
        this.seed = data?.seed;
        this.attempt = data?.attempt ?? 1;
        this.seconds = data?.seconds ?? 0;

        this.selectedIndex = 0;
        this.leaving = false;
        this.sfx = new Sfx();
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setRoundPixels(true);
        const win = this.result === 'win';

        this.cameras.main.setBackgroundColor(win ? '#0d051a' : '#140410');
        this.cameras.main.fadeIn(350, 16, 5, 26);

        this.inputReadyAt = this.time.now + 400;

        this.createAtmosphere(width, height, win);
        this.createHeaderArt(width, win);
        this.createTextHeader(width, win);
        this.createStatsCard(width);
        this.createMenuBox(width, win);
        this.createFooter(width, height);
        this.setupKeyControls();
        this.updateSelection();
    }

    createAtmosphere(width, height, win) {
        const bgGrad = this.add.graphics().setDepth(0);
        bgGrad.fillGradientStyle(win ? 0x090314 : 0x12020e, win ? 0x090314 : 0x12020e, win ? 0x180a2b : 0x220516, win ? 0x180a2b : 0x220516, 1);
        bgGrad.fillRect(0, 0, width, height);

        for (let i = 0; i < 20; i++) {
            const star = this.add.rectangle(Phaser.Math.Between(4, width - 4), Phaser.Math.Between(4, 75), 1, 1, 0xffe8a3, Phaser.Math.FloatBetween(0.2, 0.7)).setDepth(1);
            this.tweens.add({
                targets: star,
                alpha: { from: 0.1, to: 0.85 },
                duration: Phaser.Math.Between(900, 2400),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        if (win) {
            for (let i = 0; i < 26; i++) {
                const piece = this.add
                    .rectangle(Phaser.Math.Between(0, width), Phaser.Math.Between(-height, 0), 2, 3, Phaser.Utils.Array.GetRandom(CONFETTI_COLORS)).setDepth(2);
                this.tweens.add({
                    targets: piece,
                    y: height + 8,
                    x: piece.x + Phaser.Math.Between(-25, 25),
                    angle: Phaser.Math.Between(90, 360),
                    duration: Phaser.Math.Between(2600, 4800),
                    delay: Phaser.Math.Between(0, 2000),
                    repeat: -1,
                    onRepeat: () => {
                        piece.x = Phaser.Math.Between(0, width);
                        piece.y = -6;
                    },
                });
            }
        } else {
            for (let i = 0; i < 16; i++) {
                const ex = Phaser.Math.Between(10, width - 10);
                const ember = this.add.rectangle(ex, Phaser.Math.Between(120, height), 2, 2, 0xff3b5c, 0.7).setDepth(2);
                this.tweens.add({
                    targets: ember,
                    y: ember.y - Phaser.Math.Between(40, 85),
                    alpha: 0,
                    duration: Phaser.Math.Between(2000, 4000),
                    delay: Phaser.Math.Between(0, 1800),
                    repeat: -1,
                    onRepeat: () => {
                        ember.x = Phaser.Math.Between(10, width - 10);
                        ember.y = Phaser.Math.Between(130, height);
                        ember.alpha = 0.8;
                    },
                });
            }

            this.add.image(24, height - 16, 'dungeon-sheet', FRAME_TOMB_ARCH).setScale(1.2).setTint(0x73638c).setDepth(3);
            this.add.image(width - 24, height - 16, 'dungeon-sheet', FRAME_TOMB_CROSS).setScale(1.2).setTint(0x73638c).setDepth(3);
        }

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

    createHeaderArt(width, win) {
        const artY = 20;

        if (win) {
            const chest = this.add.image(width / 2, artY, 'dungeon-sheet', FRAME_CHEST_OPEN).setScale(1.8).setDepth(10);
            this.tweens.add({
                targets: chest,
                y: artY - 3,
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            const glow = this.add.circle(width / 2, artY, 14, 0xffd166, 0.25).setDepth(9);
            this.tweens.add({
                targets: glow,
                scale: { from: 1, to: 1.25 },
                alpha: { from: 0.15, to: 0.35 },
                duration: 900,
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
        } else {
            const ghost = this.add.image(width / 2, artY, 'dungeon-sheet', FRAME_GHOST).setScale(1.6).setTint(0xff5277).setDepth(10);

            this.tweens.add({
                targets: ghost,
                y: artY - 3,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            const batL = this.add.image(width / 2 - 44, artY + 1, 'dungeon-sheet', FRAME_BAT).setScale(1.3).setDepth(10);
            const batR = this.add.image(width / 2 + 44, artY + 1, 'dungeon-sheet', FRAME_BAT).setScale(1.3).setFlipX(true).setDepth(10);

            this.tweens.add({
                targets: [batL, batR],
                scaleY: { from: 1.3, to: 0.85 },
                duration: 180,
                yoyo: true,
                repeat: -1,
            });
        }
    }

    createTextHeader(width, win) {
        this.add.text(width / 2, 44, win ? 'VICTORY!' : 'YOU WERE CAUGHT!', {
            fontFamily: FONT,
            fontSize: '10px',
            color: win ? '#57f287' : '#ff4d6d',
        }).setOrigin(0.5).setDepth(10);

        this.add.text(
            width / 2,
            58,
            win ? 'You escaped into the night!' : 'The specters captured you...',
            {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#ffd166',
            }
        ).setOrigin(0.5).setDepth(10);
    }

    createStatsCard(width) {
        const cardY = 72;
        const cardW = 224;
        const cardH = 15;

        const badge = this.add.graphics().setDepth(8);
        badge.fillStyle(0x120722, 0.85);
        badge.fillRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 3);
        badge.lineStyle(1, 0x3d2b56, 0.8);
        badge.strokeRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 3);

        this.add.text(
            width / 2,
            cardY,
            `TIME: ${formatTime(this.seconds)}  ATTEMPT: ${this.attempt}`,
            {
                fontFamily: FONT,
                fontSize: '7.5px',
                color: '#c77dff',
            }
        ).setOrigin(0.5).setDepth(10);
    }

    createMenuBox(width, win) {
        this.options = win
            ? [
                { id: 'new', label: 'PLAY AGAIN' },
                { id: 'menu', label: 'MAIN MENU' },
            ]
            : [
                { id: 'retry', label: 'TRY AGAIN' },
                { id: 'new', label: 'NEW DUNGEON' },
                { id: 'menu', label: 'MAIN MENU' },
            ];

        const spacing = 16;
        const boxY = 117;
        const boxW = 196;
        const boxH = win ? 50 : 62;

        this.firstY = boxY - ((this.options.length - 1) * spacing) / 2;

        const box = this.add.graphics().setDepth(5);
        box.fillStyle(0x110722, 0.94);
        box.fillRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        box.lineStyle(1, 0x3b2254, 1);
        box.strokeRoundedRect(width / 2 - boxW / 2 - 1, boxY - boxH / 2 - 1, boxW + 2, boxH + 2, 5);
        box.lineStyle(1, win ? 0x57f287 : 0xff4d6d, 0.9);
        box.strokeRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        this.buttonTexts = this.options.map((opt, index) => {
            const btnY = this.firstY + index * spacing;
            const txt = this.add
                .text(width / 2, btnY, opt.label, {
                    fontFamily: FONT,
                    fontSize: '8px',
                    color: '#e2d5ff',
                })
                .setOrigin(0.5)
                .setDepth(10)
                .setInteractive({ useHandCursor: true });

            txt.on('pointerover', () => {
                if (this.leaving) return;
                this.selectedIndex = index;
                this.updateSelection();
                this.sfx.hover();
            });

            txt.on('pointerdown', () => {
                this.selectedIndex = index;
                this.activate();
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

        this.spacing = spacing;
    }

    createFooter(width, height) {
        this.add
            .text(width / 2, height - 8, 'W/S: NAVIGATE | ENTER: SELECT | R: RETRY', {
                fontFamily: FONT,
                fontSize: '7px',
                color: '#9d8cd7',
            })
            .setOrigin(0.5)
            .setDepth(10);

        if (this.seed !== undefined) {
            this.add
                .text(6, 6, `SEED:#${String(this.seed).slice(-6)}`, {
                    fontFamily: FONT,
                    fontSize: '7px',
                    color: '#655382',
                })
                .setDepth(10);
        }
    }

    setupKeyControls() {
        const kb = this.input.keyboard;
        kb.on('keydown-UP', () => this.navigate(-1));
        kb.on('keydown-W', () => this.navigate(-1));
        kb.on('keydown-DOWN', () => this.navigate(1));
        kb.on('keydown-S', () => this.navigate(1));
        kb.on('keydown-ENTER', () => this.activate());
        kb.on('keydown-SPACE', () => this.activate());

        kb.on('keydown-R', () => this.chooseById('retry'));
        kb.on('keydown-M', () => this.chooseById('menu'));
    }

    navigate(direction) {
        if (this.leaving) return;
        this.selectedIndex = (this.selectedIndex + direction + this.options.length) % this.options.length;
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

    activate() {
        this.choose(this.options[this.selectedIndex].id);
    }

    chooseById(id) {
        if (this.options.some((o) => o.id === id)) {
            this.choose(id);
        }
    }

    choose(id) {
        if (this.leaving || this.time.now < this.inputReadyAt) return;
        this.leaving = true;
        this.sfx.select();

        this.cameras.main.fade(280, 16, 5, 26);
        this.time.delayedCall(280, () => {
            if (id === 'retry') {
                this.scene.start('GameScene', { seed: this.seed, attempt: this.attempt + 1 });
            } else if (id === 'new') {
                this.scene.start('GameScene');
            } else {
                this.scene.start('MenuScene');
            }
        });
    }
}