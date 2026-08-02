const LETTERS = ["A", "B", "C", "D"];
const isEmbedded = Array.isArray(window.EMBEDDED_QUESTIONS);

const screens = {
  start: document.getElementById("screen-start"),
  quiz: document.getElementById("screen-quiz"),
  results: document.getElementById("screen-results"),
  history: document.getElementById("screen-history"),
};

let manifest = null;
let round = null;
let answered = false;
let playerName = "You";
let currentSetId = null;
let lastResult = null;

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("active"));
  screens[name].classList.add("active");
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

async function init() {
  if (isEmbedded) {
    renderEmbeddedSetLabel();
  } else {
    try {
      manifest = await Quiz.loadManifest();
      renderSetList();
    } catch (err) {
      document.getElementById("set-list").innerHTML =
        `<div class="empty-note">Failed to load question sets: ${err.message}</div>`;
    }
  }

  document.getElementById("btn-start").addEventListener("click", startQuiz);
  document.getElementById("btn-view-history").addEventListener("click", () => {
    renderHistory();
    showScreen("history");
  });
  document.getElementById("btn-next").addEventListener("click", nextQuestion);
  document.getElementById("btn-play-again").addEventListener("click", startQuiz);
  document.getElementById("btn-download-results").addEventListener("click", downloadResults);
  document.getElementById("btn-results-history").addEventListener("click", () => {
    renderHistory();
    showScreen("history");
  });
  document.getElementById("btn-results-home").addEventListener("click", () => showScreen("start"));
  document.getElementById("btn-history-home").addEventListener("click", () => showScreen("start"));
}

function renderEmbeddedSetLabel() {
  const meta = window.EMBEDDED_SET_META || {};
  const container = document.getElementById("set-list");
  container.innerHTML = `
    <div class="embedded-set-label">${meta.label || "Quiz set"} — ${window.EMBEDDED_QUESTIONS.length} questions</div>
  `;
}

function renderSetList() {
  const container = document.getElementById("set-list");
  container.innerHTML = "";
  manifest.sets.forEach((set, i) => {
    const label = document.createElement("label");
    label.className = "set-option";
    label.innerHTML = `
      <input type="checkbox" value="${set.file}" ${i === 0 ? "checked" : ""} />
      <span>${set.label} — ${set.questionCount} questions</span>
    `;
    container.appendChild(label);
  });
}

function getSelectedSetFiles() {
  return Array.from(document.querySelectorAll("#set-list input:checked")).map((el) => el.value);
}

