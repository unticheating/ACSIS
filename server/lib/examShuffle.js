/** Fisher–Yates shuffle (copy). */
export function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Group consecutive questions by section (rows must be ordered by section, then question). */
function groupQuestionIdsBySection(questionRows) {
  const groups = []
  let currentSectionKey = undefined
  let currentIds = []

  for (const row of questionRows) {
    const sectionKey = row.section_id ?? null
    if (sectionKey !== currentSectionKey) {
      if (currentIds.length) groups.push(currentIds)
      currentIds = []
      currentSectionKey = sectionKey
    }
    currentIds.push(Number(row.question_id))
  }
  if (currentIds.length) groups.push(currentIds)
  return groups
}

/**
 * Build persisted layout from DB question/choice rows.
 * Question shuffle is per set/section only — set order never changes.
 */
export function buildShuffleLayout(questionRows, choicesByQuestion, { shuffleQuestions, shuffleChoices }) {
  let questionOrder = questionRows.map((r) => Number(r.question_id))
  if (shuffleQuestions) {
    const groups = groupQuestionIdsBySection(questionRows)
    questionOrder = groups.flatMap((ids) => shuffleArray(ids))
  }

  const choiceOrders = {}
  if (shuffleChoices) {
    for (const qid of questionOrder) {
      const choices = choicesByQuestion.get(qid) || []
      choiceOrders[String(qid)] = shuffleArray(choices.map((c) => Number(c.choice_id)))
    }
  }

  return { questionOrder, choiceOrders }
}

/**
 * Reorder questions for a session; strip correct answers for students.
 * @param {object[]} questions - from getExamWithQuestionsQuery
 * @param {{ questionOrder?: number[], choiceOrders?: Record<string, number[]> }} layout
 */
export function applyLayoutToExamQuestions(questions, layout, { forStudent = false } = {}) {
  let ordered = [...questions]

  if (layout?.questionOrder?.length) {
    const byId = new Map(ordered.map((q) => [Number(q.id), q]))
    const seen = new Set()
    const next = []
    for (const qid of layout.questionOrder) {
      const q = byId.get(Number(qid))
      if (q && !seen.has(Number(q.id))) {
        next.push(q)
        seen.add(Number(q.id))
      }
    }
    for (const q of ordered) {
      if (!seen.has(Number(q.id))) next.push(q)
    }
    ordered = next
  }

  return ordered.map((q) => {
    const out = { ...q }
    if (forStudent) {
      delete out.correctAnswer
      // keep sectionTitle, sectionDescription, sectionId for student instructions
    }

    const order = layout?.choiceOrders?.[String(q.id)] ?? layout?.choiceOrders?.[q.id]
    if (order?.length && out._choicesMeta?.length) {
      const byCid = new Map(out._choicesMeta.map((c) => [Number(c.choiceId), c.choiceText]))
      const texts = []
      for (const cid of order) {
        const t = byCid.get(Number(cid))
        if (t != null) texts.push(t)
      }
      if (texts.length === out._choicesMeta.length) {
        out.options = texts
      }
    }

    if (forStudent) {
      delete out._choicesMeta
    }
    return out
  })
}
