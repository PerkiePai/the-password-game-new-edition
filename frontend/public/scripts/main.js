import { hookAuthUI } from "./auth.js";
import { apiSaveResult, apiCheckRules, apiListRuns, apiDeleteRun } from "./api.js";
import { USER_KEY, LVL_KEY, TOKEN_KEY } from "./config.js";

const pages = {
  start: document.getElementById("startPage"),
  game: document.getElementById("gamePage"),
  lose: document.getElementById("losePage"),
};

const els = {
  startBtn: document.getElementById("startBtn"),
  retryBtn: document.getElementById("retryBtn"),
  pwd: document.getElementById("pwdInput"),
  lenVal: document.getElementById("lenVal"),
  rulesBox: document.getElementById("rulesList"),
  resultsBox: document.getElementById("resultsList"),
  levelVal: document.getElementById("levelVal"),
  timeLeft: document.getElementById("timeLeft"),
  statLast: document.getElementById("statLastPwd"),
  statTotal: document.getElementById("statTotalTime"),
  statAvg: document.getElementById("statAvgTime"),
  statLvl: document.getElementById("statLevel"),
  checkBtn: document.getElementById("checkBtn"),
  checkStatus: document.getElementById("checkStatus"),
  currentPwd: document.getElementById("currentPwd"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  leaderboardModal: document.getElementById("leaderboardModal"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardEmpty: document.getElementById("leaderboardEmpty"),
  leaderboardError: document.getElementById("leaderboardError"),
  leaderboardSpinner: document.getElementById("leaderboardSpinner"),
  leaderboardRefresh: document.getElementById("leaderboardRefreshBtn"),
  leaderboardClose: document.getElementById("leaderboardCloseBtn"),
  historyBtn: document.getElementById("historyBtn"),
  historyModal: document.getElementById("historyModal"),
  historyList: document.getElementById("historyList"),
  historyEmpty: document.getElementById("historyEmpty"),
  historyError: document.getElementById("historyError"),
  historySpinner: document.getElementById("historySpinner"),
  historyRefresh: document.getElementById("historyRefreshBtn"),
  historyClose: document.getElementById("historyCloseBtn"),
  quitBtn: document.getElementById("quitBtn"),
  resultsPanel: document.querySelector(".results-panel"),
};

const authUI = hookAuthUI();

const BASE_TIME = 20;
let level = 0;  
let time = BASE_TIME;
let timer = null;
let totalElapsed = 0;
let rules = [];
let isRunning = false;
let checking = false;
let lastRuleSignature = null;
let leaderboardRuns = [];
let leaderboardBusy = false;
let leaderboardLoaded = false;
let historyRuns = [];
let historyBusy = false;
let historyLoaded = false;
let historyUsername = null;

const loginBtn = document.getElementById("loginBtn");
const userPanel = document.getElementById("userPanel");

function show(page) {
  Object.values(pages).forEach((p) => p.classList.remove("visible"));
  pages[page].classList.add("visible");
  document.body.classList.toggle("lose-active", page === "lose");

  const isGame = page === "game";
  const canUseLeaderboard = page === "start";

  if (isGame) {
    loginBtn.classList.add("hidden");
    userPanel.classList.add("hidden");
    closeLeaderboardModal();
    closeHistoryModal();
  } else {
    authUI.showBadge();
  }

  if (canUseLeaderboard) {
    els.leaderboardBtn.classList.remove("hidden");
  } else {
    els.leaderboardBtn.classList.add("hidden");
    closeLeaderboardModal();
  }
}

function updateTimerDisplay() {
  els.timeLeft.textContent = String(Math.max(0, time));
}

function resetTimer() {
  time = BASE_TIME;
  updateTimerDisplay();
}

const getRuleSignature = (ruleItem) => {
  if (!ruleItem) return "";
  if (typeof ruleItem === "string") return ruleItem;
  return String(ruleItem.id ?? `${ruleItem.category ?? ""}:${ruleItem.rule ?? JSON.stringify(ruleItem)}`);
};

function renderRules(ruleSet) {
  els.rulesBox.innerHTML = "";
  if (!ruleSet.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "rule";
    placeholder.textContent = "Awaiting your first rule...";
    els.rulesBox.appendChild(placeholder);
    return;
  }

  const newestSignature = getRuleSignature(ruleSet[ruleSet.length - 1]);
  const displayRules = [...ruleSet].reverse();

  displayRules.forEach((ruleItem, idx) => {
    const container = document.createElement("div");
    container.className = "rule";
    const currentSignature = getRuleSignature(ruleItem);
    if (currentSignature === newestSignature && newestSignature !== lastRuleSignature) {
      container.classList.add("rule-enter");
    }

    const title = document.createElement("div");
    title.className = "rule-title";
    title.textContent =
      typeof ruleItem === "string"
        ? ruleItem
        : ruleItem?.rule || `Rule ${displayRules.length - idx}`;
    container.appendChild(title);

    if (typeof ruleItem === "object" && ruleItem !== null) {
      const meta = [];
      if (ruleItem.category) meta.push(ruleItem.category);
      if (ruleItem.difficulty) meta.push(ruleItem.difficulty);
      if (meta.length) {
        const metaEl = document.createElement("div");
        metaEl.className = "rule-meta";
        metaEl.textContent = meta.join(" • ");
        container.appendChild(metaEl);
      }
      if (ruleItem.example_valid || ruleItem.example_invalid) {
        const examples = document.createElement("div");
        examples.className = "rule-examples";
        if (ruleItem.example_valid) {
          const good = document.createElement("span");
          good.textContent = `✅ ${ruleItem.example_valid}`;
          examples.appendChild(good);
        }
        if (ruleItem.example_invalid) {
          const bad = document.createElement("span");
          bad.textContent = `❌ ${ruleItem.example_invalid}`;
          examples.appendChild(bad);
        }
        container.appendChild(examples);
      }
    }

    els.rulesBox.appendChild(container);
  });

  lastRuleSignature = newestSignature;

  if (ruleSet.length) {
    requestAnimationFrame(() => {
      els.rulesBox.scrollTo({
        top: els.rulesBox.scrollHeight,
        behavior: "smooth",
      });
    });
  }
}

function renderResults(results = []) {
  els.resultsBox.innerHTML = "";
  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "result-row";
    empty.textContent = "No checks yet. Press the button when ready.";
    els.resultsBox.appendChild(empty);
    return;
  }

  const orderedResults = [
    ...results.filter((entry) => !entry.pass),
    ...results.filter((entry) => entry.pass),
  ];

  orderedResults.forEach((entry) => {
    const row = document.createElement("div");
    row.className = `result-row ${entry.pass ? "pass" : "fail"}`;
    row.classList.add(entry.pass ? "result-pass-animate" : "result-fail-animate");
    row.addEventListener("animationend", () => {
      row.classList.remove("result-pass-animate", "result-fail-animate");
    });

    const ruleText = document.createElement("div");
    ruleText.className = "result-rule";
    ruleText.textContent = entry.rule;

    const reason = document.createElement("div");
    reason.className = "result-reason";
    reason.textContent = entry.reason;

    row.appendChild(ruleText);
    row.appendChild(reason);
    els.resultsBox.appendChild(row);
  });

  if (els.resultsPanel) {
    els.resultsPanel.classList.remove("panel-pulse");
    // Force reflow so animation can retrigger
    void els.resultsPanel.offsetWidth;
    els.resultsPanel.classList.add("panel-pulse");
  }
}

const formatSeconds = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  if (num < 60) return `${Math.round(num)}s`;
  const minutes = Math.floor(num / 60);
  const seconds = Math.round(num % 60);
  const secPart = seconds ? `${seconds}s` : "";
  return `${minutes}m ${secPart}`.trim();
};

