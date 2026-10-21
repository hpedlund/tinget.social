import { getDocuments, getRiksmoten, getVotes } from "@/lib/data";
import { buildVoteList, riksmoteUrlSlug } from "@/lib/votes";

// Static JSON written at build time (one file per riksmöte), fetched by the
// member page's vote list so the rows are not repeated on 566 pages.
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ file: string }[]> {
  return (await getRiksmoten()).map((rm) => ({ file: `${riksmoteUrlSlug(rm)}.json` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const riksmote = (await getRiksmoten()).find((rm) => `${riksmoteUrlSlug(rm)}.json` === file);
  if (!riksmote) return new Response("Not found", { status: 404 });
  const [votes, documents] = await Promise.all([getVotes(riksmote), getDocuments(riksmote)]);
  return Response.json(buildVoteList(riksmote, votes, documents));
}
