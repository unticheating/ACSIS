<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard – PLP ACSIS</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>

<div class="container">
    <?php include 'sidebar.php'; ?>

    <div class="content">
        <!-- Breadcrumb Header -->
        <div class="content-header">
            <div class="breadcrumb">
                <span class="brand-plp">PLP</span>
                <span class="brand-acsis"> ACSIS</span>
                <span class="sep">/</span>
                <span class="page-name">Dashboard</span>
            </div>
        </div>

        <div class="content-body">

            <!-- Stat Cards -->
            <div class="stat-cards">
                <div class="stat-card green">
                    <div class="stat-card-label">On-Going Examinations</div>
                    <div class="stat-card-value">
                        <?php
                        // Replace with your DB query, e.g.:
                        // $ongoing = $pdo->query("SELECT COUNT(*) FROM examinations WHERE status = 'ongoing'")->fetchColumn();
                        echo isset($ongoing) ? $ongoing : 0;
                        ?>
                    </div>
                </div>
                <div class="stat-card green">
                    <div class="stat-card-label">Total Examinations</div>
                    <div class="stat-card-value">
                        <?php
                        // $total_exams = $pdo->query("SELECT COUNT(*) FROM examinations")->fetchColumn();
                        echo isset($total_exams) ? $total_exams : 0;
                        ?>
                    </div>
                </div>
                <div class="stat-card red">
                    <div class="stat-card-label">Detected Students</div>
                    <div class="stat-card-value">
                        <?php
                        // $detected = $pdo->query("SELECT COUNT(DISTINCT student_id) FROM violations WHERE status = 'detected'")->fetchColumn();
                        echo isset($detected) ? $detected : 0;
                        ?>
                    </div>
                </div>
            </div>

            <!-- On-Going Examinations Panel -->
            <div class="panel">
                <div class="panel-header">
                    <span class="panel-title">On-Going Examinations</span>
                    <a href="examinations.php?view=active" class="panel-view-all">View All</a>
                </div>
                <div class="exam-list">
                    <?php
                    // Replace with real DB query:
                    // $ongoing_exams = $pdo->query("
                    //     SELECT * FROM examinations
                    //     WHERE status = 'ongoing' AND archived = 0
                    //     ORDER BY created_at DESC
                    // ")->fetchAll();
                    // if ($ongoing_exams): foreach ($ongoing_exams as $exam):
                    //
                    $demo_exams = [
                        ['name' => 'INFOSEC QUIZ #1', 'by' => 'JUANITO P. ALVAREZ JR.', 'timer' => '34:23', 'sub' => 'started less than a minute ago', 'done' => '0 / 35 Done', 'archived' => 0],
                        ['name' => 'INFOSEC QUIZ #2', 'by' => 'JUANITO P. ALVAREZ JR.', 'timer' => '34:23', 'sub' => 'started less than a minute ago', 'done' => '0 / 35 Done', 'archived' => 0],
                        ['name' => 'LEGACY QUIZ', 'by' => 'MARIA SANTOS', 'timer' => '—', 'sub' => 'archived', 'done' => '35 / 35 Done', 'archived' => 1],
                    ];
                    foreach ($demo_exams as $exam):
                        if (!empty($exam['archived'])) {
                            continue;
                        }
                    ?>
                    <div class="exam-item">
                        <div class="exam-info">
                            <div class="exam-name"><?= htmlspecialchars($exam['name']) ?></div>
                            <div class="exam-by">by <?= htmlspecialchars($exam['by']) ?></div>
                        </div>
                        <div class="exam-meta">
                            <div class="exam-timer">
                                <?= htmlspecialchars($exam['timer']) ?>
                                <span class="exam-timer-sub">(<?= htmlspecialchars($exam['sub']) ?>)</span>
                            </div>
                            <div class="exam-progress"><?= htmlspecialchars($exam['done']) ?></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Detected Students Panel -->
            <div class="panel">
                <div class="panel-header">
                    <span class="panel-title">Detected Students</span>
                    <a href="violation_records.php" class="panel-view-all">View All</a>
                </div>
                <div class="detected-list">
                    <?php
                    // Replace with real DB query:
                    // $detected_students = $pdo->query("
                    //     SELECT v.*, s.full_name, e.exam_name, COUNT(v.id) as strike_count
                    //     FROM violations v
                    //     JOIN students s ON v.student_id = s.id
                    //     JOIN examinations e ON v.exam_id = e.id
                    //     GROUP BY v.student_id, v.exam_id
                    //     ORDER BY strike_count DESC
                    // ")->fetchAll();
                    //
                    // For demo:
                    $demo_detected = [
                        ['strikes' => 3, 'name' => 'RICHELLE DOROTHY BENITEZ', 'exam' => 'INFOSEC QUIZ #1', 'sub' => 'Flagged Positive by JUANITO ALVAREZ', 'id' => 1],
                        ['strikes' => 1, 'name' => 'REX NAVARRO JR', 'exam' => 'INFOSEC QUIZ #1', 'sub' => 'Warned', 'id' => 2],
                    ];
                    // Comment out $demo_detected and use the real query in production.
                    foreach ($demo_detected as $student):
                    ?>
                    <div class="detected-item">
                        <div class="detected-left">
                            <div class="strikes-badge">
                                <span class="strikes-count"><?= (int)$student['strikes'] ?></span>
                                <span class="strikes-label">strikes</span>
                            </div>
                            <div class="detected-info">
                                <div class="detected-name">
                                    <?= htmlspecialchars($student['name']) ?>
                                    <span>in <?= htmlspecialchars($student['exam']) ?></span>
                                </div>
                                <div class="detected-sub"><?= htmlspecialchars($student['sub']) ?></div>
                            </div>
                        </div>
                        <div class="detected-right">
                            <a href="violation_records.php?id=<?= (int)$student['id'] ?>" class="view-info-link">View more info</a>
                            <button class="ticket-btn" onclick="ticketViolation(<?= (int)$student['id'] ?>)">Ticket Violation</button>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div><!-- end content-body -->
    </div><!-- end content -->
</div><!-- end container -->

<script src="script.js"></script>
<script>
function ticketViolation(id) {
    if (confirm('Issue a ticket violation for this student?')) {
        // Submit to backend, e.g.:
        // window.location.href = 'ticket_violation.php?id=' + id;
        alert('Ticket issued for student ID: ' + id);
    }
}
</script>
</body>
</html>