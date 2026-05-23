<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Examinations – PLP ACSIS</title>
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
                <span class="page-name">Examinations</span>
            </div>
        </div>

        <div class="content-body">
            <div class="section-header">
                <h2>Examinations</h2>
                <button class="btn" onclick="openCreateExam()">
                    <i class="fas fa-plus"></i> Create Exam
                </button>
            </div>

            <div class="exam-card-grid">
                <?php
                // Replace with real DB query:
                // $exams = $pdo->query("SELECT * FROM examinations ORDER BY created_at DESC")->fetchAll();
                // foreach ($exams as $exam):
                //
                // Demo:
                $demo_exams = [
                    ['id' => 1, 'name' => 'INFOSEC QUIZ #1', 'subject' => 'Information Security', 'by' => 'JUANITO P. ALVAREZ JR.', 'status' => 'ongoing', 'done' => 12, 'total' => 35],
                    ['id' => 2, 'name' => 'INFOSEC QUIZ #2', 'subject' => 'Information Security', 'by' => 'JUANITO P. ALVAREZ JR.', 'status' => 'ongoing', 'done' => 8, 'total' => 35],
                    ['id' => 3, 'name' => 'MIDTERM EXAM', 'subject' => 'Database Systems', 'by' => 'MARIA SANTOS', 'status' => 'scheduled', 'done' => 0, 'total' => 40],
                    ['id' => 4, 'name' => 'FINAL EXAM', 'subject' => 'Operating Systems', 'by' => 'JOSE REYES', 'status' => 'completed', 'done' => 38, 'total' => 38],
                ];
                foreach ($demo_exams as $exam):
                    $progress = $exam['total'] > 0 ? round(($exam['done'] / $exam['total']) * 100) : 0;
                    $status_class = strtolower($exam['status']);
                    $status_label = ucfirst($exam['status']);
                ?>
                <div class="exam-card">
                    <div class="exam-card-header">
                        <div class="exam-card-title-group">
                            <h3 class="exam-card-title"><?= htmlspecialchars($exam['name']) ?></h3>
                            <p class="exam-card-meta"><?= htmlspecialchars($exam['subject']) ?> · by <?= htmlspecialchars($exam['by']) ?></p>
                        </div>
                        <span class="exam-status-badge status-<?= $status_class ?>"><?= $status_label ?></span>
                    </div>
                    <div class="exam-card-footer">
                        <span class="exam-done-label"><?= (int)$exam['done'] ?> / <?= (int)$exam['total'] ?> done</span>
                        <button class="exam-manage-btn" onclick="manageExam(<?= (int)$exam['id'] ?>)">Manage</button>
                    </div>
                    <div class="exam-progress-bar">
                        <div class="exam-progress-fill status-<?= $status_class ?>" style="width: <?= $progress ?>%"></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
function openCreateExam() {
    // window.location.href = 'create_exam.php';
    alert('Open Create Exam form');
}
function manageExam(id) {
    // window.location.href = 'manage_exam.php?id=' + id;
    alert('Manage exam ID: ' + id);
}
</script>
</body>
</html>