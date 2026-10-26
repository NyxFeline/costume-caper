import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js'; // [MỚI] import Enemy
import HUD from '../ui/HUD.js';
import CostumeSystem, {
    COSTUMES,
    COSTUME_ORDER,
    NO_COSTUME_LOOK,
} from '../systems/CostumeSystem.js';

// Rương Kenney: 89 đóng -> 90 hé nắp -> 91 mở hẳn
const CHEST_CLOSED = 89;
const CHEST_HALF = 90;
const CHEST_OPEN = 91;

// Tên phím cho ô 1, 2, 3 (theo thứ tự COSTUME_ORDER)
const KEY_NAMES = ['ONE', 'TWO', 'THREE'];

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
        this.enemies = [];
        this.chests = [];
        this.costumes = new CostumeSystem();

        // ---------- Tilemap ----------
        const map = this.make.tilemap({ key: 'mansion' });
        const tileset = map.addTilesetImage('dungeon-tiles', 'dungeon-tiles');

        map.createLayer('Floor', tileset).setDepth(-2);
        this.walls = map.createLayer('Walls', tileset).setDepth(-1);
        this.walls.setCollisionByExclusion([-1]); // mọi ô có tile trong Walls đều chặn

        // ---------- HUD ----------
        this.hud = new HUD(this);

        // ---------- Đọc layer Objects ----------
        // [SỬA] Lấy danh sách object ra biến, và gom waypoint thành các route TRƯỚC khi tạo enemy
        const objects = map.getObjectLayer('Objects').objects;
        this.routes = this.buildRoutes(objects);

        objects.forEach((o) => {
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
        this.player.applyLook(NO_COSTUME_LOOK);

        // ---------- Va chạm và tương tác ----------
        this.physics.add.collider(this.player, this.walls);

        // Cửa phép: chạm vào thì kiểm tra trang phục
        this.physics.add.collider(this.player, this.magicDoor, () => this.tryOpenDoor());

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

        // ---------- Hệ thống trang phục ----------
        this.setupCostumes();
    }

    update(time, delta) {
        if (this.won) {
            this.player.setVelocity(0, 0);
            this.enemies.forEach((e) => e.setVelocity(0, 0)); // [MỚI] kẻ địch cũng dừng khi thắng
            return;
        }
        this.player.update(time, delta);
        this.enemies.forEach((e) => e.update()); // [MỚI] cập nhật AI từng kẻ địch
    }

    // ======================= Hệ thống trang phục =======================

    setupCostumes() {
        // Phím 1, 2, 3 -> mặc / cởi trang phục
        COSTUME_ORDER.forEach((name, i) => {
            this.input.keyboard.on(`keydown-${KEY_NAMES[i]}`, (event) => {
                if (event.repeat || this.won) return; // bỏ qua khi giữ phím
                this.costumes.toggle(name);
            });
        });

        // Lắng nghe sự kiện từ CostumeSystem: logic không biết gì về hình ảnh,
        // chính scene này nối logic với hình ảnh và HUD.
        this.costumes.on('changed', (name) => {
            this.player.applyLook(name ? COSTUMES[name].look : NO_COSTUME_LOOK);
            this.hud.select(name);
            this.poof();
            this.toast(name ? `Dang mac: ${COSTUMES[name].label}` : 'Da thao trang phuc');
        });

        this.costumes.on('denied', () => {
            this.toast('Ban chua co trang phuc nay');
        });
    }

    // Hiệu ứng "bụp" khi đổi trang phục
    poof() {
        const p = this.player;
        const ring = this.add.circle(p.x, p.y, 6, 0xffffff, 0.8).setDepth(p.y + 1);
        this.tweens.add({
            targets: ring,
            scale: 3,
            alpha: 0,
            duration: 300,
            onComplete: () => ring.destroy(),
        });
    }

    // Cửa phép chỉ mở khi đang mặc đúng trang phục (data: door.requires = 'witch')
    tryOpenDoor() {
        const door = this.magicDoor;
        if (door.opening) return;

        if (this.costumes.is(door.requires)) {
            door.opening = true;
            door.disableBody(false, false); // hết chặn ngay, nhưng vẫn hiện để chạy hiệu ứng
            this.toast('Cua phep da mo!');
            this.tweens.add({
                targets: door,
                alpha: 0,
                duration: 500,
                onComplete: () => door.destroy(),
            });
        } else if (this.time.now > (this.doorHintAt ?? 0)) {
            this.doorHintAt = this.time.now + 1500; // tránh hiện thông báo liên tục
            this.toast('Cua bi khoa bang phep thuat...');
        }
    }

    // ======================= Tạo vật thể từ layer Objects =======================

    // [MỚI] Gom các waypoint (kind = 'waypoint') thành { ghost1: [{x,y}, ...], ghost2: [...] }
    // đã sắp xếp theo thuộc tính 'order' để kẻ địch đi đúng thứ tự.
    buildRoutes(objects) {
        const routes = {};
        objects
            .filter((o) => prop(o, 'kind') === 'waypoint')
            .forEach((o) => {
                const name = prop(o, 'route');
                (routes[name] ??= []).push({
                    x: o.x,
                    y: o.y,
                    order: Number(prop(o, 'order')),
                });
            });
        Object.values(routes).forEach((list) => list.sort((a, b) => a.order - b.order));
        return routes;
    }

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
            .setDepth(c.y)
            .setTint(0xb388ff); // ánh tím gợi ý đây là cửa phép
        this.magicDoor.requires = prop(o, 'requires');
    }

    // [SỬA] Dùng class Enemy thay cho sprite thường
    createEnemy(o) {
        const c = tileCenter(o);
        const enemy = new Enemy(this, c.x, c.y, o.gid - 1, {
            enemyType: prop(o, 'enemyType'),
            waypoints: this.routes[prop(o, 'route')], // Skeleton Guard không có route -> undefined -> đứng yên
        });
        this.enemies.push(enemy);
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

        const def = COSTUMES[chest.costume];
        this.costumes.unlock(chest.costume);
        this.toast(`Nhan ${def.label}! Bam phim ${def.key} de mac`);
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

    // ======================= Thông báo tạm (thay bằng HUD thật ở giai đoạn Polish) =======================

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