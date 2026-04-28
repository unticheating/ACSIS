<!DOCTYPE html>
<html>
<head>
    <title>Subjects</title>
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
                <h2>Subject Management</h2>
                <button class="btn"><i class="fas fa-plus"></i> Add Subject</button>
            </div>

            <div class="subject-grid">
                <div class="subject-card">
                    <div class="subject-card-header">
                        <div>
                            <h3 class="subject-title">Data Structures</h3>
                            <p class="subject-code">CS101</p>
                        </div>
                        <div class="subject-actions">
                            <button class="action-btn edit-btn"><i class="fas fa-pen"></i></button>
                            <button class="action-btn delete-btn"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="subject-tags">
                        <span class="tag green">1st Year</span>
                        <span class="tag blue">Section A</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

</body>
</html>