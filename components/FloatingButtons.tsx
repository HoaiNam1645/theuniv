import { buildFloatingHtml, getChrome } from "@/lib/chromeHtml";

export default async function FloatingButtons() {
  const { settings } = await getChrome();
  return <div dangerouslySetInnerHTML={{ __html: buildFloatingHtml(settings) }} />;
}
