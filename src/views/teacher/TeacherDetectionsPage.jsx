import React, { useEffect, useState, useMemo } from 'react'
import { Clock, Eye, AlertTriangle, ShieldAlert, MonitorPlay, X } from 'lucide-react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { apiFetch } from '@/lib/apiFetch.js'

// Generate 40 mock students
function generateMockStudents() {
  const firstNames = ['John', 'Jane', 'Alex', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

  const students = []
  for (let i = 0; i < 40; i++) {
    const isPresent = Math.random() > 0.15; // 85% present
    let status = 'empty'
    let strikes = 0
    let violations = []

    if (isPresent) {
      const rand = Math.random()
      if (rand > 0.9) {
        status = 'void'
        strikes = 3
        violations = ['Tab switch (10:05)', 'Screenshot detected (10:15)', 'Lost focus (10:20) - Voided']
      } else if (rand > 0.75) {
        status = 'warning'
        strikes = Math.floor(Math.random() * 2) + 1
        violations = ['Tab switch (10:12)']
        if (strikes === 2) violations.push('Right-click detected (10:18)')
      } else {
        status = 'good'
      }
    }

    students.push({
      id: `std-${i}`,
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      schoolId: `2024-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      status,
      strikes,
      violations
    })
  }
  return students
}

export default function TeacherDetectionsPage() {
  const [seconds, setSeconds] = useState(0)
  const [activeExam, setActiveExam] = useState(null)

  const students = useMemo(() => generateMockStudents(), [])
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Fetch the currently active exam from the database API
  useEffect(() => {
    async function findActiveExam() {
      try {
        const res = await apiFetch('/api/teacher/classes')
        if (!res.ok) return
        const classes = await res.json()
        // For each class, fetch its exams and find the first active one
        for (const cls of classes) {
          const exRes = await apiFetch(`/api/teacher/classes/${cls.id}/exams`)
          if (!exRes.ok) continue
          const clsData = await exRes.json()
          const activeExam = (clsData.exams || []).find(
            (e) => ['waiting', 'open'].includes((e.status || '').toLowerCase()),
          )
          if (activeExam) {
            setActiveExam({ ...activeExam, className: clsData.name })
            return
          }
        }
      } catch (err) {
        console.error('[Detections] Failed to fetch active exam:', err)
      }
    }
    findActiveExam()
  }, [])

  // Timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (totalSeconds) => {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const s = String(totalSeconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  if (!activeExam) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-8">
        <div className="flex items-center gap-3 mb-8">
          <MonitorPlay className="w-8 h-8 text-gray-400" />
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Live Monitoring</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center max-w-2xl mx-auto mt-12">
          <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Active Exams</h2>
          <p className="text-gray-500 text-lg">
            Activate an exam from the 'My Classes' page to begin live monitoring your students.
          </p>
        </div>
      </div>
    )
  }

  const presentStudents = students.filter(s => s.status !== 'empty')
  const warnings = presentStudents.filter(s => s.status === 'warning').length
  const voids = presentStudents.filter(s => s.status === 'void').length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-12">

      {/* Header Area */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 mb-8">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Live Monitoring</h1>
            </div>
            <p className="text-gray-500 font-medium">{activeExam.title}</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-6 py-3 flex flex-col items-center min-w-[120px]">
              <span className="text-orange-600 font-bold text-2xl leading-none mb-1">{warnings}</span>
              <span className="text-orange-800 text-xs font-semibold uppercase tracking-wider">Warnings</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-3 flex flex-col items-center min-w-[120px]">
              <span className="text-red-600 font-bold text-2xl leading-none mb-1">{voids}</span>
              <span className="text-red-800 text-xs font-semibold uppercase tracking-wider">Voided</span>
            </div>
            <div className="bg-gray-900 rounded-xl px-6 py-3 flex items-center gap-3 text-white min-w-[160px]">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="font-mono text-2xl font-semibold tracking-tight">{formatTime(seconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Classroom Area */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-8">

        {/* The Board */}
        <div className="w-full max-w-4xl mx-auto h-24 bg-white border-4 border-gray-300 rounded-lg shadow-sm flex items-center justify-center mb-16 relative">
          <div className="absolute top-full w-full h-4 flex justify-around px-8 opacity-20">
            <div className="w-2 h-full bg-gray-400"></div>
            <div className="w-2 h-full bg-gray-400"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-400 tracking-widest uppercase">Front of Classroom (Teacher's Desk)</h2>
        </div>

        {/* Seating Grid (4 cols, gap, 4 cols) */}
        <div className="grid grid-cols-[repeat(4,1fr)_3rem_repeat(4,1fr)] gap-y-6 gap-x-4">
          {students.map((student, idx) => {
            // Insert empty space for the 5th column (the walkway)
            const isWalkwayCol = (idx % 8) === 4;

            const isGood = student.status === 'good';
            const isWarning = student.status === 'warning';
            const isVoid = student.status === 'void';
            const isEmpty = student.status === 'empty';

            let cardClasses = "relative aspect-[4/3] rounded-xl border-2 flex flex-col p-3 transition-all cursor-pointer group ";
            let icon = null;

            if (isEmpty) {
              cardClasses += "border-dashed border-gray-300 bg-gray-50/50 cursor-default";
            } else if (isVoid) {
              cardClasses += "border-red-500 bg-red-50 hover:bg-red-100 shadow-sm";
              icon = <ShieldAlert className="w-5 h-5 text-red-500" />;
            } else if (isWarning) {
              cardClasses += "border-orange-400 bg-orange-50 hover:bg-orange-100 shadow-sm";
              icon = <AlertTriangle className="w-5 h-5 text-orange-500" />;
            } else {
              cardClasses += "border-green-400 bg-green-50 hover:bg-green-100 shadow-sm";
              icon = <div className="w-3 h-3 bg-green-500 rounded-full" />;
            }

            const initials = !isEmpty ? `${student.firstName[0]}${student.lastName[0]}` : '';

            const seatCard = (
              <div
                key={student.id}
                className={cardClasses}
                onClick={() => !isEmpty && setSelectedStudent(student)}
              >
                {!isEmpty ? (
                  <>
                    <div className="flex justify-between items-start mb-auto">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isVoid ? 'bg-red-200 text-red-800' :
                        isWarning ? 'bg-orange-200 text-orange-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                        {initials}
                      </div>
                      {icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm truncate text-gray-900">{student.firstName}</div>
                      <div className="text-xs text-gray-500 truncate">{student.lastName}</div>
                    </div>
                    {/* Strikes Indicator */}
                    {(isWarning || isVoid) && (
                      <div className="absolute -top-2 -right-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
                        {student.strikes} {student.strikes === 1 ? 'strike' : 'strikes'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <span className="text-gray-400 text-sm font-medium">Empty</span>
                  </div>
                )}
              </div>
            )

            return (
              <React.Fragment key={student.id}>
                {isWalkwayCol && <div className="col-span-1" /* Walkway gap */ />}
                {seatCard}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-6 text-white flex justify-between items-start ${selectedStudent.status === 'void' ? 'bg-red-600' :
              selectedStudent.status === 'warning' ? 'bg-orange-500' :
                'bg-green-600'
              }`}>
              <div>
                <h3 className="text-2xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                <p className="opacity-90">{selectedStudent.schoolId}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center justify-between pb-6 border-b border-gray-100">
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Current Status</div>
                  <div className={`font-bold text-lg ${selectedStudent.status === 'void' ? 'text-red-600' :
                    selectedStudent.status === 'warning' ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                    {selectedStudent.status === 'void' ? 'Exam Voided' :
                      selectedStudent.status === 'warning' ? 'Warning Issued' :
                        'Doing Well'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 font-medium mb-1">Strikes</div>
                  <div className="font-bold text-xl text-gray-900">{selectedStudent.strikes} / 3</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Violation Log</h4>
                {selectedStudent.violations && selectedStudent.violations.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedStudent.violations.map((v, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 ${selectedStudent.status === 'void' ? 'text-red-500' : 'text-orange-500'}`} />
                        {v}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                    No suspicious activity detected.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}