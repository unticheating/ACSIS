<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monitoring – PLP ACSIS</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>

<div class="container">
    <?php include 'sidebar.php'; ?>

    <div class="content">
        <div class="content-header">
            <div class="breadcrumb">
                <span class="brand-plp">PLP</span>
                <span class="brand-acsis"> ACSIS</span>
                <span class="sep">/</span>
                <span class="page-name">Monitoring</span>
            </div>
        </div>

        <div class="content-body">

            <!-- Monitoring Stat Cards -->
            <div class="monitor-stat-cards">
                <div class="monitor-stat-card">
                    <div class="monitor-stat-icon green">
                        <i class="fas fa-wave-square"></i>
                    </div>
                    <div class="monitor-stat-info">
                        <div class="monitor-stat-label">Active Sessions</div>
                        <div class="monitor-stat-value">
                            <?php
                            // $active = $pdo->query("SELECT COUNT(*) FROM sessions WHERE status='active'")->fetchColumn();
                            echo isset($active_sessions) ? $active_sessions : 4;
                            ?>
                        </div>
                    </div>
                </div>
                <div class="monitor-stat-card">
                    <div class="monitor-stat-icon green">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="monitor-stat-info">
                        <div class="monitor-stat-label">Being Monitored</div>
                        <div class="monitor-stat-value">
                            <?php
                            // $monitored = $pdo->query("SELECT COUNT(*) FROM sessions WHERE monitored=1")->fetchColumn();
                            echo isset($being_monitored) ? $being_monitored : 2;
                            ?>
                        </div>
                    </div>
                </div>
                <div class="monitor-stat-card">
                    <div class="monitor-stat-icon red">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="monitor-stat-info">
                        <div class="monitor-stat-label">Alerts (last 5m)</div>
                        <div class="monitor-stat-value">
                            <?php
                            // $alerts = $pdo->query("SELECT COUNT(*) FROM alerts WHERE created_at > NOW() - INTERVAL 5 MINUTE")->fetchColumn();
                            echo isset($recent_alerts) ? $recent_alerts : 1;
                            ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Live Activity Feed -->
            <div class="panel">
                <div class="panel-header">
                    <span class="panel-title">Live Activity Feed</span>
                </div>
                <div class="activity-feed">
                    <?php
                    // Replace with real DB query:
                    // $activities = $pdo->query("
                    //     SELECT al.*, s.full_name, e.exam_name, al.activity_type, al.created_at
                    //     FROM activity_log al
                    //     JOIN students s ON al.student_id = s.id
                    //     JOIN examinations e ON al.exam_id = e.id
                    //     ORDER BY al.created_at DESC LIMIT 20
                    // ")->fetchAll();
                    //
                    // Demo:
                    $demo_activities = [
                        ['name' => 'RICHELLE DOROTHY BENITEZ', 'exam' => 'INFOSEC QUIZ #1', 'event' => 'Tab switch detected', 'time' => '2s ago', 'status' => 'alert', 'id' => 1],
                        ['name' => 'REX NAVARRO JR.', 'exam' => 'INFOSEC QUIZ #1', 'event' => 'Window blur', 'time' => '12s ago', 'status' => 'warning', 'id' => 2],
                        ['name' => 'HANZEL GWEN NANEZ', 'exam' => 'INFOSEC QUIZ #2', 'event' => 'Active', 'time' => 'now', 'status' => 'active', 'id' => 3],
                        ['name' => 'AVRIL LAVIGNE PASCUA', 'exam' => 'INFOSEC QUIZ #2', 'event' => 'Active', 'time' => 'now', 'status' => 'active', 'id' => 4],
                    ];
                    foreach ($demo_activities as $act):
                    ?>
                    <div class="activity-item">
                        <div class="activity-left">
                            <span class="activity-dot dot-<?= htmlspecialchars($act['status']) ?>"></span>
                            <div class="activity-info">
                                <div class="activity-name"><?= htmlspecialchars($act['name']) ?></div>
                                <div class="activity-sub"><?= htmlspecialchars($act['exam']) ?> · <?= htmlspecialchars($act['event']) ?></div>
                            </div>
                        </div>
                        <div class="activity-right">
                            <span class="activity-time"><?= htmlspecialchars($act['time']) ?></span>
                            <?php if ($act['status'] === 'alert'): ?>
                                <button class="flag-btn" onclick="flagStudent(<?= (int)$act['id'] ?>)">Flag</button>
                            <?php endif; ?>
                            <button class="view-btn" onclick="viewStudent(<?= (int)$act['id'] ?>)">View</button>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
function flagStudent(id) {
    if (confirm('Flag this student for suspicious activity?')) {
        // window.location.href = 'flag_student.php?id=' + id;
        alert('Flagged student ID: ' + id);
    }
}
function viewStudent(id) {
    // window.location.href = 'view_student_session.php?id=' + id;
    alert('View student session ID: ' + id);
}
</script>
</body>
</html>