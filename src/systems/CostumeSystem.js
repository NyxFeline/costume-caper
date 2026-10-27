import Phaser from 'phaser';

// =====================================================================
// Dữ liệu trang phục
//   icon : frame trong sprite sheet 'dungeon-sheet' (hiện ở HUD)
//   key  : phím tắt hiển thị trên HUD
//   look : cách nhân vật HIỂN THỊ khi mặc (tách hẳn khỏi logic gameplay)
//
// Có hai kiểu look:
//   - Ghép lớp (outfit / hair / hat): nhân vật vẫn là người, chỉ đổi đồ. (Witch)
//   - Hoá thân (có `sprite`): ẩn nhân vật, hiện hẳn một sprite khác. (Ghost, Skeleton)
//       sprite : frame trong 'dungeon-sheet'
//       tint   : màu phủ (để phân biệt với kẻ địch thật)
//       alpha  : độ trong suốt
//       bob    : biên độ lơ lửng lên xuống (0 = đi bộ bình thường)
// =====================================================================

export const COSTUME_ORDER = ['ghost', 'skeleton', 'witch'];

export const COSTUMES = {
    ghost: {
        label: 'Ghost', icon: 121, key: '1',
        look: { sprite: 121, tint: 0x9fe8ff, alpha: 0.8, bob: 2 },
    },
    skeleton: {
        label: 'Skeleton', icon: 97, key: '2',
        look: { sprite: 97, tint: 0xd8ffd8, alpha: 1, bob: 0 },
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