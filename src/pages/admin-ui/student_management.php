<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Students – PLP ACSIS</title>
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
                <span class="page-name">Students</span>
            </div>
        </div>

        <div class="content-body">
            <div class="section-header">
                <h2>Student Management</h2>
                <button class="btn" onclick="openAddStudent()">
                    <i class="fas fa-plus"></i> Add Student
                </button>
            </div>

            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Year Level</th>
                            <th>Section</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        // Replace with real DB query:
                        // $students = $pdo->query("SELECT * FROM students ORDER BY name ASC")->fetchAll();
                        // foreach ($students as $s):
                        //
                        // Demo row:
                        $demo_students = [
                            ['id' => '2024-12345', 'name' => 'Juan Dela Cruz', 'email' => 'juan@plp.edu.ph', 'year' => '1st Year', 'section' => 'A', 'db_id' => 1],
                        ];
                        foreach ($demo_students as $s):
                        ?>
                        <tr>
                            <td><?= htmlspecialchars($s['id']) ?></td>
                            <td><?= htmlspecialchars($s['name']) ?></td>
                            <td><?= htmlspecialchars($s['email']) ?></td>
                            <td><?= htmlspecialchars($s['year']) ?></td>
                            <td><?= htmlspecialchars($s['section']) ?></td>
                            <td class="actions-cell">
                                <button class="action-btn edit-btn" title="Edit" onclick="editStudent(<?= (int)$s['db_id'] ?>)">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="action-btn delete-btn" title="Delete" onclick="deleteStudent(<?= (int)$s['db_id'] ?>)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
function openAddStudent() {
    // Open modal or redirect to add student page
    // window.location.href = 'add_student.php';
    alert('Open Add Student form');
}

function editStudent(id) {
    // window.location.href = 'edit_student.php?id=' + id;
    alert('Edit student ID: ' + id);
}

function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        // Submit delete request, e.g.:
        // window.location.href = 'delete_student.php?id=' + id;
        alert('Deleted student ID: ' + id);
    }
}
</script>
</body>
</html>