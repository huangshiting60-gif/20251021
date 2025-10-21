// 全域狀態和變數
let canvasContainer;
let cnv;
let currentGame = 0; // 0: 光點連線遊戲 (預設), 1: 氣球爆破遊戲
let isPaused = false; // 追蹤遊戲是否暫停
let hasStarted = false; // 追蹤 p5.js 是否已初始化 (用於 UI 綁定)

// ====================================================
// 【光點連線遊戲 (Game 0) 專屬變數和函式】
// ====================================================
let colors_wisps = ['#f71735', '#067bc2', '#FFC247', '#3BD89F', '#81cfe5', '#f654a9', '#2F0A30'];
let strollers = [];
let centerX, centerY;
let ctx;

function setupGameWisps() {
    // 初始化光點遊戲的變數
    strollers = [];
    rectMode(CENTER);
    colorMode(HSB, 360, 100, 100, 100);
    ctx = drawingContext;
    centerX = width / 2;
    centerY = height / 2;
    
    // 根據畫布大小決定光點數量，確保在不同尺寸下密度一致
    let densityFactor = (width * height) / (800 * 600); // 參考 800x600 的畫布
    let numWisps = Math.max(10, Math.floor(21 * densityFactor));

    for (let i = 0; i < numWisps; i++) {
        let x = random(width);
        let y = random(height);
        strollers.push(new Wisp(x, y, width * random(0.05, 0.09), colors_wisps[i % colors_wisps.length]));
    }
}

function drawGameWisps() {
    if (isPaused) return;

    background('#fafaff');

    // 計算文字的上下浮動偏移量：在 -15 和 15 之間變化
    let verticalOffset = sin(frameCount * 0.05) * 15;

    // 繪製光點和連線邏輯
    for (let s of strollers) {
        s.run();
    }
    // 處理光點間的排斥力
    for (let i = 0; i < strollers.length; i++) {
        let c1 = strollers[i];
        for (let j = i + 1; j < strollers.length; j++) {
            let c2 = strollers[j];
            let dx = c2.x - c1.x;
            let dy = c2.y - c1.y;
            let distance = sqrt(dx * dx + dy * dy);
            let minDist = c1.d + c2.d;
            if (distance < minDist && distance > 0) {
                let force = (minDist - distance) * 0.001;
                let nx = dx / distance;
                let ny = dy / distance;
                c1.vx -= force * nx;
                c1.vy -= force * ny;
                c2.vx += force * nx;
                c2.vy += force * ny;
            }
        }
    }

    // 文字顯示 (上下浮動)
    fill(0);
    textAlign(CENTER, CENTER);
    textFont('Microsoft JhengHei, PingFang TC, Arial');

    textSize(min(60, width / 12));
    text('教育科技學系', centerX, centerY - 35 + verticalOffset);

    textSize(min(30, width / 24));
    text('414730175黃詩婷', centerX, centerY + 25 + verticalOffset);
}

function mousePressedWisps() {
    // 點擊時隨機替換每個移動物件的顏色
    for (let s of strollers) {
        s.color = random(colors_wisps);
    }
}

// 供外部 UI 呼叫，用於隨機化光點顏色
function randomizeWispColors() {
    if (currentGame === 0 && !isPaused) {
        mousePressedWisps();
    }
}

// 光點遊戲輔助函式 (Wisp, Circle, aetherLink 類別和函式)
// aetherLink 函式 (連線繪製邏輯)
function aetherLink(x1, y1, d1, x2, y2, d2, dst) {
    let r = dst / 2;
    let r1 = d1 / 2;
    let r2 = d2 / 2;
    let R1 = r1 + r;
    let R2 = r2 + r;
    let dx = x2 - x1;
    let dy = y2 - y1;
    let d = sqrt(dx * dx + dy * dy);
    if (d > R1 + R2) {
        return;
    }
    let dirX = dx / d;
    let dirY = dy / d;
    let a = (R1 * R1 - R2 * R2 + d * d) / (2 * d);
    let underRoot = R1 * R1 - a * a;
    if (underRoot < 0) return;
    let h = sqrt(underRoot);
    let midX = x1 + dirX * a;
    let midY = y1 + dirY * a;
    let perpX = -dirY * h;
    let perpY = dirX * h;
    let cx1 = midX + perpX;
    let cy1 = midY + perpY;
    let cx2 = midX - perpX;
    let cy2 = midY - perpY;

    if (dist(cx1, cy1, cx2, cy2) < r * 2) {
        return;
    }

    let ang1 = atan2(y1 - cy1, x1 - cx1);
    let ang2 = atan2(y2 - cy1, x2 - cx1);
    let ang3 = atan2(y2 - cy2, x2 - cx2);
    let ang4 = atan2(y1 - cy2, x1 - cx2);

    if (ang2 < ang1) {
        ang2 += TAU;
    }

    beginShape();
    for (let i = ang1; i < ang2; i += TAU / 180) {
        vertex(cx1 + r * cos(i), cy1 + r * sin(i));
    }

    if (ang4 < ang3) {
        ang4 += TAU;
    }
    for (let i = ang3; i < ang4; i += TAU / 180) {
        vertex(cx2 + r * cos(i), cy2 + r * sin(i));
    }
    endShape(CLOSE);
}

