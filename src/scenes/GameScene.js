import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy, { ACTIVE_STATES } from '../entities/Enemy.js';
import HUD from '../ui/HUD.js';
import { createItemTextures } from '../ui/pixelTextures.js';
import DetectionSystem from '../systems/DetectionSystem.js';
import { assignCostumes, pickKeySlots } from '../systems/LootSystem.js';
import Sfx, { isSoundEnabled, setSoundEnabled } from '../systems/Sfx.js';
import CostumeSystem, {
    COSTUMES,
    COSTUME_ORDER,
    NO_COSTUME_LOOK,
} from '../systems/CostumeSystem.js';

const CHEST_CLOSED = 89;
const CHEST_HALF = 90;
const CHEST_OPEN = 91;

const KEY_NAMES = ['ONE', 'TWO', 'THREE'];
const ALERT_RADIUS = 150;
const GUARD_LEASH = 112;

function prop(obj, name) {
    const p = obj.properties;
    if (Array.isArray(p)) return p.find((q) => q.name === name)?.value;
    return p?.[name];
}

function tileCenter(obj) {
    return { x: obj.x + obj.width / 2, y: obj.y - obj.height / 2 };
}

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.seed = data?.seed ?? Date.now();
        this.attempt = data?.attempt ?? 1;
    }

    create() {
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setBackgroundColor('#1b1426');

        this.hasMask = false;
        this.won = false;
        this.caught = false;
        this.keyCount = 0;
        this.chestHintAt = 0;
        this.doorHintAt = 0;
        this.startedAt = this.time.now;
        this.danger = false;
        this.heartbeat = null;
        this.isPaused = false;
        this.soundOn = isSoundEnabled();
        this.enemies = [];
        this.chests = [];
        this.keySlots = [];
        this.keyPickups = [];
        this.costumes = new CostumeSystem();
        this.sfx = new Sfx();

        this.rng = new Phaser.Math.RandomDataGenerator([String(this.seed)]);

        createItemTextures(this);

        const map = this.make.tilemap({ key: 'mansion' });
        const tileset = map.addTilesetImage('dungeon-tiles', 'dungeon-tiles');

        map.createLayer('Floor', tileset).setDepth(-2);
        this.walls = map.createLayer('Walls', tileset).setDepth(-1);
        this.walls.setCollisionByExclusion([-1]);

        this.hud = new HUD(this);

        this.vignette = this.add
            .image(160, 90, 'vignette')
            .setScrollFactor(0)
            .setDepth(1090)
            .setAlpha(0);

        const objects = map.getObjectLayer('Objects').objects;
        this.routes = this.buildRoutes(objects);

        objects.forEach((o) => {
            switch (prop(o, 'kind')) {
                case 'chest': this.createChest(o); break;
                case 'door': this.createDoor(o); break;
                case 'enemy': this.createEnemy(o); break;
                case 'mask': this.createMask(o); break;
                case 'exit': this.createExit(o); break;
                case 'keySpot':
                    this.keySlots.push({
                        x: o.x,
                        y: o.y,
                        zone: prop(o, 'zone') ?? 'default',
                        gated: String(prop(o, 'gated')) === 'true',
                    });
                    break;
                default: break;
            }
        });

        this.assignLoot();
        this.spawnKeys();

        const start = map.findObject('Objects', (o) => o.name === 'player_start');
        this.player = new Player(this, start.x, start.y);
        this.player.applyLook(NO_COSTUME_LOOK);

        this.detection = new DetectionSystem(this.walls, this.costumes);
        this.enemies.forEach((e) => e.setTarget(this.player, this.detection));

        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.magicDoor, () => this.tryOpenDoor());
        this.physics.add.collider(this.player, this.chests, (player, chest) => this.tryOpenChest(chest));
        this.physics.add.overlap(this.player, this.keyPickups, (player, key) => this.collectKey(key));

        this.physics.add.overlap(
            this.player,
            this.enemies,
            (player, enemy) => this.onCaught(enemy),
            (player, enemy) => !this.detection.isFooled(enemy.enemyType),
        );

        this.physics.add.overlap(this.player, this.maskZone, () => {
            if (this.hasMask) return;
            this.hasMask = true;
            this.maskSprite.destroy();
            this.sfx.chest();
            this.toast('Mask recovered! Rush to the exit!');
        });

        this.physics.add.collider(this.player, this.exitZone, null, () => !this.hasMask);
        this.physics.add.overlap(this.player, this.exitZone, () => {
            if (!this.hasMask || this.won || this.caught) return;
            this.won = true;
            this.sfx.win();
            this.toast('VICTORY!');
            this.time.delayedCall(1300, () => this.goToEnd('win'));
        });

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player, true);

        this.setupCostumes();
        this.setupGameplayControls();
        this.toast('Find keys to unlock chests!');
    }

    update(time, delta) {
        if (this.isPaused) return;
        if (this.won || this.caught) {
            this.player.setVelocity(0, 0);
            this.enemies.forEach((e) => e.setVelocity(0, 0));
            if (this.won) this.setDanger(false);
            return;
        }
        this.player.update(time, delta);
        this.hud.setStamina(this.player.stamina / this.player.staminaMax, this.player.exhausted);
        this.enemies.forEach((e) => e.update());

        this.setDanger(this.enemies.some((e) => ACTIVE_STATES.includes(e.state)));
    }

    onEnemySpotted(source) {
        if (this.won || this.caught) return;

        this.cameras.main.shake(140, 0.004);
        this.sfx.alert();

        this.enemies.forEach((e) => {
            if (e === source) return;
            if (e.state !== 'PATROL' && e.state !== 'RETURN') return;
            if (Phaser.Math.Distance.Between(e.x, e.y, source.x, source.y) <= ALERT_RADIUS) {
                e.investigate(source.lastSeen);
            }
        });
    }

    setDanger(on) {
        if (on === this.danger) return;
        this.danger = on;

        this.tweens.add({
            targets: this.vignette,
            alpha: on ? 0.55 : 0,
            duration: on ? 200 : 900,
        });

        if (on) {
            this.heartbeat = this.time.addEvent({
                delay: 620,
                loop: true,
                callback: () => {
                    this.sfx.heartbeat();
                    this.tweens.add({
                        targets: this.vignette,
                        alpha: { from: 0.8, to: 0.55 },
                        duration: 260,
                    });
                },
            });
        } else if (this.heartbeat) {
            this.heartbeat.remove();
            this.heartbeat = null;
        }
    }

    goToEnd(result) {
        const seconds = Math.round((this.time.now - this.startedAt) / 1000);
        this.cameras.main.fade(300, 16, 5, 26);
        this.time.delayedCall(300, () => {
            this.scene.start('EndScene', {
                result,
                seed: this.seed,
                attempt: this.attempt,
                seconds,
            });
        });
    }

    onCaught() {
        if (this.caught || this.won) return;
        this.caught = true;

        if (this.heartbeat) this.heartbeat.remove();
        this.vignette.setAlpha(0.9);
        this.sfx.caught();

        this.cameras.main.shake(300, 0.012);
        this.toast('Caught by the monsters!');
        this.time.delayedCall(1100, () => this.goToEnd('lose'));
    }

    assignLoot() {
        const result = assignCostumes(
            this.rng,
            this.chests.map((c) => ({ gate: c.gate, fallback: c.costume })),
            COSTUME_ORDER,
        );
        this.chests.forEach((chest, i) => {
            chest.costume = result[i];
        });
    }

    spawnKeys() {
        pickKeySlots(this.rng, this.keySlots, this.chests.length).forEach((slot) => {
            const glow = this.add.circle(slot.x, slot.y, 7, 0xffd166, 0.25).setDepth(slot.y - 1);
            const key = this.physics.add.staticImage(slot.x, slot.y, 'key_icon').setDepth(slot.y);
            key.glow = glow;

            this.tweens.add({
                targets: glow,
                scale: { from: 0.8, to: 1.3 },
                alpha: { from: 0.35, to: 0.1 },
                duration: 700,
                yoyo: true,
                repeat: -1,
            });
            this.tweens.add({
                targets: key,
                y: slot.y - 2,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
            });

            this.keyPickups.push(key);
        });
    }

    collectKey(key) {
        if (key.collected) return;
        key.collected = true;
        this.keyCount += 1;
        this.hud.setKeys(this.keyCount);
        this.sfx.key();
        this.toast(`Key acquired! (${this.keyCount} in bag)`);

        key.glow.destroy();
        key.disableBody(true, true);
    }

    tryOpenChest(chest) {
        if (chest.collected) return;

        if (this.keyCount <= 0) {
            if (this.time.now > this.chestHintAt) {
                this.chestHintAt = this.time.now + 1500;
                this.sfx.locked();
                this.toast('Chest locked! Need a key.');
            }
            return;
        }

        this.keyCount -= 1;
        this.hud.setKeys(this.keyCount);
        this.openChest(chest);
    }

    setupCostumes() {
        COSTUME_ORDER.forEach((name, i) => {
            this.input.keyboard.on(`keydown-${KEY_NAMES[i]}`, (event) => {
                if (event.repeat || this.won || this.caught) return;
                this.costumes.toggle(name);
            });
        });

        this.costumes.on('changed', (name) => {
            this.player.applyLook(name ? COSTUMES[name].look : NO_COSTUME_LOOK);
            this.hud.select(name);
            this.poof();
            this.sfx.costume();
            this.toast(name ? `Disguised: ${COSTUMES[name].label}` : 'Disguise removed');
        });

        this.costumes.on('denied', () => {
            this.toast("Costume not unlocked yet!");
        });
    }

    setupGameplayControls() {
        this.input.keyboard.on('keydown-M', (event) => {
            if (event.repeat || this.won || this.caught) return;
            this.soundOn = !this.soundOn;
            setSoundEnabled(this.soundOn);
            this.toast(this.soundOn ? 'Sound: ON' : 'Sound: OFF');
        });

        this.input.keyboard.on('keydown-P', (event) => {
            if (event.repeat || this.won || this.caught) return;
            this.togglePause();
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.world.pause();
            this.tweens.pauseAll();
            this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(1200);
            this.pauseOverlay.add([
                this.add.rectangle(160, 90, 320, 180, 0x07020f, 0.82),
                this.add.text(160, 78, 'PAUSED', {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '12px',
                    color: '#ffea00',
                }).setOrigin(0.5),
                this.add.text(160, 103, 'PRESS P TO RESUME', {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '7px',
                    color: '#ffffff',
                }).setOrigin(0.5),
            ]);
        } else {
            this.physics.world.resume();
            this.tweens.resumeAll();
            this.pauseOverlay?.destroy();
            this.pauseOverlay = null;
        }
    }

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

    tryOpenDoor() {
        const door = this.magicDoor;
        if (door.opening) return;

        if (this.costumes.is(door.requires)) {
            door.opening = true;
            door.disableBody(false, false);
            this.sfx.door();
            this.toast('Magic door unsealed!');
            this.tweens.add({
                targets: door,
                alpha: 0,
                duration: 500,
                onComplete: () => door.destroy(),
            });
        } else if (this.time.now > this.doorHintAt) {
            this.doorHintAt = this.time.now + 1500;
            this.sfx.locked();
            this.toast('Sealed! Wear Witch robe.');
        }
    }

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
        const chest = this.physics.add
            .staticSprite(c.x, c.y, 'dungeon-sheet', CHEST_CLOSED)
            .setDepth(c.y);

        chest.costume = prop(o, 'costume');
        chest.gate = prop(o, 'gate');
        chest.lock = this.add.image(c.x, c.y - 11, 'lock_icon').setDepth(c.y + 1);

        this.chests.push(chest);
    }

    createDoor(o) {
        const c = tileCenter(o);
        this.magicDoor = this.physics.add
            .staticSprite(c.x, c.y, 'dungeon-sheet', o.gid - 1)
            .setDepth(c.y)
            .setTint(0xb388ff);
        this.magicDoor.requires = prop(o, 'requires');
    }

    createEnemy(o) {
        const c = tileCenter(o);
        const enemyType = prop(o, 'enemyType');
        const enemy = new Enemy(this, c.x, c.y, o.gid - 1, {
            enemyType,
            waypoints: this.routes[prop(o, 'route')],
            leash: Number(prop(o, 'leash')) || (enemyType === 'skeletonGuard' ? GUARD_LEASH : 0),
        });

        if (enemy.leash > 0) {
            const zone = this.add
                .circle(c.x, c.y, enemy.leash, 0xe9e6d3, 0.07)
                .setStrokeStyle(1, 0xe9e6d3, 0.3)
                .setDepth(-1.5);
            this.tweens.add({
                targets: zone,
                alpha: { from: 0.6, to: 1 },
                duration: 1200,
                yoyo: true,
                repeat: -1,
            });
        }

        if (!enemy.phasing) this.physics.add.collider(enemy, this.walls);
        this.enemies.push(enemy);
    }

    createMask(o) {
        this.maskSprite = this.add.circle(o.x, o.y, 5, 0xff4fd8).setStrokeStyle(1, 0xffffff).setDepth(o.y);
        this.maskZone = this.add.zone(o.x, o.y, 16, 16);
        this.physics.add.existing(this.maskZone, true);
    }

    createExit(o) {
        this.exitZone = this.add.zone(o.x + o.width / 2, o.y + o.height / 2, o.width, o.height);
        this.physics.add.existing(this.exitZone, true);
    }

    openChest(chest) {
        chest.collected = true;
        chest.setFrame(CHEST_HALF);
        this.time.delayedCall(120, () => chest.setFrame(CHEST_OPEN));
        this.sfx.chest();

        if (chest.lock) {
            const lock = chest.lock;
            this.tweens.add({
                targets: lock,
                y: lock.y - 8,
                alpha: 0,
                duration: 300,
                onComplete: () => lock.destroy(),
            });
        }

        const def = COSTUMES[chest.costume];
        this.costumes.unlock(chest.costume);
        this.toast(`Found ${def.label}! ${def.hint}. Key: [${def.key}]`);
        this.flyToInventory(chest);
    }

    flyToInventory(chest) {
        const cam = this.cameras.main;
        const name = chest.costume;

        const icon = this.add
            .image(chest.x, chest.y - 4, 'dungeon-sheet', COSTUMES[name].icon)
            .setDepth(1050);

        this.tweens.add({
            targets: icon,
            y: chest.y - 20,
            duration: 350,
            ease: 'Back.Out',
            onComplete: () => {
                this.time.delayedCall(250, () => {
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
            .text(160, 18, message, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff',
                backgroundColor: '#0d051ae6',
                padding: { x: 8, y: 3 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1100);

        this.time.delayedCall(2200, () => this.toastText?.destroy());
    }
}