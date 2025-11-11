// 🎮 Galaxy Defender 게임
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const playerImage = new Image();
playerImage.src = "images/fighter.png";
const alienImage = new Image();
alienImage.src = "images/ufo.png";
const bossImage = new Image();
bossImage.src = "images/boss.png";
const powerItemImage = new Image();
powerItemImage.src = "images/power.png";
const scoreItemImage = new Image();
scoreItemImage.src = "images/score.png";


const difficultyTable = [
  { name: "EASY",   bg: "#001028", starColor: "#a0b0ff", starSpeed: 0.5 },
  { name: "NORMAL", bg: "#002040", starColor: "#7fb8ff", starSpeed: 1.0 },
  { name: "HARD",   bg: "#300010", starColor: "#ff9090", starSpeed: 1.5 },
  { name: "HELL",   bg: "#000000", starColor: "#ff4040", starSpeed: 2.2 }
];

const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const infoOverlay = document.getElementById("infoOverlay");
const infoBtn = document.getElementById("infoBtn");
const closeInfo = document.getElementById("closeInfo");


let gameStarted = false; // 게임 시작 상태 플래그
let enemySpawnTimer;
let enemyShootTimer;

const player = {
  x: 180,
  y: 550,
  width: 40,
  height: 40,
  speed: 5,
  hp: 3,
  firePower: 1,
  maxFirePower: 4
};


let bullets = [], enemies = [], enemyBullets = [], items = [], effects = [];
let score = 0, stage = 1, gameOver = false, gamePaused = false, boss = null;
let keys = {};
let transitioning = false;
let transitionTimer = 0;
let stageStartTimer = 0;
let stageClearScore = 0;
let playerHitCooldown = 0;
let frame = 0;
let fireCooldown = 0;
let currentDifficulty = getDifficultyStage(stage);
let stageMessage = "";
let stageMessageTimer = 0;

function showStageMessage(stage, difficultyName) {
  stageMessage = `Stage ${stage} - ${difficultyName} MODE`;
  stageMessageTimer = 120; // 2초간 표시
}

// 게임 시작 버튼 클릭
startBtn.addEventListener("click", () => {
  startScreen.style.display = "none";
  gameStarted = true;

  // ✅ 게임 시작 시 타이머 새로 시작
  enemySpawnTimer = setInterval(spawnEnemy, 1000);
  enemyShootTimer = setInterval(enemyShoot, 1500);

  update(); // 게임 루프 시작
});

// ✅ "게임 설명" 버튼 클릭 시 오버레이 표시
infoBtn.addEventListener("click", () => {
  infoOverlay.classList.remove("hidden");
});

// ✅ "닫기" 버튼 클릭 시 오버레이 숨김
closeInfo.addEventListener("click", () => {
  infoOverlay.classList.add("hidden");
});

const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1 + 0.5
}));

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "p" || e.key === "P") gamePaused = !gamePaused;
  if ((e.key === "r" || e.key === "R") && gameOver) location.reload();
});
document.addEventListener("keyup", e => keys[e.key] = false);

function shoot() {
  if (playerHitCooldown > 0) return;

  const baseX = player.x + player.width / 2 - 2;
  const bulletY = player.y;
  const spacing = 10;

  const pattern = {
    1: [0],
    2: [-spacing, spacing],
    3: [-spacing * 1.5, 0, spacing * 1.5],
    4: [-spacing * 2, -spacing, spacing, spacing * 2],
  };

  pattern[player.firePower].forEach(offset => {
    bullets.push({ x: baseX + offset, y: bulletY, width: 4, height: 10, speed: 7 });
  });
}

function getDifficultyStage(stage) {
  if (stage < 4) return difficultyTable[0]; // EASY
  if (stage < 7) return difficultyTable[1]; // NORMAL
  if (stage < 10) return difficultyTable[2]; // HARD
  return difficultyTable[3]; // HELL
}

