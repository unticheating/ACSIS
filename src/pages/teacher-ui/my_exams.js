const EXAMS_STORAGE_KEY = 'teacherExams';

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderExamCards() {
  const examList = document.getElementById('exam-list');
  const exams = getStoredExams();

  if (exams.length === 0) {
    examList.innerHTML = `
      <div class="exam-card empty-state">
        <div class="exam-info">
          <h3 class="empty-title">No exams yet</h3>
          <p class="empty-text">Create an exam to see it here.</p>
        </div>
      </div>
    `;
    return;
  }

  examList.innerHTML = exams.map((exam) => {
    const status = (exam.status || 'Draft').toLowerCase() === 'active' ? 'Active' : 'Draft';
    return `
      <div class="exam-card" data-id="${exam.id}">
        <div class="exam-info">
          <h3 class="exam-title">${escapeHtml(exam.title || 'Untitled Exam')}</h3>
          <p class="exam-meta">
            Code: ${escapeHtml(exam.code || '-')} • ${Number(exam.questionCount || 0)} questions • ${Number(exam.duration || 0)} minutes
          </p>
        </div>
        <div class="exam-actions">
          <span class="status ${status === 'Active' ? 'status-active' : 'draft'}">${status}</span>
          ${status === 'Draft' ? '<button class="activate-btn">Activate</button>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function activateExam(examId) {
  const exams = getStoredExams();
  const updated = exams.map((exam) => {
    if (String(exam.id) === String(examId)) {
      return { ...exam, status: 'Active' };
    }
    return exam;
  });
  saveStoredExams(updated);
  renderExamCards();
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

document.addEventListener('click', (event) => {
  if (!event.target.classList.contains('activate-btn')) return;
  const card = event.target.closest('.exam-card');
  if (!card) return;
  activateExam(card.dataset.id);
});

window.addEventListener('storage', (event) => {
  if (event.key === EXAMS_STORAGE_KEY) {
    renderExamCards();
  }
});

window.onload = () => {
  initSidebarState();
  renderExamCards();
};
