# Message editing and chat polish

Built on the exercise expansion branch for the next approved bundle. Includes the production landing-copy fix as cherry-pick049398d. Not published.

A message author can edit their own messages while the conversation is writable. There is no new time limit. The other participant sees the current text with a small Edited label. Original creation time and message position do not change. Edits use a revision number to reject stale writes from another device. Failed edits keep the user's text in the dialog. Blocked, revoked, paused and nonparticipant writes are rejected on the server. No direct UPDATE grant is given to clients. Search and pins return current text. Prior moderation reports keep their report-time snapshot. No unsend, delete, public history or wider owner access was added.

Chat uses the existing hexagon-G path as a low-opacity watermark. Dark/light themes and Arabic RTL checked at360/390/412px. Per-message menu contains editing for the author, pinning, and reporting for the recipient. Report and block remain available.

Verification: full tests and production build passed; final rerun logged separately. A real production client and coach test account signed in separately, accepted terms, sent/received one isolated test message. The edit RPC ran under authenticated role with the client's identity, returned revision1/edited_at, and the other account received the corrected text after refresh. A pre-edit report preserved the original text. Coach block still stopped the conversation. The new UI was tested locally with fictional fixtures; no claim is made that the unreleased UI was deployed to production. Test accounts and generated credentials are removed after testing.

Production migration0037adds edited_at/revision and chat_edit_message. It is additive and backward-compatible with the existing client. Migration input was SHA256 matched to the prepared SQL before submission, then verified through the live schema and real RPC. No project-wide email-confirmation setting was changed. Only the isolated Create a new user modal's Auto confirm user checkbox was toggled, and only the two test records were later confirmed.

Release remains gated on Kareem's explicit نزّل. Native release-build/emulator upgrade verification remains part of release preparation.

## Conversation redesign

Following the owner's 24November10:28 feedback, the conversation now uses a full-height canvas with a fixed compact avatar header, alternating small bubbles, grouped messages, a date divider, compact time/edited labels, and a slim multiline input dock. Conversation tools, reporting, block and privacy notes remain behind the header menu. No new server migration is needed. No online/read/delivery indicator is invented. No attachment or voice button is shown because those are unsupported. Existing send/edit/report APIs and privacy gates remain unchanged.
