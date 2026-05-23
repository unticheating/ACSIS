/**
 * Admin PHP shell — mobile sidebar toggle + optional sidebar.html loader.
 */
(function () {
  function ensureSidebarOverlay() {
    if (!document.querySelector('.sidebar')) return null;
    var overlay = document.getElementById('sidebarOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
    return overlay;
  }

  function openSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = ensureSidebarOverlay();
    if (!sidebar) return;
    sidebar.classList.add('sidebar--open');
    if (overlay) {
      overlay.classList.add('sidebar-overlay--visible');
      overlay.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('sidebar--open');
    if (overlay) {
      overlay.classList.remove('sidebar-overlay--visible');
      overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('sidebar-open');
  }

  function toggleSidebar() {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('sidebar--open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function initSidebarToggle() {
    ensureSidebarOverlay();
    document.querySelectorAll('.content-header').forEach(function (header) {
      if (header.querySelector('#sidebarToggleBtn')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'sidebarToggleBtn';
      btn.className = 'sidebar-toggle-btn';
      btn.setAttribute('aria-label', 'Open navigation menu');
      btn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleSidebar();
      });
      header.insertBefore(btn, header.firstChild);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeSidebar();
    });
  }

  function loadSidebar() {
    var container = document.getElementById('sidebar-container');
    if (!container) {
      initSidebarToggle();
      return;
    }
    fetch('sidebar.html')
      .then(function (res) {
        return res.text();
      })
      .then(function (data) {
        container.innerHTML = data;
        initSidebarToggle();
      })
      .catch(function () {
        initSidebarToggle();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSidebar);
  } else {
    loadSidebar();
  }

  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleSidebar = toggleSidebar;
})();
