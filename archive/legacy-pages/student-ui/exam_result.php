<?php

$result = isset($exam_result) ? $exam_result : [

    'exam_title' => 'BSIT 3D INFOSEC QUIZ #1',

    'status_label' => 'Test failed',

    'status_type' => 'failed',

    'message' => 'Test has been aborted because the respondent has left the question tab too many times.',

    'score_percent' => 0,

    'score_points' => '0/6 p.',

    'time_used' => '00:00:22',

    'time_limit' => '00:12:00',

    'time_bar_pct' => 3,

    'start_time' => '01:44',

    'end_time' => '01:45',

    'date' => '2026-05-15',

    'question_count' => 6,

];



$questions = isset($exam_result_questions) ? $exam_result_questions : [

    [

        'n' => 1,

        'text' => 'May pag-asa pa ba ang pilipinas?',

        'score' => '0/1P',

        'open' => false,

    ],

    ['n' => 2, 'text' => 'Identify the primary goal of a host-based IDS.', 'score' => '0/1P', 'open' => false, 'kind' => 'text'],

    ['n' => 3, 'text' => 'True or false: A firewall inspects traffic at the application layer only.', 'score' => '0/1P', 'open' => false, 'kind' => 'text'],

    ['n' => 4, 'text' => 'List two common signs of a phishing email.', 'score' => '0/1P', 'open' => false, 'kind' => 'text'],

    ['n' => 5, 'text' => 'What does CIA stand for in information security?', 'score' => '0/1P', 'open' => false, 'kind' => 'text'],

    ['n' => 6, 'text' => 'Multiple choice: Which protocol encrypts web traffic by default?', 'score' => '0/1P', 'open' => false, 'kind' => 'text'],

];



$status_type = isset($result['status_type']) ? (string) $result['status_type'] : 'failed';

if ($status_type !== 'passed' && $status_type !== 'failed') {

    $status_type = 'failed';

}

?>

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Exam results – PLP ACSIS</title>

    <link rel="stylesheet" href="exam_result.css">

</head>

<body class="er-body">



<header class="er-header">

    <div class="er-header-inner">

        <img src="../../../img/plpupdatedlogo%203.png" alt="Pamantasan ng Lungsod ng Pasig" class="er-logo" width="40" height="40" decoding="async">

        <nav class="er-crumb" aria-label="Breadcrumb">

            <span class="er-crumb-plp">PLP</span>

            <span class="er-crumb-acsis">ACSIS</span>

            <span class="er-crumb-sep">/</span>

            <span class="er-crumb-page">Exam results</span>

        </nav>

    </div>

</header>



<main class="er-main">

    <div class="er-page-intro">

        <h1 class="er-exam-title"><?= htmlspecialchars($result['exam_title']) ?></h1>

        <p class="er-exam-meta">Attempt summary · <?= htmlspecialchars($result['date']) ?></p>

    </div>



    <section class="er-summary" aria-labelledby="er-status-heading">

        <div class="er-summary-main">

            <div class="er-status er-status--<?= htmlspecialchars($status_type) ?>" id="er-status-heading">

                <?php if ($status_type === 'passed'): ?>

                <span class="er-status-glyph" aria-hidden="true">

                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>

                </span>

                <?php else: ?>

                <span class="er-status-glyph" aria-hidden="true">

                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>

                </span>

                <?php endif; ?>

                <span class="er-status-label"><?= htmlspecialchars($result['status_label']) ?></span>

            </div>

            <p class="er-message"><?= htmlspecialchars($result['message']) ?></p>



            <div class="er-time-block">

                <div class="er-time-head">

                    <span class="er-time-title">Time on exam</span>

                    <span class="er-time-ratio"><?= htmlspecialchars($result['time_used']) ?> <span class="er-time-of">of</span> <?= htmlspecialchars($result['time_limit']) ?></span>

                </div>

                <div class="er-time-track" role="presentation">

                    <div class="er-time-fill" style="width: <?= max(0, min(100, (int) $result['time_bar_pct'])) ?>%;"></div>

                </div>

                <ul class="er-time-facts">

                    <li><span class="er-fact-k">Start</span> <span class="er-fact-v"><?= htmlspecialchars($result['start_time']) ?></span></li>

                    <li><span class="er-fact-k">End</span> <span class="er-fact-v"><?= htmlspecialchars($result['end_time']) ?></span></li>

                    <li><span class="er-fact-k">Date</span> <span class="er-fact-v"><?= htmlspecialchars($result['date']) ?></span></li>

                </ul>

            </div>

        </div>



        <aside class="er-score-aside" aria-label="Score">

            <p class="er-score-caption">Score</p>

            <p class="er-score-pct"><?= (int) $result['score_percent'] ?><span class="er-score-unit">%</span></p>

            <p class="er-score-pts"><?= htmlspecialchars($result['score_points']) ?></p>

        </aside>

    </section>



    <section class="er-panel" aria-labelledby="er-questions-label">

        <div class="er-panel-head">

            <h2 class="er-panel-title" id="er-questions-label">

                Breakdown <span class="er-count"><?= (int) $result['question_count'] ?> items</span>

            </h2>

            <button type="button" class="er-panel-toggle" id="er-collapse-all">

                <span class="er-collapse-label">Collapse all</span>

            </button>

        </div>



        <div class="er-qlist" id="er-questions-list">

            <?php foreach ($questions as $q):

                $kind = isset($q['kind']) ? (string) $q['kind'] : (!empty($q['has_chart']) ? 'visual' : 'text');

                ?>

            <details class="er-q" <?= !empty($q['open']) ? 'open' : '' ?>>

                <summary class="er-q-summary">

                    <span class="er-q-num"><?= (int) $q['n'] ?></span>

                    <span class="er-q-preview">Question <?= (int) $q['n'] ?></span>

                    <span class="er-q-badge"><?= htmlspecialchars($q['score']) ?></span>

                </summary>

                <div class="er-q-body">

                    <p class="er-q-text"><?= htmlspecialchars($q['text']) ?></p>

                    <?php if ($kind === 'visual'): ?>

                    <div class="er-visual" role="group" aria-label="Illustration placeholder">

                        <p class="er-visual-label">Referenced graphic (sample)</p>

                        <div class="er-visual-bars" aria-hidden="true">

                            <span style="--h:32%"></span>

                            <span style="--h:55%"></span>

                            <span style="--h:44%"></span>

                            <span style="--h:78%"></span>

                            <span style="--h:62%"></span>

                            <span style="--h:88%"></span>

                            <span style="--h:51%"></span>

                        </div>

                        <p class="er-visual-note">Abstract preview — not the exam asset.</p>

                    </div>

                    <?php else: ?>

                    <p class="er-q-empty">No response recorded for this item.</p>

                    <?php endif; ?>

                </div>

            </details>

            <?php endforeach; ?>

        </div>

    </section>



    <p class="er-foot">

        <a class="er-link-dash" href="dashboard.php">

            <svg class="er-link-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>

            Back to dashboard

        </a>

    </p>

</main>



<script src="exam_result.js"></script>

</body>

</html>

