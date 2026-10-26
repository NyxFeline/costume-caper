import Phaser from 'phaser';
import Player from '../entities/Player.js';
import HUD from '../ui/HUD.js';
import { COSTUMES } from '../systems/CostumeSystem.js';

// Rương Kenney: 89 đóng -> 90 hé nắp -> 91 mở hẳn
const CHEST_CLOSED = 89;
const CHEST_HALF = 90;
const CHEST_OPEN = 91;

// Đọc custom property của object Tiled (hỗ trợ cả dạng mảng lẫn dạng object)
function prop(obj, name) {
    const p = obj.properties;
    if (Array.isArray(p)) return p.find((q) => q.name === name)?.value;
    return p?.[name];
}

// Tile object trong Tiled có y là mép DƯỚI -> đổi sang tâm
function tileCenter(obj) {
    return { x: obj.x + obj.width / 2, y: obj.y - obj.height / 2 };
}

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1b1426');

        // Trạng thái màn chơi
        this.hasMask = false;
        this.won = false;
        this.unlocked = new Set();
        this.enemies = [];
        this.chests = [];

        // ---------- Tilemap ----------
        const map = this.make.tilemap({ key: 'mansion' });
        const tileset = map.addTilesetImage('dungeon-tiles', 'dungeon-tiles');

        map.createLayer('Floor', tileset).setDepth(-2);
        this.walls = map.createLayer('Walls', tileset).setDepth(-1);
        this.walls.setCollisionByExclusion([-1]); // mọi ô có tile trong Walls đều chặn

        // ---------- HUD ----------
        this.hud = new HUD(this);

        // ---------- Đọc layer Objects ----------
        map.getObjectLayer('Objects').objects.forEach((o) => {
            switch (prop(o, 'kind')) {
                case 'chest': this.createChest(o); break;
                case 'door': this.createDoor(o); break;
                case 'enemy': this.createEnemy(o); break;
                case 'mask': this.createMask(o); break;
                case 'exit': this.createExit(o); break;
                default: break; // playerStart, waypoint: xử lý ở chỗ khác
            }
        });

        // ---------- Người chơi ----------
        const start = map.findObject('Objects', (o) => o.name === 'player_start');
        this.player = new Player(this, start.x, start.y);

        // ---------- Va chạm và tương tác ----------
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.magicDoor);

        // Chạm vào rương -> rương mở
        this.physics.add.collider(this.player, this.chests, (player, chest) => {
            if (!chest.collected) this.openChest(chest);
        });

        // Nhặt mặt nạ
        this.physics.add.overlap(this.player, this.maskZone, () => {
            if (this.hasMask) return;
            this.hasMask = true;
            this.maskSprite.destroy();
            this.toast('Da lay mat na! Chay ra loi thoat!');
        });

        // Lối thoát: chặn nếu chưa có mặt nạ, thắng nếu đã có
        this.physics.add.collider(this.player, this.exitZone, null, () => !this.hasMask);
        this.physics.add.overlap(this.player, this.exitZone, () => {
            if (!this.hasMask || this.won) return;
            this.won = true;
            this.toast('THANG! (man hinh ket thuc se lam sau)');
        });

        // ---------- Thế giới và camera ----------
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true);

        // ---------- DEBUG tạm thời: xoá ở bước 5D ----------
        this.input.keyboard.on('keydown-O', () => {
            this.magicDoor.disableBody(true, true);
            this.toast('[DEBUG] Da mo cua phep');
        });
    }

    update(time, delta) {
        if (this.won) {
            this.player.setVelocity(0, 0);
            return;
        }
        this.player.update(time, delta);
    }

    // ======================= Tạo vật thể từ layer Objects =======================

    createChest(o) {
        const c = tileCenter(o);
        // Bỏ qua gid trong Tiled: rương luôn bắt đầu ở trạng thái đóng
        const chest = this.physics.add
            .staticSprite(c.x, c.y, 'dungeon-sheet', CHEST_CLOSED)
            .setDepth(c.y);
        chest.costume = prop(o, 'costume');
        this.chests.push(chest);
    }

    createDoor(o) {
        const c = tileCenter(o);
        this.magicDoor = this.physics.add
            .staticSprite(c.x, c.y, 'dungeon-sheet', o.gid - 1)
            .setDepth(c.y);
        this.magicDoor.requires = prop(o, 'requires');
    }

    createEnemy(o) {
        const c = tileCenter(o);
        const sprite = this.add.sprite(c.x, c.y, 'dungeon-sheet', o.gid - 1).setDepth(c.y);
        sprite.enemyType = prop(o, 'enemyType');
        sprite.route = prop(o, 'route');
        this.enemies.push(sprite);
    }

    createMask(o) {
        // Điểm (point) trong Tiled đã là toạ độ tâm, không cần đổi
        this.maskSprite = this.add.circle(o.x, o.y, 5, 0xff4fd8).setStrokeStyle(1, 0xffffff).setDepth(o.y);
        this.maskZone = this.add.zone(o.x, o.y, 16, 16);
        this.physics.add.existing(this.maskZone, true);
    }

    createExit(o) {
        // Hình chữ nhật trong Tiled có (x, y) là góc trên trái -> đổi sang tâm
        this.exitZone = this.add.zone(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height);
        this.physics.add.existing(this.exitZone, true);
    }

    // ======================= Rương và túi trang bị =======================

    openChest(chest) {
        chest.collected = true;
        chest.setFrame(CHEST_HALF);
        this.time.delayedCall(120, () => chest.setFrame(CHEST_OPEN));

        this.unlocked.add(chest.costume);
        this.toast(`Nhan trang phuc: ${COSTUMES[chest.costume].label}`);
        this.flyToInventory(chest);
    }

    flyToInventory(chest) {
        const cam = this.cameras.main;
        const name = chest.costume;

        const icon = this.add
            .image(chest.x, chest.y - 4, 'dungeon-sheet', COSTUMES[name].icon)
            .setDepth(1050);

        // Giai đoạn 1: nhảy lên khỏi rương (toạ độ thế giới)
        this.tweens.add({
            targets: icon,
            y: chest.y - 20,
            duration: 350,
            ease: 'Back.Out',
            onComplete: () => {
                this.time.delayedCall(250, () => {
                    // Giai đoạn 2: đổi sang toạ độ màn hình rồi bay vào ô túi đồ
                    icon.setScrollFactor(0).setPosition(icon.x - cam.scrollX, icon.y - cam.scrollY);
                    const target = this.hud.slotPosition(name);

                    this.tweens.add({
                        targets: icon,
                        x: target.x,
                        y: target.y,
                        duration: 450,
                        ease: 'Cubic.In',
                        onComplete: () => {
                            icon.destroy();
                            this.hud.unlock(name);
                        },
                    });
                });
            },
        });
    }

    toast(message) {
        if (this.toastText) this.toastText.destroy();
        this.toastText = this.add
            .text(160, 20, message, {
                fontFamily: 'monospace',
                fontSize: '8px',
                color: '#ffffff',
                backgroundColor: '#000000aa',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1100);

        this.time.delayedCall(2000, () => this.toastText?.destroy());
    }
}