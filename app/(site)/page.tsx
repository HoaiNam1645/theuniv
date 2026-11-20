import RawPage from "@/components/RawPage";
import HomeSwipers from "@/components/HomeSwipers";
import HomeFlow from "@/components/HomeFlow";
import { buildHomeHtml } from "@/lib/homeHtml";
import { readHomeLayout } from "@/lib/homeLayout";
import { loadHomeData } from "@/lib/homeData";
import { SITE_DESCRIPTION, SITE_NAME, buildMetadata, organizationJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: `${SITE_NAME} — Xưởng sản xuất đồng phục tại Đà Nẵng`,
  description: SITE_DESCRIPTION,
  path: "/",
});

// ISR: admin sửa nội dung, tối đa 60s sau trang chủ tự cập nhật
export const revalidate = 60;

export default async function Home() {
  const layout = await readHomeLayout();
  const { data, settings } = await loadHomeData(layout);
  const html = buildHomeHtml(data, layout);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            organizationJsonLd({ logo: settings.site_logo, phone: settings.hotline }),
          ),
        }}
      />
      <RawPage html={html} />
      <HomeSwipers />
      <HomeFlow />
    </>
  );
}
