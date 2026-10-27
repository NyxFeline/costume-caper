import Phaser from 'phaser';
import { setSoundEnabled } from '../systems/Sfx.js';

/**
 * Bộ tạo hiệu ứng âm thanh 8-bit bằng Web Audio API
 * Không cần file mp3 ngoài, hỗ trợ phong cách retro Halloween
 */
class RetroAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playHover() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
        } catch (e) { }
    }

    playSelect() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [440, 660].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                gain.gain.setValueAtTime(0.06, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.12);
            });
        } catch (e) { }
    }

    playStart() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            // Hợp âm ma mị C minor
            [261.6, 311.1, 392.0, 523.2].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                gain.gain.setValueAtTime(0.06, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.3);
            });
        } catch (e) { }
    }
}

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.audio = new RetroAudio();
        this.selectedIndex = 0;
        this.isGuideOpen = false;
    }

    create() {
        const { width, height } = this.scale;

        // Thiết lập màu nền buồng tối ma mị chuẩn Halloween
        this.cameras.main.setBackgroundColor('#0d051a');

        // Khởi tạo audio khi có tương tác đầu tiên
        this.input.once('pointerdown', () => this.audio.init());
        this.input.keyboard.once('keydown', () => this.audio.init());

        // Tạo asset pixel art trực tiếp bằng canvas texture
        this.createPixelTextures();

        // 1. Nền bầu trời ma quái Halloween
        this.createSpookyBackground(width, height);

        // 2. Các hạt đốm lửa ma / linh hồn bay bổng
        this.createSpookyEmbers(width, height);

        // 3. Đàn dơi bay lượn trên bầu trời
        this.createFlyingBats(width);

        // 4. Tiêu đề game & bí ngô phát sáng
        this.createTitleArea(width);

        // 5. Khung Menu và các nút bấm
        this.createMenuButtons(width, height);

        // 6. Hướng dẫn phím bấm ở chân màn hình
        this.createFooter(width, height);

        // 7. Lắng nghe phím điều khiển Menu
        this.setupKeyboardControls();

        // Cập nhật trạng thái hiển thị của nút được chọn
        this.updateSelection();
    }

    /**
     * Tạo texture pixel art thủ công để chuẩn nét 2D retro
     */
    createPixelTextures() {
        // Jack-o'-Lantern Bí Ngô Halloween (14x12)
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
            'S': '#38b000', // cuống xanh sáng
            'O': '#9a3412', // viền nâu cam cháy
            'o': '#ff7518', // cam bí ngô tươi sáng
            'Y': '#ffea00', // mắt và miệng vàng rực
        });

        // Dơi vỗ cánh 1 (12x8)
        const BAT_1 = [
            "X..........X",
            "XX........XX",
            ".XX..XX..XX.",
            "..XXXXXXXX..",
            "...XRRXX....",
            "...XXXXXX...",
            "....XXXX....",
            ".....XX....."
        ];
        // Dơi vỗ cánh 2 (12x8)
        const BAT_2 = [
            "............",
            "............",
            "....XXXX....",
            "...XRRXX....",
            "..XXXXXXXX..",
            ".XX.XXXX.XX.",
            "XX........XX",
            "X..........X"
        ];
        this.drawPixelGrid('bat_1', BAT_1, { 'X': '#221538', 'R': '#ff2a5f' });
        this.drawPixelGrid('bat_2', BAT_2, { 'X': '#221538', 'R': '#ff2a5f' });

        // Mặt trăng ma mị (21x19)
        const MOON_GRID = [
            ".......GGGGGGG.......",
            "....GGMMMMMMMMMGG....",
            "..GGMMMMLLLLMMMMGG..",
            ".GMMMMLLLLLLLLMMMMG.",
            ".GMMMCCLLLLLLLLMMMG.",
            "GMMMMCCCLLLLLLMMMMMG",
            "GMMMMMCCLLLLMMMMMMMG",
            "GMMMMMMMLLMMMMCCCCMG",
            "GMMMMMMMMMMMMCCCCCCG",
            "GMMMMMMMMMMMMCCCCCCG",
            "GMMCCMMMMMMMMMMCCCCG",
            "GMMCCCCMMMMMMMMMMMMG",
            "GMMCCCCMMMMMMMMMMMMG",
            "GMMMCCMMMMMMMMMMMMMG",
            ".GMMMMMMMMMMMMMMMMG.",
            ".GMMMMMMMMMMMMMMMMG.",
            "..GGMMMMMMMMMMMMGG..",
            "....GGMMMMMMMMMGG....",
            ".......GGGGGGG......."
        ];
        this.drawPixelGrid('spooky_moon', MOON_GRID, {
            'G': '#431f6e',
            'M': '#ffd166',
            'L': '#fff3b0',
            'C': '#e09f3e'
        });

        // Đốm lửa ma thuật / tàn tro
        this.drawPixelGrid('ember_orange', ["XX", "XX"], { 'X': '#ff9f1c' });
        this.drawPixelGrid('ember_green', ["XX", "XX"], { 'X': '#57f287' });

        // Bia mộ nghĩa địa (12x10)
        const TOMB_GRID = [
            "...XXXXXX...",
            "..XXXXXXXX..",
            "..XX.XX.XX..",
            "..XX....XX..",
            "..XX.XX.XX..",
            "..XX.XX.XX..",
            "..XXXXXXXX..",
            ".XXXXXXXXXX.",
            ".XXXXXXXXXX.",
            "XXXXXXXXXXXX"
        ];
        this.drawPixelGrid('tombstone', TOMB_GRID, { 'X': '#241a33' });
    }

    /**
     * Chuyển ma trận chuỗi ký tự thành Canvas texture
     */
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

    /**
     * Bầu trời đêm tím đen, trăng rằm ma quái và hàng bia mộ nghĩa địa
     */
    createSpookyBackground(width, height) {
        // Nền tối đậm làm nổi bật toàn bộ chữ và hiệu ứng
        this.add.rectangle(0, 0, width, height, 0x0d051a).setOrigin(0, 0).setDepth(0);

        // Các ngôi sao nhấp nháy trên bầu trời
        for (let i = 0; i < 24; i++) {
            const sx = Phaser.Math.Between(4, width - 4);
            const sy = Phaser.Math.Between(4, 90);
            const star = this.add.rectangle(sx, sy, 1, 1, 0xffe8a3, Phaser.Math.FloatBetween(0.3, 0.8)).setDepth(1);
            this.tweens.add({
                targets: star,
                alpha: { from: 0.1, to: 0.9 },
                duration: Phaser.Math.Between(800, 2200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // Mặt trăng ma quái ở góc phải trên
        const moon = this.add.image(270, 32, 'spooky_moon').setDepth(1);
        this.tweens.add({
            targets: moon,
            scale: { from: 1, to: 1.05 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Mặt đất nghĩa địa mấp mô
        const ground = this.add.graphics().setDepth(2);
        ground.fillStyle(0x160829, 1);
        ground.beginPath();
        ground.moveTo(0, height - 16);
        ground.lineTo(60, height - 20);
        ground.lineTo(130, height - 15);
        ground.lineTo(210, height - 22);
        ground.lineTo(width, height - 17);
        ground.lineTo(width, height);
        ground.lineTo(0, height);
        ground.closePath();
        ground.fillPath();

        // Đặt một số bia mộ nhỏ ở chân trời
        this.add.image(24, height - 22, 'tombstone').setDepth(2);
        this.add.image(95, height - 18, 'tombstone').setDepth(2).setScale(0.8);
        this.add.image(295, height - 20, 'tombstone').setDepth(2);
    }

    /**
     * Tàn tro và linh hồn xanh cam bay bổng từ mặt đất
     */
    createSpookyEmbers(width, height) {
        for (let i = 0; i < 15; i++) {
            const ex = Phaser.Math.Between(8, width - 8);
            const ey = Phaser.Math.Between(110, height - 15);
            const isGreen = i % 3 === 0;
            const ember = this.add.image(ex, ey, isGreen ? 'ember_green' : 'ember_orange')
                .setAlpha(Phaser.Math.FloatBetween(0.3, 0.85))
                .setDepth(3);

            this.tweens.add({
                targets: ember,
                y: ey - Phaser.Math.Between(40, 80),
                x: ex + Phaser.Math.Between(-15, 15),
                alpha: 0,
                duration: Phaser.Math.Between(2200, 4200),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                onRepeat: () => {
                    ember.x = Phaser.Math.Between(8, width - 8);
                    ember.y = Phaser.Math.Between(130, height - 15);
                    ember.alpha = Phaser.Math.FloatBetween(0.4, 0.9);
                }
            });
        }
    }

    /**
     * Đàn dơi bay lượn trên bầu trời đêm
     */
    createFlyingBats(width) {
        const bat1 = this.add.image(-15, 40, 'bat_1').setDepth(4);
        const bat2 = this.add.image(-45, 60, 'bat_1').setDepth(4).setScale(0.8);

        const bats = [bat1, bat2];

        // Hoạt ảnh vỗ cánh
        this.time.addEvent({
            delay: 150,
            loop: true,
            callback: () => {
                bats.forEach(b => {
                    b.setTexture(b.texture.key === 'bat_1' ? 'bat_2' : 'bat_1');
                });
            }
        });

        // Đường bay ngang qua màn hình
        this.tweens.add({
            targets: bat1,
            x: width + 20,
            y: { from: 35, to: 55 },
            duration: 6000,
            ease: 'Sine.easeInOut',
            repeat: -1,
            delay: 1000,
            onRepeat: () => {
                bat1.x = -20;
                bat1.y = Phaser.Math.Between(25, 55);
            }
        });

        this.tweens.add({
            targets: bat2,
            x: width + 20,
            y: { from: 60, to: 42 },
            duration: 7500,
            ease: 'Sine.easeInOut',
            repeat: -1,
            delay: 2500,
            onRepeat: () => {
                bat2.x = -30;
                bat2.y = Phaser.Math.Between(45, 75);
            }
        });
    }

    /**
     * Tiêu đề game: Dùng bóng đổ 1px, KHÔNG dùng viền stroke dày gây nhòe chữ
     */
    createTitleArea(width) {
        const titleY = 30;

        // Quả bí ngô bên trái
        this.leftPumpkin = this.add.image(30, titleY, 'pumpkin_icon')
            .setDepth(10)
            .setScale(1.2);

        // Quả bí ngô bên phải
        this.rightPumpkin = this.add.image(width - 30, titleY, 'pumpkin_icon')
            .setDepth(10)
            .setScale(1.2);

        // Hiệu ứng nhấp nháy ánh lửa bí ngô
        this.tweens.add({
            targets: [this.leftPumpkin, this.rightPumpkin],
            scaleX: { from: 1.2, to: 1.3 },
            scaleY: { from: 1.2, to: 1.3 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Tên game: COSTUME CAPER (Chữ to rõ nét, bóng đổ 1px kiểu arcade retro)
        this.titleText = this.add.text(width / 2, titleY, 'COSTUME CAPER', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#ff7518',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(10);

        // Tiêu đề bồng bềnh lên xuống nhẹ
        this.tweens.add({
            targets: [this.titleText, this.leftPumpkin, this.rightPumpkin],
            y: '+=2',
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Phụ đề Halloween rõ ràng, không viền đen bết dính
        this.add.text(width / 2, titleY + 16, '~ DEM HALLOWEEN BI AN ~', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#c77dff',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(10);

        // Lời dẫn truyện
        this.add.text(width / 2, titleY + 28, 'Lay lai chiec mat na bi danh cap!', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#ffd166',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(10);
    }

    /**
     * Khung chứa Menu và danh sách các nút tương tác
     */
    createMenuButtons(width, height) {
        // Hộp viền Menu 2D retro
        const boxX = width / 2;
        const boxY = 114;
        const boxW = 186;
        const boxH = 58;

        const box = this.add.graphics().setDepth(5);
        // Nền tối bán trong suốt
        box.fillStyle(0x130722, 0.9);
        box.fillRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);
        // Đường viền cam tím
        box.lineStyle(1, 0xff7518, 0.9);
        box.strokeRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 4);

        // Danh sách các tùy chọn Menu
        this.menuOptions = [
            { id: 'play', label: 'CHOI NGAY' },
            { id: 'guide', label: 'HUONG DAN' },
            { id: 'sound', label: 'AM THANH: BAT' }
        ];

        this.buttonTexts = [];
        const startY = boxY - 17;
        const spacing = 17;

        this.menuOptions.forEach((opt, index) => {
            const btnY = startY + index * spacing;

            const txt = this.add.text(boxX, btnY, opt.label, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '9px',
                color: '#e2d5ff',
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
            }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });

            txt.on('pointerover', () => {
                if (this.isGuideOpen) return;
                this.selectedIndex = index;
                this.updateSelection();
                this.audio.playHover();
            });

            txt.on('pointerdown', () => {
                if (this.isGuideOpen) return;
                this.selectedIndex = index;
                this.activateOption();
            });

            this.buttonTexts.push(txt);
        });

        // Con trỏ chọn hai bên nút
        this.cursorLeft = this.add.text(boxX - 68, startY, '►', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#ff9f1c',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(10);

        this.cursorRight = this.add.text(boxX + 68, startY, '◄', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#ff9f1c',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(10);

        // Hoạt ảnh nhấp nhô của con trỏ
        this.tweens.add({
            targets: this.cursorLeft,
            x: '-=2',
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: this.cursorRight,
            x: '+=2',
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Dòng hướng dẫn phím ở chân trang
     */
    createFooter(width, height) {
        this.add.text(width / 2, height - 7, 'W/S: Chon  |  ENTER: Xac nhan', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '6.5px',
            color: '#9d8cd7',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setDepth(10);
    }

    /**
     * Đăng ký phím mũi tên và WASD, ENTER, SPACE
     */
    setupKeyboardControls() {
        this.input.keyboard.on('keydown-UP', () => this.navigate(-1));
        this.input.keyboard.on('keydown-W', () => this.navigate(-1));
        this.input.keyboard.on('keydown-DOWN', () => this.navigate(1));
        this.input.keyboard.on('keydown-S', () => this.navigate(1));

        this.input.keyboard.on('keydown-ENTER', () => this.activateOption());
        this.input.keyboard.on('keydown-SPACE', () => this.activateOption());

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isGuideOpen) {
                this.closeGuideModal();
            }
        });
    }

    navigate(direction) {
        if (this.isGuideOpen) return;
        this.selectedIndex = (this.selectedIndex + direction + this.menuOptions.length) % this.menuOptions.length;
        this.updateSelection();
        this.audio.playHover();
    }

    updateSelection() {
        const startY = 114 - 17;
        const spacing = 17;
        const currentY = startY + this.selectedIndex * spacing;

        this.buttonTexts.forEach((txt, idx) => {
            if (idx === this.selectedIndex) {
                txt.setColor('#ffea00');
            } else {
                txt.setColor('#e2d5ff');
            }
        });

        // Cập nhật vị trí con trỏ
        this.cursorLeft.setY(currentY);
        this.cursorRight.setY(currentY);
    }

    activateOption() {
        this.audio.init();

        if (this.isGuideOpen) {
            this.closeGuideModal();
            return;
        }

        const selected = this.menuOptions[this.selectedIndex];

        if (selected.id === 'play') {
            this.audio.playStart();
            // Hiệu ứng chớp chuyển cảnh ma mị
            this.cameras.main.fade(350, 16, 5, 26);
            this.time.delayedCall(350, () => {
                this.scene.start('GameScene');
            });
        } else if (selected.id === 'guide') {
            this.audio.playSelect();
            this.openGuideModal();
        } else if (selected.id === 'sound') {
            this.audio.enabled = !this.audio.enabled;
            setSoundEnabled(this.audio.enabled);
            selected.label = this.audio.enabled ? 'AM THANH: BAT' : 'AM THANH: TAT';
            this.buttonTexts[this.selectedIndex].setText(selected.label);
            if (this.audio.enabled) {
                this.audio.playSelect();
            }
        }
    }

    /**
     * Bảng Hướng Dẫn chơi (Modal Popup phong cách 2D Retro)
     */
    openGuideModal() {
        this.isGuideOpen = true;
        const { width, height } = this.scale;

        this.guideContainer = this.add.container(0, 0).setDepth(20);

        // Lớp phủ đen làm mờ nền
        const dimmer = this.add.rectangle(width / 2, height / 2, width, height, 0x07020f, 0.85)
            .setInteractive();

        // Khung bảng hướng dẫn
        const modalW = 236;
        const modalH = 136;
        const modal = this.add.graphics();
        modal.fillStyle(0x160a2b, 0.98);
        modal.fillRoundedRect((width - modalW) / 2, (height - modalH) / 2, modalW, modalH, 4);
        modal.lineStyle(1.5, 0xff7518, 1);
        modal.strokeRoundedRect((width - modalW) / 2, (height - modalH) / 2, modalW, modalH, 4);

        // Tiêu đề bảng
        const title = this.add.text(width / 2, 35, '[ HUONG DAN CHOI ]', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#ff9f1c',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5);

        // Nội dung phím bấm và cốt truyện
        const content = this.add.text(width / 2, 76,
            "WASD / Mui ten : Di chuyen\n\n" +
            "SPACE / ENTER  : Tuong tac\n\n" +
            "Nhiem vu: Tim lai chiec\n" +
            "Mat Na Bi Ngo bi danh cap\n" +
            "trong ham nguc ma am!", {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: '#e2d5ff',
            align: 'center',
            lineSpacing: 4,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5);

        // Nút Đóng
        const closeBtn = this.add.text(width / 2, 134, '[ DONG / ESC ]', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#57f287',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, fill: true },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffea00'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#57f287'));
        closeBtn.on('pointerdown', () => this.closeGuideModal());

        this.guideContainer.add([dimmer, modal, title, content, closeBtn]);
    }

    closeGuideModal() {
        if (!this.isGuideOpen) return;
        this.audio.playSelect();
        this.isGuideOpen = false;
        if (this.guideContainer) {
            this.guideContainer.destroy();
            this.guideContainer = null;
        }
    }
}