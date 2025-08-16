// Script untuk simulasi lubang hitam
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Atur ukuran canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Variabel simulasi
let width = canvas.width;
let height = canvas.height;
let centerX = width / 2;
let centerY = height / 2;

// Kamera dan transformasi
let zoom = 1;
let offsetX = 0;
let offsetY = 0;

// Efek fisika
let gravIntensity = 50;
let ringSpeed = 0.01;

// Elemen yang ditampilkan
let showDNA = true;
let showStars = true;
let showLabels = true;

// Input kontrol
const gravSlider = document.getElementById('gravSlider');
const accSpeedSlider = document.getElementById('accSpeed');
const toggleDNA = document.getElementById('toggleDNA');
const toggleStars = document.getElementById('toggleStars');
const toggleLabels = document.getElementById('toggleLabels');
const helpButton = document.getElementById('helpButton');
const closeHelp = document.getElementById('closeHelp');
const helpPanel = document.getElementById('help-panel');
const muteButton = document.getElementById('muteButton');

gravSlider.oninput = () => { gravIntensity = gravSlider.value; };
accSpeedSlider.oninput = () => { ringSpeed = accSpeedSlider.value / 1000; };
toggleDNA.onchange = () => { showDNA = toggleDNA.checked; };
toggleStars.onchange = () => { showStars = toggleStars.checked; };
toggleLabels.onchange = () => { showLabels = toggleLabels.checked; };
helpButton.onclick = () => { helpPanel.classList.remove('hidden'); };
closeHelp.onclick = () => { helpPanel.classList.add('hidden'); };

// Audio latar (Web Audio API sederhana)
let audio = new Audio('ambient.ogg');
audio.loop = true;
audio.volume = 0.5;
audio.play().catch(e => {
    // Play mungkin gagal di beberapa browser, coba ulang
    audio = new Audio('ambient.ogg');
    audio.loop = true;
    audio.volume = 0.5;
    audio.play();
});

let isMuted = false;
muteButton.onclick = () => {
    isMuted = !isMuted;
    if (isMuted) {
        audio.pause();
        muteButton.textContent = 'Unmute';
    } else {
        audio.play();
        muteButton.textContent = 'Mute';
    }
};

// Membuat latar bintang
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        // Posisi acak dalam rentang area gambar (dua kali lebar/tinggi)
        let x = (Math.random() - 0.5) * width * 2;
        let y = (Math.random() - 0.5) * height * 2;
        stars.push({
            x: x,
            y: y,
            size: 1 + Math.random() * 2,
            depth: 0.5 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2
        });
    }
}
initStars();

// Variabel animasi
let accAngle = 0;
let dnaRotation = 0;

// Menangani sentuhan/drag/pinch
let pointers = {};
canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    // Cek double tap
    let now = Date.now();
    if (now - (canvas.lastTap || 0) < 300) {
        // Reset kamera
        zoom = 1;
        offsetX = 0;
        offsetY = 0;
    }
    canvas.lastTap = now;
});
canvas.addEventListener('pointermove', (e) => {
    if (pointers[e.pointerId]) {
        let start = pointers[e.pointerId];
        let dx = e.clientX - start.x;
        let dy = e.clientY - start.y;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        let ids = Object.keys(pointers);
        if (ids.length === 1) {
            // Drag: geser kamera
            offsetX += dx;
            offsetY += dy;
        } else if (ids.length === 2) {
            // Pinch: zoom
            let p1 = pointers[ids[0]];
            let p2 = pointers[ids[1]];
            let curDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (!canvas.startDist) {
                canvas.startDist = curDist;
            } else {
                let delta = curDist - canvas.startDist;
                zoom *= 1 + delta / 200;
                canvas.startDist = curDist;
                if (zoom < 0.1) zoom = 0.1;
                if (zoom > 3) zoom = 3;
            }
        }
    }
});
canvas.addEventListener('pointerup', (e) => {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) {
        canvas.startDist = null;
    }
});

// Gambar animasi
function animate() {
    width = canvas.width;
    height = canvas.height;
    centerX = width / 2;
    centerY = height / 2;
    // Update bintang (flicker)
    stars.forEach(star => {
        star.phase += 0.01;
        star.alpha = 0.7 + 0.3 * Math.sin(star.phase);
    });
    accAngle += ringSpeed;
    dnaRotation += 0.5;

    // Bersihkan kanvas
    ctx.clearRect(0, 0, width, height);

    // Gambar latar bintang dengan efek paralaks
    if (showStars) {
        stars.forEach(star => {
            let sx = centerX + offsetX * star.depth + star.x * zoom;
            let sy = centerY + offsetY * star.depth + star.y * zoom;
            let size = star.size * (star.depth) * zoom;
            ctx.globalAlpha = star.alpha;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    // Terapkan transformasi kamera
    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, centerX + offsetX, centerY + offsetY);

    // Gambar lubang hitam (horizon acara)
    let radius = 50 + gravIntensity / 2;
    let grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    grad.addColorStop(0, '#000');
    grad.addColorStop(1, 'rgba(50,50,50,0.5)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    // Lingkar horizon tipis
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Gambar cincin akresi
    ctx.save();
    ctx.rotate(accAngle);
    ctx.scale(1.3, 1);
    ctx.strokeStyle = '#f80';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 15, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(accAngle + Math.PI);
    ctx.scale(1.3, 1);
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 15, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // Gambar struktur DNA
    if (showDNA) {
        ctx.save();
        ctx.translate(100, 0); // Geser posisinya relatif ke lubang hitam
        for (let i = 0; i <= 360; i += 15) {
            let t = (i + dnaRotation) * Math.PI / 180;
            let x1 = Math.cos(t) * 20;
            let z = Math.sin(t) * 20;
            let y = (i / 360 - 0.5) * 180;
            let x2 = -Math.cos(t) * 20;
            // Efek perspektif sederhana berdasarkan z
            let scale = 1 + z / 100;
            // Gambar tiap sisi heliks
            ctx.save();
            ctx.translate(x1 * scale, y);
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.translate(x2 * scale, y);
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Gambar bilangan penghubung setiap beberapa langkah
            if (i % 60 === 0) {
                ctx.beginPath();
                ctx.moveTo(x1 * scale, y);
                ctx.lineTo(x2 * scale, y);
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // Gambar label fisika
    if (showLabels) {
        ctx.fillStyle = '#0ff';
        ctx.font = '20px sans-serif';
        ctx.fillText("Relativitas Umum", -radius - 150, -radius - 20);
        ctx.fillText("Hukum Newton", radius + 30, radius + 30);
        ctx.fillText("Termodinamika", -radius - 150, radius + 30);
    }

    ctx.restore(); // Kembalikan transformasi

    requestAnimationFrame(animate);
}
animate();
