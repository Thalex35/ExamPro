import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitch({
  tone = "default",
  value,
  onChange,
}: {
  tone?: "default" | "light";
  value?: Lang;
  onChange?: (lang: Lang) => void;
}) {
  const { lang, setLang, t } = useI18n();
  const selectedLang = value ?? lang;
  const changeLang = onChange ?? setLang;
  const opts: { v: Lang; l: string }[] = [
    { v: "fr", l: "FR" },
    { v: "ht", l: "KR" },
  ];
  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={cn(
        "inline-flex rounded-full border p-0.5 text-xs font-semibold",
        tone === "light" ? "border-primary-foreground/30" : "border-border bg-card",
      )}
    >
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => changeLang(o.v)}
          aria-pressed={selectedLang === o.v}
          className={cn(
            "rounded-full px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedLang === o.v
              ? "bg-brand text-brand-foreground"
              : tone === "light"
                ? "text-primary-foreground/80 hover:text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
