/* =========================================================
   연구용 실험 웹 앱
   기능:
   1. 참가자 정보 입력
   2. 2048 게임 수행
   3. 랜덤 간격 알림 제시
   4. 알림 색상 R/G/B, 중요도 높음/낮음 기록
   5. 사후 회상 설문
   6. CSV 저장
   ========================================================= */

/* ==============================
   실험 설정값
   ============================== */

// 실제 실험은 5분 = 300초
const EXPERIMENT_SECONDS = 300;

// 알림은 5초 동안 화면에 표시
const NOTIFICATION_VISIBLE_MS = 5000;

// 전체 알림 개수
// 색상 3개 x 중요도 2개 x 반복 3회 = 18개
const NOTIFICATION_COUNT = 18;

// 알림 제시 최소/최대 시점
// 시작 직후와 종료 직전은 피하기 위해 범위 설정
const MIN_NOTIFICATION_TIME = 12;
const MAX_NOTIFICATION_TIME = EXPERIMENT_SECONDS - 15;

/* ==============================
   DOM 요소
   ============================== */

const startScreen = document.getElementById("startScreen");
const experimentScreen = document.getElementById("experimentScreen");
const surveyScreen = document.getElementById("surveyScreen");
const resultScreen = document.getElementById("resultScreen");

const participantForm = document.getElementById("participantForm");
const recallForm = document.getElementById("recallForm");

const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const boardEl = document.getElementById("board");

const notificationToast = document.getElementById("notificationToast");
const toastImportance = document.getElementById("toastImportance");
const toastMessage = document.getElementById("toastMessage");

const surveyList = document.getElementById("surveyList");
const summaryBox = document.getElementById("summaryBox");

const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const restartBtn = document.getElementById("restartBtn");

/* ==============================
   실험 데이터 저장 변수
   ============================== */

let participantInfo = {};
let notificationSchedule = [];
let shownNotifications = [];
let surveyResponses = [];

let experimentTimer = null;
let experimentStartTime = null;
let remainingSeconds = EXPERIMENT_SECONDS;

/* ==============================
   2048 게임 변수
   ============================== */

let board = [];
let score = 0;
let touchStartX = 0;
let touchStartY = 0;

/* ==============================
   알림 문구 데이터
   실제 연구에서는 사전 중요도 설문 후 문구를 확정하는 것을 권장
   ============================== */

const highImportanceMessages = [
  "오늘 18시까지 팀 프로젝트 보고서를 제출해야 합니다.",
  "내일 오전 9시 전공 수업 발표 순서가 변경되었습니다.",
  "장학금 신청 마감이 오늘 자정까지입니다.",
  "교수님 면담 시간이 오늘 14시로 변경되었습니다.",
  "중간고사 시험 강의실이 변경되었습니다.",
  "오늘 17시까지 졸업요건 확인 서류를 제출해야 합니다.",
  "팀 회의가 30분 뒤 시작됩니다.",
  "수강 정정 신청 마감이 오늘까지입니다.",
  "과제 피드백 확인 후 재제출이 필요합니다."
];

const lowImportanceMessages = [
  "학생식당에 새로운 메뉴가 추가되었습니다.",
  "동아리 홍보 부스가 학생회관 앞에서 운영 중입니다.",
  "학교 앱 배경화면이 새롭게 업데이트되었습니다.",
  "도서관 로비에서 사진 전시가 진행 중입니다.",
  "캠퍼스 카페에서 시즌 음료를 판매합니다.",
  "학교 굿즈 온라인 판매가 시작되었습니다.",
  "학생회 SNS 이벤트가 진행 중입니다.",
  "교내 산책로 야간 조명이 개선되었습니다.",
  "이번 주 영화 동아리 상영작이 공개되었습니다."
];

/* ==============================
   화면 전환 함수
   ============================== */

function showScreen(screen) {
  [startScreen, experimentScreen, surveyScreen, resultScreen].forEach((s) => {
    s.classList.remove("active");
  });

  screen.classList.add("active");
}

/* ==============================
   배열 랜덤 섞기 함수
   ============================== */

