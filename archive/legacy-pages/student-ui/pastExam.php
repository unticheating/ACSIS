<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Past Examinations – PLP ACSIS</title>
    <link rel="stylesheet" href="../admin-ui/style.css">
    <link rel="stylesheet" href="past_exam.css">
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
                <span class="page-name">Examinations</span>
            </div>
        </div>

        <div class="content-body pe-body">
            <?php
            $past_rows = isset($past_examinations) ? $past_examinations : [
                [
                    'exam' => '3D INFOSEC QUIZ #1',
                    'subject' => 'Information Assurance and Security I',
                    'code' => 'IT 108',
                    'completed' => 'May 8, 2026',
                    'score' => '94%',
                    'result_href' => 'exam_result.php',
                ],
                [
                    'exam' => 'INFOSEC QUIZ #2',
                    'subject' => 'Information Assurance and Security I',
                    'code' => 'IT 108',
                    'completed' => 'May 1, 2026',
                    'score' => '88%',
                    'result_href' => 'exam_result.php',
                ],
                [
                    'exam' => 'DATABASE MIDTERM',
                    'subject' => 'Integrative Programming and Technologies II',
                    'code' => 'IT203',
                    'completed' => 'Apr 22, 2026',
                    'score' => '90%',
                    'result_href' => 'exam_result.php',
                ],
                [
                    'exam' => 'INTEGRATIVE MIDTERM',
                    'subject' => 'Integrative Programming and Technologies II',
                    'code' => 'IT203',
                    'completed' => 'Apr 5, 2026',
                    'score' => 'Passed',
                    'result_href' => 'exam_result.php',
                ],
            ];

            /**
             * @param string $score
             * @return string CSS class suffixes for .pe-score
             */
            $pe_score_mod = function ($score) {
                $s = strtolower($score);
                if (strpos($s, 'pass') !== false) {
                    return ' pe-score--neutral';
                }
                if (preg_match('/(\d+)/', $score, $m)) {
                    $n = (int) $m[1];
                    if ($n >= 90) {
                        return ' pe-score--high';
                    }
                    if ($n >= 80) {
                        return ' pe-score--mid';
                    }
                    return ' pe-score--low';
                }
                return ' pe-score--neutral';
            };
            ?>

            <header class="pe-intro">
                <h1 class="pe-title">Past examinations</h1>
                <p class="pe-lead">Completed attempts and scores for your enrolled courses.</p>
            </header>

            <p class="pe-count" aria-live="polite"><?= count($past_rows) ?> record<?= count($past_rows) === 1 ? '' : 's' ?></p>

            <?php if (count($past_rows) === 0): ?>
            <div class="pe-empty">
                <p class="pe-empty-title">No past examinations yet</p>
                <p class="pe-empty-text">When you finish an exam, it will appear here.</p>
            </div>
            <?php else: ?>
            <ul class="pe-list">
                <?php foreach ($past_rows as $row):
                    $href = isset($row['result_href']) ? (string) $row['result_href'] : 'exam_result.php';
                    $scoreClass = 'pe-score' . $pe_score_mod((string) $row['score']);
                    ?>
                <li>
                    <a class="pe-card" href="<?= htmlspecialchars($href) ?>">
                        <div class="pe-card-main">
                            <h2 class="pe-exam-name"><?= htmlspecialchars($row['exam']) ?></h2>
                            <p class="pe-subject">
                                <?= htmlspecialchars($row['subject']) ?>
                                <span class="pe-code"><?= htmlspecialchars($row['code']) ?></span>
                            </p>
                        </div>
                        <div class="pe-card-meta">
                            <time class="pe-date"><?= htmlspecialchars($row['completed']) ?></time>
                            <span class="<?= htmlspecialchars($scoreClass) ?>"><?= htmlspecialchars($row['score']) ?></span>
                        </div>
                        <span class="pe-card-arrow" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        </span>
                    </a>
                </li>
                <?php endforeach; ?>
            </ul>
            <?php endif; ?>
        </div>
    </div>
</div>

<script src="../admin-ui/script.js"></script>
</body>
</html>
