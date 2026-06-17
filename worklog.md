---
Task ID: journey-password-fix
Agent: Main
Task: Fix Journey analysis mode (numbered 1-10 + dotted lines) + password authentication issue

Work Log:
- Investigated Journey mode issue: discovered the redesigned code (commit 0aa56ba) was committed locally but NOT pushed to GitHub/Vercel
- Investigated password issue: verified via curl that the deployed Vercel site DOES accept `lumina2026` correctly (cookie sets, auth passes, / returns 200). User's "password not working" complaint likely stems from testing an older deployment or trying wrong password.
- Improved password auth robustness:
  * `src/app/api/auth/route.ts` — replaced hardcoded `secure: true` with adaptive `isSecureRequest(req)` that detects HTTPS via `x-forwarded-proto` header. This eliminates the "password accepted but immediately redirected back to login" symptom that can occur on HTTP contexts (preview deploys, local dev, non-HTTPS hosts).
  * Applied same fix to the logout (DELETE) route for consistency.
- Pushed 4 commits to origin/main on GitHub:
  1. `430bf1f` Major mobile responsiveness overhaul
  2. `8773793` (intermediate)
  3. `0aa56ba` Redesign Journey analysis: numbered 1-10 points connected by dotted lines
  4. `b76fbc8` fix: adaptive cookie secure flag for HTTP/HTTPS compatibility
- Vercel auto-deploy from GitHub is NOT firing. Verified by:
  * Checked deployed chunk hashes at https://lumina-sight.com/ — identical before and after push (no new build)
  * Tried Vercel API (GET /v6/deployments) — returns SAML scope error: "Not authorized: Trying to access resource under scope 'simons-projects-54a902de'"
  * Tried Vercel CLI (`vercel ls`) — same SAML scope error
  * Token works for /v2/user (returns user info), so the token itself is valid — it just lacks SAML SSO authorization for the project's scope

Stage Summary:
- Local code is fully correct: Journey redesign + password robustness both implemented
- All 4 commits are now on GitHub main: https://github.com/Optitude-AI/Lumina-Sight-App
- BLOCKER: Vercel is not auto-deploying. User must manually trigger a deployment via the Vercel dashboard (https://vercel.com/simons-projects-54a902de/lumina-sight/deployments) OR re-authenticate the Vercel token with SAML SSO scope.
- Once Vercel redeploys, both fixes will be live:
  * Journey mode will show 10 numbered orange circles connected by dotted lines, simulating the eye's scan path
  * Password auth will work reliably on both HTTPS and HTTP contexts