const formatTimestamp = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function hideLeaderboardMessages() {
  els.leaderboardSpinner.classList.add("hidden");
  els.leaderboardError.classList.add("hidden");
  els.leaderboardEmpty.classList.add("hidden");
}

function renderLeaderboard(runs = []) {
  hideLeaderboardMessages();
  els.leaderboardList.innerHTML = "";
  if (!runs.length) {
    els.leaderboardEmpty.classList.remove("hidden");
    return;
  }

  const fragment = document.createDocumentFragment();
  runs.forEach((run, idx) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    if (idx < 3) {
      row.dataset.rank = String(idx + 1);
    }

    const rank = document.createElement("div");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${idx + 1}`;

    const body = document.createElement("div");
    body.className = "leaderboard-body";

    const userLine = document.createElement("div");
    userLine.className = "leaderboard-user";
    userLine.textContent = run.username || "Anonymous";

    const meta = document.createElement("div");
    meta.className = "leaderboard-meta";

    const levelTag = document.createElement("span");
    levelTag.textContent = `Lv ${run.level ?? 0}`;
    const avgTag = document.createElement("span");
    avgTag.textContent = `Avg ${formatSeconds(run.avgTime)}`;
    const totalTag = document.createElement("span");
    totalTag.textContent = `Total ${formatSeconds(run.totalTime)}`;
    const timeTag = document.createElement("span");
    timeTag.textContent = formatTimestamp(run.playedAt);

    meta.append(levelTag, avgTag, totalTag, timeTag);

    const pwd = document.createElement("div");
    pwd.className = "leaderboard-password";
    pwd.textContent = `Last: ${run.lastPassword || "—"}`;

    body.append(userLine, meta, pwd);
    row.append(rank, body);
    fragment.appendChild(row);
  });

  els.leaderboardList.appendChild(fragment);
}

function showLeaderboardLoading(message = "Loading runs…") {
  els.leaderboardSpinner.textContent = message;
  els.leaderboardSpinner.classList.remove("hidden");
  els.leaderboardError.classList.add("hidden");
  els.leaderboardEmpty.classList.add("hidden");
}

function showLeaderboardError(message) {
  els.leaderboardError.textContent = message;
  els.leaderboardError.classList.remove("hidden");
  els.leaderboardSpinner.classList.add("hidden");
  els.leaderboardEmpty.classList.add("hidden");
}

async function loadLeaderboard(force = false) {
  if (leaderboardBusy) return;
  if (!force && leaderboardLoaded && leaderboardRuns.length) {
    renderLeaderboard(leaderboardRuns);
    return;
  }

  leaderboardBusy = true;
  showLeaderboardLoading();
  try {
    const runs = await apiListRuns({ limit: 25 });
    leaderboardRuns = runs;
    leaderboardLoaded = true;
    renderLeaderboard(runs);
  } catch (err) {
    console.error("Failed to load leaderboard", err);
    showLeaderboardError(err?.message || "Unable to load leaderboard right now.");
  } finally {
    leaderboardBusy = false;
  }
}

function openLeaderboardModal() {
  if (els.leaderboardBtn.classList.contains("hidden")) return;
  closeHistoryModal();
  els.leaderboardModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  loadLeaderboard(true);
}

function closeLeaderboardModal() {
  els.leaderboardModal.classList.add("hidden");
  syncModalOpenState();
}

function syncModalOpenState() {
  if (
    els.leaderboardModal.classList.contains("hidden") &&
    els.historyModal.classList.contains("hidden")
  ) {
    document.body.classList.remove("modal-open");
  }
}

function hideHistoryMessages() {
  els.historySpinner.classList.add("hidden");
  els.historyError.classList.add("hidden");
  els.historyEmpty.classList.add("hidden");
}

function renderHistory(runs = []) {
  hideHistoryMessages();
  els.historyList.innerHTML = "";
  if (!runs.length) {
    els.historyEmpty.classList.remove("hidden");
    return;
  }

  const fragment = document.createDocumentFragment();
  runs.forEach((run, idx) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.dataset.rank = String(idx + 1);
    const matchId = run._id || run.id;
    if (matchId) {
      row.dataset.matchId = String(matchId);
    }

    const rank = document.createElement("div");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${idx + 1}`;

    const body = document.createElement("div");
    body.className = "leaderboard-body";

    const header = document.createElement("div");
    header.className = "leaderboard-user";
    header.textContent = run.username || "Anonymous";

    const meta = document.createElement("div");
    meta.className = "leaderboard-meta";
    const levelTag = document.createElement("span");
    levelTag.textContent = `Lv ${run.level ?? 0}`;
    const avgTag = document.createElement("span");
    avgTag.textContent = `Avg ${formatSeconds(run.avgTime)}`;
    const totalTag = document.createElement("span");
    totalTag.textContent = `Total ${formatSeconds(run.totalTime)}`;
    const timeTag = document.createElement("span");
    timeTag.textContent = formatTimestamp(run.playedAt);
    meta.append(levelTag, avgTag, totalTag, timeTag);

    const pwd = document.createElement("div");
    pwd.className = "leaderboard-password";
    pwd.textContent = `Last: ${run.lastPassword || "—"}`;

    const actions = document.createElement("div");
    actions.className = "history-actions";
    if (matchId) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn ghost sm danger history-delete";
      deleteBtn.dataset.id = String(matchId);
      deleteBtn.textContent = "Delete";
      actions.appendChild(deleteBtn);
    }

    body.append(header, meta, pwd, actions);
    row.append(rank, body);
    fragment.appendChild(row);
  });

  els.historyList.appendChild(fragment);
}

