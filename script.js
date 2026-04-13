const boardSize = 4;
let board = [];
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore2048App")) || 0;

let touchStartX = 0;
let touchStartY = 0;

// 실험 상태
let experimentStarted = false;
let experimentEnded = false;
let experimentLogs = [];
let experimentConditions = [];
let currentConditionIndex = 0;
let currentNotification = null;
let currentNotificationStart = null;
let notificationTimeout = null;
let nextNotificationTimeout = null;
let experimentEndTimeout = null;
let countdownInterval = null;
let experimentEndTime = null;
let surveySubmitted = false;

// DOM
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const gameBoardEl = document.getElementById("gameBoard");
const gameOverEl = document.getElementById("gameOver");
const restartBtn = document.getElementById("restartBtn");

const participantIdEl = document.getElementById("participantId");
const experimentMinutesEl = document.getElementById("experimentMinutes");
const minIntervalEl = document.getElementById("minInterval");
const maxIntervalEl = document.getElementById("maxInterval");
const notificationDurationEl = document.getElementById("notificationDuration");
const repeatPerConditionEl = document.getElementById("repeatPerCondition");

const experimentStatusEl = document.getElementById("experimentStatus");
const remainingTimeEl = document.getElementById("remainingTime");
const currentConditionEl = document.getElementById("currentCondition");
const progressTextEl = document.getElementById("progressText");

const notificationContainerEl = document.getElementById("notificationContainer");
const logPreviewEl = document.getElementById("logPreview");

const startExperimentBtn = document.getElementById("startExperimentBtn");
const resetGameBtn = document.getElementById("resetGameBtn");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");

const surveyModal = document.getElementById("surveyModal");
const satisfactionScoreEl = document.getElementById("satisfactionScore");
const satisfactionReasonEl = document.getElementById("satisfactionReason");
const submitSurveyBtn = document.getElementById("submitSurveyBtn");

const notificationMessages = {
  high: [
    "곧 제출 마감인 팀플 과제가 있습니다.",
    "오늘 시험 일정이 30분 뒤에 시작됩니다.",
    "장학금 신청 마감이 오늘까지입니다.",
    "중요한 면담 일정이 곧 시작됩니다."
  ],
  low: [
    "친구가 오늘 저녁 메뉴 사진을 보냈습니다.",
    "동아리 채팅방에 새 메시지가 도착했습니다.",
    "쇼핑 앱에서 추천 상품 알림이 도착했습니다.",
    "영상 플랫폼에서 새 콘텐츠 추천이 도착했습니다."
  ]
};

function initBoard() {
  board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
  score = 0;
  updateScore();
  addRandomTile();
  addRandomTile();
  renderBoard();
  hideGameOver();
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === 0) empty.push({ r, c });
    }
  }
  if (!empty.length) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function renderBoard() {
  gameBoardEl.innerHTML = "";
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const tile = document.createElement("div");
      tile.className = `tile tile-${board[r][c]}`;
      tile.textContent = board[r][c] === 0 ? "" : board[r][c];
      gameBoardEl.appendChild(tile);
    }
  }
}

function updateScore() {
  scoreEl.textContent = score;
  bestScore = Math.max(bestScore, score);
  bestScoreEl.textContent = bestScore;
  localStorage.setItem("bestScore2048App", bestScore);
}

function slideAndCombine(row) {
  const filtered = row.filter(v => v !== 0);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered[i + 1] = 0;
    }
  }
  const result = filtered.filter(v => v !== 0);
  while (result.length < boardSize) result.push(0);
  return result;
}

function reverseRows(matrix) {
  return matrix.map(row => [...row].reverse());
}

