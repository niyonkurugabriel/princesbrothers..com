export type PermissionSubject = {
  permissions?: readonly string[];
};

export const permissionKey = (action: string, resource: string): string =>
  `${resource}:${action}`;

export const hasPermission = (
  user: PermissionSubject | null | undefined,
  action: string,
  resource: string,
): boolean => {
  if (!user?.permissions?.length || !action || !resource) return false;

  const permissions = new Set(user.permissions);
  return (
    permissions.has(permissionKey(action, resource)) ||
    permissions.has(permissionKey("*", resource)) ||
    permissions.has(permissionKey("*", "*"))
  );
};