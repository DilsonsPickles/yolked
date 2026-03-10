import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav";
import { BrosClient } from "./bros-client";

export default async function BrosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's share code
  const { data: profile } = await supabase
    .from("profiles")
    .select("share_code")
    .eq("id", user.id)
    .single();

  // Get bros list with profile info
  const { data: bros } = await supabase
    .from("bros")
    .select("bro_id, profile:profiles!bro_id(display_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen pb-20">
      <header className="border-b border-zinc-800 px-4 py-6">
        <h1 className="text-2xl font-bold">Bros</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect with your gym buddies
        </p>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <BrosClient
          shareCode={profile?.share_code || "------"}
          bros={
            (bros as unknown as {
              bro_id: string;
              profile: { display_name: string | null };
            }[]) || []
          }
        />
      </main>

      <BottomNav />
    </div>
  );
}
