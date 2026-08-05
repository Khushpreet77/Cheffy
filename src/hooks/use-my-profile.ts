import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";

export function useMyProfile() {
  const fn = useServerFn(getMyProfile);
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
