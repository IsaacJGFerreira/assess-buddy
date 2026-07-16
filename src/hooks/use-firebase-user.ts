import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { onAuthChange } from "@/integrations/firebase/auth";

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(!auth.currentUser);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}