function spawnEnemy() {
  if (boss || transitioning) return;
  const diff = getDifficultyStage(stage);
  const x = Math.random() * (canvas.width - 40);
  const speed = 1.5 + stage * 0.3 + diff.starSpeed * 0.3;
  enemies.push({ x, y: 0, width: 40, height: 40, speed });
}

function spawnBoss() {
  const diff = getDifficultyStage(stage);
  boss = {
    x: 130,
    y: 50,
    width: 140,
    height: 100,
    hp: 30 + stage * 10 * diff.starSpeed,
    speed: 1 + diff.starSpeed * 0.2,
    direction: 1
  };
}

function enemyShoot() {
  if (transitioning) return;

  // 🔹 보스 공격 패턴
  if (boss) {
    const pattern = Math.floor(Math.random() * 3) + 1; // 1~3 랜덤
    const bx = boss.x + boss.width / 2;
    const by = boss.y + boss.height;

    switch (pattern) {
      case 1: // 🌀 직선 사격
        enemyBullets.push({ x: bx, y: by, dx: 0, dy: 5, width: 4, height: 10 });
        break;

      case 2: // 🌊 양옆 확산 사격
        for (let angle = -0.3; angle <= 0.3; angle += 0.15) {
          enemyBullets.push({ x: bx, y: by, dx: Math.sin(angle) * 3, dy: Math.cos(angle) * 5 });
        }
        break;

      case 3: // 💣 빠른 연속 난사
        for (let i = -2; i <= 2; i++) {
          enemyBullets.push({ x: bx + i * 10, y: by, dx: i * 0.2, dy: 6 });
        }
        break;
    }
    return;
  }

  // 🔹 일반 적 사격
  if (enemies.length === 0) return;
  const shooter = enemies[Math.floor(Math.random() * enemies.length)];
  enemyBullets.push({
    x: shooter.x + shooter.width / 2,
    y: shooter.y + shooter.height,
    dx: 0,
    dy: 4,
  });
}


function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function spawnEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    effects.push({ x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, radius: 2 + Math.random() * 3, life: 30, color: `hsl(${Math.random() * 360}, 100%, 60%)` });
  }
}

function spawnItem(x, y) {
  const types = ["score", "power"];
  const type = types[Math.floor(Math.random() * types.length)];
  const image = type === "score" ? scoreItemImage : powerItemImage; // ✅ 이미지 추가

  items.push({
    x,
    y,
    width: 48,
    height: 48,
    speed: 2,
    type,
    image
  });
}

function updateItems() {
  items.forEach(item => {
    item.y += item.speed;
    if (isColliding(item, player)) {
      if (item.type === "score") score += 10;
      else if (item.type === "power" && player.firePower < player.maxFirePower) {
        player.firePower++;
      }
      item.collected = true;
    }
  });
  items = items.filter(i => i.y < canvas.height && !i.collected);
}

