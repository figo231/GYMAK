// @vitest-environment node
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('messaging conversation layout',()=>{
 const jsx=readFileSync('src/pages/PrivateChat/PrivateChat.jsx','utf8'),css=readFileSync('src/pages/PrivateChat/conversation.css','utf8');
 it('keeps compact bubbles, date grouping and labelled composer',()=>{
  for(const text of ['pc-conversation','pc-chat-header','pc-message-row','pc-day','pc-composer-dock','aria-label={sending','pc-visually-hidden','rows={1}'])expect(jsx).toContain(text);
  expect(css).toContain('overflow-y:auto');expect(css).toContain('safe-area-inset-bottom');expect(css).toContain('.pc-message.grouped');
 });
 it('keeps tools, privacy, editing, report and block reachable',()=>{
  for(const text of ['aria-expanded={showTools}','<PrivacyNote />','setReport({ kind: "message"','toggleBlock','editChatMessage(id,editing','pc-edited','care_chat_pin'])expect(jsx).toContain(text);
  expect(jsx).not.toContain('className="pc-compose glass"');
 });
});