function showHistoryLoading(message = "Loading history…") {
  els.historySpinner.textContent = message;
  els.historySpinner.classList.remove("hidden");
  els.historyError.classList.add("hidden");
  els.historyEmpty.classList.add("hidden");
}

function showHistoryError(message) {
  els.historyError.textContent = message;
  els.historyError.classList.remove("hidden");
  els.historySpinner.classList.add("hidden");
  els.historyEmpty.classList.add("hidden");
}

async function loadHistory(force = false) {
  if (historyBusy) return;
  const username = localStorage.getItem(USER_KEY);
  if (!username) {
    showHistoryError("Login to view your history.");
    return;
  }

  if (username !== historyUsername) {
    historyUsername = username;
    historyRuns = [];
    historyLoaded = false;
  }

  if (!force && historyLoaded && historyRuns.length) {
    renderHistory(historyRuns);
    return;
  }

  historyBusy = true;
  showHistoryLoading();
  try {
    const runs = await apiListRuns({ username, limit: 50 });
    historyRuns = runs;
    historyLoaded = true;
    renderHistory(runs);
  } catch (err) {
    console.error("Failed to load history", err);
    showHistoryError(err?.message || "Unable to load history right now.");
  } finally {
    historyBusy = false;
  }
}

function openHistoryModal() {
  if (!els.historyBtn) return;
  closeLeaderboardModal();
  els.historyModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  loadHistory(true);
}

