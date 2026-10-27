// =====================================================================
// Âm thanh 8-bit tạo bằng Web Audio, không cần file mp3.
// Dùng chung MỘT AudioContext cho cả game (trình duyệt giới hạn số context,
// nên không tạo mới mỗi lần chơi lại).
// =====================================================================

let sharedCtx = null;

function getCtx() {
    if (!sharedCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        sharedCtx = new AC();
    }
    if (sharedCtx.state === 'suspended') sharedCtx.resume();
    return sharedCtx;
}

function tone({ freq, to = freq, dur = 0.15, type = 'square', vol = 0.05, delay = 0 }) {
    const ctx = getCtx();
    if (!ctx) return;
    try {
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
    } catch (e) {
        // Âm thanh lỗi thì bỏ qua, không được làm hỏng game
    }
}

export default class Sfx {
    // Kẻ địch phát hiện bạn
    alert() { tone({ freq: 760, to: 260, dur: 0.22, type: 'sawtooth', vol: 0.07 }); }
    // Ma chuẩn bị lao tới
    windup() { tone({ freq: 180, to: 700, dur: 0.3, type: 'sawtooth', vol: 0.05 }); }
    // Ma lao tới
    dash() { tone({ freq: 320, to: 70, dur: 0.28, type: 'square', vol: 0.07 }); }
    // Tim đập khi đang bị đuổi
    heartbeat() {
        tone({ freq: 75, to: 38, dur: 0.12, type: 'sine', vol: 0.16 });
        tone({ freq: 70, to: 36, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.17 });
    }
    key() {
        tone({ freq: 880, to: 1320, dur: 0.1, type: 'triangle', vol: 0.07 });
        tone({ freq: 1320, to: 1760, dur: 0.12, type: 'triangle', vol: 0.06, delay: 0.09 });
    }
    chest() {
        [523, 659, 784, 1046].forEach((f, i) =>
            tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.06, delay: i * 0.07 }));
    }
    locked() { tone({ freq: 140, to: 110, dur: 0.12, type: 'square', vol: 0.05 }); }
    door() { tone({ freq: 200, to: 520, dur: 0.35, type: 'sawtooth', vol: 0.05 }); }
    costume() { tone({ freq: 420, to: 900, dur: 0.14, type: 'triangle', vol: 0.06 }); }
    caught() {
        [440, 330, 220, 110].forEach((f, i) =>
            tone({ freq: f, dur: 0.18, type: 'sawtooth', vol: 0.08, delay: i * 0.12 }));
    }
    win() {
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
            tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.07, delay: i * 0.09 }));
    }
}