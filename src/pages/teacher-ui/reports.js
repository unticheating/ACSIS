/**
 * Switches between the Summary, Violations, and Detailed tabs.
 * @param {string} tabId - The ID of the tab to switch to.
 * @param {HTMLElement} btn - The button element that was clicked.
 */
function switchTab(tabId, btn) {
  // Update Buttons
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.classList.remove('active');
  });
  btn.classList.add('active');

  // Update Panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

/**
 * Mocks the functionality for changing the currently viewed exam.
 */
function changeExam() {
  alert('Exam selector modal will appear here.');
}

/**
 * Mocks the functionality for exporting data.
 * @param {string} format - The format to export ('CSV' or 'PDF').
 */
function exportData(format) {
  alert(`Preparing ${format} download. The file will be saved shortly.`);
  // This will trigger backend API endpoint to fetch data from `report_logs`
}

/**
 * Handles user logout.
 */
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = 'index.html';
  }
}