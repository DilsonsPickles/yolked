import Link from "next/link";
import { BottomNav } from "@/components/nav";
import { NewExerciseForm } from "./new-exercise-form";

export default function NewExercisePage() {
  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-4">
        <Link
          href="/exercises"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <h1 className="text-2xl font-bold">New Exercise</h1>
        <p className="mt-1 text-sm text-zinc-400">Only you will see it in the picker.</p>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <NewExerciseForm />
      </main>

      <BottomNav />
    </div>
  );
}
