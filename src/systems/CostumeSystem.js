// Dữ liệu trang phục dùng chung cho HUD, rương và (sau này) logic nhận diện.
// "icon" là số frame trong sprite sheet 'dungeon-sheet' (16x16).
// Hiện là hình tạm; muốn đổi icon chỉ cần sửa số ở đây.

export const COSTUME_ORDER = ['ghost', 'skeleton', 'witch'];

export const COSTUMES = {
    ghost: { label: 'Ghost', icon: 121, key: '1' },
    skeleton: { label: 'Skeleton', icon: 97, key: '2' },
    witch: { label: 'Witch', icon: 84, key: '3' },
};