import { buildHeaderHtml, getChrome } from "@/lib/chromeHtml";

export default async function Header() {
  const { menus, settings } = await getChrome();
  return <div dangerouslySetInnerHTML={{ __html: buildHeaderHtml(menus, settings) }} />;
}
