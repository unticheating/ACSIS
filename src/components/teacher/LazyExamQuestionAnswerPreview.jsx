import { lazy, Suspense, useEffect, useRef, useState } from 'react'

const ExamQuestionAnswerPresentation = lazy(
  () => import('@/components/teacher/ExamQuestionAnswerPresentation.jsx'),
)

/**
 * Renders the teacher answer-key preview only when the question scrolls near the viewport.
 */
export default function LazyExamQuestionAnswerPreview({ question }) {
  const rootRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = rootRef.current
    if (!node || visible) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={rootRef} className="acsis-exam-detail__question-answer-lazy">
      {visible ? (
        <Suspense
          fallback={<div className="acsis-exam-detail__question-answer-placeholder" aria-hidden />}
        >
          <ExamQuestionAnswerPresentation question={question} />
        </Suspense>
      ) : (
        <div className="acsis-exam-detail__question-answer-placeholder" aria-hidden />
      )}
    </div>
  )
}