// Wisp 類別 (移動的主光點)
class Wisp {
    constructor(x, y, d, c) {
        this.x = x;
        this.y = y;
        this.d = d;
        this.vx = random(-1, 1) * width * 0.001;
        this.vy = random(-1, 1) * width * 0.001;
        this.ang = 0;
        this.rnd = random(10000);
        this.circles = [];
        this.timer = 0;
        this.color = c;
        this.angle = 0;
        this.pp = createVector(this.x, this.y);
    }

    show() {
        noStroke();
        fill(this.color);
        // 繪製從 Wisp 產生的附屬光點 (Circle)
        for (let c of this.circles) {
            c.run();
        }
        
        // 繪製 Wisp 與其附屬光點之間的連結
        for (let i = 0; i < this.circles.length; i++) {
            let c = this.circles[i];
            if (c.isDead) {
                this.circles.splice(0, 1); // 移除死亡的附屬光點
            }
            aetherLink(this.x, this.y, this.d, c.x, c.y, c.d, this.d * 0.2);
        }

        // 繪製主 Wisp (圓形和眼睛/面部裝飾)
        push();
        translate(this.x, this.y);
        rotate(this.angle);
        circle(0, 0, this.d);

        translate(this.d * 0.15, 0);
        rotate(-this.angle);
        fill('#ffffff');
        // 眼睛或裝飾
        ellipse(-this.d * 0.22, -this.d * 0.02, this.d * 0.125, this.d * 0.15);
        ellipse(this.d * 0.22, -this.d * 0.02, this.d * 0.125, this.d * 0.15);
        ellipse(0, this.d * 0.05, this.d * 0.07, this.d * 0.09);
        
        pop();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        let r = this.d / 2
        // 邊界反彈
        if (this.x <= r || width - r <= this.x) {
            this.vx *= -1;
        }
        if (this.y <= r || height - r <= this.y) {
            this.vy *= -1;
        }

        this.x = constrain(this.x, r, width - r);
        this.y = constrain(this.y, r, height - r);

        // 每隔一定時間產生一個新的附屬光點
        if ((this.timer % 30) == 0) {
            this.circles.push(new Circle(this.x, this.y, this.d))
        }

        this.timer++;

        // 計算運動方向，用於旋轉
        this.angle = atan2(this.y - this.pp.y, this.x - this.pp.x);
        this.pp = createVector(this.x, this.y);
    }

    run() {
        this.show();
        this.update();
    }
}

// Circle 類別 (從 Wisp 產生的附屬光點，會逐漸縮小死亡)
class Circle {
    constructor(x, y, d) {
        this.x = x;
        this.y = y;
        this.d = d;
        this.decrease = width * 0.0015;
        this.isDead = false;
        this.vx = random(-1, 1) * width * 0.0008;
        this.vy = random(-1, 1) * width * 0.0008;
    }

    show() {
        circle(this.x, this.y, this.d);
    }

    update() {
        this.d -= this.decrease;
        if (this.d < 0) {
            this.isDead = true;
        }
        this.d = constrain(this.d, 0, width);
        this.x += this.vx;
        this.y += this.vy;
    }

    run() {
        this.show();
        this.update();
    }
}


// ====================================================
// 【氣球爆破遊戲 (Game 1) 專屬變數和函式】
// ====================================================
let circles_balloons = [];
let colors_balloons = [
    "#ff0000", "#ff8700", "#ffd300", "#deff0a", "#a1ff0a",
    "#0aff99", "#0aefff", "#147df5", "#580aff", "#be0aff"
];
let explosions = [];
let explosionSound = null;
let soundLoaded = false;
let started = false;

