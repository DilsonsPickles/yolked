import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-5xl font-black tracking-tight">YOLKED</h1>
        <p className="mt-4 text-lg text-zinc-400">
          Build and track your workouts. No subscription required.
        </p>
        <Link
          href="/login"
          className="mt-8 rounded-lg bg-orange-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Get Started
        </Link>
      </div>
    );
  }

  // Fetch recent sessions
  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, completed_at, workout:workouts(name)")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5);

  // Fetch incomplete session for resume banner
  const { data: incompleteSession } = await supabase
    .from("workout_sessions")
    .select("id, started_at, workout_id, workout:workouts(name)")
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Count workouts this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: weekCount } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .not("completed_at", "is", null)
    .gte("completed_at", weekStart.toISOString());

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <h1 className="text-2xl font-black tracking-tight">YOLKED</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Welcome back
          {user.user_metadata?.display_name
            ? `, ${user.user_metadata.display_name}`
            : ""}
        </p>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Resume incomplete session */}
        {incompleteSession && (
          <Link
            href={`/workouts/${incompleteSession.workout_id}/perform`}
            className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 transition-colors hover:bg-orange-500/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-orange-400">Resume Workout</p>
              <p className="text-sm text-zinc-400">
                {(incompleteSession.workout as unknown as { name: string })?.name || "Workout"} — started{" "}
                {new Date(incompleteSession.started_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </Link>
        )}

        {/* Weekly stats */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-500">This week</p>
          <p className="mt-1 text-2xl font-bold">
            {weekCount || 0}{" "}
            <span className="text-base font-normal text-zinc-500">
              workout{weekCount !== 1 ? "s" : ""}
            </span>
          </p>
        </div>

        {/* Quick actions */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/workouts"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-orange-500/50"
            >
              <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              <span className="text-sm font-medium">Start</span>
            </Link>
            <Link
              href="/workouts/new"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-orange-500/50"
            >
              <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-medium">Create</span>
            </Link>
            <Link
              href="/bros"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-orange-500/50"
            >
              <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <span className="text-sm font-medium">Bros</span>
            </Link>
          </div>
        </section>

        {/* Recent sessions */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">
            Recent Sessions
          </h2>
          {recentSessions && recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((session) => {
                const started = new Date(session.started_at);
                const completed = new Date(session.completed_at!);
                const durationMin = Math.round(
                  (completed.getTime() - started.getTime()) / 60000
                );
                return (
                  <Link
                    key={session.id}
                    href={`/history/${session.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div>
                      <p className="font-medium">
                        {(session.workout as unknown as { name: string })?.name || "Workout"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {started.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {durationMin}min
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
              No workouts completed yet. Start your first one!
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