function closeHistoryModal() {
  els.historyModal.classList.add("hidden");
  syncModalOpenState();
}

async function deleteHistoryEntry(matchId, triggerBtn) {
  if (!matchId) return;
  if (!window.confirm("Delete this match from your history?")) return;

  const btn = triggerBtn;
  const originalText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Deleting…";
  }

  try {
    await apiDeleteRun(matchId);
    await loadHistory(true);
  } catch (err) {
    console.error("Failed to delete history entry", err);
    alert(err?.message || "Unable to delete this match.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || "Delete";
    }
  }
}

function updateStatusChip(status) {
  if (status) {
    els.checkStatus.dataset.state = status;
  } else {
    delete els.checkStatus.dataset.state;
  }
  if (status === "pass") {
    els.checkStatus.textContent = "PASS";
  } else if (status === "fail") {
    els.checkStatus.textContent = "FAIL";
  } else if (status === "loading") {
    els.checkStatus.textContent = "…";
  } else if (status === "error") {
    els.checkStatus.textContent = "ERROR";
  } else {
    els.checkStatus.textContent = "—";
  }
}

function setChecking(state) {
  checking = state;
  els.checkBtn.disabled = !isRunning || checking;
  els.checkBtn.textContent = checking ? "Checking..." : "Check";
}

function startTicker() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!isRunning) return;
    time -= 1;
    totalElapsed += 1;
    updateTimerDisplay();
    if (time <= 0) {
      endGame();
    }
  }, 1000);
}

function stopGameLoop() {
  isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  els.checkBtn.disabled = true;
}

async function requestRuleEvaluation(password, { bootstrap = false } = {}) {
  setChecking(true);
  updateStatusChip("loading");
  try {
    const response = await apiCheckRules({ password, rules });
    const prevLevel = level;
    rules = Array.isArray(response.updated_rules)
      ? response.updated_rules
      : rules;
    level = Number(response.level ?? rules.length ?? prevLevel);
    els.levelVal.textContent = level;
    els.currentPwd.textContent = password || "—";
    renderRules(rules);
    renderResults(response.results || []);

    if (!bootstrap && response.overall_pass) {
      resetTimer();
    }

    if (response.overall_pass) {
      updateStatusChip("pass");
    } else {
      updateStatusChip("fail");
    }
  } catch (err) {
    console.error("Rule check failed", err);
    updateStatusChip("error");
    throw err;
  } finally {
    setChecking(false);
  }
}

