import { fetchArticles } from "@/lib/nostr";
import EditPostClient from "./edit-client";

export const dynamicParams = false;

export async function generateStaticParams() {
  const articles = await fetchArticles();
  if (articles.length === 0) return [{ slug: "placeholder" }];
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EditPostClient slug={slug} />;
}