function transpose(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function boardsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function moveLeft() {
  const old = JSON.parse(JSON.stringify(board));
  board = board.map(row => slideAndCombine(row));
  return !boardsEqual(old, board);
}

function moveRight() {
  const old = JSON.parse(JSON.stringify(board));
  board = reverseRows(board).map(row => slideAndCombine(row));
  board = reverseRows(board);
  return !boardsEqual(old, board);
}

function moveUp() {
  const old = JSON.parse(JSON.stringify(board));
  board = transpose(board);
  board = board.map(row => slideAndCombine(row));
  board = transpose(board);
  return !boardsEqual(old, board);
}

function moveDown() {
  const old = JSON.parse(JSON.stringify(board));
  board = transpose(board);
  board = reverseRows(board).map(row => slideAndCombine(row));
  board = reverseRows(board);
  board = transpose(board);
  return !boardsEqual(old, board);
}

function canMove() {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === 0) return true;
      if (c < boardSize - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < boardSize - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function handleMove(direction) {
  let moved = false;
  if (direction === "left") moved = moveLeft();
  if (direction === "right") moved = moveRight();
  if (direction === "up") moved = moveUp();
  if (direction === "down") moved = moveDown();

  if (moved) {
    addRandomTile();
    updateScore();
    renderBoard();

    if (!canMove()) showGameOver();
  }
}

function showGameOver() {
  gameOverEl.classList.remove("hidden");
}

function hideGameOver() {
  gameOverEl.classList.add("hidden");
}

function createConditionList() {
  const colors = ["red", "green", "blue"];
  const importances = ["high", "low"];
  const repeatCount = Number(repeatPerConditionEl.value) || 3;
  const list = [];

  for (const importance of importances) {
    for (const color of colors) {
      for (let i = 0; i < repeatCount; i++) {
        list.push({ importance, color });
      }
    }
  }
  return shuffleArray(list);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickMessage(importance) {
  const pool = notificationMessages[importance];
  return pool[Math.floor(Math.random() * pool.length)];
}

function startExperiment() {
  if (experimentStarted) return;

  const participantId = participantIdEl.value.trim();
  const minInterval = Number(minIntervalEl.value);
  const maxInterval = Number(maxIntervalEl.value);
  const duration = Number(notificationDurationEl.value);
  const minutes = Number(experimentMinutesEl.value);

  if (!participantId) {
    alert("참가자 ID를 입력해주세요.");
    return;
  }
  if (minInterval >= maxInterval) {
    alert("최소 간격은 최대 간격보다 작아야 합니다.");
    return;
  }
  if (duration <= 0 || minutes <= 0) {
    alert("실험 시간과 알림 시간은 0보다 커야 합니다.");
    return;
  }

  experimentStarted = true;
  experimentEnded = false;
  surveySubmitted = false;
  experimentLogs = [];
  currentConditionIndex = 0;
  experimentConditions = createConditionList();
  experimentEndTime = Date.now() + minutes * 60 * 1000;

  updateStatus("실험 진행 중");
  updateProgress();
  updateRemainingTime();

  countdownInterval = setInterval(updateRemainingTime, 1000);
  experimentEndTimeout = setTimeout(endExperiment, minutes * 60 * 1000);

  scheduleNextNotification();
}

function scheduleNextNotification() {
  if (experimentEnded) return;
  if (currentConditionIndex >= experimentConditions.length) {
    endExperiment();
    return;
  }

  const min = Number(minIntervalEl.value) * 1000;
  const max = Number(maxIntervalEl.value) * 1000;
  const delay = randomBetween(min, max);

  nextNotificationTimeout = setTimeout(() => {
    showNotification(experimentConditions[currentConditionIndex]);
  }, delay);
}

function showNotification(condition) {
  if (experimentEnded) return;

  clearNotification();

  const message = pickMessage(condition.importance);
  const durationMs = Number(notificationDurationEl.value) * 1000;

  const el = document.createElement("div");
  el.className = `notification ${condition.color} ${condition.importance}`;
  el.innerHTML = `
    <div class="notification-head">
      <h3 class="notification-title">실험 알림</h3>
      <span class="importance-badge">
        ${condition.importance === "high" ? "중요도 높음" : "중요도 낮음"}
      </span>
    </div>
    <p class="notification-message">${message}</p>
    <div class="notification-guide">탭하면 확인 · 오른쪽으로 밀면 무시</div>
    <div class="notification-timer">
      <div class="notification-timer-bar"></div>
    </div>
  `;

  notificationContainerEl.innerHTML = "";
  notificationContainerEl.appendChild(el);

  currentNotification = {
    ...condition,
    message,
    shownAt: new Date().toISOString(),
    durationMs
  };
  currentNotificationStart = performance.now();

  currentConditionEl.textContent =
    `${translateImportance(condition.importance)} / ${translateColor(condition.color)}`;

  const timerBar = el.querySelector(".notification-timer-bar");
  timerBar.animate(
    [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
    { duration: durationMs, fill: "forwards", easing: "linear" }
  );

  el.addEventListener("click", () => {
    recordNotificationResponse("checked");
  });

  setupNotificationSwipe(el);

  notificationTimeout = setTimeout(() => {
    recordNotificationResponse("timeout");
  }, durationMs);
}

function setupNotificationSwipe(el) {
  let startX = 0;
  let currentX = 0;
  let dragging = false;

  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    dragging = true;
  }, { passive: true });

  el.addEventListener("touchmove", e => {
    if (!dragging) return;
    currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    if (diffX > 0) {
      el.style.transform = `translateX(${diffX}px)`;
    }
  }, { passive: true });

  el.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    const diffX = currentX - startX;

    if (diffX > 110) {
      recordNotificationResponse("ignored");
    } else {
      el.style.transform = "translateX(0)";
    }
    currentX = 0;
  });

  let mouseDown = false;
  let mouseStartX = 0;
  let mouseCurrentX = 0;

  el.addEventListener("mousedown", e => {
    mouseDown = true;
    mouseStartX = e.clientX;
  });

  window.addEventListener("mousemove", e => {
    if (!mouseDown) return;
    mouseCurrentX = e.clientX;
    const diffX = mouseCurrentX - mouseStartX;
    if (diffX > 0) el.style.transform = `translateX(${diffX}px)`;
  });

  window.addEventListener("mouseup", () => {
    if (!mouseDown) return;
    mouseDown = false;
    const diffX = mouseCurrentX - mouseStartX;

    if (diffX > 110) {
      recordNotificationResponse("ignored");
    } else {
      el.style.transform = "translateX(0)";
    }
    mouseCurrentX = 0;
  });
}

