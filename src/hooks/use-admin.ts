"use client";

import { useEffect, useState } from "react";
import { getIsAdmin } from "@/actions/admin";

export function useIsAdmin(enabled: boolean = true) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    getIsAdmin().then((ok) => {
      setIsAdmin(ok);
      setLoading(false);
    });
  }, [enabled]);

  return { isAdmin, loading };
}
