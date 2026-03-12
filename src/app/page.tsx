import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { WeeklyActivity } from "@/components/weekly-activity";
import { ActivityFeed, type FeedItem } from "@/components/activity-feed";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Run independent queries in parallel
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [
    { data: ownSessions },
    { data: ownProfile },
    { data: bros },
    { data: incompleteSession },
    { data: weekSessions },
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, user_id, started_at, completed_at, workout:workouts(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("bros")
      .select("bro_id")
      .eq("user_id", user.id),
    supabase
      .from("workout_sessions")
      .select("id, started_at, workout_id, workout:workouts(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("completed_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .not("completed_at", "is", null)
      .gte("completed_at", weekStart.toISOString()),
  ]);

  const broIds = (bros || []).map((b) => b.bro_id);

  // Fetch bro data in parallel (depends on broIds)
  let broSessions: typeof ownSessions = [];
  const broProfiles = new Map<string, string | null>();

  if (broIds.length > 0) {
    const [{ data: broSessionData }, { data: broProfileData }] =
      await Promise.all([
        supabase
          .from("workout_sessions")
          .select(
            "id, user_id, started_at, completed_at, workout:workouts(name)"
          )
          .in("user_id", broIds)
          .is("deleted_at", null)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(10),
        supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", broIds),
      ]);
    broSessions = broSessionData;
    for (const p of broProfileData || []) {
      broProfiles.set(p.id, p.display_name);
    }
  }

  // Fetch reactions for all visible sessions
  const allSessionIds = [
    ...(ownSessions || []).map((s) => s.id),
    ...(broSessions || []).map((s) => s.id),
  ];

  const reactionsMap = new Map<
    string,
    { id: string; userId: string; displayName: string | null; reaction: string }[]
  >();

  if (allSessionIds.length > 0) {
    const { data: reactions } = await supabase
      .from("workout_reactions")
      .select("id, session_id, user_id, reaction")
      .in("session_id", allSessionIds);

    const reactorIds = new Set((reactions || []).map((r) => r.user_id));
    const reactorProfiles = new Map<string, string | null>();

    if (reactorIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [...reactorIds]);
      for (const p of profiles || []) {
        reactorProfiles.set(p.id, p.display_name);
      }
    }

    for (const r of reactions || []) {
      const list = reactionsMap.get(r.session_id) || [];
      list.push({
        id: r.id,
        userId: r.user_id,
        displayName: reactorProfiles.get(r.user_id) || null,
        reaction: r.reaction,
      });
      reactionsMap.set(r.session_id, list);
    }
  }

  // Build unified feed items
  const feedItems: FeedItem[] = [];

  for (const s of ownSessions || []) {
    const started = new Date(s.started_at);
    const completed = new Date(s.completed_at!);
    const durationMin = Math.round(
      (completed.getTime() - started.getTime()) / 60000
    );
    const sessionReactions = reactionsMap.get(s.id) || [];
    feedItems.push({
      sessionId: s.id,
      workoutName:
        (s.workout as unknown as { name: string })?.name || "Workout",
      startedAt: s.started_at,
      completedAt: s.completed_at!,
      durationMin,
      userId: s.user_id,
      displayName: ownProfile?.display_name || null,
      isOwn: true,
      reactions: sessionReactions.filter((r) => r.userId !== user.id),
      currentUserReaction:
        sessionReactions.find((r) => r.userId === user.id)?.reaction || null,
    });
  }

  for (const s of broSessions || []) {
    const started = new Date(s.started_at);
    const completed = new Date(s.completed_at!);
    const durationMin = Math.round(
      (completed.getTime() - started.getTime()) / 60000
    );
    const sessionReactions = reactionsMap.get(s.id) || [];
    feedItems.push({
      sessionId: s.id,
      workoutName:
        (s.workout as unknown as { name: string })?.name || "Workout",
      startedAt: s.started_at,
      completedAt: s.completed_at!,
      durationMin,
      userId: s.user_id,
      displayName: broProfiles.get(s.user_id) || null,
      isOwn: false,
      reactions: sessionReactions.filter((r) => r.userId !== user.id),
      currentUserReaction:
        sessionReactions.find((r) => r.userId === user.id)?.reaction || null,
    });
  }

  // Sort by completed_at descending
  feedItems.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

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

        {/* This week */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">
            This Week
          </h2>
          <WeeklyActivity
            sessionDates={(weekSessions || []).map((s) => s.completed_at!)}
          />
        </section>

        {/* Activity feed */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">
            Activity
          </h2>
          <ActivityFeed items={feedItems} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
