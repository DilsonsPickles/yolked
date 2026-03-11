import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, share_code")
    .eq("id", user.id)
    .single();

  return (
    <>
      <ProfileClient
        displayName={profile?.display_name ?? user.user_metadata?.display_name ?? null}
        email={user.email ?? ""}
        shareCode={profile?.share_code ?? ""}
      />
      <BottomNav />
    </>
  );
}
