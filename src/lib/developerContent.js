// Local built-in content visibility only. This is not an authorization check.
// This immutable account ID was checked against production admin_users.
// All server operations still require their normal server-side permissions.
export const DEVELOPER_CONTENT_USER_ID = "d5a0c491-6423-4a2d-9406-7bba4dc59e0e";
export function isDeveloperContentUser(userId) {
  return !!userId && userId === DEVELOPER_CONTENT_USER_ID;
}
