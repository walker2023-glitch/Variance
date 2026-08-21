import { QuickEntryForm } from "@/components/quick-entry/quick-entry-form";

export default function QuickEntryPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5">
        <p className="label-caps">Quick entry</p>
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Log it in seconds
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Amount, category, save — no wizard, no extra taps.
        </p>
      </div>
      <QuickEntryForm />
    </div>
  );
}
