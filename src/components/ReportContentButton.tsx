import { useState, type FormEvent } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type ReportTarget = "course" | "exam" | "user";

export function ReportContentButton({
  targetType,
  targetId,
}: {
  targetType: ReportTarget;
  targetId: string;
}) {
  const { t, errMsg } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10 || trimmedReason.length > 500) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_content_report", {
        _target_type: targetType,
        _target_id: targetId,
        _reason: trimmedReason,
      });
      if (error) throw error;
      toast.success(t("report.submitted"));
      setReason("");
      setOpen(false);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="mr-2 h-4 w-4" />
        {t(targetType === "user" ? "report.reportUser" : "report.reportContent")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.title")}</DialogTitle>
            <DialogDescription>{t("report.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <Textarea
              autoFocus
              required
              minLength={10}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("report.reasonPlaceholder")}
              aria-label={t("report.reason")}
            />
            <p className="text-xs text-muted-foreground">{t("report.reasonHint")}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting || reason.trim().length < 10 || reason.trim().length > 500}
              >
                {submitting ? t("common.loading") : t("report.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
