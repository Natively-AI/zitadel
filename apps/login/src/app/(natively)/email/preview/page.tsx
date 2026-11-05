import { DisableAutoFocus } from "@/components/natively/auto-focus";
import { PreviewScreenContent } from "@/components/natively/preview-screen";
import { ThemeToggle } from "@/components/natively/theme-toggle";
import { isPreviewEnabled, PREVIEW_SCREENS } from "@/lib/natively/preview";
import Link from "next/link";
import { notFound } from "next/navigation";

// NativelyAI fork: design preview, every screen side by side in a popup (480×640) and a phone
// (375×667) and a desktop (1280×800) box. The toggle switches between the
// light and dark theme (the same switch the real screens show, top right). Development only.
// A box that shows a scrollbar means that screen needs scrolling at that size.

const FRAMES = [
  { name: "Popup 480×640", width: 480, height: 640 },
  { name: "Phone 375×667", width: 375, height: 667 },
  { name: "Desktop 1280×800", width: 1280, height: 800 },
];

export default async function Page() {
  if (!isPreviewEnabled()) {
    notFound();
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">NativelyAI login: screen preview</h1>
          <p className="text-fg-muted mt-1 max-w-2xl text-sm">
            Sample data, no Zitadel connection: buttons don&apos;t log anyone in. If a box shows a scrollbar, that screen
            needs scrolling at that size. Click a title to open the screen on its own and resize the window.
          </p>
        </div>
        <ThemeToggle className="relative" />
      </div>

      {PREVIEW_SCREENS.map((screen) => (
        <section key={screen.id} className="mt-12">
          <h2 className="mb-3 text-sm font-semibold">
            <Link href={`/email/preview/${screen.id}`} className="hover:underline">
              {screen.label}
            </Link>
          </h2>
          <div className="flex flex-wrap items-start gap-6">
            {FRAMES.map((frame) => (
              <figure key={frame.name}>
                <div
                  className="rounded-ds-lg border-line bg-page relative overflow-auto border"
                  style={{ width: frame.width, height: frame.height }}
                >
                  <DisableAutoFocus>
                    <PreviewScreenContent screen={screen.id} contained />
                  </DisableAutoFocus>
                </div>
                <figcaption className="text-fg-subtle mt-1.5 text-xs">{frame.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
