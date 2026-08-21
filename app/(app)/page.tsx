import { QuickEntryForm } from "@/components/quick-entry/quick-entry-form";

export default function QuickEntryPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Quick Entry</h1>
        <p className="text-sm text-muted-foreground">
          Log an expense or deposit in seconds.
        </p>
      </div>
      <QuickEntryForm />
    </div>
  );
}
