import type { UserContext } from './can';

export interface ScopeFilters {
  workspaceId: string;
  ownerId?: string;
}

/**
 * Returns scope filters for queries to prevent cross-tenant or out-of-scope record access.
 */
export function getQueryScope(user: UserContext, objectType: string): ScopeFilters {
  const scope: ScopeFilters = {
    workspaceId: user.workspaceId,
  };

  // For roles with strictly scoped ownership
  if (user.role === 'sales_rep' && objectType === 'deals') {
    // Sales rep only views owned records in specific views
    scope.ownerId = user.id;
  }

  return scope;
}
