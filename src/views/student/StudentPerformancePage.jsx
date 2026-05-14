import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'

/** Placeholder analytics until grades API exists — matches ACSIS shell + green accent. */
export default function StudentPerformancePage() {
  return (
    <div className="acsis-view space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Performance</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Track how you are doing across enrolled classes. Live charts will connect to your institution&apos;s gradebook.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average (demo)</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No graded attempts in this preview yet.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Exams completed</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Counts finished sessions only.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Integrity strikes (demo)</CardDescription>
            <CardTitle className="text-3xl font-bold tabular-nums">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tab-leave and hotkey flags from exam sessions.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Readiness</CardTitle>
          <CardDescription>Example progress bar using the same green system as the rest of ACSIS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Course goals (placeholder)</span>
            <span>42%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[42%] rounded-full bg-primary transition-all" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
