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
                <button type="button" class="btn" onclick="openCreateExam()">
                    <i class="fas fa-plus"></i> Create Exam
                </button>
            </div>

            <?php
            $exam_view = isset($_GET['view']) ? strtolower((string) $_GET['view']) : 'active';
            if (!in_array($exam_view, ['active', 'archived'], true)) {
                $exam_view = 'active';
            }
            ?>

            <div class="um-topbar exam-filter-bar">
                <div class="um-tabs" role="tablist" aria-label="Exam list">
                    <button
                        type="button"
                        class="um-tab<?= $exam_view === 'active' ? ' active' : '' ?>"
                        onclick="setExamView('active')"
                    >Active Exams</button>
                    <button
                        type="button"
                        class="um-tab<?= $exam_view === 'archived' ? ' active' : '' ?>"
                        onclick="setExamView('archived')"
                    >Archived Exams</button>
                </div>
            </div>

            <div class="exam-card-grid" id="examCardGrid">
                <?php
                // Replace with real DB query:
                // $view === 'active'   → WHERE archived = 0
                // $view === 'archived' → WHERE archived = 1
                //
                $demo_exams = [
                    ['id' => 1, 'name' => 'INFOSEC QUIZ #1', 'subject' => 'Information Security', 'by' => 'JUANITO P. ALVAREZ JR.', 'status' => 'ongoing', 'done' => 12, 'total' => 35, 'archived' => 0],
                    ['id' => 2, 'name' => 'INFOSEC QUIZ #2', 'subject' => 'Information Security', 'by' => 'JUANITO P. ALVAREZ JR.', 'status' => 'ongoing', 'done' => 8, 'total' => 35, 'archived' => 0],
                    ['id' => 3, 'name' => 'MIDTERM EXAM', 'subject' => 'Database Systems', 'by' => 'MARIA SANTOS', 'status' => 'scheduled', 'done' => 0, 'total' => 40, 'archived' => 0],
                    ['id' => 4, 'name' => 'FINAL EXAM', 'subject' => 'Operating Systems', 'by' => 'JOSE REYES', 'status' => 'completed', 'done' => 38, 'total' => 38, 'archived' => 1],
                ];
                foreach ($demo_exams as $exam):
                    $is_archived = !empty($exam['archived']);
                    if (($exam_view === 'active' && $is_archived) || ($exam_view === 'archived' && !$is_archived)) {
                        continue;
                    }
                    $progress = $exam['total'] > 0 ? round(($exam['done'] / $exam['total']) * 100) : 0;
                    $status_class = $is_archived ? 'archived' : strtolower($exam['status']);
                    $status_label = $is_archived ? 'Archived' : ucfirst($exam['status']);
                    $card_class = 'exam-card' . ($is_archived ? ' exam-card--archived' : '');
                ?>
                <div
                    class="<?= $card_class ?>"
                    data-exam-id="<?= (int) $exam['id'] ?>"
                    data-archived="<?= $is_archived ? '1' : '0' ?>"
                >
                    <div class="exam-card-header">
                        <div class="exam-card-title-group">
                            <h3 class="exam-card-title"><?= htmlspecialchars($exam['name']) ?></h3>
                            <p class="exam-card-meta"><?= htmlspecialchars($exam['subject']) ?> · by <?= htmlspecialchars($exam['by']) ?></p>
                        </div>
                        <span class="exam-status-badge status-<?= htmlspecialchars($status_class) ?>"><?= htmlspecialchars($status_label) ?></span>
                    </div>
                    <div class="exam-card-footer">
                        <span class="exam-done-label"><?= (int) $exam['done'] ?> / <?= (int) $exam['total'] ?> done</span>
                        <div class="exam-card-actions">
                            <?php if (!$is_archived): ?>
                            <button type="button" class="exam-archive-btn" onclick="archiveExam(<?= (int) $exam['id'] ?>)">Archive</button>
                            <?php else: ?>
                            <button type="button" class="exam-archive-btn" onclick="unarchiveExam(<?= (int) $exam['id'] ?>)">Unarchive</button>
                            <?php endif; ?>
                            <button type="button" class="exam-manage-btn" onclick="manageExam(<?= (int) $exam['id'] ?>)">Manage</button>
                        </div>
                    </div>
                    <div class="exam-progress-bar">
                        <div class="exam-progress-fill status-<?= htmlspecialchars($status_class) ?>" style="width: <?= $progress ?>%"></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
var EXAM_ARCHIVE_KEY = 'acsis_admin_exam_archived';

function setExamView(view) {
    var url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.location.href = url.toString();
}

function getClientArchivedExamIds() {
    try {
        return JSON.parse(localStorage.getItem(EXAM_ARCHIVE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function archiveExam(id) {
    if (!confirm('Archive this examination? It will move to Archived Exams.')) return;
    var ids = getClientArchivedExamIds();
    if (ids.indexOf(id) === -1) ids.push(id);
    localStorage.setItem(EXAM_ARCHIVE_KEY, JSON.stringify(ids));
    // UPDATE examinations SET archived = 1 WHERE id = ?
    alert('Exam ID ' + id + ' archived (demo). Switching to Archived Exams.');
    setExamView('archived');
}

function unarchiveExam(id) {
    var ids = getClientArchivedExamIds().filter(function (x) { return x !== id; });
    localStorage.setItem(EXAM_ARCHIVE_KEY, JSON.stringify(ids));
    // UPDATE examinations SET archived = 0 WHERE id = ?
    alert('Exam ID ' + id + ' unarchived (demo).');
    setExamView('active');
}

function openCreateExam() {
    alert('Open Create Exam form (placeholder)');
}

function manageExam(id) {
    alert('Manage exam ID: ' + id);
}
</script>
</body>
</html>
