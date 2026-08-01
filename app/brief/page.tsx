import Link from "next/link";
import BriefForm from "@/components/BriefForm";

export default function BriefPage() {
  return (
    <main className="space-y-8">
      <header>
        <Link href="/" className="text-sm text-neutral-500 underline underline-offset-2">
          ← Back to pipeline
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Generate from URL</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Paste a product or service's page — no persona setup, no topic, no template picking.
          Review the generated script, click approve, and the rest of the pipeline runs on its own.
        </p>
      </header>
      <BriefForm />
    </main>
  );
}