function shuffleArray(array) {
  return array
    .map((value) => ({ value, random: Math.random() }))
    .sort((a, b) => a.random - b.random)
    .map((item) => item.value);
}

/* ==============================
   참가자 정보 입력 후 실험 시작
   ============================== */

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();

  participantInfo = {
    participantId: document.getElementById("participantId").value.trim(),
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    experimentDate: new Date().toLocaleString()
  };

  startExperiment();
});

/* ==============================
   실험 시작
   ============================== */

function startExperiment() {
  showScreen(experimentScreen);
  document.body.classList.add("lock-scroll");
  initGame();
  createNotificationSchedule();

  shownNotifications = [];
  surveyResponses = [];

  remainingSeconds = EXPERIMENT_SECONDS;
  experimentStartTime = Date.now();

  updateTimerDisplay();

  experimentTimer = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    const elapsedSeconds = EXPERIMENT_SECONDS - remainingSeconds;
    checkNotificationTiming(elapsedSeconds);

    if (remainingSeconds <= 0) {
      endExperiment();
    }
  }, 1000);
}

/* ==============================
   타이머 표시
   ============================== */

function updateTimerDisplay() {
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  timerEl.textContent = `${minutes}:${seconds}`;
}

/* ==============================
   알림 스케줄 생성
   ============================== */

function createNotificationSchedule() {
  const colors = ["red", "green", "blue"];
  const importanceLevels = ["high", "low"];

  let baseConditions = [];

  // 색상 3개 x 중요도 2개 x 반복 3회
  for (let repeat = 0; repeat < 3; repeat++) {
    colors.forEach((color) => {
      importanceLevels.forEach((importance) => {
        baseConditions.push({
          color,
          importance
        });
      });
    });
  }

  baseConditions = shuffleArray(baseConditions).slice(0, NOTIFICATION_COUNT);

  // 알림이 뜰 시간을 랜덤 생성
  const randomTimes = [];

  while (randomTimes.length < baseConditions.length) {
    const time = Math.floor(
      Math.random() * (MAX_NOTIFICATION_TIME - MIN_NOTIFICATION_TIME + 1)
    ) + MIN_NOTIFICATION_TIME;

    // 너무 가까운 시간에 알림이 겹치지 않도록 8초 이상 간격 유지
    const isFarEnough = randomTimes.every((t) => Math.abs(t - time) >= 8);

    if (isFarEnough) {
      randomTimes.push(time);
    }
  }

  randomTimes.sort((a, b) => a - b);

  notificationSchedule = baseConditions.map((condition, index) => {
    const messagePool =
      condition.importance === "high"
        ? highImportanceMessages
        : lowImportanceMessages;

    return {
      id: `N${String(index + 1).padStart(2, "0")}`,
      color: condition.color,
      importance: condition.importance,
      message: messagePool[index % messagePool.length],
      showAt: randomTimes[index],
      displayed: false
    };
  });
}

/* ==============================
   알림 표시 시점 확인
   ============================== */

function checkNotificationTiming(elapsedSeconds) {
  notificationSchedule.forEach((notification) => {
    if (!notification.displayed && notification.showAt === elapsedSeconds) {
      notification.displayed = true;
      showNotification(notification, elapsedSeconds);
    }
  });
}

/* ==============================
   알림 표시
   ============================== */

function showNotification(notification, elapsedSeconds) {
  notificationToast.className = `notification-toast ${notification.color}`;

  toastImportance.textContent =
    notification.importance === "high" ? "중요도 높음" : "중요도 낮음";

  toastMessage.textContent = notification.message;

  notificationToast.classList.remove("hidden");

  shownNotifications.push({
    ...notification,
    shownAtSecond: elapsedSeconds,
    shownAtClock: new Date().toLocaleTimeString()
  });

  setTimeout(() => {
    notificationToast.classList.add("hidden");
  }, NOTIFICATION_VISIBLE_MS);
}

/* ==============================
   실험 종료
   ============================== */

function endExperiment() {
  clearInterval(experimentTimer);
  notificationToast.classList.add("hidden");

  document.body.classList.remove("lock-scroll");

  createRecallSurvey();
  showScreen(surveyScreen);
}

/* =========================================================
   2048 게임 구현
   ========================================================= */

