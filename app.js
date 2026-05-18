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
// 게임 시간: 4분 = 240초
const EXPERIMENT_SECONDS = 1;

// 알림은 5초 동안 화면에 표시
const NOTIFICATION_VISIBLE_MS = 5000;

// 알림 표시 시간(초 단위)
const NOTIFICATION_VISIBLE_SECONDS = NOTIFICATION_VISIBLE_MS / 1000;

// 전체 알림 개수
// 중요 알림 6개 + 비중요 알림 6개 = 총 12개
const NOTIFICATION_COUNT = 12;

// 게임 시작 후 30초 동안은 알림이 나오지 않음
const MIN_NOTIFICATION_TIME = 30;

// 알림은 30초 ~ 180초 구간에서만 제시
// 즉, 2분 30초 동안 알림 제시 후 마지막 2분은 게임에만 집중
const NOTIFICATION_END_TIME = 180;

// 마지막 알림도 180초 전에 사라지도록 최대 표시 시점 설정
const MAX_NOTIFICATION_TIME = NOTIFICATION_END_TIME - NOTIFICATION_VISIBLE_SECONDS;

/* ==============================
   DOM 요소
   ============================== */

const participantForm = document.getElementById("participantForm");
const recallForm = document.getElementById("recallForm");

const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const boardEl = document.getElementById("board");
const reshuffleBtn = document.getElementById("reshuffleBtn");

const notificationToast = document.getElementById("notificationToast");
const toastImportance = document.getElementById("toastImportance");
const toastMessage = document.getElementById("toastMessage");

const surveyList = document.getElementById("surveyList");
const summaryBox = document.getElementById("summaryBox");

const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const restartBtn = document.getElementById("restartBtn");

const guideScreen = document.getElementById("guideScreen");
const startScreen = document.getElementById("startScreen");
const experimentScreen = document.getElementById("experimentScreen");
const surveyScreen = document.getElementById("surveyScreen");
const resultScreen = document.getElementById("resultScreen");

const guideConfirmBtn = document.getElementById("guideConfirmBtn");
const guideAgreeCheck = document.getElementById("guideAgreeCheck");

const guideNextBtns = document.querySelectorAll(".guide-next-btn");
const guidePrevBtns = document.querySelectorAll(".guide-prev-btn");
const guidePages = document.querySelectorAll(".guide-page");
/* ==============================
   실험 데이터 저장 변수
   ============================== */

let participantInfo = {};
let notificationSchedule = [];
let shownNotifications = [];
let surveyResponses = {};

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
  "오늘 18시 성적 장학금 신청 마감! 증빙 서류를 반드시 제출하세요.",
  "최종 면접 합격 결과가 발표되었습니다. 사이트에서 확인하세요.",
  "오늘 15시 수업 휴강 안내 및 보강 일정을 확인하세요.",
  "급한 일이니 메시지 확인하는 대로 집으로 바로 전화해라.",
  "2026-1학기 중간고사 성적 조회가 현재 가능합니다. 점수를 확인하세요.",
  "오늘 저녁 7시 정기 총회 장소가 [공학관 201호]로 변경되었습니다."
];

const lowImportanceMessages = [
  "최근 3일간 걸음 수가 많이 부족합니다. 가벼운 산책을 권장합니다.",
  "에스파 유튜브에서 업로드한 동영상: aespa 에스파 'Rich Man' MV 공개",
  "ruwon님이 회원님의 게시물을 좋아합니다.",
  "야식 출출하지 않으세요? 지금 주문하면 배달비 0원 쿠폰이 즉시 지급!",
  "건조한 날씨로 산불이 발생할 위험이 높습니다.",
  "지금 만보기 미션 완료! 10000원을 받으러 아래 버튼을 클릭하세요."
];

/* ==============================
   화면 전환 함수
   ============================== */

