// Mock Data based on SQL Schema
const activeStudents = [
  { id: 1, firstName: 'Juan', lastName: 'Dela Cruz', schoolId: '2024-12345', progress: 0, status: 'in_progress' },
  { id: 2, firstName: 'Maria', lastName: 'Clara', schoolId: '2024-54321', progress: 100, status: 'submitted' }
];

function renderLiveStatus() {
  const container = document.getElementById('live-status-container');
  container.innerHTML = activeStudents.map(student => {
    const isSubmitted = student.status === 'submitted';
    const pillClass = isSubmitted ? 'pill-submitted' : 'pill-progress';
    const pillText = isSubmitted ? 'Submitted' : 'In Progress';
    
    return `
      <div class="student-card">
        <div class="student-card-top">
          <div>
            <h4 class="student-name">${student.firstName} ${student.lastName}</h4>
            <p class="student-id">${student.schoolId}</p>
          </div>
        </div>
        <div class="progress-container">
          <div class="progress-header">
            <span>Progress</span>
            <span>${student.progress}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${student.progress}%"></div>
          </div>
        </div>
        <span class="status-pill ${pillClass}">${pillText}</span>
      </div>
    `;
  }).join('');
}

function startTimer() {
  let seconds = 0;
  const timerElement = document.getElementById('stat-timer');
  
  setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    timerElement.innerText = `${m}:${s}`;
  }, 1000);
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = 'index.html';
  }
}

window.onload = () => {
  renderLiveStatus();
  startTimer();
};