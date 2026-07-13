/** Fisher–Yates shuffle (copy). */
export function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function groupQuestionsBySection(questions) {
  const groups = []
  let currentSectionKey = undefined
  let current = []

  for (const q of questions) {
    const sectionKey = q.sectionId ?? q.section_id ?? null
    if (sectionKey !== currentSectionKey) {
      if (current.length) groups.push(current)
      current = []
      currentSectionKey = sectionKey
    }
    current.push(q)
  }
  if (current.length) groups.push(current)
  return groups
}

/**
 * Per-student layout for preview / client-side simulation.
 * Question shuffle is per set/section only — set order never changes.
 */
export function buildShuffleLayout(questions, { shuffleQuestions, shuffleChoices }) {
  const list = Array.isArray(questions) ? questions : []
  let questionOrder = list.map((q) => q.id)

  if (shuffleQuestions) {
    questionOrder = groupQuestionsBySection(list).flatMap((group) =>
      shuffleArray(group.map((q) => q.id)),
    )
  }

  const choiceOrders = {}
  if (shuffleChoices) {
    for (const qid of questionOrder) {
      const q = list.find((item) => item.id === qid)
      if (!q) continue
      const meta = Array.isArray(q._choicesMeta) ? q._choicesMeta : null
      if (meta?.length) {
        choiceOrders[String(qid)] = shuffleArray(meta.map((c) => Number(c.choiceId)))
        continue
      }
      const opts = Array.isArray(q.options) ? q.options : []
      if (opts.length) {
        choiceOrders[String(qid)] = shuffleArray(opts.map((_, index) => index))
      }
    }
  }

  return { questionOrder, choiceOrders }
}

/**
 * @param {object[]} questions
 * @param {{ questionOrder?: unknown[], choiceOrders?: Record<string, number[]> }} layout
 */
export function applyLayoutToExamQuestions(questions, layout) {
  let ordered = [...questions]

  if (layout?.questionOrder?.length) {
    const byId = new Map(ordered.map((q) => [String(q.id), q]))
    const seen = new Set()
    const next = []
    for (const qid of layout.questionOrder) {
      const q = byId.get(String(qid))
      if (q && !seen.has(String(q.id))) {
        next.push(q)
        seen.add(String(q.id))
      }
    }
    for (const q of ordered) {
      if (!seen.has(String(q.id))) next.push(q)
    }
    ordered = next
  }

  return ordered.map((q) => {
    const out = { ...q }
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
    } else if (order?.length && Array.isArray(out.options) && out.options.length === order.length) {
      out.options = order.map((index) => out.options[index])
    }
    return out
  })
}