function setupGameBalloons() {
    // 重設氣球遊戲變數
    circles_balloons = [];
    explosions = [];
    started = false; // 每次重啟都從起始畫面開始

    // 非阻塞載入音效 (保持原來的載入邏輯)
    // 確保 p5.sound 函式可用
    if (typeof loadSound === 'function') {
        loadSound('氣球炸裂.mp3',
            function(s) {
                explosionSound = s;
                soundLoaded = true;
            },
            function(err) {
                loadSound('explosion.mp3',
                    function(s2) {
                        explosionSound = s2;
                        soundLoaded = true;
                    },
                    function(err2) {
                        soundLoaded = false;
                        // console.error('所有音效載入失敗。');
                    }
                );
            }
        );
    } else {
        // console.warn('p5.sound 庫未載入，氣球遊戲音效將不可用。');
    }

    // 產生 100 個圓的資料
    for (let i = 0; i < 100; i++) {
        let r = random(30, 150);
        let speed = map(r, 30, 150, 2.5, 0.5);
        let color = random(colors_balloons);
        circles_balloons.push({
            x: random(width),
            y: random(height),
            r: r,
            alpha: random(150, 255), // 提高最低透明度
            speed: speed,
            color: color
        });
    }
    background("#bde0fe");
}

function drawGameBalloons() {
    if (isPaused) return;

    background("#bde0fe");
    noStroke();

    // 左上角顯示指定文字（咖啡色，大小 30）
    push();
    fill('#6f4e37');
    textSize(min(30, width / 20));
    textAlign(LEFT, TOP);
    text('414730175', 8, 8);
    pop();

    // 若尚未開始，顯示起始畫面並停止後續更新
    if (!started) {
        push();
        fill(0, 150); // 半透明遮罩
        rect(0, 0, width, height);
        fill(255);
        textSize(min(40, width / 15));
        textAlign(CENTER, CENTER);
        text('點擊螢幕開始', width / 2, height / 2);
        pop();
        return; // 等待使用者點擊開始
    }

    // 每 30 frame 自動新增一個爆破點 (讓畫面更活躍，但實際點擊優先)
    if (frameCount % 30 === 0) {
        explosions.push({
            x: random(width),
            y: random(height),
            timer: 0
        });
    }

    for (let c of circles_balloons) {
        // 設定顏色和透明度
        let col = color(c.color);
        col.setAlpha(c.alpha);
        fill(col);
        ellipse(c.x, c.y, c.r, c.r);

        // 立體感小方塊 (白色反光)
        let rectSize = c.r / 6;
        fill(255, 255, 255, c.alpha * 0.8);
        rect(
            c.x - c.r / 3, // 修正反光位置，讓它看起來像在左上角
            c.y - c.r / 3,
            rectSize,
            rectSize,
            5
        );

        // 檢查是否進入任一自動產生的爆破點範圍
        for (let ex of explosions) {
            if (ex.timer === 0 && dist(c.x, c.y, ex.x, ex.y) < c.r / 2 + 30) {
                ex.timer = 1; // 觸發爆破動畫
                
                // 重設氣球參數並移到下方，而不是簡單隱藏
                c.r = random(30, 150);
                c.speed = map(c.r, 30, 150, 2.5, 0.5);
                c.color = random(colors_balloons);
                c.x = random(width);
                c.y = height + c.r / 2; 
                c.alpha = random(150, 255);

                // 播放音效
                if (soundLoaded && explosionSound && typeof explosionSound.play === 'function' && !explosionSound.isPlaying()) {
                    explosionSound.play();
                }
            }
        }

        // 往上飄
        c.y = c.y - c.speed;

        // 如果飄到最上方，移到最底部並重設參數
        if (c.y < -c.r / 2) {
            c.r = random(30, 150);
            c.speed = map(c.r, 30, 150, 2.5, 0.5);
            c.color = random(colors_balloons);
            c.x = random(width);
            c.y = height + c.r / 2;
            c.alpha = random(150, 255);
        }
    }

    // 爆破效果（移到圓形繪製之後）
    for (let ex of explosions) {
        if (ex.timer > 0) {
            for (let i = 0; i < 20; i++) {
                let angle = random(TWO_PI);
                let dist = ex.timer * 5 + random(10, 30);
                let exx = ex.x + cos(angle) * dist;
                let exy = ex.y + sin(angle) * dist;
                fill(255, random(150, 255), 0, 200 - ex.timer * 10);
                ellipse(exx, exy, random(10, 30));
            }
            ex.timer++;
        }
    }

    // 移除已結束的爆破點
    explosions = explosions.filter(ex => ex.timer === 0 || ex.timer <= 20);
}

