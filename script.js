const headerEl = document.querySelector("header");
headerEl.classList.add("active");

document.querySelector(".mouse").addEventListener("click", function () {
  document.getElementById("explain").scrollIntoView({ behavior: "smooth" });
});

function scrollToSection(event) {
  event.preventDefault();
  const targetId = event.currentTarget.getAttribute("href");
  document.querySelector(targetId).scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", scrollToSection);
});

const animationMove = function (selector) {
  const targetEl = document.querySelector(selector);
  const browserScrollY = window.pageYOffset;
  const targetScrolly = targetEl.getBoundingClientRect().top + browserScrollY;
  window.scrollTo({ top: targetScrolly, behavior: "smooth" });
};

window.addEventListener("scroll", function () {
  // 대상 요소 선택
  var pElement = document.querySelector(".ptitle p");
  var h2Element = document.querySelector(".title2 h2");

  // 요소의 위치 확인
  var pPosition = pElement.getBoundingClientRect().top;
  var h2Position = h2Element.getBoundingClientRect().top;
  var screenPosition = window.innerHeight / 1.3; // 화면 높이의 3/4 지점

  // p 요소가 화면에 나타나면 visible 클래스 추가
  if (pPosition < screenPosition) {
    pElement.classList.add("visible");
  }

  // h2 요소가 화면에 나타나면 visible 클래스 추가
  if (h2Position < screenPosition) {
    h2Element.classList.add("visible");
  }
});

// 모달을 열고 이미지를 확대하는 함수
function openModal(img) {
  var modal = document.getElementById("imageModal");
  var modalImg = document.getElementById("modalImg");

  modal.style.display = "block"; // 모달 보이기
  modalImg.src = img.src; // 클릭한 이미지의 경로를 모달 이미지로 설정
}

// 모달을 닫는 함수
function closeModal() {
  var modal = document.getElementById("imageModal");
  modal.style.display = "none"; // 모달 닫기
}

document.addEventListener("DOMContentLoaded", () => {
  const profiles = [
    {
      imgSrc: "images/정.png",
      name: "정도영",
      position: "CEO",
      bio: [
        "농촌진흥청 공공데이터 활용 예비창업 프로젝트 팀장",
        "2018~2019 부산국제광고제 C.C본선",
        "2024 농림축산식품부 공공데이터활용 창업경진대회 3위",
        "2024 제2회 제6보병사단 창업경진대회 1위",
        '농정원 "창업표준 프로세스"등 다수 정규 교육과정 수료',
      ],
    },
    {
      imgSrc: "images/park.png",
      name: "박무경",
      position: "CTO",
      bio: [
        "전) DiveXr 메타버스 개발 연구원",
        "전) PlugVr 의료용 2D/3D 콘텐츠 메인 개발자",
        "전) 명지재단 산학사업 메인개발/PM",
        "전) 미래산업과학고 개발 외부강사",
        "영남이공대학교 공학기술교육혁신센터",
      ],
    },
    {
      imgSrc: "images/임.png",
      name: "임현진",
      position: "Designer",
      bio: [
        "전) MDinsight 디자인부서 재직",
        "2023 외국인 창업대전 Oasis Pip제작",
        "아랍에미리트 사르자 국제도서전(SIBF) 모션그래픽 영상 제작",
        "부다페스트 헝가리 문화원 미술작품 전시보조물 제작",
        "2023 미래한국 공모전 시상식 배너 제작",
      ],
    },
    {
      imgSrc: "images/전.png",
      name: "전현진",
      position: "QA/QC",
      bio: [
        "전) 디엘애즈바이 기획 자문",
        "전) 예비창업팀 YOGI JOGI 기획 컨설턴트",
        "로컬 여행 플랫폼 맵핑 프로젝트 투자의향서 유치",
        "치유농업 예약 플랫폼 큐어팜 프로젝트 마케팅 컨설턴트",
        "한국디자인진흥원 디자인그라운드 교육과정 수료 (UI/UX)",
      ],
    },
  ];

  let currentProfile = 0;

  const profileImg = document.getElementById("profile-img");
  const profileName = document.getElementById("profile-name");
  const profilePosition = document.getElementById("profile-position");
  const profileBio = document.getElementById("profile-bio");

  function updateProfile(index) {
    const profile = profiles[index];
    profileImg.src = profile.imgSrc;
    profileName.textContent = profile.name;
    profilePosition.textContent = profile.position;
    profileBio.innerHTML = profile.bio.map((item) => `<p>${item}</p>`).join("");
  }

  document.getElementById("prev").addEventListener("click", () => {
    currentProfile =
      currentProfile === 0 ? profiles.length - 1 : currentProfile - 1;
    updateProfile(currentProfile);
  });

  document.getElementById("next").addEventListener("click", () => {
    currentProfile =
      currentProfile === profiles.length - 1 ? 0 : currentProfile + 1;
    updateProfile(currentProfile);
  });

  // 초기 프로필 설정
  updateProfile(currentProfile);
});
