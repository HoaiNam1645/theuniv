import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isObjectId } from "@/lib/mongo";
import ArticleForm from "../article-form";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isObjectId(id)) notFound(); // id rác từ URL -> 404 thay vì lỗi query
  const article = await db.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <>
      <h1 className="admin-title">Sửa: {article.title}</h1>
      <ArticleForm article={article} />
    </>
  );
}
