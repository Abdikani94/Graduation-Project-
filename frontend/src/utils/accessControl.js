export const isSuperAdmin = (user) => user?.role === 'Admin';

export const hasPermission = (user, permission) => (
  Array.isArray(user?.permissions) && user.permissions.includes(permission)
);

export const canAccessModule = (user, module) => {
  if (!user?.role) return false;

  const superAdminModules = new Set([
    'admissionPeriods',
    'smsNotifications',
    'scheduledMessages',
    'activityLog',
    'adminUsers',
    'adminReport',
    'settings',
  ]);
  if (superAdminModules.has(module)) return isSuperAdmin(user);
  if (module === 'studentSearch') {
    return isSuperAdmin(user)
      || (user.role === 'Officer' && hasPermission(user, 'student_search.view'));
  }

  return ['Admin', 'Officer'].includes(user.role);
};
