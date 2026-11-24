import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEVELOPER_CONTENT_USER_ID, isDeveloperContentUser } from '../src/lib/developerContent';
describe('developer-only built-in content',()=>{
 it('matches only the verified immutable account, not email, name or another account',()=>{
  expect(isDeveloperContentUser(DEVELOPER_CONTENT_USER_ID)).toBe(true);
  for(const id of [undefined,null,'','ordinary-member','kareemmohamed7392@gmail.com','super_admin']) expect(isDeveloperContentUser(id)).toBe(false);
 });
 it('enables local content from the session without a second network request and clears on sign-out',()=>{
  const auth=readFileSync('src/hooks/useAuth.jsx','utf8');
  expect(auth).toContain('Store.setOwnerView(developerContent)');
  expect(auth).toContain('if (!developerContent) isOwnerAdmin');
  expect(auth).toContain('if (!userId || isPasswordRecovery) { Store.setOwnerView(false)');
 });
 it('defaults the developer to full library but keeps normal program scope and explicit choices',()=>{
  const page=readFileSync('src/pages/Exercises/Exercises.jsx','utf8');
  expect(page).toContain('scope ?? (Store.isOwnerView() ? "all" : "program")');
  expect(page).toContain('effectiveScope === "all"');
 });
 it('shows a self-preview linking to profile, never starts a self-chat',()=>{
  const page=readFileSync('src/pages/PrivateChat/PrivateChat.jsx','utf8');
  expect(page).toContain('const developerSelf = isDeveloperContentUser(user?.id)');
  expect(page).toContain('developerSelf && <Link to="/chat-profile"');
  expect(page).toContain('contacts.filter(c=>c.is_developer)');
 });
});
