<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Examination – PLP ACSIS</title>
    <link rel="stylesheet" href="exam_session.css">
</head>
<body class="exam-session-body">

    <!-- Lobby -->
    <section id="scene-lobby" class="scene is-active" aria-label="Exam lobby">
        <header class="exam-chrome">
            <div class="exam-logo" aria-hidden="true">
                <img src="../../../img/plpupdatedlogo%203.png" alt="" class="exam-logo-img" width="40" height="40" decoding="async">
            </div>
            <div class="exam-title-bar">BSIT 3D INFOSEC QUIZ #1</div>
            <div class="exam-timer">35:00</div>
        </header>
        <main class="lobby-main">
            <h1 class="lobby-warning-title">WARNING:</h1>
            <div class="lobby-copy">
                <p>This examination system monitors your activity to ensure academic fairness.</p>
                <p>Actions like <strong>tab switching</strong>, <strong>leaving the exam page</strong>, <strong>screenshots</strong>, or <strong>right-clicking</strong> are detected. Avoid pressing Windows Key.</p>
                <p>You are allowed up to <strong>3 strikes</strong> only. If this limit is exceeded, your exam will be automatically submitted.</p>
                <p>Please remain on this page and complete the exam honestly.</p>
            </div>
        </main>
        <footer class="lobby-footer">
            <div class="lobby-spinner" aria-hidden="true"></div>
            <p class="lobby-waiting">Waiting for JUANITO ALVAREZ JR to start the exam&hellip;</p>
        </footer>
    </section>

    <!-- Countdown -->
    <section id="scene-countdown" class="scene" aria-label="Starting soon">
        <header class="exam-chrome">
            <div class="exam-logo" aria-hidden="true">
                <img src="../../../img/plpupdatedlogo%203.png" alt="" class="exam-logo-img" width="40" height="40" decoding="async">
            </div>
            <div class="exam-title-bar">BSIT 3D INFOSEC QUIZ #1</div>
            <div class="exam-timer">35:00</div>
        </header>
        <main class="countdown-main">
            <p class="countdown-label">Starting in</p>
            <p class="countdown-number" id="countdown-number">3</p>
        </main>
    </section>

    <!-- Multiple choice -->
    <section id="scene-mc" class="scene" aria-label="Multiple choice question">
        <header class="exam-chrome">
            <div class="exam-logo" aria-hidden="true">
                <img src="../../../img/plpupdatedlogo%203.png" alt="" class="exam-logo-img" width="40" height="40" decoding="async">
            </div>
            <div class="exam-title-bar">BSIT 3D INFOSEC QUIZ #1</div>
            <div class="exam-timer">34:59</div>
        </header>
        <div class="exam-stage">
            <p class="exam-type-label">Multiple choice</p>
            <p class="exam-type-hint">Read carefully and choose the best answer for the question.</p>
            <div class="question-box">
                A tool that monitors network or system activities for suspicious behavior or attacks and alerts administrators.
            </div>
            <div class="options-list" id="mc-options">
                <button type="button" class="option-row is-selected" data-value="a">
                    <span class="option-radio" aria-hidden="true"></span>
                    <span>IDS</span>
                </button>
                <button type="button" class="option-row" data-value="b">
                    <span class="option-radio" aria-hidden="true"></span>
                    <span>IPS</span>
                </button>
                <button type="button" class="option-row" data-value="c">
                    <span class="option-radio" aria-hidden="true"></span>
                    <span>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span>
                </button>
                <button type="button" class="option-row" data-value="d">
                    <span class="option-radio" aria-hidden="true"></span>
                    <span>Firewall</span>
                </button>
            </div>
        </div>
        <footer class="exam-footer-bar">
            <span class="exam-section-label">Section 1 of 2</span>
            <div class="exam-footer-right">
                <button type="button" class="btn-next" id="btn-next-mc">Next <span aria-hidden="true">&rarr;</span></button>
                <div class="progress-row">
                    <span class="progress-label">Progress</span>
                    <div class="progress-track">
                        <div class="progress-fill" id="progress-mc"></div>
                    </div>
                </div>
            </div>
        </footer>
    </section>

    <!-- Identification -->
    <section id="scene-id" class="scene" aria-label="Identification question">
        <header class="exam-chrome">
            <div class="exam-logo" aria-hidden="true">
                <img src="../../../img/plpupdatedlogo%203.png" alt="" class="exam-logo-img" width="40" height="40" decoding="async">
            </div>
            <div class="exam-title-bar">BSIT 3D INFOSEC QUIZ #1</div>
            <div class="exam-timer">35:00</div>
        </header>
        <div class="exam-stage">
            <p class="exam-type-label">Identification</p>
            <p class="exam-type-hint">Type the correct answer for each question.</p>
            <div class="question-box">
                A tool that monitors network or system activities for suspicious behavior or attacks and alerts administrators.
            </div>
            <label class="visually-hidden" for="id-answer">Your answer</label>
            <input type="text" class="id-input" id="id-answer" name="id-answer" placeholder="Type your answer.." autocomplete="off">
        </div>
        <footer class="exam-footer-bar">
            <span class="exam-section-label">Section 1 of 2</span>
            <div class="exam-footer-right">
                <button type="button" class="btn-next" id="btn-next-id">Next <span aria-hidden="true">&rarr;</span></button>
                <div class="progress-row">
                    <span class="progress-label">Progress</span>
                    <div class="progress-track">
                        <div class="progress-fill" id="progress-id"></div>
                    </div>
                </div>
            </div>
        </footer>
    </section>

    <!-- Manual coding -->
    <section id="scene-code" class="scene" aria-label="Coding question">
        <header class="exam-chrome">
            <div class="exam-logo" aria-hidden="true">
                <img src="../../../img/plpupdatedlogo%203.png" alt="" class="exam-logo-img" width="40" height="40" decoding="async">
            </div>
            <div class="exam-title-bar">BSIT 3D INFOSEC QUIZ #1</div>
            <div class="exam-timer">34:58</div>
        </header>
        <div class="exam-stage">
            <p class="exam-type-label">Manual coding</p>
            <p class="exam-type-hint">Write your solution in the editor. Syntax is not auto-checked in this preview.</p>
            <div class="question-box">
                Implement <strong>is_strong_password(p)</strong>: return <code>True</code> if string <code>p</code> is at least 12 characters and contains at least one uppercase letter, one lowercase letter, and one digit; otherwise return <code>False</code>. Use only the starter code below.
            </div>
            <label class="visually-hidden" for="code-answer">Your code</label>
            <div class="code-editor-wrap">
                <textarea class="code-editor" id="code-answer" name="code-answer" rows="14" spellcheck="false" autocapitalize="off" autocomplete="off">def is_strong_password(p):
    # your code here
    pass</textarea>
            </div>
        </div>
        <footer class="exam-footer-bar">
            <span class="exam-section-label">Section 1 of 2</span>
            <div class="exam-footer-right">
                <button type="button" class="btn-next" id="btn-next-code">Next <span aria-hidden="true">&rarr;</span></button>
                <div class="progress-row">
                    <span class="progress-label">Progress</span>
                    <div class="progress-track">
                        <div class="progress-fill" id="progress-code"></div>
                    </div>
                </div>
            </div>
        </footer>
    </section>

    <!-- True or false -->
    <section id="scene-tf" class="scene" aria-label="True or false question">
        <header class="exam-chrome">
            <div class="exam-logo" aria-hidden="true">
                <img src="../../../img/plpupdatedlogo%203.png" alt="" class="exam-logo-img" width="40" height="40" decoding="async">
            </div>
            <div class="exam-title-bar">BSIT 3D INFOSEC QUIZ #1</div>
            <div class="exam-timer">34:59</div>
        </header>
        <div class="exam-stage">
            <p class="exam-type-label">True or false</p>
            <p class="exam-type-hint">Select whether the statement is true or false.</p>
            <div class="question-box">
                An intrusion detection system (IDS) only blocks malicious traffic and never logs events for review.
            </div>
            <div class="options-list tf-grid" id="tf-options">
                <button type="button" class="option-row is-selected" data-value="true">
                    <span class="option-radio" aria-hidden="true"></span>
                    <span>True</span>
                </button>
                <button type="button" class="option-row" data-value="false">
                    <span class="option-radio" aria-hidden="true"></span>
                    <span>False</span>
                </button>
            </div>
        </div>
        <footer class="exam-footer-bar">
            <span class="exam-section-label">Section 1 of 2</span>
            <div class="exam-footer-right">
                <button type="button" class="btn-next" id="btn-next-tf">Next <span aria-hidden="true">&rarr;</span></button>
                <div class="progress-row">
                    <span class="progress-label">Progress</span>
                    <div class="progress-track">
                        <div class="progress-fill" id="progress-tf"></div>
                    </div>
                </div>
            </div>
        </footer>
    </section>

    <!-- Detection (overlay) -->
    <div id="scene-detection" class="detection-overlay" role="alertdialog" aria-modal="true" aria-labelledby="detection-title" aria-describedby="detection-desc">
        <h2 id="detection-title" class="detection-title">Suspicious Activity Detected!</h2>
        <p id="detection-desc" class="detection-sub">This is a warning.</p>
        <p class="detection-strikes">1 strike</p>
        <p id="detection-return" class="detection-countdown">Returning to exam in 5</p>
    </div>

    <script src="exam_session.js"></script>
</body>
</html>