async function startQuiz() {
  const nameInput = document.getElementById("player-name");
  playerName = (nameInput.value || "").trim() || "You";

  if (isEmbedded) {
    const meta = window.EMBEDDED_SET_META || {};
    currentSetId = meta.id || "embedded";
    round = new Quiz.QuizRound(window.EMBEDDED_QUESTIONS);
    answered = false;
    showScreen("quiz");
    renderQuestion();
    return;
  }

  const files = getSelectedSetFiles();
  if (files.length === 0) {
    alert("Pick at least one question set.");
    return;
  }
  const btn = document.getElementById("btn-start");
  btn.disabled = true;
  try {
    const sets = await Promise.all(files.map((f) => Quiz.loadQuestionSet(f)));
    const allQuestions = sets.flat();
    currentSetId = files.map((f) => f.replace(/\.json$/, "")).join("+");
    round = new Quiz.QuizRound(allQuestions);
    answered = false;
    showScreen("quiz");
    renderQuestion();
  } catch (err) {
    alert(`Failed to start quiz: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

function renderDots() {
  const dots = document.getElementById("quiz-dots");
  dots.innerHTML = "";
  round.questions.forEach((q, i) => {
    const dot = document.createElement("span");
    dot.className = "dot";
    if (i < round.answers.length) {
      dot.classList.add(round.answers[i].correct ? "done-correct" : "done-wrong");
    } else if (i === round.currentIndex) {
      dot.classList.add("current");
    }
    dots.appendChild(dot);
  });
}

function renderAudio(audio) {
  const container = document.getElementById("quiz-audio");
  const hasSource = audio && (audio.url || audio.videoId);
  if (!hasSource) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  container.style.display = "block";

  if (audio.type === "youtube" && audio.videoId) {
    const start = audio.start ? `&start=${audio.start}` : "";
    // Blurred + hidden behind a "listen only" button until answered: the
    // YouTube embed's own thumbnail/title overlay would otherwise name the
    // artist/song outright before anyone even presses play.
    container.innerHTML = `
      <div class="yt-wrap hidden" id="yt-wrap">
        <iframe
          id="yt-frame"
          src="https://www.youtube-nocookie.com/embed/${audio.videoId}?enablejsapi=1&controls=1&modestbranding=1&rel=0${start}"
          title="Audio clip"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
        <button type="button" class="yt-reveal-btn" id="yt-play-btn">▶ Play clip — video hidden until you answer</button>
      </div>
      ${audio.credit ? `<span class="audio-credit hidden" id="audio-credit">${audio.credit}</span>` : ""}
    `;
    document.getElementById("yt-play-btn").addEventListener("click", (e) => {
      const frame = document.getElementById("yt-frame");
      frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
      e.target.textContent = "🔊 Playing — video hidden until you answer";
    });
    return;
  }

  container.innerHTML = `
    <audio controls preload="none" src="${audio.url}"></audio>
    ${audio.credit ? `<span class="audio-credit hidden" id="audio-credit">${audio.credit}</span>` : ""}
  `;
}

function renderQuestion() {
  answered = false;
  const q = round.current;

  document.getElementById("quiz-progress").textContent = `Q ${round.currentIndex + 1}/${round.total}`;
  document.getElementById("quiz-score").textContent = `Score ${round.score}`;
  document.getElementById("quiz-category").textContent = q.category;
  document.getElementById("quiz-question").textContent = q.question;
  renderAudio(q.audio);
  renderDots();

  const optionsEl = document.getElementById("quiz-options");
  optionsEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.dataset.index = i;
    div.innerHTML = `
      <span class="letter">${LETTERS[i]}</span>
      <span class="opt-body">
        <span class="opt-text">${opt.text}</span>
        <span class="opt-info">${opt.info}</span>
      </span>
    `;
    div.addEventListener("click", () => selectAnswer(i));
    optionsEl.appendChild(div);
  });

  document.getElementById("btn-next").style.display = "none";
}

function selectAnswer(selectedIndex) {
  if (answered) return;
  answered = true;

  const q = round.current;
  const correct = round.submitAnswer(selectedIndex);

  const ytWrap = document.getElementById("yt-wrap");
  if (ytWrap) {
    ytWrap.classList.remove("hidden");
    const btn = document.getElementById("yt-play-btn");
    if (btn) btn.remove();
  }
  const audioCredit = document.getElementById("audio-credit");
  if (audioCredit) audioCredit.classList.remove("hidden");

  const optionEls = document.querySelectorAll("#quiz-options .option");
  optionEls.forEach((el) => {
    const i = Number(el.dataset.index);
    el.classList.add("disabled", "revealed");
    if (i === q.correctIndex) {
      el.classList.add("correct");
    } else if (i === selectedIndex) {
      el.classList.add("wrong");
    }
  });

  document.getElementById("quiz-score").textContent = `Score ${round.score}`;
  renderDots();

  const nextBtn = document.getElementById("btn-next");
  nextBtn.textContent = round.isLast ? "See Results" : "Next Question";
  nextBtn.style.display = "inline-block";
}

function nextQuestion() {
  if (round.isLast) {
    finishRound();
    return;
  }
  round.advance();
  renderQuestion();
}

function finishRound() {
  const entry = {
    date: new Date().toISOString(),
    name: playerName,
    setId: currentSetId,
    score: round.score,
    total: round.total,
    byCategory: round.byCategory(),
    answers: round.answers,
  };
  lastResult = entry;
  QuizStorage.addRoundToHistory(entry);

  document.getElementById("results-score").textContent = `${round.score} / ${round.total}`;
  const pct = round.total ? Math.round((round.score / round.total) * 100) : 0;
  document.getElementById("results-pct").textContent = `${pct}%`;
  showScreen("results");
}

function downloadResults() {
  if (!lastResult) return;
  const dateSlug = lastResult.date.slice(0, 10);
  const fileName = `results-${slugify(lastResult.name)}-${dateSlug}.json`;
  const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderHistory() {
  const list = document.getElementById("history-list");
  const history = QuizStorage.getHistory();
  if (history.length === 0) {
    list.innerHTML = `<div class="empty-note">No rounds played yet.</div>`;
    return;
  }
  list.innerHTML = "";
  history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "history-row";
    const date = new Date(entry.date);
    const dateStr = isNaN(date) ? entry.date : date.toLocaleString();
    const namePart = entry.name ? `${entry.name} — ` : "";
    row.innerHTML = `
      <span>${namePart}${dateStr}</span>
      <span class="score">${entry.score} / ${entry.total}</span>
    `;
    list.appendChild(row);
  });
}

init();