function mousePressedBalloons() {
    // 在第一次點擊滑鼠時啟動網頁的音訊功能
    if (typeof userStartAudio === 'function') userStartAudio();

    // 如果還沒開始，先把畫面從起始畫面切換到主畫面
    if (!started) {
        started = true;
        return;
    }

    // 已開始後，檢查是否點擊到任一氣球
    for (let i = 0; i < circles_balloons.length; i++) {
        let c = circles_balloons[i];
        if (dist(mouseX, mouseY, c.x, c.y) < c.r / 2) {
            // 觸發該氣球的爆破
            explosions.push({ x: c.x, y: c.y, timer: 1 });
            
            // 重設氣球參數並移到下方
            c.r = random(30, 150);
            c.speed = map(c.r, 30, 150, 2.5, 0.5);
            c.color = random(colors_balloons);
            c.x = random(width);
            c.y = height + c.r / 2; 
            c.alpha = random(150, 255);
            
            // 播放音效（若已載入）
            if (soundLoaded && explosionSound && typeof explosionSound.play === 'function' && !explosionSound.isPlaying()) {
                explosionSound.play();
            }
            break; // 只處理最上方被點到的一顆
        }
    }
}


// ====================================================
// 【核心 p5.js 函式和遊戲切換邏輯】
// ====================================================

function setup() {
    // 確保 canvas 容器存在
    canvasContainer = document.getElementById('canvas-container');
    let w = canvasContainer ? canvasContainer.clientWidth : windowWidth;
    let h = canvasContainer ? canvasContainer.clientHeight : windowHeight;
    // 設置一個最小尺寸，防止畫布太小
    w = max(400, w);
    h = max(300, h);

    cnv = createCanvas(w, h);
    if (canvasContainer) cnv.parent('canvas-container');
    
    // 預設啟動光點連線遊戲
    setupGameWisps();
    
    hasStarted = true; // 標記 p5.js 已初始化
    // 呼叫 UI 綁定函數
    // 延遲綁定，確保 DOM 元素已載入
    window.addEventListener('DOMContentLoaded', bindUIEvents);
}

// 供外部 HTML 呼叫的函式，用於切換遊戲
function changeGame(gameId) {
    // 確保只接收 0 或 1
    gameId = parseInt(gameId);
    if (isNaN(gameId) || (gameId !== 0 && gameId !== 1)) return;

    if (currentGame === gameId) return; // 避免重複切換
    
    // 如果是從氣球遊戲切換出來，停止音效播放
    if (currentGame === 1 && explosionSound && typeof explosionSound.stop === 'function' && explosionSound.isPlaying()) {
        explosionSound.stop();
    }
    
    currentGame = gameId;
    
    // 根據新的遊戲 ID 執行初始化
    if (currentGame === 0) {
        setupGameWisps();
        // 確保光點遊戲不會因為氣球遊戲的起始畫面被誤判為暫停
        isPaused = false; 
    } else if (currentGame === 1) {
        setupGameBalloons();
        // 氣球遊戲從起始畫面開始，但 isPaused 狀態保持
    }
    
    // 重設畫布大小和背景
    windowResized();
    loop(); // 確保遊戲在切換後是運行的

    // 更新 UI 狀態 (如果 UI 已經綁定)
    if (hasStarted) updateUIState();
}


function draw() {
    if (isPaused) return; // 全域暫停檢查

    if (currentGame === 0) {
        drawGameWisps();
    } else if (currentGame === 1) {
        drawGameBalloons();
    }
}

function mousePressed() {
    // 根據當前遊戲狀態呼叫對應的 mousePressed 函式
    if (currentGame === 0) {
        mousePressedWisps();
    } else if (currentGame === 1) {
        mousePressedBalloons();
    }
    return false; // 防止瀏覽器預設行為
}

function touchStarted() {
    // 支援行動裝置觸控
    mousePressed();
    return false; // prevent default
}

