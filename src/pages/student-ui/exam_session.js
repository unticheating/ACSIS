/**
 * Static UI flow: lobby → countdown → MC → identification → manual coding → true/false → results.
 * Suspicious-activity overlay: tab hidden (debounced) or F8 during questions (demo).
 */
(function () {
  "use strict";

  var LOBBY_MS = 5500;
  var COUNTDOWN_SEC = 3;
  var DETECTION_RETURN_SEC = 5;
  var OVERLAY_FADE_MS = 340;
  var TAB_LEAVE_DEBOUNCE_MS = 450;
  var POST_DETECTION_COOLDOWN_MS = 1400;

  var scenes = {
    lobby: document.getElementById("scene-lobby"),
    countdown: document.getElementById("scene-countdown"),
    mc: document.getElementById("scene-mc"),
    id: document.getElementById("scene-id"),
    code: document.getElementById("scene-code"),
    tf: document.getElementById("scene-tf"),
  };

  var countdownNumEl = document.getElementById("countdown-number");
  var detectionOverlay = document.getElementById("scene-detection");
  var detectionReturnEl = document.getElementById("detection-return");

  var progressFills = {
    mc: document.getElementById("progress-mc"),
    id: document.getElementById("progress-id"),
    code: document.getElementById("progress-code"),
    tf: document.getElementById("progress-tf"),
  };

  var activeScene = "lobby";
  var detectionRunning = false;
  var postDetectionCooldownUntil = 0;
  var visibilityLeaveTimer = null;

  function isExamScene(name) {
    return name === "mc" || name === "id" || name === "code" || name === "tf";
  }

  function showScene(name) {
    activeScene = name;
    Object.keys(scenes).forEach(function (key) {
      if (scenes[key]) {
        scenes[key].classList.toggle("is-active", key === name);
      }
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function runLobby() {
    showScene("lobby");
    return wait(LOBBY_MS);
  }

  function runCountdown() {
    showScene("countdown");
    var n = COUNTDOWN_SEC;
    function showThenAdvance() {
      if (countdownNumEl) {
        countdownNumEl.textContent = String(n);
      }
      if (n <= 1) {
        setTimeout(function () {
          showScene("mc");
        }, 1000);
        return;
      }
      n -= 1;
      setTimeout(showThenAdvance, 1000);
    }
    showThenAdvance();
  }

  function showDetectionThenResume(returnToScene, opts) {
    opts = opts || {};
    if (!detectionOverlay || !detectionReturnEl || detectionRunning) return;
    if (!opts.skipCooldown && Date.now() < postDetectionCooldownUntil) return;

    detectionRunning = true;
    var left = DETECTION_RETURN_SEC;

    function finish() {
      detectionOverlay.classList.remove("is-active");
      setTimeout(function () {
        showScene(returnToScene);
        detectionRunning = false;
        postDetectionCooldownUntil = Date.now() + POST_DETECTION_COOLDOWN_MS;
      }, OVERLAY_FADE_MS);
    }

    function tickReturn() {
      if (left <= 0) {
        finish();
        return;
      }
      detectionReturnEl.textContent =
        "Returning to exam in " + String(left);
      left -= 1;
      setTimeout(tickReturn, 1000);
    }

    requestAnimationFrame(function () {
      detectionOverlay.classList.add("is-active");
    });
    tickReturn();
  }

  function scheduleDetectionFromTabLeave() {
    if (visibilityLeaveTimer) {
      clearTimeout(visibilityLeaveTimer);
      visibilityLeaveTimer = null;
    }
    if (!document.hidden) return;
    if (!isExamScene(activeScene) || detectionRunning) return;

    visibilityLeaveTimer = setTimeout(function () {
      visibilityLeaveTimer = null;
      if (!document.hidden || !isExamScene(activeScene) || detectionRunning) return;
      showDetectionThenResume(activeScene);
    }, TAB_LEAVE_DEBOUNCE_MS);
  }

  function cancelTabLeaveDetectionSchedule() {
    if (visibilityLeaveTimer) {
      clearTimeout(visibilityLeaveTimer);
      visibilityLeaveTimer = null;
    }
  }

  function goToExamResult() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    window.location.href =
      "exam_result.php" + (id ? "?id=" + encodeURIComponent(id) : "");
  }

  function bindDetectionTriggers() {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        scheduleDetectionFromTabLeave();
      } else {
        cancelTabLeaveDetectionSchedule();
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (detectionRunning) return;
      if (!isExamScene(activeScene)) return;
      if (ev.code !== "F8") return;
      ev.preventDefault();
      showDetectionThenResume(activeScene, { skipCooldown: true });
    });
  }

  function bindOptionRows(container) {
    if (!container) return;
    container.querySelectorAll(".option-row").forEach(function (row) {
      row.addEventListener("click", function () {
        container.querySelectorAll(".option-row").forEach(function (r) {
          r.classList.remove("is-selected");
        });
        row.classList.add("is-selected");
      });
    });
  }

  function bindMc() {
    bindOptionRows(document.getElementById("mc-options"));
    var btn = document.getElementById("btn-next-mc");
    if (btn) {
      btn.addEventListener("click", function () {
        showScene("id");
      });
    }
  }

  function bindId() {
    var btn = document.getElementById("btn-next-id");
    if (btn) {
      btn.addEventListener("click", function () {
        showScene("code");
      });
    }
  }

  function bindCode() {
    var btn = document.getElementById("btn-next-code");
    if (btn) {
      btn.addEventListener("click", function () {
        showScene("tf");
      });
    }
  }

  function bindTf() {
    bindOptionRows(document.getElementById("tf-options"));
    var btn = document.getElementById("btn-next-tf");
    if (btn) {
      btn.addEventListener("click", function () {
        goToExamResult();
      });
    }
  }

  function init() {
    bindMc();
    bindId();
    bindCode();
    bindTf();
    bindDetectionTriggers();

    if (progressFills.mc) progressFills.mc.style.width = "18%";
    if (progressFills.id) progressFills.id.style.width = "32%";
    if (progressFills.code) progressFills.code.style.width = "55%";
    if (progressFills.tf) progressFills.tf.style.width = "82%";

    runLobby().then(runCountdown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
