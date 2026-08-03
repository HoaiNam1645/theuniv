import { buildFooterHtml, getChrome } from "@/lib/chromeHtml";

export default async function Footer() {
  const { settings } = await getChrome();
  return <div dangerouslySetInnerHTML={{ __html: buildFooterHtml(settings) }} />;
}
