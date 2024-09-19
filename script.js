// 전역 변수 및 설정
let canvas, context;
let nextCanvas, nextContext;
let holdCanvas, holdContext;
let arena;
let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    level: 0,
    lines: 0,
};
let nextPiece = null;
let holdPiece = null;
let holdUsed = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let lockDelay = 500; // 락 딜레이 시간(ms)
let lockTimer = 0; // 락 타이머
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let keyBindings = {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'Space',
    rotateLeft: 'KeyQ',
    rotateRight: 'KeyW',
    hold: 'KeyC',
    pause: 'KeyP',
};

const arenaWidth = 12;
const arenaHeight = 20;

const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // O
    '#0DFF72', // L
    '#F538FF', // J
    '#FF8E0D', // I
    '#FFE138', // S
    '#3877FF', // Z
];

const themes = {
    default: {
        '--background-color': '#000',
        '--text-color': '#fff',
    },
    dark: {
        '--background-color': '#121212',
        '--text-color': '#fff',
    },
    light: {
        '--background-color': '#f0f0f0',
        '--text-color': '#000',
    },
};

// 함수 정의

function init() {
    canvas = document.getElementById('tetris');
    context = canvas.getContext('2d');
    context.scale(20, 20);

    nextCanvas = document.getElementById('next');
    nextContext = nextCanvas.getContext('2d');
    nextContext.scale(20, 20);

    holdCanvas = document.getElementById('hold');
    holdContext = holdCanvas.getContext('2d');
    holdContext.scale(20, 20);

    arena = createMatrix(arenaWidth, arenaHeight);

    document.getElementById('highScore').innerText = '최고 점수: ' + highScore;

    updateScore();
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    init();
    playerReset();
    update();
}

function openSettings() {
    document.getElementById('settings-menu').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settings-menu').classList.add('hidden');
}

function changeTheme(themeName) {
    const theme = themes[themeName];
    for (let variable in theme) {
        document.documentElement.style.setProperty(variable, theme[variable]);
    }
}

function changeKey(action) {
    const input = document.getElementById(action + 'Key');
    input.value = '';
    input.focus();
    input.onkeydown = (event) => {
        keyBindings[action] = event.code;
        input.value = event.key;
        input.onkeydown = null;
    };
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    switch (type) {
        case 'T':
            return [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0],
            ];
        case 'O':
            return [
                [2, 2],
                [2, 2],
            ];
        case 'L':
            return [
                [0, 0, 3],
                [3, 3, 3],
                [0, 0, 0],
            ];
        case 'J':
            return [
                [4, 0, 0],
                [4, 4, 4],
                [0, 0, 0],
            ];
        case 'I':
            return [
                [0, 5, 0, 0],
                [0, 5, 0, 0],
                [0, 5, 0, 0],
                [0, 5, 0, 0],
            ];
        case 'S':
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ];
        case 'Z':
            return [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0],
            ];
    }
}

function drawMatrix(matrix, offset, ctx, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                if (isGhost) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                } else {
                    ctx.fillStyle = colors[value];
                }
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 }, context);
    drawGhost();
    drawMatrix(player.matrix, player.pos, context);
    drawNext();
    drawHold();
}

function drawNext() {
    nextContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawMatrix(nextPiece, { x: 1, y: 1 }, nextContext);
}

function drawHold() {
    holdContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        drawMatrix(holdPiece, { x: 1, y: 1 }, holdContext);
    }
}

function drawGhost() {
    const ghostPos = { x: player.pos.x, y: player.pos.y };
    while (!collide(arena, { pos: ghostPos, matrix: player.matrix })) {
        ghostPos.y++;
    }
    ghostPos.y--;
    drawMatrix(player.matrix, ghostPos, context, true);
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (nextPiece === null) {
        nextPiece = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
    }
    player.matrix = nextPiece;
    nextPiece = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
    holdUsed = false;
    player.pos.y = 0;
    player.pos.x = (arenaWidth / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        player.level = 0;
        player.lines = 0;
        updateScore();
        dropInterval = 1000;
        highScore = Math.max(player.score, highScore);
        localStorage.setItem('tetrisHighScore', highScore);
        document.getElementById('highScore').innerText = '최고 점수: ' + highScore;
    }
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        player.pos.y++;
        lockTimer = 0; // 충돌 시 락 타이머 시작
    } else {
        lockTimer = 0;
    }
    dropCounter = 0;
}

function playerHardDrop() {
    let dropDistance = 0;
    while (!collide(arena, player)) {
        player.pos.y++;
        dropDistance++;
    }
    player.pos.y--;
    merge(arena, player);
    player.score += dropDistance * 2; // 하드 드롭 보너스 점수
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerHold() {
    if (!holdUsed) {
        if (holdPiece) {
            let temp = player.matrix;
            player.matrix = holdPiece;
            holdPiece = temp;
            player.pos.y = 0;
            player.pos.x = (arenaWidth / 2 | 0) - (player.matrix[0].length / 2 | 0);
        } else {
            holdPiece = player.matrix;
            playerReset();
        }
        holdUsed = true;
    }
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arenaWidth; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        rowCount++;
        player.lines++;
        player.score += rowCount * 100;
    }
}

function updateScore() {
    document.getElementById('score').innerText = '점수: ' + player.score;
    player.level = Math.floor(player.lines / 10);
    document.getElementById('level').innerText = '레벨: ' + player.level;
    document.getElementById('lines').innerText = '라인: ' + player.lines;
    dropInterval = 1000 - (player.level * 100);

    if (player.score > highScore) {
        highScore = player.score;
        localStorage.setItem('tetrisHighScore', highScore);
        document.getElementById('highScore').innerText = '최고 점수: ' + highScore;
    }
}

function update(time = 0) {
    if (!isPaused) {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        lockTimer += deltaTime;

        if (dropCounter > dropInterval) {
            playerDrop();
        }

        if (collide(arena, player)) {
            if (lockTimer > lockDelay) {
                player.pos.y--;
                merge(arena, player);
                playerReset();
                arenaSweep();
                updateScore();
                lockTimer = 0;
            }
        } else {
            lockTimer = 0;
        }

        draw();
    }
    requestAnimationFrame(update);
}

// 키 이벤트 처리

document.addEventListener('keydown', event => {
    if (event.code === keyBindings.moveLeft) {
        playerMove(-1);
        if (!collide(arena, player)) {
            lockTimer = 0; // 움직였으므로 락 타이머 초기화
        } else {
            playerMove(1);
        }
    } else if (event.code === keyBindings.moveRight) {
        playerMove(1);
        if (!collide(arena, player)) {
            lockTimer = 0;
        } else {
            playerMove(-1);
        }
    } else if (event.code === keyBindings.softDrop) {
        playerDrop();
    } else if (event.code === keyBindings.hardDrop) {
        playerHardDrop();
    } else if (event.code === keyBindings.rotateLeft) {
        playerRotate(-1);
        if (!collide(arena, player)) {
            lockTimer = 0; // 회전했으므로 락 타이머 초기화
        }
    } else if (event.code === keyBindings.rotateRight) {
        playerRotate(1);
        if (!collide(arena, player)) {
            lockTimer = 0;
        }
    } else if (event.code === keyBindings.hold) {
        playerHold();
    } else if (event.code === keyBindings.pause) {
        isPaused = !isPaused;
    }
});

// 초기화는 startGame()에서 수행하므로 여기에 init() 호출이 필요 없습니다.