function showScreen(screen) {
  [guideScreen, startScreen, experimentScreen, surveyScreen, resultScreen].forEach((s) => {
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
   사전 안내 페이지 전환
   ============================== */

function showGuidePage(pageNumber) {
  guidePages.forEach((page) => {
    page.classList.remove("active");
  });

  const targetPage = document.getElementById(`guidePage${pageNumber}`);

  if (targetPage) {
    targetPage.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

guideNextBtns.forEach((button) => {
  button.addEventListener("click", () => {
    const nextPage = button.dataset.next;
    showGuidePage(nextPage);
  });
});

guidePrevBtns.forEach((button) => {
  button.addEventListener("click", () => {
    const prevPage = button.dataset.prev;
    showGuidePage(prevPage);
  });
});

/* ==============================
   체크박스 확인 후 참가자 정보 입력 화면 이동
   ============================== */

guideAgreeCheck.addEventListener("change", () => {
  guideConfirmBtn.disabled = !guideAgreeCheck.checked;
});

guideConfirmBtn.addEventListener("click", () => {
  if (!guideAgreeCheck.checked) {
    alert("안내사항 확인 체크박스를 먼저 선택해 주세요.");
    return;
  }

  showScreen(startScreen);
});


/* ==============================
   참가자 정보 입력 후 실험 시작
   ============================== */

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // 데이터 구조 유지 및 에러 방지를 위한 고유 ID 자동 생성
  participantInfo = {
    participantId: "P_" + Date.now(),
    age: "N/A",
    gender: "N/A",
    experimentDate: new Date().toLocaleDateString("ko-KR")
  };

  // 1. [중요] index.html에 정의된 ID에 맞게 experimentScreen 요소를 지정하여 화면 전환
  if (typeof showScreen === "function" && typeof experimentScreen !== "undefined") {
    showScreen(experimentScreen);
  } else {
    // 만약 상단에 변수 선언이 안 되어 있을 경우를 대비한 대체 코드
    const expScreen = document.getElementById("experimentScreen");
    if (expScreen) {
      [guideScreen, startScreen, experimentScreen, surveyScreen, resultScreen].forEach((s) => {
        if(s) s.classList.remove("active");
      });
      expScreen.classList.add("active");
    }
  }

  // 2. 4분 실험 타이머 및 게임 초기화 가동
  startExperiment();
  
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  surveyResponses = {};

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
  // 알림 테두리 색상
  const colors = ["red", "green", "blue"];

  // 5개 알림에 색상을 최대한 고르게 배정하는 함수
  function createBalancedColors(count) {
    const result = [];

    while (result.length < count) {
      result.push(...shuffleArray(colors));
    }

    return shuffleArray(result.slice(0, count));
  }

  const highColors = createBalancedColors(highImportanceMessages.length);
  const lowColors = createBalancedColors(lowImportanceMessages.length);

  // 중요 알림 5개 생성
  const highNotifications = shuffleArray(highImportanceMessages).map((message, index) => {
    return {
      color: highColors[index],
      importance: "high",
      message
    };
  });

  // 비중요 알림 5개 생성
  const lowNotifications = shuffleArray(lowImportanceMessages).map((message, index) => {
    return {
      color: lowColors[index],
      importance: "low",
      message
    };
  });

  // 중요 5개 + 비중요 5개를 합친 뒤 순서 랜덤화
  const baseConditions = shuffleArray([
    ...highNotifications,
    ...lowNotifications
  ]);

  const randomTimes = [];

  const availableStart = MIN_NOTIFICATION_TIME; // 30초
  const availableEnd = MAX_NOTIFICATION_TIME;   // 175초

  // 30초 ~ 175초 구간을 알림 10개가 들어갈 수 있도록 나눔
  const totalRange = availableEnd - availableStart;
  const interval = totalRange / NOTIFICATION_COUNT;

  for (let i = 0; i < NOTIFICATION_COUNT; i++) {
    const sectionStart = availableStart + i * interval;
    const sectionEnd = availableStart + (i + 1) * interval;

    // 각 구간 안에서 랜덤 시점 선택
    const randomTime = Math.floor(
      sectionStart + Math.random() * (sectionEnd - sectionStart)
    );

    randomTimes.push(Math.min(randomTime, availableEnd));
  }

  randomTimes.sort((a, b) => a - b);

  notificationSchedule = baseConditions.map((condition, index) => {
    return {
      id: `N${String(index + 1).padStart(2, "0")}`,
      color: condition.color,
      importance: condition.importance,
      message: condition.message,
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

  // 중요도 문구는 참가자에게 보이지 않게 숨김
  toastImportance.textContent = "";
  toastImportance.style.display = "none";

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

  // 실험 화면에서 걸어둔 스크롤 잠금 해제
  document.body.classList.remove("lock-scroll");
  document.body.style.overflow = "";
  document.body.style.height = "";
  document.body.style.position = "";
  document.body.style.width = "";

  showScreen(surveyScreen);

  // 설문 시작 시 화면 맨 위로 이동
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
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
  updateReshuffleButton();
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

function hasAvailableMove() {
  // 빈칸이 있으면 아직 이동 가능
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === 0) {
        return true;
      }
    }
  }

  // 가로로 합칠 수 있는 타일이 있는지 확인
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === board[row][col + 1]) {
        return true;
      }
    }
  }

  // 세로로 합칠 수 있는 타일이 있는지 확인
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === board[row + 1][col]) {
        return true;
      }
    }
  }

  // 빈칸도 없고 합칠 숫자도 없으면 이동 불가
  return false;
}

function updateReshuffleButton() {
  if (!reshuffleBtn) return;

  if (!hasAvailableMove()) {
    reshuffleBtn.classList.remove("hidden");
  } else {
    reshuffleBtn.classList.add("hidden");
  }
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
   CSV 다운로드
   ========================================================= */

if (downloadCsvBtn) {
  downloadCsvBtn.addEventListener("click", () => {
    downloadCSV();
  });
}

function downloadCSV() {
  const headers = [
    "participantId",
    "age",
    "gender",
    "experimentDate",
    "freeRecallText",
    "colorRecallText",
    "memoryReason",
    "mostNoticeableColor",
    "mostNoticeableOther",
    "colorMemoryHelp",
    "colorChoiceReason",
    "mentalEffort",
    "timePressure",
    "attentionDemand",
    "taskSuccess"
  ];

  const row = [
    participantInfo.participantId,
    participantInfo.age,
    participantInfo.gender,
    participantInfo.experimentDate,
    surveyResponses.freeRecallText,
    surveyResponses.colorRecallText,
    surveyResponses.memoryReason,
    surveyResponses.mostNoticeableColor,
    surveyResponses.mostNoticeableOther,
    surveyResponses.colorMemoryHelp,
    surveyResponses.colorChoiceReason,
    surveyResponses.mentalEffort,
    surveyResponses.timePressure,
    surveyResponses.attentionDemand,
    surveyResponses.taskSuccess
  ];

  const csvContent = [
    headers.join(","),
    row
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
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

reshuffleBtn.addEventListener("click", () => {
  continueWithNewBoard();
});

function continueWithNewBoard() {
  // 점수와 남은 시간은 유지하고 보드만 새로 시작
  board = Array.from({ length: 4 }, () => Array(4).fill(0));
  mergedPositions = [];

  addRandomTile();
  addRandomTile();

  renderBoard();
}

restartBtn.addEventListener("click", () => {
  location.reload();
});
