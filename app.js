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

// 게임 시간: 3분 = 180초
const EXPERIMENT_SECONDS = 180;

// 알림은 5초 동안 화면에 표시
const NOTIFICATION_VISIBLE_MS = 5000;

// 전체 알림 개수
// 색상 3개 x 중요도 2개 x 반복 3회 = 18개
const NOTIFICATION_COUNT = 18;

// 알림 제시 최소/최대 시점
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
let mergedPositions = [];

let pointerStartX = 0;
let pointerStartY = 0;
let isPointerDown = false;

/* ==============================
   알림 문구 데이터
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

  const randomTimes = [];

  while (randomTimes.length < baseConditions.length) {
    const time =
      Math.floor(Math.random() * (MAX_NOTIFICATION_TIME - MIN_NOTIFICATION_TIME + 1)) +
      MIN_NOTIFICATION_TIME;

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
  mergedPositions = [];

  addRandomTile();
  addRandomTile();

  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const tile = document.createElement("div");
      tile.classList.add("tile");

      if (value > 0) {
        tile.textContent = value;

        // 2048보다 큰 숫자도 오류 없이 표시되도록 기본 클래스는 유지
        tile.classList.add(`tile-${value}`);

        const isMerged = mergedPositions.some(
          (pos) => pos.row === rowIndex && pos.col === colIndex
        );

        if (isMerged) {
          tile.classList.add("merged");
        }
      }

      boardEl.appendChild(tile);
    });
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

  // 실제 2048 규칙: 새 타일은 보통 2, 낮은 확률로 4
  board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
}

/* ==============================
   2048 실제 게임 규칙
   ============================== */

/*
  핵심 규칙:
  1. 0은 먼저 제거한다.
  2. 이동 방향 기준으로 앞에서부터 같은 숫자만 합친다.
  3. 한 번 합쳐진 타일은 같은 이동에서 다시 합쳐지지 않는다.
  4. 점수는 합쳐져서 만들어진 숫자만큼만 증가한다.

  예시:
  [2, 0, 2, 2] -> [4, 2, 0, 0], 점수 +4
  [2, 2, 2, 2] -> [4, 4, 0, 0], 점수 +8
  [2, 4, 8, 0] -> [2, 4, 8, 0], 점수 +0
*/
function mergeLine(line) {
  const numbers = line.filter((value) => value !== 0);

  const newLine = [];
  const mergedIndexes = [];
  let gainedScore = 0;

  for (let i = 0; i < numbers.length; i++) {
    const current = numbers[i];
    const next = numbers[i + 1];

    if (current === next) {
      const mergedValue = current * 2;

      newLine.push(mergedValue);
      gainedScore += mergedValue;
      mergedIndexes.push(newLine.length - 1);

      // 다음 타일은 이미 합쳐졌으므로 건너뜀
      i++;
    } else {
      newLine.push(current);
    }
  }

  while (newLine.length < 4) {
    newLine.push(0);
  }

  return {
    line: newLine,
    gainedScore,
    mergedIndexes
  };
}

function cloneBoard(targetBoard) {
  return targetBoard.map((row) => [...row]);
}

function boardsAreSame(boardA, boardB) {
  return JSON.stringify(boardA) === JSON.stringify(boardB);
}

/* ==============================
   이동 처리 통합 함수
   ============================== */

function move(direction) {
  const oldBoard = cloneBoard(board);
  const nextBoard = Array.from({ length: 4 }, () => Array(4).fill(0));

  let totalGainedScore = 0;
  mergedPositions = [];

  for (let i = 0; i < 4; i++) {
    let line = [];

    if (direction === "left") {
      line = [...board[i]];
    }

    if (direction === "right") {
      line = [...board[i]].reverse();
    }

    if (direction === "up") {
      line = [board[0][i], board[1][i], board[2][i], board[3][i]];
    }

    if (direction === "down") {
      line = [board[3][i], board[2][i], board[1][i], board[0][i]];
    }

    const result = mergeLine(line);
    totalGainedScore += result.gainedScore;

    if (direction === "left") {
      for (let col = 0; col < 4; col++) {
        nextBoard[i][col] = result.line[col];
      }

      result.mergedIndexes.forEach((col) => {
        mergedPositions.push({ row: i, col });
      });
    }

    if (direction === "right") {
      const reversedResult = [...result.line].reverse();

      for (let col = 0; col < 4; col++) {
        nextBoard[i][col] = reversedResult[col];
      }

      result.mergedIndexes.forEach((reversedCol) => {
        mergedPositions.push({ row: i, col: 3 - reversedCol });
      });
    }

    if (direction === "up") {
      for (let row = 0; row < 4; row++) {
        nextBoard[row][i] = result.line[row];
      }

      result.mergedIndexes.forEach((row) => {
        mergedPositions.push({ row, col: i });
      });
    }

    if (direction === "down") {
      const reversedResult = [...result.line].reverse();

      for (let row = 0; row < 4; row++) {
        nextBoard[row][i] = reversedResult[row];
      }

      result.mergedIndexes.forEach((reversedRow) => {
        mergedPositions.push({ row: 3 - reversedRow, col: i });
      });
    }
  }

  /*
    실제 2048 규칙:
    - 보드가 변했을 때만 이동 성공
    - 이동 성공 시에만 새 타일 생성
    - 점수는 병합 점수만 더함
    - 단순 이동이면 totalGainedScore가 0이므로 점수 변화 없음
  */
  if (!boardsAreSame(oldBoard, nextBoard)) {
    board = nextBoard;
    score += totalGainedScore;

    addRandomTile();
    renderBoard();
  } else {
    // 보드가 안 움직였으면 아무 일도 일어나면 안 됨
    mergedPositions = [];
  }
}

/* 방향별 이동 함수 */

function moveLeft() {
  move("left");
}

function moveRight() {
  move("right");
}

function moveUp() {
  move("up");
}

function moveDown() {
  move("down");
}

/* ==============================
   PC/모바일 공통 스와이프 조작
   ============================== */

boardEl.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  isPointerDown = true;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  boardEl.setPointerCapture(event.pointerId);
});

boardEl.addEventListener("pointermove", (event) => {
  event.preventDefault();
});

boardEl.addEventListener("pointerup", (event) => {
  event.preventDefault();

  if (!isPointerDown) return;
  isPointerDown = false;

  const pointerEndX = event.clientX;
  const pointerEndY = event.clientY;

  const diffX = pointerEndX - pointerStartX;
  const diffY = pointerEndY - pointerStartY;

  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  // 너무 짧은 움직임은 무시
  if (absX < 40 && absY < 40) return;

  if (absX > absY) {
    if (diffX > 0) {
      moveRight();
    } else {
      moveLeft();
    }
  } else {
    if (diffY > 0) {
      moveDown();
    } else {
      moveUp();
    }
  }
});

boardEl.addEventListener("pointercancel", () => {
  isPointerDown = false;
});

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
