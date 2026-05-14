<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Dashboard – PLP ACSIS</title>
    <link rel="stylesheet" href="../admin-ui/style.css">
    <link rel="stylesheet" href="dashboard.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>

<div class="container">
    <?php include __DIR__ . '/sidebar.php'; ?>

    <div class="content">
        <div class="content-header">
            <div class="breadcrumb">
                <span class="brand-plp">PLP</span>
                <span class="brand-acsis"> ACSIS</span>
                <span class="sep">/</span>
                <span class="page-name">Dashboard</span>
                <span id="breadcrumb-class-wrap" hidden>
                    <span class="sep">/</span>
                    <span class="page-name" id="breadcrumb-class"></span>
                </span>
            </div>
        </div>

        <div class="content-body">

            <div id="view-home" class="db-view is-active">
                <div class="panel db-panel">
                    <div class="panel-header db-panel-head">
                        <div>
                            <span class="panel-title">My classes</span>
                        </div>
                    </div>
                    <div class="exam-list exam-list--class-cards" role="list">
                        <?php
                        $classes = isset($my_classes) ? $my_classes : [
                            ['key' => 'it108', 'code' => 'IT 108', 'name' => 'Information Assurance and Security I'],
                            ['key' => 'it203', 'code' => 'IT203', 'name' => 'Integrative Programming and Technologies II'],
                            ['key' => 'it110', 'code' => 'IT 110', 'name' => 'Social and Professional Issues'],
                        ];
                        foreach ($classes as $class):
                            $key = isset($class['key']) ? (string) $class['key'] : '';
                        ?>
                        <div
                            class="exam-item class-row-interactive"
                            role="button"
                            tabindex="0"
                            data-class-key="<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>"
                            aria-label="Open <?= htmlspecialchars($class['code'] . ' — ' . $class['name'], ENT_QUOTES, 'UTF-8') ?>"
                        >
                            <span class="class-card-code"><?= htmlspecialchars($class['code']) ?></span>
                            <div class="exam-name class-card-title"><?= htmlspecialchars($class['name']) ?></div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="panel db-panel">
                    <div class="panel-header db-panel-head">
                        <div>
                            <span class="panel-title">Available exams</span>
                        </div>
                    </div>
                    <div id="dashboard-all-exams" class="class-exams-list"></div>
                </div>
            </div>

            <div id="view-class" class="db-view">
                <div class="class-detail-toolbar">
                    <button type="button" class="btn-back-classes" id="btn-back-classes">
                        <i class="fas fa-arrow-left" aria-hidden="true"></i> All classes
                    </button>
                    <p class="class-detail-heading" id="class-detail-heading"></p>
                </div>
                <div class="panel db-panel">
                    <div class="panel-header db-panel-head">
                        <div>
                            <span class="panel-title">Available exams</span>
                            <p class="db-panel-desc">Exams for this class only.</p>
                        </div>
                    </div>
                    <div id="class-exams-list" class="class-exams-list"></div>
                </div>
            </div>

        </div>
    </div>
</div>

<div
    id="exam-lobby-modal"
    class="exam-lobby-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="exam-lobby-modal-title"
    hidden
>
    <div class="exam-lobby-modal__backdrop" id="exam-lobby-modal-backdrop"></div>
    <div class="exam-lobby-modal__shell">
        <div class="exam-lobby-modal__card">
            <button type="button" class="exam-lobby-modal__close" id="exam-lobby-modal-close" aria-label="Close">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <h2 id="exam-lobby-modal-title" class="exam-lobby-modal__title"></h2>
            <p id="exam-lobby-modal-sub" class="exam-lobby-modal__sub"></p>
            <div class="exam-lobby-modal__rows">
                <div class="exam-lobby-modal__row">
                    <span class="exam-lobby-modal__label">Format</span>
                    <span id="exam-lobby-val-format" class="exam-lobby-modal__value"></span>
                </div>
                <div class="exam-lobby-modal__row">
                    <span class="exam-lobby-modal__label">Items</span>
                    <span id="exam-lobby-val-items" class="exam-lobby-modal__value"></span>
                </div>
                <div class="exam-lobby-modal__row">
                    <span class="exam-lobby-modal__label">Duration</span>
                    <span id="exam-lobby-val-duration" class="exam-lobby-modal__value"></span>
                </div>
                <div class="exam-lobby-modal__row">
                    <span class="exam-lobby-modal__label">Instructor</span>
                    <span id="exam-lobby-val-instructor" class="exam-lobby-modal__value"></span>
                </div>
            </div>
            <p class="exam-lobby-modal__hint">The timer starts after you join. Stay on one tab once the session opens.</p>
            <div class="exam-lobby-modal__foot">
                <a id="exam-lobby-modal-join" class="exam-lobby-modal__join" href="#">Join exam</a>
                <button type="button" class="exam-lobby-modal__cancel" id="exam-lobby-modal-dismiss">Not now</button>
            </div>
        </div>
    </div>
</div>

<script src="../admin-ui/script.js"></script>
<script src="dashboard.js"></script>
</body>
</html>
