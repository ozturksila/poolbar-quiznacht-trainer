function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadManifest() {
  const res = await fetch("questions/manifest.json");
  if (!res.ok) throw new Error("Could not load questions/manifest.json");
  return res.json();
}

async function loadQuestionSet(fileName) {
  const res = await fetch(`questions/${fileName}`);
  if (!res.ok) throw new Error(`Could not load questions/${fileName}`);
  return res.json();
}

class QuizRound {
  constructor(questions) {
    this.questions = shuffle(questions).map((q) => this.prepareQuestion(q));
    this.currentIndex = 0;
    this.score = 0;
    this.answers = []; // { questionId, correct }
  }

  prepareQuestion(q) {
    const order = shuffle(q.options.map((_, i) => i));
    const options = order.map((originalIndex) => q.options[originalIndex]);
    const correctIndex = order.indexOf(q.correctIndex);
    return {
      id: q.id,
      category: q.category,
      question: q.question,
      audio: q.audio,
      options,
      correctIndex,
    };
  }

  get total() {
    return this.questions.length;
  }

  get current() {
    return this.questions[this.currentIndex];
  }

  get isLast() {
    return this.currentIndex === this.total - 1;
  }

  submitAnswer(selectedIndex) {
    const correct = selectedIndex === this.current.correctIndex;
    if (correct) this.score++;
    this.answers.push({
      questionId: this.current.id,
      category: this.current.category,
      correct,
    });
    return correct;
  }

  advance() {
    this.currentIndex++;
  }

  byCategory() {
    const stats = {};
    this.answers.forEach((a) => {
      if (!stats[a.category]) stats[a.category] = { correct: 0, total: 0 };
      stats[a.category].total++;
      if (a.correct) stats[a.category].correct++;
    });
    return stats;
  }
}

window.Quiz = { shuffle, loadManifest, loadQuestionSet, QuizRound };
