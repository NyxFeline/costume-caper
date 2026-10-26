import Phaser from 'phaser';

// =====================================================================
// Quy tắc nhận diện: loại kẻ địch -> trang phục khiến nó "bị lừa".
// Đây là DỮ LIỆU thuần. Muốn đổi luật chơi, chỉ cần sửa bảng này.
// (Witch không lừa ai cả: nó dành cho cửa phép.)
// =====================================================================
export const FOOLED_BY = {
    ghost: 'ghost',
    skeletonGuard: 'skeleton',
};

// =====================================================================
// Logic phát hiện: KHÔNG biết gì về sprite hay HUD.
// Chỉ trả lời hai câu hỏi:
//   - isFooled(type): kẻ địch loại này có đang bị trang phục lừa không?
//   - canSee(enemy, player, range): kẻ địch có nhìn thấy người chơi không?
// =====================================================================
export default class DetectionSystem {
    constructor(walls, costumes) {
        this.walls = walls;       // layer tường, dùng để kiểm tra bị che khuất
        this.costumes = costumes; // CostumeSystem
    }

    isFooled(enemyType) {
        const need = FOOLED_BY[enemyType];
        return need !== undefined && this.costumes.is(need);
    }

    canSee(enemy, player, range) {
        if (this.isFooled(enemy.enemyType)) return false;

        const a = enemy.body.center;
        const b = player.body.center;

        if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > range) return false;

        // Có tường chắn giữa hai bên không?
        const line = new Phaser.Geom.Line(a.x, a.y, b.x, b.y);
        const blockers = this.walls.getTilesWithinShape(line, { isColliding: true });
        return blockers.length === 0;
    }
}