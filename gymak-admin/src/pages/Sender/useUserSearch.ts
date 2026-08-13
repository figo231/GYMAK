import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export interface UserSearchResult {
  id: string;
  name: string | null;
  username: string | null;
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useUserSearch(rawTerm: string) {
  const term = useDebouncedValue(rawTerm.trim(), 300);

  return useQuery({
    queryKey: ["user-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, username")
        .or(`name.ilike.%${term}%,username.ilike.%${term}%`)
        .limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as UserSearchResult[];
    },
  });
}
