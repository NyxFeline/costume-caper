import Phaser from 'phaser';

const PATROL_SPEED = 30;   // đi tuần
const CHASE_SPEED = 45;    // đuổi: nhanh hơn tuần nhưng chậm hơn Player (60) -> chạy thoát được
const SIGHT_RANGE = 56;    // khoảng cách bắt đầu phát hiện (~3.5 ô)
const LOSE_RANGE = 80;     // đã thấy rồi thì phải ra xa hơn mức này mới mất dấu
const SEARCH_WAIT = 2000;  // ms đứng tìm quanh chỗ thấy bạn lần cuối
const STATE_TIMEOUT = 6000; // an toàn: kẹt quá lâu ở SEARCH/RETURN thì bỏ qua
const ARRIVE_DIST = 2;

// Màu báo trạng thái (vừa đẹp vừa giúp bạn debug AI bằng mắt)
const STATE_TINT = { CHASE: 0xff8080, SEARCH: 0xffe082 };

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, frame, config) {
        super(scene, x, y, 'dungeon-sheet', frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyType = config.enemyType;
        this.waypoints = config.waypoints ?? [];
        this.wpIndex = 0;
        this.home = { x, y };       // chỗ đứng gốc (cho Skeleton Guard không có route)

        this.state = 'PATROL';
        this.stateSince = 0;
        this.lastSeen = null;       // nơi thấy người chơi lần cuối
        this.waitUntil = 0;         // 0 = chưa tới nơi tìm kiếm

        // Ma bay xuyên tường; các loại khác bị tường chặn (GameScene xử lý)
        this.phasing = this.enemyType === 'ghost';

        this.player = null;
        this.detection = null;

        this.body.setSize(10, 10);
    }

    // GameScene gọi sau khi Player và DetectionSystem đã được tạo
    setTarget(player, detection) {
        this.player = player;
        this.detection = detection;
    }

    // ---------------------------------------------------------------
    // State machine: PATROL -> CHASE -> SEARCH -> RETURN -> PATROL
    // ---------------------------------------------------------------
    update() {
        const now = this.scene.time.now;

        // Đang đuổi thì "mắt tốt" hơn (LOSE_RANGE) để không bỏ cuộc quá dễ
        const range = this.state === 'CHASE' ? LOSE_RANGE : SIGHT_RANGE;
        const sees = !!this.player && this.detection.canSee(this, this.player, range);

        if (sees) {
            this.lastSeen = { x: this.player.body.center.x, y: this.player.body.center.y };
            this.setState('CHASE');
        }

        switch (this.state) {
            case 'PATROL': this.patrol(); break;
            case 'CHASE': this.chase(sees); break;
            case 'SEARCH': this.search(now); break;
            case 'RETURN': this.returnToRoute(now); break;
            default: break;
        }

        this.setDepth(this.y);
    }

    setState(next) {
        if (this.state === next) return;
        this.state = next;
        this.stateSince = this.scene.time.now;

        const tint = STATE_TINT[next];
        if (tint) this.setTint(tint);
        else this.clearTint();

        if (next === 'CHASE') this.showAlert();
        if (next === 'SEARCH') this.waitUntil = 0;
    }

    // ---------------------------------------------------------------
    // Từng trạng thái
    // ---------------------------------------------------------------
    patrol() {
        if (this.waypoints.length === 0) {
            this.setVelocity(0, 0); // không có route -> đứng gác tại chỗ
            return;
        }
        const t = this.waypoints[this.wpIndex];
        if (this.moveToward(t.x, t.y, PATROL_SPEED)) {
            this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        }
    }

    chase(sees) {
        if (!sees) {
            // Mất dấu (bị che khuất, chạy xa, hoặc bạn vừa đổi đúng trang phục)
            this.setVelocity(0, 0);
            this.setState('SEARCH');
            return;
        }
        const c = this.player.body.center;
        this.scene.physics.moveTo(this, c.x, c.y, CHASE_SPEED);
    }

    search(now) {
        const t = this.lastSeen;

        if (this.waitUntil === 0) {
            // Giai đoạn 1: đi tới chỗ thấy bạn lần cuối
            if (!t || this.moveToward(t.x, t.y, CHASE_SPEED)) {
                this.waitUntil = now + SEARCH_WAIT;
                this.setVelocity(0, 0);
            } else if (now - this.stateSince > STATE_TIMEOUT) {
                this.setState('RETURN');
            }
        } else if (now >= this.waitUntil) {
            // Giai đoạn 2: đứng tìm xong -> về chỗ cũ
            this.setState('RETURN');
        }
    }

    returnToRoute(now) {
        const t = this.waypoints.length > 0 ? this.waypoints[this.wpIndex] : this.home;

        if (this.moveToward(t.x, t.y, PATROL_SPEED)) {
            this.setState('PATROL');
        } else if (now - this.stateSince > STATE_TIMEOUT) {
            this.setPosition(t.x, t.y); // kẹt quá lâu: đưa thẳng về vị trí
            this.setState('PATROL');
        }
    }

    // ---------------------------------------------------------------
    // Tiện ích
    // ---------------------------------------------------------------

    // Di chuyển về (x, y). Trả về true khi đã tới nơi.
    moveToward(x, y, speed) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, x, y);
        if (dist < ARRIVE_DIST) {
            this.setVelocity(0, 0);
            return true;
        }
        this.scene.physics.moveTo(this, x, y, speed);
        return false;
    }

    // Dấu "!" nảy lên khi phát hiện người chơi
    showAlert() {
        const mark = this.scene.add
            .text(this.x, this.y - 14, '!', {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#ff4444',
                fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setDepth(1050);

        this.scene.tweens.add({
            targets: mark,
            y: mark.y - 6,
            alpha: 0,
            duration: 600,
            onComplete: () => mark.destroy(),
        });
    }
}