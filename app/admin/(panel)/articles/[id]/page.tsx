import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ArticleForm from "../article-form";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await db.article.findUnique({ where: { id: Number(id) } });
  if (!article) notFound();

  return (
    <>
      <h1 className="admin-title">Sửa: {article.title}</h1>
      <ArticleForm article={article} />
    </>
  );
}
