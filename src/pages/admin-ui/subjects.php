<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subjects – PLP ACSIS</title>
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
                <span class="page-name">Subjects</span>
            </div>
        </div>

        <div class="content-body">
            <div class="section-header">
                <h2>Subject Management</h2>
                <button class="btn" onclick="openAddSubject()">
                    <i class="fas fa-plus"></i> Add Subject
                </button>
            </div>

            <div class="subject-grid">
                <?php
                // Replace with real DB query:
                // $subjects = $pdo->query("SELECT * FROM subjects ORDER BY subject_name ASC")->fetchAll();
                // foreach ($subjects as $sub):
                //
                // Demo:
                $demo_subjects = [
                    ['title' => 'Data Structures', 'code' => 'CS101', 'year' => '1st Year', 'section' => 'Section A', 'db_id' => 1],
                ];
                foreach ($demo_subjects as $sub):
                ?>
                <div class="subject-card">
                    <div class="subject-card-header">
                        <div>
                            <h3 class="subject-title"><?= htmlspecialchars($sub['title']) ?></h3>
                            <p class="subject-code"><?= htmlspecialchars($sub['code']) ?></p>
                        </div>
                        <div class="subject-actions">
                            <button class="action-btn edit-btn" title="Edit" onclick="editSubject(<?= (int)$sub['db_id'] ?>)">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="action-btn delete-btn" title="Delete" onclick="deleteSubject(<?= (int)$sub['db_id'] ?>)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="subject-tags">
                        <span class="tag green"><?= htmlspecialchars($sub['year']) ?></span>
                        <span class="tag blue"><?= htmlspecialchars($sub['section']) ?></span>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
function openAddSubject() {
    // window.location.href = 'add_subject.php';
    alert('Open Add Subject form');
}

function editSubject(id) {
    // window.location.href = 'edit_subject.php?id=' + id;
    alert('Edit subject ID: ' + id);
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        // window.location.href = 'delete_subject.php?id=' + id;
        alert('Deleted subject ID: ' + id);
    }
}
</script>
</body>
</html>