function updateStars() {
  const diff = getDifficultyStage(stage);
  for (let s of stars) {
    s.y += s.speed * diff.starSpeed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}

function updateEffects() {
  effects.forEach(e => { e.x += e.dx; e.y += e.dy; e.life--; });
  effects = effects.filter(e => e.life > 0);
}

function drawStars() {
  const diff = getDifficultyStage(stage);
  ctx.fillStyle = diff.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = diff.starColor;
  for (let s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects() {
  for (let e of effects) {
    const alpha = e.life / 30;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawItems() {
  items.forEach(item => {
    ctx.save();
    ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
    ctx.rotate((frame / 30) % (2 * Math.PI)); // 계속 회전
    if (item.image && item.image.complete) {
      ctx.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height);
    } else {
      ctx.fillStyle = item.type === "score" ? "gold" : "cyan";
      ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
    }
    ctx.restore();
  });
}


function update() {
  if (!gameStarted) return; // 게임이 시작되지 않았으면 업데이트 중지
  frame++;
  if (fireCooldown > 0) fireCooldown--;

  if (transitioning) {
    updateStars();
    drawStars();

    player.y -= 2;
    if (player.y < -player.height) player.y = -player.height;

    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText(`Stage ${stage} Clear!`, canvas.width / 2 - 70, canvas.height / 2);

    transitionTimer++;
    if (transitionTimer > 240) {
  player.y = 550;
  stage++;
  transitioning = false;
  stageStartTimer = 0;

  currentDifficulty = getDifficultyStage(stage);
  showStageMessage(stage, currentDifficulty.name);
  }


    requestAnimationFrame(update);
    return;
  }

  if (gameOver || gamePaused) return requestAnimationFrame(update);

  updateStars(); updateEffects(); updateItems();

  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed;
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) player.x += player.speed;
  if (keys[" "] && fireCooldown === 0) {
  shoot();
  fireCooldown = 30;
}

  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);

  enemies.forEach(e => {
    e.y += e.speed;
    if (isColliding(e, player) && playerHitCooldown === 0) {
      handleHit();
      playerHitCooldown = 60;
    }
  });

  if (boss) {
    boss.x += boss.speed * boss.direction;
    if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.direction *= -1;
  }

  bullets.forEach(b => {
    enemies.forEach((e, i) => {
      if (isColliding(b, e)) {
        score++;
        spawnEffect(e.x + e.width / 2, e.y + e.height / 2);
        if (Math.random() < 0.3) spawnItem(e.x, e.y);
        enemies.splice(i, 1);
        b.hit = true;
      }
    });
    if (boss && isColliding(b, boss)) {
      boss.hp--;
      spawnEffect(b.x, b.y);
      b.hit = true;
      if (boss.hp <= 0) {
        score += 50;
        boss = null;
        stageClearScore = score;

        // ✅ 게임 상태 정리
        enemies = [];
        bullets = [];
        enemyBullets = [];
        items = [];
        effects = [];

        transitioning = true;
        transitionTimer = 0;
      }
    }
  });
  bullets = bullets.filter(b => !b.hit);

  enemies = enemies.filter(e => e.y < canvas.height);

  for (let b of enemyBullets) {
    b.x += b.dx || 0;
    b.y += b.dy || 0;
    if (isColliding(b, player) && playerHitCooldown === 0) {
      handleHit();
      playerHitCooldown = 60;
      break;
    }
  }
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height && b.y > -10);

  if (playerHitCooldown > 0) playerHitCooldown--;

  drawStars(); drawEffects(); drawItems();
  enemies.forEach(e => ctx.drawImage(alienImage, e.x, e.y, e.width, e.height));
  if (boss) ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
  bullets.forEach(b => { ctx.fillStyle = "yellow"; ctx.fillRect(b.x, b.y, b.width, b.height); });
  enemyBullets.forEach(b => {
    const flicker = Math.sin(frame / 5 + b.y / 10) * 0.5 + 0.5; // 0~1 반짝임
    const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
    gradient.addColorStop(0, `rgba(255, ${100 + 150 * flicker}, 0, 1)`); // 중앙 밝게
    gradient.addColorStop(1, `rgba(255, 255, 0, 0)`); // 바깥쪽 희미하게
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  if (playerHitCooldown === 0 || frame % 10 < 5) {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
  }

  ctx.fillStyle = getDifficultyStage(stage).starColor;
  ctx.font = "16px Arial";
  ctx.fillText(
    `Score: ${score}  HP: ${player.hp}  Stage: ${stage}  [${getDifficultyStage(stage).name}]`,
    10, 20
  );

  if (!boss && !transitioning && stageStartTimer > 180 && (score - stageClearScore) >= 30) {
    spawnBoss();
    stageStartTimer = 0;
  }
  if (!transitioning) stageStartTimer++;

  // ✅ 스테이지 변경 메시지 표시
  if (stageMessageTimer > 0) {
    ctx.font = "28px Arial Black";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(stageMessage, canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "left";
    stageMessageTimer--;
  }

  requestAnimationFrame(update);
}

function handleHit() {
  player.hp--;
  player.firePower = 1;

  if (player.hp <= 0) {
    gameOver = true;
    alert("Game Over!\nScore: " + score);
    clearInterval(enemySpawnTimer);
    clearInterval(enemyShootTimer);
  }
}