function initGame() {
  board = Array.from({ length: 4 }, () => Array(4).fill(0));
  score = 0;

  addRandomTile();
  addRandomTile();

  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";

  board.flat().forEach((value) => {
    const tile = document.createElement("div");
    tile.classList.add("tile");

    if (value > 0) {
      tile.textContent = value;
      tile.classList.add(`tile-${value}`);
    }

    boardEl.appendChild(tile);
  });

  scoreEl.textContent = score;
}

function addRandomTile() {
  const emptyCells = [];

  board.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === 0) {
        emptyCells.push({ r, c });
      }
    });
  });

  if (emptyCells.length === 0) return;

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
}

function slideAndMerge(row) {
  const filtered = row.filter((value) => value !== 0);

  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered[i + 1] = 0;
    }
  }

  const merged = filtered.filter((value) => value !== 0);

  while (merged.length < 4) {
    merged.push(0);
  }

  return merged;
}

function moveLeft() {
  const oldBoard = JSON.stringify(board);

  board = board.map((row) => slideAndMerge(row));

  afterMove(oldBoard);
}

function moveRight() {
  const oldBoard = JSON.stringify(board);

  board = board.map((row) => {
    const reversed = [...row].reverse();
    return slideAndMerge(reversed).reverse();
  });

  afterMove(oldBoard);
}

function moveUp() {
  const oldBoard = JSON.stringify(board);

  for (let c = 0; c < 4; c++) {
    const column = board.map((row) => row[c]);
    const mergedColumn = slideAndMerge(column);

    for (let r = 0; r < 4; r++) {
      board[r][c] = mergedColumn[r];
    }
  }

  afterMove(oldBoard);
}

function moveDown() {
  const oldBoard = JSON.stringify(board);

  for (let c = 0; c < 4; c++) {
    const column = board.map((row) => row[c]).reverse();
    const mergedColumn = slideAndMerge(column).reverse();

    for (let r = 0; r < 4; r++) {
      board[r][c] = mergedColumn[r];
    }
  }

  afterMove(oldBoard);
}

function afterMove(oldBoard) {
  const newBoard = JSON.stringify(board);

  if (oldBoard !== newBoard) {
    addRandomTile();
    renderBoard();
  }
}



/* 모바일 스와이프 조작 */
boardEl.addEventListener("touchstart", (event) => {
  event.preventDefault();

  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: false });

boardEl.addEventListener("touchmove", (event) => {
  // 게임판 위에서 손가락을 움직일 때 화면 스크롤 방지
  event.preventDefault();
}, { passive: false });

boardEl.addEventListener("touchend", (event) => {
  event.preventDefault();

  const touchEndX = event.changedTouches[0].clientX;
  const touchEndY = event.changedTouches[0].clientY;

  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;

  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 40) moveRight();
    if (diffX < -40) moveLeft();
  } else {
    if (diffY > 40) moveDown();
    if (diffY < -40) moveUp();
  }
}, { passive: false });
/* =========================================================
   사후 회상 설문
   ========================================================= */

