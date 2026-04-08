const TILE = 32;
const MAP = [
  '#####################',
  '#.........#.........#',
  '#.###.###.#.###.###.#',
  '#o# #.....P.....# #o#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.###.#.###.#####',
  '#.........#.........#',
  '#.###.###.#.###.###.#',
  '#...#.....G.....#...#',
  '###.#.#.#####.#.#.###',
  '#.....#...#...#.....#',
  '#.########.#.########',
  '#...................#',
  '#####################'
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const stateEl = document.getElementById('state');

const images = {
  pacman: loadImage('assets/pacman.svg'),
  ghostA: loadImage('assets/ghost-a.svg'),
  ghostB: loadImage('assets/ghost-b.svg'),
  power: loadImage('assets/powerup.svg')
};

const dirs = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};

const state = {
  score: 0,
  lives: 3,
  poweredUntil: 0,
  dots: new Set(),
  powerups: new Set(),
  player: { x: 0, y: 0, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } },
  ghosts: [],
  gameOver: false,
  win: false,
  time: 0
};

function key(x, y) {
  return `${x},${y}`;
}

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function parseMap() {
  MAP.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '.') state.dots.add(key(x, y));
      if (cell === 'o') state.powerups.add(key(x, y));
      if (cell === 'P') {
        state.player.x = x;
        state.player.y = y;
      }
      if (cell === 'G') {
        state.ghosts.push({ x, y, dir: { x: 1, y: 0 }, seed: Math.random() });
        state.ghosts.push({ x: x - 2, y, dir: { x: -1, y: 0 }, seed: Math.random() });
      }
    });
  });
}

function wallAt(x, y) {
  return MAP[y]?.[x] === '#';
}

function canMove(entity, dir) {
  const nx = entity.x + dir.x;
  const ny = entity.y + dir.y;
  return !wallAt(nx, ny);
}

function movePlayer() {
  const { player } = state;
  if (canMove(player, player.nextDir)) player.dir = player.nextDir;
  if (canMove(player, player.dir)) {
    player.x += player.dir.x;
    player.y += player.dir.y;
  }

  const pos = key(player.x, player.y);
  if (state.dots.delete(pos)) state.score += 10;
  if (state.powerups.delete(pos)) {
    state.score += 50;
    state.poweredUntil = state.time + 8000;
  }
}

function moveGhosts() {
  for (const ghost of state.ghosts) {
    const options = Object.values(dirs)
      .slice(0, 4)
      .filter((dir) => canMove(ghost, dir));

    if (!canMove(ghost, ghost.dir) || Math.random() < 0.3) {
      options.sort((a, b) => {
        const da = distanceSq(ghost.x + a.x, ghost.y + a.y, state.player.x, state.player.y);
        const db = distanceSq(ghost.x + b.x, ghost.y + b.y, state.player.x, state.player.y);
        const chase = state.poweredUntil < state.time ? 1 : -1;
        return (da - db) * chase + (Math.random() - 0.5) * 2;
      });
      ghost.dir = options[0] || { x: 0, y: 0 };
    }

    if (canMove(ghost, ghost.dir)) {
      ghost.x += ghost.dir.x;
      ghost.y += ghost.dir.y;
    }
  }
}

function distanceSq(x1, y1, x2, y2) {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}

function resolveCollisions() {
  for (const ghost of state.ghosts) {
    if (ghost.x === state.player.x && ghost.y === state.player.y) {
      if (state.poweredUntil > state.time) {
        state.score += 200;
        ghost.x = 10;
        ghost.y = 9;
      } else {
        state.lives -= 1;
        state.player.x = 10;
        state.player.y = 3;
        state.player.dir = { x: 0, y: 0 };
        if (state.lives <= 0) state.gameOver = true;
      }
    }
  }

  if (state.dots.size === 0 && state.powerups.size === 0) {
    state.win = true;
  }
}

function updateHud() {
  scoreEl.textContent = `Score: ${state.score}`;
  livesEl.textContent = `Lives: ${state.lives}`;
  stateEl.textContent = state.gameOver
    ? 'State: Game Over'
    : state.win
      ? 'State: You Win'
      : state.poweredUntil > state.time
        ? 'State: Powered Up'
        : 'State: Normal';
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  MAP.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const px = x * TILE;
      const py = y * TILE;
      if (cell === '#') {
        ctx.fillStyle = '#1232aa';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#6f8dff';
        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      }
    });
  });

  ctx.fillStyle = '#ffe780';
  for (const dot of state.dots) {
    const [x, y] = dot.split(',').map(Number);
    ctx.beginPath();
    ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of state.powerups) {
    const [x, y] = p.split(',').map(Number);
    ctx.drawImage(images.power, x * TILE + 4, y * TILE + 2, TILE - 8, TILE - 4);
  }

  ctx.drawImage(images.pacman, state.player.x * TILE + 2, state.player.y * TILE + 2, TILE - 4, TILE - 4);

  state.ghosts.forEach((ghost, idx) => {
    const sprite = idx % 2 === 0 ? images.ghostA : images.ghostB;
    if (state.poweredUntil > state.time) {
      ctx.globalAlpha = 0.7;
    }
    ctx.drawImage(sprite, ghost.x * TILE + 2, ghost.y * TILE + 2, TILE - 4, TILE - 4);
    ctx.globalAlpha = 1;
  });

  if (state.gameOver || state.win) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.win ? 'YOU WIN' : 'GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.font = '22px sans-serif';
    ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 40);
  }
}

let lastStep = 0;
function tick(ts) {
  state.time = ts;
  if (!state.gameOver && !state.win && ts - lastStep > 140) {
    movePlayer();
    moveGhosts();
    resolveCollisions();
    updateHud();
    lastStep = ts;
  }
  draw();
  requestAnimationFrame(tick);
}

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.poweredUntil = 0;
  state.dots.clear();
  state.powerups.clear();
  state.ghosts = [];
  state.gameOver = false;
  state.win = false;
  state.player.dir = { x: 0, y: 0 };
  state.player.nextDir = { x: 0, y: 0 };
  parseMap();
  updateHud();
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r' && (state.gameOver || state.win)) {
    resetGame();
    return;
  }
  const dir = dirs[event.key] || dirs[event.key.toLowerCase()];
  if (dir) {
    state.player.nextDir = dir;
    event.preventDefault();
  }
});

resetGame();
requestAnimationFrame(tick);
