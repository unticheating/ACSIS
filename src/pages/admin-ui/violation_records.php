<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Violation Records – PLP ACSIS</title>
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
                <span class="page-name">Violation Records</span>
            </div>
        </div>

        <div class="content-body">
            <div class="panel">
                <div class="panel-header">
                    <span class="panel-title">
                        All Violations
                        <?php
                        // $count = $pdo->query("SELECT COUNT(DISTINCT student_id) FROM violations")->fetchColumn();
                        $count = isset($violation_count) ? $violation_count : 3;
                        ?>
                        <span class="violation-count">(<?= (int)$count ?>)</span>
                    </span>
                </div>

                <div class="violation-list">
                    <?php
                    // Replace with real DB query:
                    // $violations = $pdo->query("
                    //     SELECT v.*, s.full_name, e.exam_name, COUNT(v.id) as strike_count,
                    //            MAX(v.status) as vstatus, MAX(v.created_at) as vdate
                    //     FROM violations v
                    //     JOIN students s ON v.student_id = s.id
                    //     JOIN examinations e ON v.exam_id = e.id
                    //     GROUP BY v.student_id, v.exam_id
                    //     ORDER BY strike_count DESC
                    // ")->fetchAll();
                    //
                    // Demo:
                    $demo_violations = [
                        ['id' => 1, 'student' => 'RICHELLE DOROTHY BENITEZ', 'exam' => 'INFOSEC QUIZ #1', 'strikes' => 3, 'status' => 'Ticketed', 'date' => '5/2/2026'],
                        ['id' => 2, 'student' => 'REX NAVARRO JR.', 'exam' => 'INFOSEC QUIZ #1', 'strikes' => 1, 'status' => 'Warned', 'date' => '5/2/2026'],
                        ['id' => 3, 'student' => 'CARL AJ JUNIO', 'exam' => 'INFOSEC QUIZ #2', 'strikes' => 2, 'status' => 'Warned', 'date' => '5/1/2026'],
                    ];
                    foreach ($demo_violations as $v):
                        $vstatus_class = strtolower(str_replace(' ', '-', $v['status']));
                    ?>
                    <div class="violation-item">
                        <div class="violation-left">
                            <div class="strikes-badge">
                                <span class="strikes-count"><?= (int)$v['strikes'] ?></span>
                                <span class="strikes-label">strikes</span>
                            </div>
                            <div class="violation-info">
                                <div class="violation-name"><?= htmlspecialchars($v['student']) ?></div>
                                <div class="violation-sub"><?= htmlspecialchars($v['exam']) ?> · <?= htmlspecialchars($v['date']) ?></div>
                            </div>
                        </div>
                        <div class="violation-right">
                            <span class="violation-status-badge vstatus-<?= $vstatus_class ?>"><?= htmlspecialchars($v['status']) ?></span>
                            <button class="view-btn" onclick="viewViolation(<?= (int)$v['id'] ?>)">View</button>
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
function viewViolation(id) {
    // window.location.href = 'violation_detail.php?id=' + id;
    alert('View violation ID: ' + id);
}
function ticketViolation(id) {
    if (confirm('Issue a ticket for this violation record?')) {
        // window.location.href = 'ticket_violation.php?id=' + id;
        alert('Ticket issued for violation ID: ' + id);
    }
}
</script>
</body>
</html>