function createRecallSurvey() {
  surveyList.innerHTML = "";

  const randomizedNotifications = shuffleArray([...shownNotifications]);

  randomizedNotifications.forEach((notification, index) => {
    const item = document.createElement("div");
    item.classList.add("survey-item");

    const colorKorean = {
      red: "빨간색",
      green: "초록색",
      blue: "파란색"
    };

    const importanceKorean =
      notification.importance === "high" ? "높음" : "낮음";

    item.innerHTML = `
      <div class="survey-meta">
        <span class="badge ${notification.color}">
          ${colorKorean[notification.color]}
        </span>
        <span class="badge">
          중요도 ${importanceKorean}
        </span>
      </div>

      <p><strong>Q${index + 1}.</strong> 이 조건의 알림 내용을 기억하나요?</p>

      <div class="radio-row">
        <label>
          <input type="radio" name="remember_${notification.id}" value="1" required />
          기억함
        </label>
        <label>
          <input type="radio" name="remember_${notification.id}" value="0.5" />
          일부 기억함
        </label>
        <label>
          <input type="radio" name="remember_${notification.id}" value="0" />
          기억하지 못함
        </label>
      </div>

      <label>
        기억나는 알림 내용을 적어 주세요.
        <textarea 
          name="recallText_${notification.id}" 
          placeholder="예: 과제 제출 마감 알림이었던 것 같다."
        ></textarea>
      </label>

      <label>
        이 알림 디자인이 눈에 잘 띄었다고 느꼈나요?
        <select name="visibility_${notification.id}" required>
          <option value="">선택</option>
          <option value="1">1점 - 전혀 그렇지 않다</option>
          <option value="2">2점</option>
          <option value="3">3점 - 보통</option>
          <option value="4">4점</option>
          <option value="5">5점 - 매우 그렇다</option>
        </select>
      </label>

      <label>
        이 알림 디자인에 대한 만족도는 어느 정도인가요?
        <select name="satisfaction_${notification.id}" required>
          <option value="">선택</option>
          <option value="1">1점 - 매우 낮음</option>
          <option value="2">2점</option>
          <option value="3">3점 - 보통</option>
          <option value="4">4점</option>
          <option value="5">5점 - 매우 높음</option>
        </select>
      </label>
    `;

    surveyList.appendChild(item);
  });
}

/* 설문 제출 */
recallForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(recallForm);

  surveyResponses = shownNotifications.map((notification) => {
    return {
      notificationId: notification.id,
      color: notification.color,
      importance: notification.importance,
      originalMessage: notification.message,
      shownAtSecond: notification.shownAtSecond,
      recallScore: formData.get(`remember_${notification.id}`),
      recallText: formData.get(`recallText_${notification.id}`) || "",
      visibilityScore: formData.get(`visibility_${notification.id}`),
      satisfactionScore: formData.get(`satisfaction_${notification.id}`)
    };
  });

  createSummary();
  showScreen(resultScreen);
});

/* ==============================
   결과 요약 생성
   ============================== */

function createSummary() {
  const total = surveyResponses.length;
  const recallSum = surveyResponses.reduce(
    (sum, item) => sum + Number(item.recallScore),
    0
  );

  const recallRate = total > 0 ? ((recallSum / total) * 100).toFixed(1) : 0;

  const greenItems = surveyResponses.filter((item) => item.color === "green");
  const highItems = surveyResponses.filter((item) => item.importance === "high");
  const greenHighItems = surveyResponses.filter(
    (item) => item.color === "green" && item.importance === "high"
  );

  const avg = (items, key) => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + Number(item[key]), 0);
    return (sum / items.length).toFixed(2);
  };

  summaryBox.innerHTML = `
    <strong>전체 알림 개수:</strong> ${total}개<br />
    <strong>자가 보고 기준 전체 회상률:</strong> ${recallRate}%<br />
    <strong>초록색 알림 평균 회상 점수:</strong> ${avg(greenItems, "recallScore")}점<br />
    <strong>중요도 높음 알림 평균 회상 점수:</strong> ${avg(highItems, "recallScore")}점<br />
    <strong>초록색 + 중요도 높음 평균 회상 점수:</strong> ${avg(greenHighItems, "recallScore")}점
  `;
}

/* =========================================================
   CSV 다운로드
   ========================================================= */

downloadCsvBtn.addEventListener("click", () => {
  downloadCSV();
});

function downloadCSV() {
  const headers = [
    "participantId",
    "age",
    "gender",
    "experimentDate",
    "notificationId",
    "color",
    "importance",
    "originalMessage",
    "shownAtSecond",
    "recallScore",
    "recallText",
    "visibilityScore",
    "satisfactionScore"
  ];

  const rows = surveyResponses.map((item) => {
    return [
      participantInfo.participantId,
      participantInfo.age,
      participantInfo.gender,
      participantInfo.experimentDate,
      item.notificationId,
      item.color,
      item.importance,
      item.originalMessage,
      item.shownAtSecond,
      item.recallScore,
      item.recallText,
      item.visibilityScore,
      item.satisfactionScore
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `recall_experiment_${participantInfo.participantId}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

/* ==============================
   다시 시작
   ============================== */

restartBtn.addEventListener("click", () => {
  location.reload();
});
