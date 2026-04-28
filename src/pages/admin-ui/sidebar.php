<?php $current = basename($_SERVER['PHP_SELF']); ?>

<div class="sidebar">
    <div class="sidebar-top">
        <div class="admin-avatar">A</div>
        <div class="admin-info">
            <span class="admin-name">Admin</span>
            <span class="admin-role">Portal</span>
        </div>
    </div>

    <nav class="sidebar-nav">
        <a href="dashboard.php" class="nav-item <?= $current == 'dashboard.php' ? 'active' : '' ?>">
            <i class="fas fa-th-large"></i>
            <span>Dashboard</span>
        </a>
        <a href="student_management.php" class="nav-item <?= $current == 'student_management.php' ? 'active' : '' ?>">
            <i class="fas fa-user-circle"></i>
            <span>Students</span>
        </a>
        <a href="subjects.php" class="nav-item <?= $current == 'subjects.php' ? 'active' : '' ?>">
            <i class="fas fa-book-open"></i>
            <span>Subjects</span>
        </a>
        <a href="#" class="nav-item <?= $current == 'examinations.php' ? 'active' : '' ?>">
            <i class="fas fa-file-alt"></i>
            <span>Examinations</span>
        </a>
        <a href="#" class="nav-item <?= $current == 'monitoring.php' ? 'active' : '' ?>">
            <i class="fas fa-wave-square"></i>
            <span>Monitoring</span>
        </a>
        <a href="#" class="nav-item <?= $current == 'settings.php' ? 'active' : '' ?>">
            <i class="fas fa-cog"></i>
            <span>Settings</span>
        </a>
    </nav>

    <a href="#" class="logout-btn">
        <i class="fas fa-sign-out-alt"></i>
        <span>Logout</span>
    </a>
</div>