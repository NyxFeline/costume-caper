import Phaser from 'phaser';

const PATROL_SPEED = 34;
const CHASE_SPEED = 50;
const DASH_SPEED = 95;

const SIGHT_RANGE = 72;
const LOSE_RANGE = 104;

const DASH_MIN = 20;
const DASH_MAX = 64;
const DASH_COOLDOWN = 3200;
const WINDUP_TIME = 320;
const DASH_TIME = 360;

const SEARCH_WAIT = 2600;
const STATE_TIMEOUT = 6000;
const ARRIVE_DIST = 3;
const CHECK_COOLDOWN = 3000;
const WOBBLE = 16;

const STATE_TINT = { CHASE: 0xff9a9a, WINDUP: 0xff4040, DASH: 0xff0000, SEARCH: 0xffe082 };

export const ACTIVE_STATES = ['CHASE', 'WINDUP', 'DASH'];

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, frame, config) {
        super(scene, x, y, 'dungeon-sheet', frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.enemyType = config.enemyType;
        this.waypoints = config.waypoints ?? [];
        this.wpIndex = 0;
        this.dir = 1;
        this.pauseUntil = 0;
        this.home = { x, y };

        this.state = 'PATROL';
        this.stateSince = 0;
        this.lastSeen = null;
        this.searchEnd = 0;
        this.wander = null;

        this.dashReadyAt = 0;
        this.windupEnd = 0;
        this.dashEnd = 0;

        this.phase = Math.random() * Math.PI * 2;

        this.leash = config.leash ?? 0;
        this.isGuard = this.enemyType === 'skeletonGuard';
        this.nextCheckAt = 0;

        this.isGhost = this.enemyType === 'ghost';
        this.phasing = this.isGhost;
        this.canDash = this.isGhost;

        this.player = null;
        this.detection = null;

        this.body.setSize(10, 10);
    }

    setTarget(player, detection) {
        this.player = player;
        this.detection = detection;
    }

    update() {
        const now = this.scene.time.now;
        const active = ACTIVE_STATES.includes(this.state);

        let sees = !!this.player
            && this.detection.canSee(this, this.player, active ? LOSE_RANGE : SIGHT_RANGE);

        if (sees && this.leash > 0) {
            const c = this.player.body.center;
            if (Phaser.Math.Distance.Between(c.x, c.y, this.home.x, this.home.y) > this.leash) {
                sees = false;
            }
        }

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

        if (this.isGuard && !ACTIVE_STATES.includes(this.state)) this.inspect(now);

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

        if (next === 'CHASE' && !ACTIVE_STATES.includes(prev)) {
            this.showMark('!', '#ff4444');
            this.scene.onEnemySpotted?.(this);
        }
    }

    inspect(now) {
        if (now < this.nextCheckAt || !this.player) return;
        if (!this.detection.isFooled(this.enemyType)) return;

        const c = this.player.body.center;
        if (Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y) > SIGHT_RANGE) return;

        this.nextCheckAt = now + CHECK_COOLDOWN;
        this.showMark('OK', '#57f287');
    }

    investigate(point) {
        this.lastSeen = { x: point.x, y: point.y };
        this.setState('SEARCH');
        this.showMark('?', '#ffd166');
    }

    patrol(now) {
        if (this.waypoints.length === 0) {
            this.setVelocity(0, 0);
            return;
        }
        if (now < this.pauseUntil) {
            this.setVelocity(0, 0);
            return;
        }
        const t = this.waypoints[this.wpIndex];
        if (this.moveToward(t.x, t.y, PATROL_SPEED, WOBBLE)) {
            this.pickNextWaypoint(now);
        }
    }

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

    startDash(now) {
        const c = this.player.body.center;
        const angle = Math.atan2(c.y - this.y, c.x - this.x);
        this.setVelocity(Math.cos(angle) * DASH_SPEED, Math.sin(angle) * DASH_SPEED);
        this.setState('DASH');
        this.dashEnd = now + DASH_TIME;
        this.scene.sfx?.dash();
    }

    dash(now) {
        if (now < this.dashEnd) return;
        this.dashReadyAt = now + DASH_COOLDOWN;
        this.setVelocity(0, 0);
        this.setState('CHASE');
    }

    search(now) {
        const t = this.lastSeen;

        if (this.searchEnd === 0) {
            if (!t || this.moveToward(t.x, t.y, CHASE_SPEED, WOBBLE)) {
                this.searchEnd = now + SEARCH_WAIT;
                this.wander = null;
            } else if (now - this.stateSince > STATE_TIMEOUT) {
                this.setState('RETURN');
            }
        } else if (now >= this.searchEnd) {
            this.setState('RETURN');
        } else if (!this.wander || this.moveToward(this.wander.x, this.wander.y, PATROL_SPEED, WOBBLE)) {
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
            this.setPosition(t.x, t.y);
            this.setState('PATROL');
        }
    }

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

    showMark(text, color) {
        const mark = this.scene.add
            .text(this.x, this.y - 14, text, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color,
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