<!DOCTYPE html>
<html>
<head>
    <title>Students</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>

<div class="container">
    <?php include 'sidebar.php'; ?>

    <div class="content">
        <div class="content-header">
            <div>
                <h1>Admin Dashboard</h1>
                <p>Welcome back, Administrator</p>
            </div>
        </div>

        <div class="content-body">
            <div class="section-header">
                <h2>Student Management</h2>
                <button class="btn"><i class="fas fa-plus"></i> Add Student</button>
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
                        <tr>
                            <td>2024-12345</td>
                            <td>Juan Dela Cruz</td>
                            <td>juan@plp.edu.ph</td>
                            <td>1st Year</td>
                            <td>A</td>
                            <td class="actions-cell">
                                <button class="action-btn edit-btn"><i class="fas fa-pen"></i></button>
                                <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

</body>
</html>