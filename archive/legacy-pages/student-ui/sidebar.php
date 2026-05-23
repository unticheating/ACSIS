<?php $current = basename($_SERVER['PHP_SELF']); ?>

<div class="sidebar">
    <div class="sidebar-top">
        <div class="admin-avatar">S</div>
        <div class="admin-info">
            <span class="admin-name">Student</span>
            <span class="admin-role">Portal</span>
        </div>
    </div>

    <nav class="sidebar-nav">
        <a href="dashboard.php" class="nav-item <?= $current === 'dashboard.php' ? 'active' : '' ?>">
            <i class="fas fa-th-large"></i>
            <span>Dashboard</span>
        </a>
        <a href="pastExam.php" class="nav-item <?= $current === 'pastExam.php' ? 'active' : '' ?>">
            <i class="fas fa-file-alt"></i>
            <span>Examinations</span>
        </a>
    </nav>

    <a href="logout.php" class="logout-btn">
        <i class="fas fa-sign-out-alt"></i>
        <span>Logout</span>
    </a>
</div>
