import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackFilter } from "@/lib/catalog";
import type { Database } from "@/integrations/supabase/types";

export type DemoRecord = Database["public"]["Tables"]["demo_student_records"]["Row"];
export type DemoRecordType = DemoRecord["record_type"];

export function demoRecordsQuery(
  levelId: string | null | undefined,
  trackId: string | null | undefined,
  recordType: DemoRecordType,
) {
  return queryOptions({
    queryKey: ["demo-student-records", levelId, trackId, recordType],
    enabled: !!levelId,
    queryFn: async () => {
      if (!levelId) return [];
      const { data, error } = await supabase
        .from("demo_student_records")
        .select("*")
        .eq("level_id", levelId)
        .eq("record_type", recordType)
        .or(trackFilter(trackId))
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
