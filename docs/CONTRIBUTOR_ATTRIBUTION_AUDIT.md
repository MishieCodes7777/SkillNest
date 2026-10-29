# Contributor attribution audit — 12 October 2026

Inspected local HEAD `2680dc3` before this work and all locally available branches, including `backup-before-rewrite`. No Git history, identity configuration, or remote reference was changed by this audit. New work is on `codex/smart-help`.

## Observations

- All 26 reachable commits name `MishieCodes7777` as author and committer.
- A case-insensitive search of complete reachable commit messages found no Claude, Anthropic, or Co-authored-by entry.
- Local Git user.name is `MishieCodes7777`; user.email is configured. Its ownership/verification has not been independently established and its value is intentionally omitted.
- The public GitHub contributors API (`GET /repos/MishieCodes7777/SkillNest/contributors?anon=true`) returned an account entry `MishieCodes7777` with 22 contributions, plus an anonymous entry also named `MishieCodes7777` with 4 contributions. It did not return Claude.
- An existing backup branch name suggests earlier history work may have happened, but its name alone cannot establish what happened, when, or why.

**Conclusion:** the reported Claude display is not reproducible from the current reachable history or public API. Its historical cause remains inconclusive; it could be a different view/reference or stale display, but none of those explanations is verified. The four anonymous contributions indicate an account-attribution distinction, not evidence of a Claude collaborator. We have not audited GitHub repository access settings.

## Safe decision tree

1. If the display returns, record the exact GitHub page and associated commit, without publishing private email addresses. Compare author, committer and trailers for that commit.
2. For future commits, retain the genuine author. Compare local identity with the owner's verified GitHub email or GitHub-provided noreply address privately. Ask the owner for the verified identity if unavailable; do not guess it.
3. If two aliases demonstrably belong to the same person, an accurate `.mailmap` can consolidate local shortlog output. Do not assume it will remove a GitHub UI entry.
4. If historical credit is authentic, retain it. There is no arbitrary contributor-hide operation that guarantees disappearance from GitHub, mirrors and caches.
5. Only if historical metadata is demonstrably wrong: prepare a fresh mirror/backup, inspect every affected branch/tag, obtain a verified replacement mapping, test git-filter-repo on the copy, review hashes/signatures and collaborator impact, and obtain separate explicit approval before a coordinated force-push. No rewrite is prepared or performed here because current evidence does not establish an error.

Reproduction commands (inspect output privately; redact emails before sharing): `git branch -a`, `git log --all --format='%h | author=%an | committer=%cn | %s'`, `git log --all --format='%B'`, and the public API above. A full forensic audit of deleted refs, reflogs, remote caches, forks or credentials is outside these observations.
