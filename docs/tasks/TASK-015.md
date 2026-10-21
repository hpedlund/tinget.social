# TASK-015: Generate and review AI summaries

**Status**: draft
**Priority**: high
**Depends on**: TASK-014
**Branch**: task/015-ai-summaries

## Goal

The 6 omröstningar without a Riksdagen summary have reviewed, labelled AI summaries on the live site, and the summary step is safe to leave running.

## Details

- Add the `ANTHROPIC_API_KEY` repository secret with a spend limit on the key (owner action; document the steps in `docs/DEVELOPMENT.md`)
- Run the data refresh manually; review each generated text in `data/generated-summaries.json` against the source before it is deployed (wording, neutrality, no facts outside the source)
- Dependabot: group `@anthropic-ai/sdk` and give it a cooldown, so the pinned SDK version is never days old (see TASK-014 security review #4)
- Decide and document what happens to a bad summary: delete the entry and add the beteckning to a skip list in `data:summarize`

## Acceptance Criteria

- [ ] All 6 omröstningar show a generated summary, or are on the skip list with a reason
- [ ] Each published summary reviewed by a person; the review recorded in the task's review file
- [ ] Dependabot config covers the SDK with a cooldown
- [ ] The refresh still passes without the secret (fork, local run)

## Artifacts

- Spec: `docs/specs/TASK-015.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-015-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-015-ux.md` *(created by @ux)*
