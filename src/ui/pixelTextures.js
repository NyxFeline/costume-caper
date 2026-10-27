function drawGrid(scene, key, grid, colorMap) {
    if (scene.textures.exists(key)) return;

    const h = grid.length;
    const w = grid[0].length;
    const canvas = scene.textures.createCanvas(key, w, h);
    const ctx = canvas.getContext();

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const color = colorMap[grid[y][x]];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    canvas.refresh();
}

const KEY_GRID = [
    '.YYY........',
    'Y...Y.......',
    'Y...YYYYYYYY',
    'Y...Y..Y.Y..',
    '.YYY........',
];

const LOCK_GRID = [
    '..GGG..',
    '.G...G.',
    '.G...G.',
    'YYYYYYY',
    'YYYKYYY',
    'YYYKYYY',
    'YYYYYYY',
];

function drawVignette(scene) {
    if (scene.textures.exists('vignette')) return;

    const canvas = scene.textures.createCanvas('vignette', 320, 180);
    const ctx = canvas.getContext();
    const g = ctx.createRadialGradient(160, 90, 50, 160, 90, 200);
    g.addColorStop(0, 'rgba(140, 0, 25, 0)');
    g.addColorStop(1, 'rgba(150, 0, 25, 1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 180);
    canvas.refresh();
}

export function createItemTextures(scene) {
    drawGrid(scene, 'key_icon', KEY_GRID, { Y: '#ffd166' });
    drawGrid(scene, 'lock_icon', LOCK_GRID, { G: '#cfd8dc', Y: '#d4a017', K: '#2b1d00' });
    drawVignette(scene);
}