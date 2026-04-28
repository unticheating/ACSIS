const EXAMS_STORAGE_KEY = 'teacherExams';
let questions = [];
let selectedHours = 1;
let selectedMinutes = 0;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStoredExams() {
  const raw = localStorage.getItem(EXAMS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveStoredExams(exams) {
  localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(exams));
}

function generateExamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function clearExamDetailsForm() {
  document.getElementById('exam-title').value = '';
  document.getElementById('time-limit').value = '';
  document.getElementById('subject').selectedIndex = 0;
  document.getElementById('year-level').selectedIndex = 0;
  document.getElementById('section').selectedIndex = 0;
}

function changeQuestionType() {
  const type = document.getElementById('question-type').value;
  const optionsArea = document.getElementById('options-area');
  optionsArea.innerHTML = '';

  if (!type) {
    return;
  }

  if (type === 'multiple') {
    optionsArea.innerHTML = `
      <div class="form-group">
        <label>Options</label>
        <input type="text" id="opt1" placeholder="Option 1"><br><br>
        <input type="text" id="opt2" placeholder="Option 2"><br><br>
        <input type="text" id="opt3" placeholder="Option 3"><br><br>
        <input type="text" id="opt4" placeholder="Option 4">
      </div>
      <div class="form-group">
        <label>Correct Answer</label>
        <select id="correct-answer">
          <option value="" selected>Select correct answer</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
          <option value="3">Option 3</option>
          <option value="4">Option 4</option>
        </select>
      </div>
    `;
  } else if (type === 'identification') {
    optionsArea.innerHTML = `
      <div class="form-group">
        <label>Correct Answer</label>
        <input type="text" id="ident-answer" placeholder="Enter correct answer">
      </div>
    `;
  } else if (type === 'truefalse') {
    optionsArea.innerHTML = `
      <div class="form-group">
        <label>Correct Answer</label>
        <select id="tf-answer">
          <option value="" selected>Select answer</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </div>
    `;
  }
}

function resetAddQuestionForm() {
  document.getElementById('question-text').value = '';
  document.getElementById('question-type').value = '';
  changeQuestionType();
}

function resetWholeExamBuilder() {
  questions = [];
  renderQuestions();
  document.getElementById('questions-list-card').style.display = 'none';
  document.getElementById('question-count').textContent = '0';
  clearExamDetailsForm();
  resetAddQuestionForm();
}

function addQuestion() {
  const questionText = document.getElementById('question-text').value.trim();
  if (!questionText) {
    alert('Please enter a question.');
    return;
  }

  const type = document.getElementById('question-type').value;
  if (!type) {
    alert('Please select a question type.');
    return;
  }
  let correctAnswer = '';
  let options = [];

  if (type === 'multiple') {
    const optionElements = ['opt1', 'opt2', 'opt3', 'opt4'].map((id) => document.getElementById(id));
    options = optionElements.map((el) => (el ? el.value.trim() : ''));
    if (options.some((opt) => !opt)) {
      alert('Please fill in all multiple-choice options.');
      return;
    }

    const selected = document.getElementById('correct-answer').value;
    if (!selected) {
      alert('Please select the correct answer.');
      return;
    }
    correctAnswer = options[Number(selected) - 1];
  } else if (type === 'identification') {
    const ident = document.getElementById('ident-answer').value.trim();
    if (!ident) {
      alert('Please enter the identification answer.');
      return;
    }
    correctAnswer = ident;
  } else if (type === 'truefalse') {
    const tf = document.getElementById('tf-answer').value;
    if (!tf) {
      alert('Please select True or False.');
      return;
    }
    correctAnswer = tf === 'true' ? 'True' : 'False';
  }

  questions.push({
    id: Date.now(),
    type: type === 'multiple' ? 'multiple-choice' : type,
    question: questionText,
    options,
    correctAnswer
  });

  renderQuestions();
  document.getElementById('questions-list-card').style.display = 'block';
  resetAddQuestionForm();
}

function renderQuestions() {
  const container = document.getElementById('questions-list');
  container.innerHTML = '';

  questions.forEach((q) => {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.innerHTML = `
      <div class="question-text">${escapeHtml(q.question)}</div>
      <div class="meta">
        Type: ${escapeHtml(q.type)}<br>
        Answer: <span class="correct-answer">${escapeHtml(q.correctAnswer)}</span>
      </div>
      <div class="actions">
        <button class="edit-btn material-icons" onclick="editQuestion(${q.id})">edit</button>
        <button class="delete-btn material-icons" onclick="deleteQuestion(${q.id})">delete</button>
      </div>
    `;
    container.appendChild(div);
  });

  document.getElementById('question-count').textContent = String(questions.length);
}

function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return;
  questions = questions.filter((q) => q.id !== id);
  renderQuestions();
  if (questions.length === 0) {
    document.getElementById('questions-list-card').style.display = 'none';
  }
}

