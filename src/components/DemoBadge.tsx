import { useI18n } from "@/lib/i18n";

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">
      {t("demo.badge")}
    </span>
  );
}
