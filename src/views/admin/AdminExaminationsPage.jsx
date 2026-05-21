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
import {
  CLASSES_CHANGED_EVENT,
  CLASSES_STORAGE_KEY,
  addClass,
  deleteClass,
  ensureClassesMigrated,
  getClasses,
  updateClassMeta,
} from '@/lib/classesExams.js'
import '../../pages/admin-ui/style.css'

/**
 * @param {{ pageTitle?: string }} props
 */
export default function AdminExaminationsPage({ pageTitle = 'Classes' }) {
  const [classes, setClasses] = useState(() => {
    ensureClassesMigrated()
    return getClasses()
  })
  const [tab, setTab] = useState(() => getClasses()[0]?.id ?? '')

  const refresh = useCallback(() => {
    ensureClassesMigrated()
    const next = getClasses()
    setClasses(next)
    setTab((cur) => (next.some((c) => c.id === cur) ? cur : next[0]?.id ?? ''))
  }, [])

  useEffect(() => {
    const on = () => refresh()
    window.addEventListener(CLASSES_CHANGED_EVENT, on)
    const onStorage = (e) => {
      if (e.key === CLASSES_STORAGE_KEY) on()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CLASSES_CHANGED_EVENT, on)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  const [newName, setNewName] = useState('')
  const [newAy, setNewAy] = useState('A.Y. 2025-2026')
  const [newSem, setNewSem] = useState('1st Semester')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editAy, setEditAy] = useState('')
  const [editSem, setEditSem] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')

  const activeClass = useMemo(() => classes.find((c) => c.id === tab), [classes, tab])

  function handleAddClass(e) {
    e.preventDefault()
    if (!newName.trim()) {
      window.alert('Enter a class name.')
      return
    }
    const id = addClass({ name: newName, academicYear: newAy, semester: newSem })
    setNewName('')
    setNewAy('A.Y. 2025-2026')
    setNewSem('1st Semester')
    refresh()
    setTab(id)
  }

  function openEdit(c) {
    setEditId(c.id)
    setEditName(c.name)
    setEditAy(c.academicYear)
    setEditSem(c.semester)
    setEditOpen(true)
  }

  function saveEdit() {
    if (!editName.trim()) return
    updateClassMeta(editId, { name: editName.trim(), academicYear: editAy.trim(), semester: editSem.trim() })
    setEditOpen(false)
    refresh()
  }

  function confirmDelete() {
    if (deleteId) deleteClass(deleteId)
    setDeleteOpen(false)
    setDeleteId('')
    refresh()
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
                  <Label htmlFor="class-ay">Academic year</Label>
                  <Input id="class-ay" value={newAy} onChange={(e) => setNewAy(e.target.value)} placeholder="A.Y. …" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class-sem">Semester</Label>
                  <Input id="class-sem" value={newSem} onChange={(e) => setNewSem(e.target.value)} placeholder="1st …" />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add class
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-lg">Classes & exams</CardTitle>
                <CardDescription>Select a class to view its exams.</CardDescription>
              </div>
              {activeClass ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(activeClass)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit class
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteId(activeClass.id)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes yet. Add one on the left.</p>
              ) : (
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                  <ScrollArea className="w-full max-w-full pb-2">
                    <TabsList className="mb-2 inline-flex h-auto w-max flex-wrap justify-start gap-1 bg-muted/80 p-1">
                      {classes.map((c) => (
                        <TabsTrigger key={c.id} value={c.id} className="max-w-[220px] truncate">
                          {c.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </ScrollArea>

                  {classes.map((c) => (
                    <TabsContent key={c.id} value={c.id} className="mt-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="secondary">{c.academicYear}</Badge>
                        <Badge variant="outline">{c.semester}</Badge>
                        <span className="text-muted-foreground">
                          {(c.exams || []).length} exam{(c.exams || []).length === 1 ? '' : 's'}
                        </span>
                      </div>

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
                    </TabsContent>
                  ))}
                </Tabs>
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
              This removes the class and all exams stored under it. If you delete every class, an empty default class is
              created so the system keeps a valid structure.
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
