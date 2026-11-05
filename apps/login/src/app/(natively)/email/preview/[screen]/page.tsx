import { PreviewScreenContent } from "@/components/natively/preview-screen";
import { isPreviewEnabled, PREVIEW_SCREENS, PreviewScreen } from "@/lib/natively/preview";
import { notFound } from "next/navigation";

// NativelyAI fork: one design-preview screen at full size (/email/preview/<screen>).

export default async function Page(props: { params: Promise<{ screen: string }> }) {
  const { screen } = await props.params;
  if (!isPreviewEnabled() || !PREVIEW_SCREENS.some((s) => s.id === screen)) {
    notFound();
  }
  return <PreviewScreenContent screen={screen as PreviewScreen} />;
}
