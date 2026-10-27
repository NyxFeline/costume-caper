import Phaser from 'phaser';
import Sfx from '../systems/Sfx.js';

// =====================================================================
// End Game Screen: VICTORY or GAME OVER
// Matches the retro arcade Halloween aesthetic of Costume Caper.
//
// Receives data from GameScene:
//   result  : 'win' | 'lose'
//   seed    : dungeon seed (to replay the exact same layout)
//   attempt : attempt count on this seed
//   seconds : playtime in seconds
// =====================================================================

const FONT = '"Press Start 2P", monospace';
const SHADOW = { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true };

// Dungeon sheet frame constants
const FRAME_CHEST_OPEN = 90;
const FRAME_BAT = 120;
const FRAME_GHOST = 121;
const FRAME_SKULL = 124;
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
        const win = this.result === 'win';

        // Atmospheric background tint
        this.cameras.main.setBackgroundColor(win ? '#0d051a' : '#140410');
        this.cameras.main.fadeIn(350, 16, 5, 26);

        // Guard against instant accidental button press on defeat
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

    // ---------------------------------------------------------------
    // 1. Atmosphere: Twinkling stars, embers / confetti, dungeon props
    // ---------------------------------------------------------------
    createAtmosphere(width, height, win) {
        // Deep background vignette
        const bgGrad = this.add.graphics().setDepth(0);
        bgGrad.fillGradientStyle(
            win ? 0x090314 : 0x12020e,
            win ? 0x090314 : 0x12020e,
            win ? 0x180a2b : 0x220516,
            win ? 0x180a2b : 0x220516,
            1
        );
        bgGrad.fillRect(0, 0, width, height);

        // Twinkling stars in the upper sky
        for (let i = 0; i < 20; i++) {
            const star = this.add
                .rectangle(
                    Phaser.Math.Between(4, width - 4),
                    Phaser.Math.Between(4, 75),
                    1, 1, 0xffe8a3, Phaser.Math.FloatBetween(0.2, 0.7)
                )
                .setDepth(1);
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
            // Victory confetti drifting down
            for (let i = 0; i < 26; i++) {
                const piece = this.add
                    .rectangle(
                        Phaser.Math.Between(0, width),
                        Phaser.Math.Between(-height, 0),
                        2, 3,
                        Phaser.Utils.Array.GetRandom(CONFETTI_COLORS)
                    )
                    .setDepth(2);
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
            // Spooky red/purple embers rising from the bottom
            for (let i = 0; i < 16; i++) {
                const ex = Phaser.Math.Between(10, width - 10);
                const ember = this.add
                    .rectangle(ex, Phaser.Math.Between(120, height), 2, 2, 0xff3b5c, 0.7)
                    .setDepth(2);
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

            // Tombstones resting quietly in bottom corners
            const tombLeft = this.add.image(24, height - 16, 'dungeon-sheet', FRAME_TOMB_ARCH)
                .setScale(1.2)
                .setTint(0x73638c)
                .setDepth(3);
            const tombRight = this.add.image(width - 24, height - 16, 'dungeon-sheet', FRAME_TOMB_CROSS)
                .setScale(1.2)
                .setTint(0x73638c)
                .setDepth(3);
        }

        // Side torches flanking the menu for rich retro dungeon atmosphere
        const torchY = 117;
        const torchLeft = this.add.image(42, torchY, 'dungeon-sheet', FRAME_TORCH)
            .setScale(1.4)
            .setDepth(4);
        const torchRight = this.add.image(width - 42, torchY, 'dungeon-sheet', FRAME_TORCH)
            .setScale(1.4)
            .setFlipX(true)
            .setDepth(4);

        // Torch flicker animation
        this.tweens.add({
            targets: [torchLeft, torchRight],
            alpha: { from: 0.75, to: 1 },
            duration: 160,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // ---------------------------------------------------------------
    // 2. Character / Monster Artwork (Ghost & Bats from dungeon-sheet)
    //    Positioned safely at Y = 20 so it NEVER touches the text at Y = 46!
    // ---------------------------------------------------------------
    createHeaderArt(width, win) {
        const artY = 20;

        if (win) {
            // Victory: Opened Golden Treasure Chest flanked by celebratory bats
            const chest = this.add.image(width / 2, artY, 'dungeon-sheet', FRAME_CHEST_OPEN)
                .setScale(1.8)
                .setDepth(10);
            this.tweens.add({
                targets: chest,
                y: artY - 3,
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            // Golden aura glow behind chest
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

            // Flying celebratory bats
            const batL = this.add.image(width / 2 - 42, artY + 1, 'dungeon-sheet', FRAME_BAT)
                .setScale(1.3)
                .setDepth(10);
            const batR = this.add.image(width / 2 + 42, artY + 1, 'dungeon-sheet', FRAME_BAT)
                .setScale(1.3)
                .setFlipX(true)
                .setDepth(10);

            // Wing flap & bobbing motion
            this.tweens.add({
                targets: [batL, batR],
                scaleY: { from: 1.3, to: 0.85 },
                duration: 180,
                yoyo: true,
                repeat: -1,
            });
            this.tweens.add({
                targets: batL,
                y: artY - 3,
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            this.tweens.add({
                targets: batR,
                y: artY + 4,
                duration: 750,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

        } else {
            // Game Over: Specter Ghost (frame 121) flanked by two flying Bats (frame 120)
            const ghost = this.add.image(width / 2, artY, 'dungeon-sheet', FRAME_GHOST)
                .setScale(1.6)
                .setTint(0xff5277)
                .setDepth(10);

            // Ghost gentle levitation & ethereal flicker
            this.tweens.add({
                targets: ghost,
                y: artY - 3,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            this.tweens.add({
                targets: ghost,
                alpha: { from: 0.85, to: 1 },
                duration: 600,
                yoyo: true,
                repeat: -1,
            });

            // Left Bat
            const batL = this.add.image(width / 2 - 44, artY + 1, 'dungeon-sheet', FRAME_BAT)
                .setScale(1.3)
                .setDepth(10);

            // Right Bat (flipped)
            const batR = this.add.image(width / 2 + 44, artY + 1, 'dungeon-sheet', FRAME_BAT)
                .setScale(1.3)
                .setFlipX(true)
                .setDepth(10);

            // Flapping animation
            this.tweens.add({
                targets: [batL, batR],
                scaleY: { from: 1.3, to: 0.85 },
                duration: 180,
                yoyo: true,
                repeat: -1,
            });
            // Floating motion
            this.tweens.add({
                targets: batL,
                y: artY - 2,
                duration: 650,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            this.tweens.add({
                targets: batR,
                y: artY + 3,
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }

    // ---------------------------------------------------------------
    // 3. Text Header: Clear vertical positioning without overlapping
    // ---------------------------------------------------------------
    createTextHeader(width, win) {
        // Main Title (Y = 46): Clean 12px retro header, safely below art (bottom ~33)
        this.add.text(width / 2, 46, win ? 'VICTORY!' : 'YOU WERE CAUGHT!', {
            fontFamily: FONT,
            fontSize: '12px',
            color: win ? '#57f287' : '#ff4d6d',
            shadow: SHADOW,
        })
            .setOrigin(0.5)
            .setDepth(10);

        // Subtitle (Y = 59): Crisp description
        this.add.text(
            width / 2,
            59,
            win ? 'You recovered the stolen mask & escaped!' : 'The ghost snatched you into the darkness...',
            {
                fontFamily: FONT,
                fontSize: '6px',
                color: '#ffd166',
                shadow: SHADOW,
            }
        )
            .setOrigin(0.5)
            .setDepth(10);
    }

    // ---------------------------------------------------------------
    // 4. Stats Badge Card: Time & Attempt
    // ---------------------------------------------------------------
    createStatsCard(width) {
        const cardY = 72;
        const cardW = 192;
        const cardH = 13;

        // Subtle pill badge behind stats
        const badge = this.add.graphics().setDepth(8);
        badge.fillStyle(0x120722, 0.85);
        badge.fillRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 3);
        badge.lineStyle(1, 0x3d2b56, 0.8);
        badge.strokeRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 3);

        this.add.text(
            width / 2,
            cardY,
            `TIME: ${formatTime(this.seconds)}    ATTEMPT: ${this.attempt}`,
            {
                fontFamily: FONT,
                fontSize: '6px',
                color: '#c77dff',
                shadow: SHADOW,
            }
        )
            .setOrigin(0.5)
            .setDepth(10);
    }

    // ---------------------------------------------------------------
    // 5. Interactive Menu Box & English Buttons
    // ---------------------------------------------------------------
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

        // Outer dialog frame
        const box = this.add.graphics().setDepth(5);
        // Dark translucent panel
        box.fillStyle(0x110722, 0.94);
        box.fillRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        // Double border for authentic retro arcade aesthetic
        box.lineStyle(1, 0x3b2254, 1);
        box.strokeRoundedRect(width / 2 - boxW / 2 - 1, boxY - boxH / 2 - 1, boxW + 2, boxH + 2, 5);
        box.lineStyle(1, win ? 0x57f287 : 0xff4d6d, 0.9);
        box.strokeRoundedRect(width / 2 - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        // Buttons
        this.buttonTexts = this.options.map((opt, index) => {
            const btnY = this.firstY + index * spacing;
            const txt = this.add
                .text(width / 2, btnY, opt.label, {
                    fontFamily: FONT,
                    fontSize: '8.5px',
                    color: '#e2d5ff',
                    shadow: SHADOW,
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

        // Pulsing selection arrows
        const cursorStyle = { fontFamily: FONT, fontSize: '8.5px', color: '#ffea00', shadow: SHADOW };
        this.cursorLeft = this.add.text(width / 2 - 72, this.firstY, '►', cursorStyle).setOrigin(0.5).setDepth(10);
        this.cursorRight = this.add.text(width / 2 + 72, this.firstY, '◄', cursorStyle).setOrigin(0.5).setDepth(10);

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

    // ---------------------------------------------------------------
    // 6. Footer & Dungeon Seed Indicator
    // ---------------------------------------------------------------
    createFooter(width, height) {
        // Control hints
        this.add
            .text(width / 2, height - 8, 'W/S: Navigate  |  ENTER: Select  |  R: Quick Retry', {
                fontFamily: FONT,
                fontSize: '5.5px',
                color: '#9d8cd7',
                shadow: SHADOW,
            })
            .setOrigin(0.5)
            .setDepth(10);

        // Dungeon seed code in top-left
        if (this.seed !== undefined) {
            this.add
                .text(6, 6, `SEED: #${String(this.seed).slice(-6)}`, {
                    fontFamily: FONT,
                    fontSize: '5px',
                    color: '#655382',
                })
                .setDepth(10);
        }
    }

    // ---------------------------------------------------------------
    // 7. Input Controls
    // ---------------------------------------------------------------
    setupKeyControls() {
        const kb = this.input.keyboard;
        kb.on('keydown-UP', () => this.navigate(-1));
        kb.on('keydown-W', () => this.navigate(-1));
        kb.on('keydown-DOWN', () => this.navigate(1));
        kb.on('keydown-S', () => this.navigate(1));
        kb.on('keydown-ENTER', () => this.activate());
        kb.on('keydown-SPACE', () => this.activate());

        // Quick shortcuts
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
                // Replay same seed with incremented attempt
                this.scene.start('GameScene', { seed: this.seed, attempt: this.attempt + 1 });
            } else if (id === 'new') {
                // Completely new random dungeon seed
                this.scene.start('GameScene');
            } else {
                // Back to main title menu
                this.scene.start('MenuScene');
            }
        });
    }
}