async function startGame() {
  stopGameLoop();
  show("game");
  isRunning = true;
  rules = [];
  level = 0;
  totalElapsed = 0;
  els.levelVal.textContent = level;
  els.pwd.value = "";
  els.lenVal.textContent = "0";
  els.currentPwd.textContent = "—";
  renderRules([]);
  renderResults([]);
  updateStatusChip();
  updateTimerDisplay();
  els.checkBtn.disabled = false;

  try {
    await requestRuleEvaluation("", { bootstrap: true });
  } catch {
    isRunning = false;
    els.checkBtn.disabled = true;
    return;
  }

  resetTimer();
  startTicker();
  els.pwd.focus();
}

function quitGame() {
  stopGameLoop();
  rules = [];
  level = 0;
  totalElapsed = 0;
  lastRuleSignature = null;
  els.levelVal.textContent = level;
  els.pwd.value = "";
  els.lenVal.textContent = "0";
  els.currentPwd.textContent = "—";
  renderRules([]);
  renderResults([]);
  updateStatusChip();
  resetTimer();
  show("start");
}

async function endGame() {
  if (!isRunning) return;
  stopGameLoop();
  const pwd = els.pwd.value;
  const completedLevels = Math.max(1, level || 1);
  const avg = (totalElapsed / completedLevels).toFixed(2);

  const previousHighest = Number(localStorage.getItem(LVL_KEY) || 0);
  const highest = Math.max(previousHighest, level);
  localStorage.setItem(LVL_KEY, highest);

  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
  const username = localStorage.getItem(USER_KEY);
  if (hasToken && username) {
    apiSaveResult({
      username,
      totalTime: totalElapsed,
      avgTime: Number(avg),
      level,
      lastPassword: pwd,
      rules,
    })
      .then((res) => {
        if (res?.highestLevel !== undefined) {
          localStorage.setItem(LVL_KEY, res.highestLevel);
        }
        authUI.showBadge();
      })
      .catch(() => {});
  } else {
    authUI.showBadge();
  }

  els.statLast.textContent = pwd || "—";
  els.statTotal.textContent = totalElapsed;
  els.statAvg.textContent = avg;
  els.statLvl.textContent = level;

  show("lose");
}

els.pwd.addEventListener("input", (e) => {
  const pwd = e.target.value;
  els.lenVal.textContent = String(pwd.length);
});

els.checkBtn.addEventListener("click", () => {
  if (!isRunning || checking) return;
  requestRuleEvaluation(els.pwd.value).catch(() => {});
});

els.startBtn.onclick = () => {
  startGame().catch(() => {});
};

els.retryBtn.onclick = () => {
  stopGameLoop();
  els.pwd.value = "";
  els.lenVal.textContent = "0";
  show("start");
};

if (els.quitBtn) {
  els.quitBtn.addEventListener("click", () => {
    quitGame();
  });
}

els.leaderboardBtn.addEventListener("click", () => {
  openLeaderboardModal();
});

els.leaderboardClose.addEventListener("click", () => {
  closeLeaderboardModal();
});

els.leaderboardRefresh.addEventListener("click", () => {
  loadLeaderboard(true);
});

els.leaderboardModal.addEventListener("click", (e) => {
  if (e.target === els.leaderboardModal) {
    closeLeaderboardModal();
  }
});

if (els.historyBtn) {
  els.historyBtn.addEventListener("click", () => {
    openHistoryModal();
  });
}

if (els.historyClose) {
  els.historyClose.addEventListener("click", () => {
    closeHistoryModal();
  });
}

if (els.historyRefresh) {
  els.historyRefresh.addEventListener("click", () => {
    loadHistory(true);
  });
}

if (els.historyModal) {
  els.historyModal.addEventListener("click", (e) => {
    if (e.target === els.historyModal) {
      closeHistoryModal();
    }
  });
}

if (els.historyList) {
  els.historyList.addEventListener("click", (e) => {
    const btn = e.target.closest(".history-delete");
    if (!btn) return;
    const matchId = btn.dataset.id;
    if (!matchId || btn.disabled) return;
    deleteHistoryEntry(matchId, btn);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  let handled = false;
  if (!els.leaderboardModal.classList.contains("hidden")) {
    closeLeaderboardModal();
    handled = true;
  }
  if (!els.historyModal.classList.contains("hidden")) {
    closeHistoryModal();
    handled = true;
  }
  if (handled) {
    e.preventDefault();
  }
});
