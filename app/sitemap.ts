import type { MetadataRoute } from "next";

import { getAllMemberIds, getMeta } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { getDocumentPageParams } from "@/lib/votes/load";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [meta, memberIds, documents] = await Promise.all([
    getMeta(),
    getAllMemberIds(),
    getDocumentPageParams(),
  ]);
  // Data pages change when new votes arrive; the method page does not.
  const lastModified = meta.lastVoteDate ?? undefined;
  const url = (path: string) => `${SITE_URL}${path}`;

  return [
    { url: url("/"), lastModified },
    { url: url("/partier/"), lastModified },
    { url: url("/sa-raknar-vi/") },
    ...memberIds.map((id) => ({
      url: url(`/ledamoter/${encodeURIComponent(id)}/`),
      lastModified,
    })),
    ...documents.map(({ riksmote, slug }) => ({ url: url(`/voteringar/${riksmote}/${slug}/`) })),
  ];
}
