import { supabase } from "@/integrations/supabase/client";

/** Provision signing material on the server; no private key enters the browser. */
export const createUserActor = async (_userId: string, enableFederation = true): Promise<boolean> => {
  const { data, error } = await supabase.functions.invoke("create-user-actor", { body: { enableFederation } });
  if (error || !data?.success) {
    console.error("Could not enable federation", error || data?.error);
    return false;
  }
  return true;
};

export const checkActorKeys = async (actorId: string): Promise<boolean> => {
  const { data, error } = await supabase.from("public_actors")
    .select("public_key, status").eq("id", actorId).maybeSingle();
  return !error && data?.status === "active" && !!data.public_key?.startsWith("-----BEGIN PUBLIC KEY-----");
};

export const ensureActorKeys = async (actorId: string): Promise<boolean> => {
  if (await checkActorKeys(actorId)) return true;
  const { data, error } = await supabase.functions.invoke("create-user-actor", { body: { enableFederation: true } });
  return !error && data?.actorId === actorId && data?.success === true;
};

/** Local posting needs an actor record, but must never opt a user into federation. */
export async function getOrCreateLocalActor(userId: string) {
  const load = () => supabase.from("public_actors").select("id, preferred_username")
    .eq("user_id", userId).eq("is_remote", false).maybeSingle();
  const result = await load();
  if (result.error) throw result.error;
  if (result.data) return result.data;
  if (!await createUserActor(userId, false)) throw new Error("Could not prepare your account for posting");
  const created = await load();
  if (created.error) throw created.error;
  if (!created.data) throw new Error("Account actor was not created");
  return created.data;
}
