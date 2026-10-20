import { REPOSITORY_URL, RIKSDAGEN_OPEN_DATA_URL } from "@/lib/site";

const linkClassName =
  "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-5xl space-y-2 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>
          Källa:{" "}
          <a href={RIKSDAGEN_OPEN_DATA_URL} className={linkClassName}>
            Sveriges riksdag
          </a>
          . tinget.social är oberoende och har ingen koppling till Sveriges
          riksdag.
        </p>
        <p>
          Inga kakor och ingen spårning. Webbplatsen ligger på GitHub Pages,
          som kan logga IP-adresser av säkerhetsskäl.
        </p>
        <p>
          <a href={REPOSITORY_URL} className={linkClassName}>
            Källkod och synpunkter på GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
