import Phaser from 'phaser';

// ---------------- Tốc độ (Player chạy 60) ----------------
const PATROL_SPEED = 34;
const CHASE_SPEED = 50;    // chậm hơn Player một chút -> vẫn chạy thoát được
const DASH_SPEED = 95;     // lao tới: nhanh hơn Player, nhưng rất ngắn và có báo trước

// ---------------- Tầm nhìn ----------------
const SIGHT_RANGE = 72;    // bắt đầu phát hiện (~4.5 ô)
const LOSE_RANGE = 104;    // đã thấy rồi thì phải ra xa hơn mức này mới mất dấu

// ---------------- Lao tới (chỉ ma) ----------------
const DASH_MIN = 20;       // gần hơn mức này thì cứ đuổi thường
const DASH_MAX = 64;       // xa hơn mức này thì chưa lao
const DASH_COOLDOWN = 3200;
const WINDUP_TIME = 320;   // thời gian báo trước: đứng khựng, đỏ rực. Đây là lúc né!
const DASH_TIME = 360;

// ---------------- Khác ----------------
const SEARCH_WAIT = 2600;  // ms lục soát quanh chỗ thấy bạn lần cuối
const STATE_TIMEOUT = 6000; // an toàn: kẹt quá lâu thì bỏ qua
const ARRIVE_DIST = 3;
const WOBBLE = 16;         // độ lắc ngang khi bay, tạo cảm giác "lơ lửng"

// Màu báo trạng thái (giúp người chơi đọc được ý đồ của kẻ địch)
const STATE_TINT = { CHASE: 0xff9a9a, WINDUP: 0xff4040, DASH: 0xff0000, SEARCH: 0xffe082 };

