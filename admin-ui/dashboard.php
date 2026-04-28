<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
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
            <div class="card-container">
                <div class="card">
                    <div class="card-info">
                        <span class="card-label">Total Students</span>
                        <span class="card-value">1</span>
                    </div>
                    <div class="card-icon students-icon">
                        <i class="fas fa-user-friends"></i>
                    </div>
                </div>
                <div class="card">
                    <div class="card-info">
                        <span class="card-label">Total Exams</span>
                        <span class="card-value">0</span>
                    </div>
                    <div class="card-icon exams-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                </div>
                <div class="card">
                    <div class="card-info">
                        <span class="card-label">Subjects</span>
                        <span class="card-value">1</span>
                    </div>
                    <div class="card-icon subjects-icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                </div>
                <div class="card">
                    <div class="card-info">
                        <span class="card-label">Total Warnings</span>
                        <span class="card-value warnings">0</span>
                    </div>
                    <div class="card-icon warnings-icon">
                        <i class="fas fa-wave-square"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>