function recordNotificationResponse(action) {
  if (!currentNotification) return;

  clearTimeout(notificationTimeout);

  const reactionTimeMs = Math.round(performance.now() - currentNotificationStart);

  const log = {
    participantId: participantIdEl.value.trim(),
    trial: currentConditionIndex + 1,
    importance: currentNotification.importance,
    color: currentNotification.color,
    message: currentNotification.message,
    action,
    reactionTimeMs: action === "timeout" ? null : reactionTimeMs,
    shownAt: currentNotification.shownAt,
    scoreAtResponse: score,
    boardState: JSON.stringify(board)
  };

  experimentLogs.push(log);
  appendLogPreview(log);

  currentConditionIndex++;
  updateProgress();

  clearNotification();

  if (currentConditionIndex >= experimentConditions.length) {
    endExperiment();
  } else {
    scheduleNextNotification();
  }
}

function clearNotification() {
  clearTimeout(notificationTimeout);
  currentNotification = null;
  currentNotificationStart = null;
  notificationContainerEl.innerHTML = `
    <div class="notification-placeholder">
      다음 알림을 기다리는 중입니다.
    </div>
  `;
  currentConditionEl.textContent = "-";
}

function endExperiment() {
  if (experimentEnded) return;

  experimentEnded = true;
  experimentStarted = false;

  clearTimeout(notificationTimeout);
  clearTimeout(nextNotificationTimeout);
  clearTimeout(experimentEndTimeout);
  clearInterval(countdownInterval);

  clearNotification();
  updateStatus("실험 종료");
  remainingTimeEl.textContent = "00:00";
  openSurveyModal();
}

