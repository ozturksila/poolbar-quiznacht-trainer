const HISTORY_KEY = "poolbar-quiz-history";

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read quiz history", err);
    return [];
  }
}

function addRoundToHistory(round) {
  const history = getHistory();
  history.unshift(round);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error("Failed to save quiz history", err);
  }
  return history;
}

window.QuizStorage = { getHistory, addRoundToHistory };
