import Phaser from 'phaser';

const SPRINT_NOISE = 1.3;

export const FOOLED_BY = {
    ghost: 'ghost',
    skeletonGuard: 'skeleton',
};

export default class DetectionSystem {
    constructor(walls, costumes) {
        this.walls = walls;
        this.costumes = costumes;
    }

    isFooled(enemyType) {
        const need = FOOLED_BY[enemyType];
        return need !== undefined && this.costumes.is(need);
    }

    canSee(enemy, player, range) {
        if (this.isFooled(enemy.enemyType)) return false;

        const a = enemy.body.center;
        const b = player.body.center;

        const noise = player.sprinting ? SPRINT_NOISE : 1;
        if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) > range * noise) return false;

        const line = new Phaser.Geom.Line(a.x, a.y, b.x, b.y);
        const blockers = this.walls.getTilesWithinShape(line, { isColliding: true });
        return blockers.length === 0;
    }
}