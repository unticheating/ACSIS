import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'

export default function StudentMessagesPage() {
  return (
    <div className="acsis-view">
      <Card className="w-full border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Results &amp; email</CardTitle>
          <CardDescription>
            When your professor releases scores, notifications and exam summaries can be sent to your registered email.
            This area will list delivered results and downloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Connect to your messaging service when ready.</CardContent>
      </Card>
    </div>
  )
}
