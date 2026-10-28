import Phaser from 'phaser';

export const COSTUME_ORDER = ['ghost', 'skeleton', 'witch'];

export const COSTUMES = {
    ghost: {
        label: 'Ghost', icon: 121, key: '1',
        hint: 'Ghost fools ghosts',
        look: { sprite: 121, tint: 0x9fe8ff, alpha: 0.8, bob: 2 },
    },
    skeleton: {
        label: 'Skeleton', icon: 97, key: '2',
        hint: 'Skeleton fools guards',
        look: { sprite: 97, tint: 0xd8ffd8, alpha: 1, bob: 0 },
    },
    witch: {
        label: 'Witch', icon: 84, key: '3',
        hint: 'Witch opens magic doors',
        look: { outfit: 'outfit_robe', hair: true, hat: 'hat_wizard', tint: null, alpha: 1 },
    },
};

export const NO_COSTUME_LOOK = {
    outfit: 'outfit_tunic', hair: true, hat: null, tint: null, alpha: 1,
};

export default class CostumeSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.unlocked = new Set();
        this.current = null;
    }

    has(name) {
        return this.unlocked.has(name);
    }

    is(name) {
        return this.current === name;
    }

    unlock(name) {
        if (this.unlocked.has(name)) return false;
        this.unlocked.add(name);
        this.emit('unlocked', name);
        return true;
    }

    toggle(name) {
        if (!this.unlocked.has(name)) {
            this.emit('denied', name);
            return false;
        }
        this.current = this.current === name ? null : name;
        this.emit('changed', this.current);
        return true;
    }
}