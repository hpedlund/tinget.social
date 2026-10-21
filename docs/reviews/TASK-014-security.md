# Security review: TASK-014 — How members voted and what the votes were about

**Scope**: document fetch, HTML handling, data contract v2, static JSON route, member vote list, document pages, `data:summarize` and its workflow step.

## Findings

| # | Area | Finding | Severity | Status |
|---|------|---------|----------|--------|
| 1 | XSS | Riksdagen's "Beslut i korthet" is HTML. It is converted to plain-text blocks in the pipeline (`htmlToBlocks`: tags dropped, `script`/`style`/`del` content dropped, entities decoded) and rendered as React text. No `dangerouslySetInnerHTML` anywhere. Tested with `javascript:` links, event handlers and `<script>`. | — | OK |
| 2 | Input validation | New Riksdagen responses (`dokumentlista`, `utskottsforslag`, vote document) are zod-validated; `dok_id` and `beteckning` are restricted to letters, digits and `-`. The list's `rm`/`doktyp` are checked because unknown query parameters are silently ignored. | — | OK |
| 3 | URLs | Outbound links use `encodeURIComponent` (`documentSourceUrl`, `voteSourceUrl`). Page slugs are ASCII-only, built from validated beteckningar; `generateStaticParams` + `dynamicParams = false` on both new routes; slug collisions fail the build. | — | OK |
| 4 | Secret exposure | `ANTHROPIC_API_KEY` is optional and set as `env` on the `data:summarize` step only — not on `npm ci`, `data:fetch`, tests or the build — in the job that has a read-only token. The workflow runs on schedule/dispatch only, so fork PRs never get it. A compromised dependency imported by the summarize script (SDK, zod) could still read it: keep the SDK pinned (exact version, published ≥ 2 weeks before adoption) and give the key a spend limit. | Low | Accepted, documented |
| 5 | Prompt injection | Document text is untrusted input to the model. Impact is limited: output is schema-constrained text, rendered as text, labelled as AI-generated, committed through git (reviewable, revertible), and never affects any figure. The prompt fences the document and says it is material, not instructions. | Low | Accepted |
| 6 | Cost / abuse | At most 20 documents per run (`--limit`); texts above 600 000 characters are skipped. Today only 6 documents qualify. | — | OK |
| 7 | Integrity | Ballot strings are checked against vote files and the member's counts on every read; attendance output unchanged (verified: only `schemaVersion` differs). | — | OK |
| 8 | Privacy | No new personal data: ballots are public votes by public officials, already linked from Riksdagen. The static JSON contains no member data. No new cookies, tracking or third-party requests in the browser (the vote list is fetched from the same origin). | — | OK |
| 9 | Supply chain | New dev dependency `@anthropic-ai/sdk` 0.132.1, exact pin. `npm audit` shows only the pre-existing `eslint-config-next` advisory chain. | — | OK |

No open findings.
