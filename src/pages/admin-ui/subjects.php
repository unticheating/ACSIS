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
                <button type="button" class="btn" onclick="openAddSubject()">
                    <i class="fas fa-plus"></i> Add Subject
                </button>
            </div>

            <div class="subject-toolbar">
                <label class="subject-filter">
                    <span class="subject-filter__label">Year</span>
                    <select id="filterYear" class="subject-filter__select" onchange="applySubjectFilters()">
                        <option value="">All Years</option>
                    </select>
                </label>
                <label class="subject-filter">
                    <span class="subject-filter__label">Section</span>
                    <select id="filterSection" class="subject-filter__select" onchange="applySubjectFilters()">
                        <option value="">All Sections</option>
                    </select>
                </label>
                <label class="subject-filter subject-filter--checkbox">
                    <input type="checkbox" id="showArchivedSubjects" onchange="applySubjectFilters()">
                    <span>Show archived</span>
                </label>
            </div>

            <div class="subject-grid" id="subjectGrid">
                <?php
                // Replace with real DB query:
                // $subjects = $pdo->query("SELECT *, archived FROM subjects ORDER BY subject_name ASC")->fetchAll();
                // foreach ($subjects as $sub):
                //
                $demo_subjects = [
                    ['title' => 'Data Structures', 'code' => 'CS101', 'year' => '1st Year', 'section' => 'Section A', 'db_id' => 1, 'archived' => 0],
                    ['title' => 'Information Security', 'code' => 'INFOSEC', 'year' => '3rd Year', 'section' => 'Section A', 'db_id' => 2, 'archived' => 0],
                    ['title' => 'Database Systems', 'code' => 'DB201', 'year' => '2nd Year', 'section' => 'Section B', 'db_id' => 3, 'archived' => 1],
                    ['title' => 'Operating Systems', 'code' => 'OS301', 'year' => '2nd Year', 'section' => 'Section A', 'db_id' => 4, 'archived' => 0],
                ];
                foreach ($demo_subjects as $sub):
                    $archived = !empty($sub['archived']);
                ?>
                <div
                    class="subject-card<?= $archived ? ' subject-card--archived' : '' ?>"
                    data-subject-id="<?= (int) $sub['db_id'] ?>"
                    data-year="<?= htmlspecialchars($sub['year'], ENT_QUOTES, 'UTF-8') ?>"
                    data-section="<?= htmlspecialchars($sub['section'], ENT_QUOTES, 'UTF-8') ?>"
                    data-archived="<?= $archived ? '1' : '0' ?>"
                >
                    <div class="subject-card-header">
                        <div>
                            <h3 class="subject-title"><?= htmlspecialchars($sub['title']) ?></h3>
                            <p class="subject-code"><?= htmlspecialchars($sub['code']) ?></p>
                        </div>
                        <div class="subject-actions">
                            <?php if ($archived): ?>
                            <span class="tag tag--archived">Archived</span>
                            <?php endif; ?>
                            <button type="button" class="action-btn edit-btn" title="Edit" onclick="editSubject(<?= (int) $sub['db_id'] ?>)">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button
                                type="button"
                                class="action-btn archive-btn"
                                title="<?= $archived ? 'Unarchive' : 'Archive' ?>"
                                onclick="toggleArchiveSubject(<?= (int) $sub['db_id'] ?>)"
                            >
                                <i class="fas <?= $archived ? 'fa-box-open' : 'fa-archive' ?>"></i>
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

            <p class="subject-empty-msg" id="subjectEmptyMsg" hidden>No subjects match the current filters.</p>
        </div>
    </div>
</div>

<script src="script.js"></script>
<script>
var SUBJECT_ARCHIVE_KEY = 'acsis_admin_subject_archived';