function openSurveyModal() {
  surveyModal.classList.remove("hidden");
}

function closeSurveyModal() {
  surveyModal.classList.add("hidden");
}

function submitSurvey() {
  if (surveySubmitted) return;

  const surveyLog = {
    participantId: participantIdEl.value.trim(),
    type: "survey",
    satisfactionScore: satisfactionScoreEl.value,
    satisfactionReason: satisfactionReasonEl.value.trim(),
    submittedAt: new Date().toISOString()
  };

  experimentLogs.push(surveyLog);
  appendLogPreview({
    trial: "설문",
    importance: "-",
    color: "-",
    action: `만족도 ${surveyLog.satisfactionScore}`,
    reactionTimeMs: "-",
    message: surveyLog.satisfactionReason || "이유 없음"
  });

  surveySubmitted = true;
  closeSurveyModal();
  alert("설문이 제출되었습니다.");
}

function appendLogPreview(log) {
  const item = document.createElement("div");
  item.className = "log-item";
  item.innerHTML = `
    <strong>${log.trial}회차</strong><br>
    조건: ${translateImportance(log.importance)} / ${translateColor(log.color)}<br>
    행동: ${log.action}<br>
    반응시간: ${log.reactionTimeMs ?? "-"} ms<br>
    내용: ${log.message}
  `;
  logPreviewEl.prepend(item);

  const items = logPreviewEl.querySelectorAll(".log-item");
  if (items.length > 5) items[items.length - 1].remove();
}

function updateStatus(text) {
  experimentStatusEl.textContent = text;
}

function updateProgress() {
  progressTextEl.textContent = `${currentConditionIndex} / ${experimentConditions.length}`;
}

function updateRemainingTime() {
  if (!experimentEndTime) {
    remainingTimeEl.textContent = "-";
    return;
  }

  const diff = Math.max(0, experimentEndTime - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const sec = String(totalSeconds % 60).padStart(2, "0");
  remainingTimeEl.textContent = `${min}:${sec}`;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function translateImportance(value) {
  if (value === "high") return "중요도 높음";
  if (value === "low") return "중요도 낮음";
  return value || "-";
}

function translateColor(value) {
  if (value === "red") return "빨강";
  if (value === "green") return "초록";
  if (value === "blue") return "파랑";
  return value || "-";
}

function downloadCSV() {
  if (!experimentLogs.length) {
    alert("저장할 로그가 없습니다.");
    return;
  }

  const headers = [
    "participantId",
    "trial",
    "importance",
    "color",
    "message",
    "action",
    "reactionTimeMs",
    "shownAt",
    "scoreAtResponse",
    "boardState",
    "type",
    "satisfactionScore",
    "satisfactionReason",
    "submittedAt"
  ];

  const rows = [headers.join(",")];

  experimentLogs.forEach(log => {
    const row = headers.map(h => {
      const value = log[h] ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    rows.push(row.join(","));
  });

  const blob = new Blob(["\uFEFF" + rows.join("\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `experiment_logs_${participantIdEl.value.trim() || "participant"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 입력
document.addEventListener("keydown", e => {
  const map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down"
  };
  if (map[e.key]) {
    e.preventDefault();
    handleMove(map[e.key]);
  }
});

gameBoardEl.addEventListener("touchstart", e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

gameBoardEl.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;

  const dx = endX - touchStartX;
  const dy = endY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 30) handleMove("right");
    if (dx < -30) handleMove("left");
  } else {
    if (dy > 30) handleMove("down");
    if (dy < -30) handleMove("up");
  }
}, { passive: true });

restartBtn.addEventListener("click", initBoard);
resetGameBtn.addEventListener("click", initBoard);
startExperimentBtn.addEventListener("click", startExperiment);
downloadCsvBtn.addEventListener("click", downloadCSV);
submitSurveyBtn.addEventListener("click", submitSurvey);

// PWA 서비스워커 등록
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}

bestScoreEl.textContent = bestScore;
initBoard();
updateStatus("대기 중");