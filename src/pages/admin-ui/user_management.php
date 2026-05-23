<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management – PLP ACSIS</title>
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
                <span class="page-name">User Management</span>
            </div>
        </div>

        <div class="content-body">
            <!-- Filter Tabs + Add User -->
            <div class="um-topbar">
                <div class="um-tabs">
                    <button class="um-tab active" onclick="filterUsers('all', this)">All</button>
                    <button class="um-tab" onclick="filterUsers('students', this)">Students</button>
                    <button class="um-tab" onclick="filterUsers('faculty', this)">Faculty</button>
                </div>
                <div class="um-topbar-right">
                    <?php
                    // $pending = $pdo->query("SELECT COUNT(*) FROM users WHERE status='pending' AND role='faculty'")->fetchColumn();
                    $pending_faculty = isset($pending_faculty) ? $pending_faculty : 10;
                    ?>
                    <span class="pending-badge">Pending Faculty (<?= (int)$pending_faculty ?>)</span>
                </div>
            </div>

            <div class="panel">
                <div class="panel-header">
                    <span class="panel-title">
                        All Users
                        <?php
                        // $user_count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                        $user_count = isset($user_count) ? $user_count : 9;
                        ?>
                        <span class="violation-count">(<?= (int)$user_count ?>)</span>
                    </span>
                    <button class="btn" onclick="openAddUser()">
                        Add User
                    </button>
                </div>

                <div class="um-table-wrapper">
                    <table class="um-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Account Status</th>
                                <th>Role</th>
                                <th>Date Created</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <?php
                            // Replace with real DB query:
                            // $users = $pdo->query("SELECT * FROM users ORDER BY name ASC")->fetchAll();
                            // foreach ($users as $u):
                            //
                            // Demo:
                            $demo_users = [
                                ['name' => 'JUANITO ALVAREZ JR.', 'email' => 'alvarez_juanito@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Professor', 'date' => '5/2/2026', 'db_id' => 1],
                                ['name' => 'RICHELLE DOROTHY BENITEZ', 'email' => 'benitez_richelledorothy@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 2],
                                ['name' => 'HANZEL GWEN NANEZ', 'email' => 'nanez_hanzelgwen@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 3],
                                ['name' => 'AVRIL LAVIGNE PASCUA', 'email' => 'pascua_avrillavigne@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 4],
                                ['name' => 'KELLY ROWLAND LOLA', 'email' => 'lola_kellyrowland@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 5],
                                ['name' => 'RON MICHAEL LEGASPI', 'email' => 'legaspi_ronmichael@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 6],
                                ['name' => 'CARL AJ JUNIO', 'email' => 'junio_carlaj@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 7],
                                ['name' => 'REX NAVARRO JR.', 'email' => 'navarrojr_rex@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 8],
                                ['name' => 'JOHN EDRIAN MARTINEZ', 'email' => 'martinez_johnedrian@plpasig.edu.ph', 'status' => 'Active', 'role' => 'Student', 'date' => '5/2/2026', 'db_id' => 9],
                            ];
                            foreach ($demo_users as $u):
                            ?>
                            <tr data-role="<?= strtolower(htmlspecialchars($u['role'])) ?>">
                                <td class="um-name"><?= htmlspecialchars($u['name']) ?></td>
                                <td class="um-email"><?= htmlspecialchars($u['email']) ?></td>
                                <td><span class="um-status-badge"><?= htmlspecialchars($u['status']) ?></span></td>
                                <td><?= htmlspecialchars($u['role']) ?></td>
                                <td><?= htmlspecialchars($u['date']) ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
function openAddUser() {
    // window.location.href = 'add_user.php';
    alert('Open Add User form');
}

function filterUsers(type, btn) {
    document.querySelectorAll('.um-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach(row => {
        if (type === 'all') {
            row.style.display = '';
        } else if (type === 'students') {
            row.style.display = row.dataset.role === 'student' ? '' : 'none';
        } else if (type === 'faculty') {
            row.style.display = (row.dataset.role === 'professor' || row.dataset.role === 'faculty') ? '' : 'none';
        }
    });
}
</script>
</body>
</html>