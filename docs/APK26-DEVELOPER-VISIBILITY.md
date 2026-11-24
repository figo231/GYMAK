# Developer content and inbox display fix, not released

Compared actual APK24/APK25 bundles and release source. Women's catalog and gender/owner filters were unchanged, and women's entries remain bundled. Production still identifies the developer as super_admin with a male profile.

Confirmed weaknesses: owner content-view flag starts false and requires one server lookup, with no offline continuity; program-scope default also filters the owner's library; nutrition goal visibility omitted the owner exception. Exact triggering state on the user's phone is not available.

Local fix recognizes the verified immutable developer account ID only for bundled content visibility, defaults that account to full library, and adds the owner exception to nutrition goals. Normal users retain gender/program filters. Signed-out and recovery sessions have no exception. Server authorization is unchanged.

Production contacts_v3 read as an authenticated normal consenting member returns developer support first, verified and developer flags true. The owner does not see himself because contacts excludes self. Local self-preview links to profile, never creates self-chat. No migration or user data edits needed.

Visual checks: 390x844 developer self-preview and full library with Push Pull Legs active, no page errors. Data fixtures used for local visual rendering, not proof of production phone delivery.

No APK release, web deployment, notification campaign or OTA publication authorized by this document. Await explicit release instruction. APK25 OTA is compile-disabled; web changes cannot update its bundled code.
