import Phaser from 'phaser';

// =====================================================================
// Dữ liệu trang phục
//   icon : frame trong sprite sheet 'dungeon-sheet' (hiện ở HUD)
//   key  : phím tắt hiển thị trên HUD
//   look : cách nhân vật HIỂN THỊ khi mặc (tách hẳn khỏi logic gameplay)
// =====================================================================

export const COSTUME_ORDER = ['ghost', 'skeleton', 'witch'];

export const COSTUMES = {
    ghost: {
        label: 'Ghost', icon: 121, key: '1',
        look: { outfit: 'outfit_armor', hair: false, hat: null, tint: 0xcfe8ff, alpha: 0.6 },
    },
    skeleton: {
        label: 'Skeleton', icon: 97, key: '2',
        look: { outfit: 'outfit_armor', hair: false, hat: null, tint: 0xe9e6d3, alpha: 1 },
    },
    witch: {
        label: 'Witch', icon: 84, key: '3',
        look: { outfit: 'outfit_robe', hair: true, hat: 'hat_wizard', tint: null, alpha: 1 },
    },
};

// Khi không mặc trang phục nào
export const NO_COSTUME_LOOK = {
    outfit: 'outfit_tunic', hair: true, hat: null, tint: null, alpha: 1,
};

// =====================================================================
// Logic trang phục: KHÔNG biết gì về sprite hay màn hình.
// Chỉ giữ trạng thái và phát sự kiện; phần khác của game tự lắng nghe.
//   Sự kiện: 'unlocked' (name) | 'changed' (name | null) | 'denied' (name)
// =====================================================================

export default class CostumeSystem extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.unlocked = new Set();
        this.current = null; // tên trang phục đang mặc, hoặc null
    }

    has(name) {
        return this.unlocked.has(name);
    }

    // Đang mặc đúng trang phục này không?
    is(name) {
        return this.current === name;
    }

    unlock(name) {
        if (this.unlocked.has(name)) return false;
        this.unlocked.add(name);
        this.emit('unlocked', name);
        return true;
    }

    // Bấm phím lần 1: mặc. Bấm lại cùng phím: cởi ra.
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