// Các trạng thái "đang săn bạn"
export const ACTIVE_STATES = ['CHASE', 'WINDUP', 'DASH'];

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, frame, config) {
        super(scene, x, y, 'dungeon-sheet', frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyType = config.enemyType;
        this.waypoints = config.waypoints ?? [];
        this.wpIndex = 0;
        this.dir = 1;               // chiều đi trên route (đôi khi đảo ngược)
        this.pauseUntil = 0;        // dừng lại nhìn quanh khi tuần tra
        this.home = { x, y };       // chỗ đứng gốc (cho Skeleton Guard không có route)

        this.state = 'PATROL';
        this.stateSince = 0;
        this.lastSeen = null;       // nơi thấy người chơi lần cuối
        this.searchEnd = 0;         // 0 = chưa tới nơi lục soát
        this.wander = null;         // điểm lục soát hiện tại

        this.dashReadyAt = 0;
        this.windupEnd = 0;
        this.dashEnd = 0;

        this.phase = Math.random() * Math.PI * 2; // mỗi con lắc lệch pha nhau

        // Ma bay xuyên tường và biết lao tới; các loại khác thì không
        this.isGhost = this.enemyType === 'ghost';
        this.phasing = this.isGhost;
        this.canDash = this.isGhost;

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
    // State machine:
    //   PATROL -> CHASE -> (WINDUP -> DASH -> CHASE)* -> SEARCH -> RETURN -> PATROL
    // ---------------------------------------------------------------
    update() {
        const now = this.scene.time.now;
        const active = ACTIVE_STATES.includes(this.state);

        // Đang săn thì "mắt tốt" hơn để không bỏ cuộc quá dễ
        const sees = !!this.player
            && this.detection.canSee(this, this.player, active ? LOSE_RANGE : SIGHT_RANGE);

        if (sees) {
            this.lastSeen = { x: this.player.body.center.x, y: this.player.body.center.y };
            if (!active) this.setState('CHASE');
        }

        switch (this.state) {
            case 'PATROL': this.patrol(now); break;
            case 'CHASE': this.chase(sees, now); break;
            case 'WINDUP': this.windup(now); break;
            case 'DASH': this.dash(now); break;
            case 'SEARCH': this.search(now); break;
            case 'RETURN': this.returnToRoute(now); break;
            default: break;
        }

        // Ma chập chờn khi chưa săn mồi
        if (this.isGhost && !ACTIVE_STATES.includes(this.state)) {
            this.setAlpha(0.8 + 0.2 * Math.sin(now * 0.006 + this.phase));
        } else {
            this.setAlpha(1);
        }

        this.setDepth(this.y);
    }

    setState(next) {
        if (this.state === next) return;
        const prev = this.state;
        this.state = next;
        this.stateSince = this.scene.time.now;

        const tint = STATE_TINT[next];
        if (tint) this.setTint(tint);
        else this.clearTint();

        if (next === 'SEARCH') {
            this.searchEnd = 0;
            this.wander = null;
        }

        // Vừa phát hiện bạn (không tính khi chỉ đổi giữa các trạng thái săn)
        if (next === 'CHASE' && !ACTIVE_STATES.includes(prev)) {
            this.showMark('!', '#ff4444');
            this.scene.onEnemySpotted?.(this); // báo động cho kẻ địch gần đó
        }
    }

    // Được đồng bọn báo động: chạy tới chỗ có người chơi để lục soát
    investigate(point) {
        this.lastSeen = { x: point.x, y: point.y };
        this.setState('SEARCH');
        this.showMark('?', '#ffd166');
    }

    // ---------------------------------------------------------------
    // Từng trạng thái
    // ---------------------------------------------------------------
    patrol(now) {
        if (this.waypoints.length === 0) {
            this.setVelocity(0, 0); // không có route -> đứng gác tại chỗ
            return;
        }
        if (now < this.pauseUntil) {
            this.setVelocity(0, 0); // đang dừng lại nhìn quanh
            return;
        }
        const t = this.waypoints[this.wpIndex];
        if (this.moveToward(t.x, t.y, PATROL_SPEED, WOBBLE)) {
            this.pickNextWaypoint(now);
        }
    }

    // Tuần tra khó đoán: đôi khi quay đầu, nhảy cóc sang điểm khác, hoặc dừng lại
    pickNextWaypoint(now) {
        const n = this.waypoints.length;
        if (n > 1) {
            const roll = Math.random();
            if (roll < 0.2) this.dir *= -1;
            if (roll >= 0.2 && roll < 0.32) {
                this.wpIndex = Phaser.Math.Between(0, n - 1);
            } else {
                this.wpIndex = (this.wpIndex + this.dir + n) % n;
            }
        }
        if (Math.random() < 0.4) {
            this.pauseUntil = now + Phaser.Math.Between(300, 1500);
        }
    }

    chase(sees, now) {
        if (!sees) {
            // Mất dấu (bị che khuất, chạy xa, hoặc bạn vừa đổi đúng trang phục)
            this.setVelocity(0, 0);
            this.setState('SEARCH');
            return;
        }

        const c = this.player.body.center;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y);

        if (this.canDash && now >= this.dashReadyAt && dist >= DASH_MIN && dist <= DASH_MAX) {
            this.startWindup(now);
            return;
        }
        this.moveToward(c.x, c.y, CHASE_SPEED);
    }

    // Báo trước: đứng khựng lại và phình to. Người chơi có ~0.3 giây để né sang bên.
    startWindup(now) {
        this.setVelocity(0, 0);
        this.setState('WINDUP');
        this.windupEnd = now + WINDUP_TIME;
        this.showMark('!!', '#ffffff');
        this.scene.sfx?.windup();

        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: WINDUP_TIME / 2,
            yoyo: true,
        });
    }

    windup(now) {
        this.setVelocity(0, 0);
        if (now >= this.windupEnd) this.startDash(now);
    }

    // Lao thẳng về phía vị trí người chơi LÚC BẮT ĐẦU lao (không bám theo) -> né được
    startDash(now) {
        const c = this.player.body.center;
        const angle = Math.atan2(c.y - this.y, c.x - this.x);
        this.setVelocity(Math.cos(angle) * DASH_SPEED, Math.sin(angle) * DASH_SPEED);
        this.setState('DASH');
        this.dashEnd = now + DASH_TIME;
        this.scene.sfx?.dash();
    }

    dash(now) {
        if (now < this.dashEnd) return; // giữ nguyên vận tốc lao
        this.dashReadyAt = now + DASH_COOLDOWN;
        this.setVelocity(0, 0);
        this.setState('CHASE');
    }

    search(now) {
        const t = this.lastSeen;

        if (this.searchEnd === 0) {
            // Giai đoạn 1: đi tới chỗ thấy bạn lần cuối
            if (!t || this.moveToward(t.x, t.y, CHASE_SPEED, WOBBLE)) {
                this.searchEnd = now + SEARCH_WAIT;
                this.wander = null;
            } else if (now - this.stateSince > STATE_TIMEOUT) {
                this.setState('RETURN');
            }
        } else if (now >= this.searchEnd) {
            // Giai đoạn 3: lục soát xong -> về chỗ cũ
            this.setState('RETURN');
        } else if (!this.wander || this.moveToward(this.wander.x, this.wander.y, PATROL_SPEED, WOBBLE)) {
            // Giai đoạn 2: lượn lờ lục soát quanh đó
            this.wander = {
                x: t.x + Phaser.Math.Between(-28, 28),
                y: t.y + Phaser.Math.Between(-28, 28),
            };
        }
    }

    returnToRoute(now) {
        const t = this.waypoints.length > 0 ? this.waypoints[this.wpIndex] : this.home;

        if (this.moveToward(t.x, t.y, PATROL_SPEED, WOBBLE)) {
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
    // wobble > 0: lắc ngang theo hình sin để chuyển động bớt "đường thẳng".
    moveToward(x, y, speed, wobble = 0) {
        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < ARRIVE_DIST) {
            this.setVelocity(0, 0);
            return true;
        }

        const ux = dx / dist;
        const uy = dy / dist;
        let vx = ux * speed;
        let vy = uy * speed;

        if (wobble) {
            const w = Math.sin(this.scene.time.now * 0.005 + this.phase) * wobble;
            vx += -uy * w;
            vy += ux * w;
        }
        this.setVelocity(vx, vy);
        return false;
    }

    // Dấu "!" / "?" nảy lên trên đầu
    showMark(text, color) {
        const mark = this.scene.add
            .text(this.x, this.y - 14, text, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color,
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