function getArchivedSubjectIds() {
    try {
        return JSON.parse(localStorage.getItem(SUBJECT_ARCHIVE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function setArchivedSubjectIds(ids) {
    localStorage.setItem(SUBJECT_ARCHIVE_KEY, JSON.stringify(ids));
}

function syncSubjectArchiveState() {
    var archived = getArchivedSubjectIds();
    document.querySelectorAll('.subject-card[data-subject-id]').forEach(function (card) {
        var id = parseInt(card.getAttribute('data-subject-id'), 10);
        var isArchived = archived.indexOf(id) !== -1 || card.getAttribute('data-archived') === '1';
        applyArchivedUiToCard(card, isArchived);
    });
}

function applyArchivedUiToCard(card, isArchived) {
    var badge = card.querySelector('.tag--archived');
    var btn = card.querySelector('.archive-btn');
    if (isArchived) {
        card.classList.add('subject-card--archived');
        card.setAttribute('data-archived', '1');
        if (!badge) {
            var actions = card.querySelector('.subject-actions');
            var span = document.createElement('span');
            span.className = 'tag tag--archived';
            span.textContent = 'Archived';
            actions.insertBefore(span, actions.firstChild);
        }
        if (btn) {
            btn.title = 'Unarchive';
            btn.querySelector('i').className = 'fas fa-box-open';
        }
    } else {
        card.classList.remove('subject-card--archived');
        card.setAttribute('data-archived', '0');
        if (badge) badge.remove();
        if (btn) {
            btn.title = 'Archive';
            btn.querySelector('i').className = 'fas fa-archive';
        }
    }
}

function populateSubjectFilters() {
    var years = new Set();
    var sections = new Set();
    document.querySelectorAll('.subject-card').forEach(function (card) {
        years.add(card.getAttribute('data-year'));
        sections.add(card.getAttribute('data-section'));
    });
    var yearSel = document.getElementById('filterYear');
    var sectionSel = document.getElementById('filterSection');
    years.forEach(function (y) {
        if (!y) return;
        var opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSel.appendChild(opt);
    });
    sections.forEach(function (s) {
        if (!s) return;
        var opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sectionSel.appendChild(opt);
    });
}

function applySubjectFilters() {
    var year = document.getElementById('filterYear').value;
    var section = document.getElementById('filterSection').value;
    var showArchived = document.getElementById('showArchivedSubjects').checked;
    var visible = 0;
    document.querySelectorAll('.subject-card').forEach(function (card) {
        var matchYear = !year || card.getAttribute('data-year') === year;
        var matchSection = !section || card.getAttribute('data-section') === section;
        var isArchived = card.getAttribute('data-archived') === '1';
        var matchArchive = showArchived || !isArchived;
        var show = matchYear && matchSection && matchArchive;
        card.hidden = !show;
        if (show) visible += 1;
    });
    document.getElementById('subjectEmptyMsg').hidden = visible > 0;
}

function toggleArchiveSubject(id) {
    var card = document.querySelector('.subject-card[data-subject-id="' + id + '"]');
    var isArchived = card && card.getAttribute('data-archived') === '1';
    if (!isArchived && !confirm('Archive this subject (class instance)?')) return;
    var archived = getArchivedSubjectIds();
    if (isArchived) {
        archived = archived.filter(function (x) { return x !== id; });
        // UPDATE subjects SET archived = 0 WHERE id = ?
    } else {
        if (archived.indexOf(id) === -1) archived.push(id);
        // UPDATE subjects SET archived = 1 WHERE id = ?
    }
    setArchivedSubjectIds(archived);
    if (card) applyArchivedUiToCard(card, !isArchived);
    applySubjectFilters();
}

function openAddSubject() {
    alert(
        'Add Subject (placeholder)\n\n' +
        'You will enter:\n' +
        '• Course title\n' +
        '• Subject code\n' +
        '• Year level\n' +
        '• Section\n\n' +
        'Database hook-up coming soon.'
    );
}

function editSubject(id) {
    alert('Edit subject ID: ' + id + ' (placeholder)');
}

document.addEventListener('DOMContentLoaded', function () {
    populateSubjectFilters();
    syncSubjectArchiveState();
    applySubjectFilters();
});
</script>
</body>
</html>