function editQuestion() {
  alert('Edit functionality coming soon...');
}

function initTimePicker() {
  const hoursList = document.getElementById('hours-list');
  const minutesList = document.getElementById('minutes-list');
  hoursList.innerHTML = '';
  minutesList.innerHTML = '';

  for (let i = 0; i <= 4; i += 1) {
    const div = document.createElement('div');
    div.textContent = i === 0 ? '00' : String(i);
    div.onclick = () => selectHour(i, div);
    if (i === selectedHours) div.classList.add('selected');
    hoursList.appendChild(div);
  }

  for (let i = 0; i < 60; i += 5) {
    const div = document.createElement('div');
    div.textContent = i < 10 ? `0${i}` : String(i);
    div.onclick = () => selectMinute(i, div);
    if (i === selectedMinutes) div.classList.add('selected');
    minutesList.appendChild(div);
  }
}

function selectHour(hour, element) {
  document.querySelectorAll('#hours-list div').forEach((el) => el.classList.remove('selected'));
  element.classList.add('selected');
  selectedHours = hour;
}

function selectMinute(minute, element) {
  document.querySelectorAll('#minutes-list div').forEach((el) => el.classList.remove('selected'));
  element.classList.add('selected');
  selectedMinutes = minute;
}

function showTimePicker() {
  initTimePicker();
  document.getElementById('time-picker-modal').style.display = 'flex';
}

function hideTimePicker() {
  document.getElementById('time-picker-modal').style.display = 'none';
}

function saveTimeLimit() {
  const totalMinutes = (selectedHours * 60) + selectedMinutes;
  document.getElementById('time-limit').value = totalMinutes > 0 ? totalMinutes : '';
  hideTimePicker();
}

function shuffleQuestions() {
  questions.sort(() => Math.random() - 0.5);
  renderQuestions();
}

function createExam() {
  const examTitle = document.getElementById('exam-title').value.trim();
  const duration = Number(document.getElementById('time-limit').value);
  const subject = document.getElementById('subject').value;
  const yearLevel = document.getElementById('year-level').value;
  const section = document.getElementById('section').value;

  if (!examTitle) {
    alert('Please enter an exam title.');
    return;
  }
  if (!duration || duration < 1) {
    alert('Please set a valid time limit.');
    return;
  }
  if (!subject || !yearLevel || !section) {
    alert('Please select subject, year level, and section.');
    return;
  }
  if (questions.length === 0) {
    alert('Please add at least one question.');
    return;
  }

  const exams = getStoredExams();
  exams.unshift({
    id: Date.now(),
    title: examTitle,
    code: generateExamCode(),
    questionCount: questions.length,
    duration,
    status: 'Draft',
    subject,
    yearLevel,
    section,
    questions
  });
  saveStoredExams(exams);

  alert(`Exam "${examTitle}" created successfully with ${questions.length} questions.`);
  resetWholeExamBuilder();
}

function initSidebarState() {
  const links = document.querySelectorAll('.sidebar-link[data-page]');
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '').replace('_', '-');
  links.forEach((link) => {
    const href = (link.getAttribute('href') || '').replace('.html', '').replace('_', '-');
    if (href === currentPage || link.dataset.page === currentPage) {
      link.classList.add('active');
    }
  });
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = 'index.html';
  }
}

window.onload = () => {
  initSidebarState();
  resetWholeExamBuilder();
};