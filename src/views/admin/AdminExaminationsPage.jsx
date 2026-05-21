import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import '../../pages/admin-ui/style.css'

export default function AdminExaminationsPage({ pageTitle = 'Classes' }) {
  const [classes, setClasses] = useState([])
  const [faculties, setFaculties] = useState([])
  const [tab, setTab] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchFaculties = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setFaculties(data.users.filter(u => u.role === 'faculty' && u.status === 'active'))
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
        setTab(cur => data.some(c => c.id === cur) ? cur : data[0]?.id ?? '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFaculties()
    fetchClasses()
  }, [fetchFaculties, fetchClasses])

  const [newName, setNewName] = useState('')
  const [newAy, setNewAy] = useState('2025-2026')
  const [newSem, setNewSem] = useState('1st')
  const [newProfessorId, setNewProfessorId] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editAy, setEditAy] = useState('')
  const [editSem, setEditSem] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')

  const activeClass = useMemo(() => classes.find((c) => c.id === tab), [classes, tab])

  async function handleAddClass(e) {
    e.preventDefault()
    if (!newName.trim()) return window.alert('Enter a class name.')
    if (!newProfessorId) return window.alert('Please assign a professor.')

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          academicYear: newAy,
          semester: newSem,
          professorId: Number(newProfessorId)
        })
      })

      if (!res.ok) {
        const data = await res.json()
        return window.alert(data.error || 'Failed to create class')
      }

      setNewName('')
      setNewAy('2025-2026')
      setNewSem('1st')
      setNewProfessorId('')
      fetchClasses()
    } catch (err) {
      window.alert('Network error')
    }
  }

  function openEdit(c) {
    setEditId(c.id)
    setEditName(c.name)
    setEditAy(c.academicYear)
    setEditSem(c.semester)
    setEditOpen(true)
  }

  function saveEdit() {
    // Left empty for now. Full update not yet migrated.
    setEditOpen(false)
  }

  function confirmDelete() {
    // Left empty for now. Full delete not yet migrated.
    setDeleteOpen(false)
    setDeleteId('')
  }

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{pageTitle}</span>
        </div>
      </div>

      <div className="content-body">
        <p className="text-sm text-muted-foreground mb-4 w-full">
          Classes group exams. Set the academic year and semester per class; teachers attach new exams to a class when
          creating them.
        </p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add class</CardTitle>
              <CardDescription>New examination group for a cohort.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClass} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="class-name">Class name</Label>
                  <Input
                    id="class-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. CS 4A — Data Structures"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-prof">Assigned Professor</Label>
                  <select 
                    id="class-prof"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={newProfessorId}
                    onChange={(e) => setNewProfessorId(e.target.value)}
                  >
                    <option value="">Select a professor...</option>
                    {faculties.map(f => (
                      <option key={f.memberId} value={f.memberId}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-ay">Academic year</Label>
                  <Input id="class-ay" value={newAy} onChange={(e) => setNewAy(e.target.value)} placeholder="2025-2026" maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-sem">Semester</Label>
                  <select 
                    id="class-sem"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={newSem}
                    onChange={(e) => setNewSem(e.target.value)}
                  >
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add class
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <div>
                <CardTitle className="text-lg">Classes & exams</CardTitle>
                <CardDescription>View and manage classes and their respective exams.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading classes...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes yet. Add one on the left.</p>
              ) : (
                <div className="flex flex-col gap-6">

                  {classes.map((c) => (
                    <Card key={c.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="border-b bg-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <h3 className="font-semibold text-lg text-foreground">{c.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary">{c.academicYear}</Badge>
                            <Badge variant="outline">{c.semester}</Badge>
                            <Badge variant="outline">Prof. {c.professorName}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                            {(c.exams || []).length} exam{(c.exams || []).length === 1 ? '' : 's'}
                          </span>
                          <div className="flex gap-1 ml-2">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label="Edit class">
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                setDeleteId(c.id)
                                setDeleteOpen(true)
                              }}
                              aria-label="Delete class"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">

                      {(c.exams || []).length === 0 ? (
                        <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                          No exams in this class yet. Teachers can create one from{' '}
                          <Link to={`/teacher/create-exam?classId=${encodeURIComponent(c.id)}`} className="text-primary underline-offset-4 hover:underline">
                            Create exam
                          </Link>
                          .
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="border-b border-border bg-muted/50">
                              <tr>
                                <th className="px-3 py-2 font-medium">Title</th>
                                <th className="px-3 py-2 font-medium">Code</th>
                                <th className="px-3 py-2 font-medium">Questions</th>
                                <th className="px-3 py-2 font-medium">Minutes</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(c.exams || []).map((ex) => (
                                <tr key={ex.id} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 font-medium">{ex.title || 'Untitled'}</td>
                                  <td className="px-3 py-2 font-mono text-xs">{ex.code || '—'}</td>
                                  <td className="px-3 py-2">{Number(ex.questionCount || 0)}</td>
                                  <td className="px-3 py-2">{Number(ex.duration || 0)}</td>
                                  <td className="px-3 py-2">
                                    <Badge variant={(ex.status || '').toLowerCase() === 'active' ? 'default' : 'muted'}>
                                      {(ex.status || 'Draft').toLowerCase() === 'active' ? 'Active' : 'Draft'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Update display name, academic year, and semester.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Class name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ay">Academic year</Label>
              <Input id="edit-ay" value={editAy} onChange={(e) => setEditAy(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sem">Semester</Label>
              <Input id="edit-sem" value={editSem} onChange={(e) => setEditSem(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this class?</DialogTitle>
            <DialogDescription>
              This removes the class and all exams stored under it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
