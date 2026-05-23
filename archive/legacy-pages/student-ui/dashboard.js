/**
 * Static UI: home wall of all exams + drill into a class for filtered cards.
 */
(function () {
  "use strict";

  var CLASS_ORDER = ["it108", "it203", "it110"];

  var CLASS_DATA = {
    it108: {
      code: "IT 108",
      name: "Information Assurance and Security I",
      exams: [
        {
          name: "3D INFOSEC QUIZ #1",
          questions: 20,
          id: 1,
        },
        {
          name: "INFOSEC QUIZ #2",
          questions: 18,
          id: 3,
        },
      ],
    },
    it203: {
      code: "IT203",
      name: "BSIT 3D • Integrative Programming and Technologies II",
      exams: [
        {
          name: "DATABASE MIDTERM",
          questions: 35,
          id: 2,
        },
        {
          name: "INTEGRATIVE MIDTERM",
          questions: 12,
          id: 4,
        },
      ],
    },
    it110: {
      code: "IT 110",
      name: "SOCIAL AND PROFESSIONAL ISSUES",
      exams: [],
    },
  };

  var viewHome = document.getElementById("view-home");
  var viewClass = document.getElementById("view-class");
  var breadcrumbWrap = document.getElementById("breadcrumb-class-wrap");
  var breadcrumbClass = document.getElementById("breadcrumb-class");
  var btnBack = document.getElementById("btn-back-classes");
  var classHeading = document.getElementById("class-detail-heading");
  var examsListEl = document.getElementById("class-exams-list");
  var homeExamsEl = document.getElementById("dashboard-all-exams");

  var LOBBY_BY_ID = {
    1: {
      title: "3D INFOSEC QUIZ #1",
      code: "IT 108",
      subject: "Information Assurance and Security I",
      questions: 20,
      question_types:
        "Multiple choice, identification, and true or false",
      instructor: "JUANITO P. ALVAREZ JR.",
      duration: "60 minutes",
    },
    2: {
      title: "DATABASE MIDTERM",
      code: "IT203",
      subject: "Integrative Programming and Technologies II",
      questions: 35,
      question_types: "Multiple choice and identification",
      instructor: "MARIA SANTOS",
      duration: "90 minutes",
    },
    3: {
      title: "INFOSEC QUIZ #2",
      code: "IT 108",
      subject: "Information Assurance and Security I",
      questions: 18,
      question_types: "Multiple choice and true or false",
      instructor: "JUANITO P. ALVAREZ JR.",
      duration: "60 minutes",
    },
    4: {
      title: "INTEGRATIVE MIDTERM",
      code: "IT203",
      subject: "Integrative Programming and Technologies II",
      questions: 12,
      question_types: "Multiple choice only",
      instructor: "MARIA SANTOS",
      duration: "45 minutes",
    },
  };

  var lobbyModal = document.getElementById("exam-lobby-modal");
  var lobbyBackdrop = document.getElementById("exam-lobby-modal-backdrop");
  var lobbyClose = document.getElementById("exam-lobby-modal-close");
  var lobbyDismiss = document.getElementById("exam-lobby-modal-dismiss");
  var lobbyTitle = document.getElementById("exam-lobby-modal-title");
  var lobbySub = document.getElementById("exam-lobby-modal-sub");
  var lobbyJoin = document.getElementById("exam-lobby-modal-join");
  var lobbyValFormat = document.getElementById("exam-lobby-val-format");
  var lobbyValItems = document.getElementById("exam-lobby-val-items");
  var lobbyValDuration = document.getElementById("exam-lobby-val-duration");
  var lobbyValInstructor = document.getElementById("exam-lobby-val-instructor");

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function questionsLabel(exam) {
    var n =
      typeof exam.questions === "number"
        ? exam.questions
        : parseInt(exam.questions, 10) || 0;
    return n === 1 ? "1 question" : n + " questions";
  }

  function buildExamCardHtml(exam, options) {
    var showClass = options && options.showClassCode && exam.classCode;
    var id = Number(exam.id);
    var classLine = showClass
      ? '<p class="available-exam-card__class">' +
        escapeHtml(exam.classCode) +
        "</p>"
      : "";
    return (
      '<div class="available-exam-card" role="button" tabindex="0" ' +
      'onclick="enterExam(' +
      id +
      ')" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();enterExam(' +
      id +
      ');}">' +
      classLine +
      '<h3 class="available-exam-card__title">' +
      escapeHtml(exam.name) +
      "</h3>" +
      '<p class="available-exam-card__meta">' +
      escapeHtml(questionsLabel(exam)) +
      "</p>" +
      "</div>"
    );
  }

  function buildCardsGridHtml(exams, options) {
    if (!exams || exams.length === 0) {
      return '<p class="exams-empty">No exams assigned yet.</p>';
    }
    return (
      '<div class="available-exams-card-grid">' +
      exams.map(function (exam) {
        return buildExamCardHtml(exam, options);
      }).join("") +
      "</div>"
    );
  }

  function flattenAllExamsForHome() {
    var out = [];
    CLASS_ORDER.forEach(function (key) {
      var block = CLASS_DATA[key];
      if (!block || !block.exams) return;
      block.exams.forEach(function (exam) {
        out.push(
          Object.assign({}, exam, { classCode: block.code })
        );
      });
    });
    return out;
  }

  function renderHomeWall() {
    if (!homeExamsEl) return;
    var all = flattenAllExamsForHome();
    homeExamsEl.innerHTML = buildCardsGridHtml(all, {
      showClassCode: true,
    });
  }

  function renderExams(exams) {
    if (!examsListEl) return;
    examsListEl.innerHTML = buildCardsGridHtml(exams, {
      showClassCode: false,
    });
  }

  function showHome() {
    if (viewHome) viewHome.classList.add("is-active");
    if (viewClass) viewClass.classList.remove("is-active");
    if (breadcrumbWrap) breadcrumbWrap.hidden = true;
    if (breadcrumbClass) breadcrumbClass.textContent = "";
  }

  function showClass(classKey) {
    var data = CLASS_DATA[classKey];
    if (!data) return;

    if (viewHome) viewHome.classList.remove("is-active");
    if (viewClass) viewClass.classList.add("is-active");
    if (breadcrumbWrap) breadcrumbWrap.hidden = false;
    if (breadcrumbClass) breadcrumbClass.textContent = data.code;
    if (classHeading) {
      classHeading.innerHTML =
        "<strong>" +
        escapeHtml(data.code) +
        '</strong> <span aria-hidden="true">·</span> ' +
        escapeHtml(data.name);
    }
    renderExams(data.exams);
  }

  function getLobbyFallback(id) {
    return {
      title: "Examination",
      code: "—",
      subject: "—",
      questions: 0,
      question_types: "—",
      instructor: "—",
      duration: "—",
      _id: id,
    };
  }

  function openExamLobbyModal(id) {
    var data = LOBBY_BY_ID[id] || getLobbyFallback(id);
    if (!lobbyModal || !lobbyTitle || !lobbySub) return;

    lobbyTitle.textContent = data.title;
    lobbySub.textContent = data.code + " · " + data.subject;
    if (lobbyValFormat) {
      lobbyValFormat.textContent = data.question_types;
    }
    if (lobbyValItems) {
      lobbyValItems.textContent =
        data.questions === 1 ? "1 question" : data.questions + " questions";
    }
    if (lobbyValDuration) lobbyValDuration.textContent = data.duration;
    if (lobbyValInstructor) lobbyValInstructor.textContent = data.instructor;
    if (lobbyJoin) {
      lobbyJoin.href =
        "exam_session.php?id=" + encodeURIComponent(String(id));
    }

    lobbyModal.removeAttribute("hidden");
    lobbyModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (lobbyClose) {
      lobbyClose.focus();
    }
  }

  function closeExamLobbyModal() {
    if (!lobbyModal) return;
    lobbyModal.setAttribute("hidden", "hidden");
    lobbyModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function bindExamLobbyModal() {
    if (lobbyBackdrop) {
      lobbyBackdrop.addEventListener("click", closeExamLobbyModal);
    }
    if (lobbyClose) {
      lobbyClose.addEventListener("click", closeExamLobbyModal);
    }
    if (lobbyDismiss) {
      lobbyDismiss.addEventListener("click", closeExamLobbyModal);
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!lobbyModal || lobbyModal.hasAttribute("hidden")) return;
      closeExamLobbyModal();
    });
  }

  window.enterExam = function (id) {
    openExamLobbyModal(Number(id));
  };

  function bindClassRows() {
    document.querySelectorAll("[data-class-key]").forEach(function (row) {
      row.addEventListener("click", function () {
        var key = row.getAttribute("data-class-key");
        if (key) showClass(key);
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          var key = row.getAttribute("data-class-key");
          if (key) showClass(key);
        }
      });
    });
  }

  function init() {
    bindClassRows();
    bindExamLobbyModal();
    renderHomeWall();
  }

  if (btnBack) {
    btnBack.addEventListener("click", showHome);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