function windowResized() {
    // 重新計算父容器尺寸
    canvasContainer = document.getElementById('canvas-container');
    let w = canvasContainer ? canvasContainer.clientWidth : windowWidth;
    let h = canvasContainer ? canvasContainer.clientHeight : windowHeight;
    // 設置一個最小尺寸，防止畫布太小
    w = max(400, w);
    h = max(300, h);
    resizeCanvas(w, h);
    
    // 重新初始化當前遊戲（確保比例正確）
    if (currentGame === 0) {
        setupGameWisps(); // 重新計算光點位置和尺寸，確保響應式
        centerX = width / 2;
        centerY = height / 2;
    }
    // 氣球遊戲只需要重設背景
    if (currentGame === 1) {
        background("#bde0fe");
    }
}


// ====================================================
// 【UI 互動邏輯】
// ====================================================

// 暫停/繼續 遊戲
function togglePause() {
    isPaused = !isPaused;
    const btnPause = document.getElementById('btn-pause');
    if (isPaused) {
        noLoop();
        btnPause.textContent = '繼續 (已暫停)';
        // 如果是氣球遊戲，在暫停時停止音效
        if (currentGame === 1 && explosionSound && typeof explosionSound.stop === 'function' && explosionSound.isPlaying()) {
            explosionSound.stop();
        }
    } else {
        loop();
        btnPause.textContent = '暫停';
    }
}

// 切換全螢幕模式
function toggleFullscreen() {
    // 確保整個 #app 元素進入全螢幕
    const app = document.getElementById('app');
    if (!document.fullscreenElement) {
        if (app.requestFullscreen) {
            app.requestFullscreen();
        } else if (app.webkitRequestFullscreen) { /* Safari */
            app.webkitRequestFullscreen();
        } else if (app.msRequestFullscreen) { /* IE11 */
            app.msRequestFullscreen();
        }
        // 在進入全螢幕後，強制觸發一次 resize 以確保 canvas 填滿
        setTimeout(windowResized, 100); 
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
        // 在退出全螢幕後，強制觸發一次 resize
        setTimeout(windowResized, 100);
    }
}

// 根據當前遊戲狀態更新 UI (例如：隱藏或顯示隨機顏色按鈕)
function updateUIState() {
    const btnRandom = document.getElementById('btn-random');
    if (btnRandom) {
        // 隨機顏色按鈕只在光點連線遊戲 (Game 0) 中有用
        btnRandom.style.display = (currentGame === 0) ? 'block' : 'none';
    }
    
    // 更新遊戲選單項目的視覺狀態 (例如：加上 'active' class)
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.menu-item[data-game-id="${currentGame}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // 更新暫停按鈕文字 (以防從其他遊戲切換回來)
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.textContent = isPaused ? '繼續 (已暫停)' : '暫停';
    }
}


// 綁定 HTML 元素事件
function bindUIEvents() {
    const btnToggle = document.getElementById('btn-toggle');
    const app = document.getElementById('app');
    if (btnToggle && app) {
        btnToggle.addEventListener('click', () => {
            app.classList.toggle('collapsed');
            // 觸發 resize 以重新繪製 Canvas
            setTimeout(windowResized, 100); 
        });
    }

    const btnRandom = document.getElementById('btn-random');
    if (btnRandom) {
        btnRandom.addEventListener('click', randomizeWispColors);
    }

    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.addEventListener('click', togglePause);
    }

    const btnFull = document.getElementById('btn-full');
    if (btnFull) {
        btnFull.addEventListener('click', toggleFullscreen);
    }

    // 遊戲切換按鈕
    document.querySelectorAll('.menu-item').forEach(btn => {
        // 使用 data 屬性儲存 gameId
        const gameId = btn.getAttribute('data-game-id');
        if (gameId !== null) {
            btn.addEventListener('click', () => changeGame(gameId));
        }
    });

    // 初始化 UI 狀態
    updateUIState();
}

// 處理全螢幕退出時的事件
document.addEventListener('fullscreenchange', windowResized);
document.addEventListener('webkitfullscreenchange', windowResized);
document.addEventListener('mozfullscreenchange', windowResized);
document.addEventListener('msfullscreenchange', windowResized);

// 確保 p5.js setup 執行完畢後再嘗試綁定
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUIEvents);
} else {
    // 如果 DOM 已經準備好，但 p5.js 還沒啟動，則在 p5.js setup 中處理
    // 如果 p5.js 已經啟動，則在 setup 結束後 bindUIEvents 會被呼叫
}
