import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'

export default function TeacherDetectionsPage() {
  return (
    <div className="acsis-view">
      <Card className="w-full border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Detections</CardTitle>
          <CardDescription className="acsis-prose">
            Live indicators for Alt+Tab, copy attempts, and other suspicious activity will appear here during active
            exams. Three warnings can trigger auto-submit per your system rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Connect this view to your detections API when ready.</CardContent>
      </Card>
    </div>
  )
}
