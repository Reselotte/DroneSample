import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/**
 * สถานะการเข้าสู่ระบบ { session, user, ready }
 * ready = false ระหว่างเช็ก (ยังไม่รู้ว่าเข้าระบบอยู่ไหม)
 */
export default function useAuth() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) { setSession(null); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session: session || null, user: session?.user || null, ready: session !== undefined };
}
