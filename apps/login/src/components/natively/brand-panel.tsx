// NativelyAI fork: the left-hand brand panel on wide screens. Kept out of ui.tsx because it
// reads translations; useTranslations (not the async getTranslations) so it renders in both
// server pages and the client error boundary.

import { useTranslations } from "next-intl";

const steps = ["describe", "preview", "publish"] as const;

export function BrandPanel() {
  const t = useTranslations("natively.panel");

  return (
    <div className="flex max-w-md flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-fg text-4xl leading-[1.1] font-semibold tracking-tight">{t("headline")}</h2>
        <p className="text-fg-muted text-base leading-relaxed">{t("body")}</p>
      </div>
      <ol className="border-line flex flex-col border-t">
        {steps.map((key, i) => (
          <li key={key} className="border-line flex items-baseline gap-4 border-b py-3.5">
            <span className="text-fg-subtle font-mono text-xs tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-fg text-sm">{t(`steps.${key}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BrandPanelFooter() {
  const t = useTranslations("natively.panel");
  return <p className="text-fg-muted text-sm">{t("footer")}</p>;
}
