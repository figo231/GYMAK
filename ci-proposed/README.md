Prepared, NOT pushed (separate approval, needs token Workflows scope):
- ci.yml: npm ci, Node 22, read-only permissions, also runs on push to the audit/stage branches if wanted.
- android-play.yml: pin third-party actions to commit SHAs and add a permissions block (not edited here; needs SHA lookup at approval time).
CSP: see csp-proposed.json. Ship as Content-Security-Policy-Report-Only first via vercel.json on the Vercel project (note: live site serves web-production, which does not read root vercel.json, so this needs a web-production change = separate approval).
