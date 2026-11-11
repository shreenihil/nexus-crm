import type { WorkspaceRole } from "@nexus/schema";
import { ROLE_PERMISSIONS_MATRIX, type Action } from "./roles";

export interface UserContext {
  id: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export interface RecordContext {
  ownerId?: string | null;
  createdBy?: string | null;
  workspaceId: string;
}

/**
 * Enforces server-side permissions at three layers:
 * 1. Object-level (CRUD permissions)
 * 2. Record-level (Ownership / Team)
 * 3. Field-level (Hidden / Read-only)
 */
export function can(
  user: UserContext,
  action: Action,
  objectType: string,
  record?: RecordContext | null,
  field?: string | null,
): boolean {
  // If record has a workspaceId, it MUST match the user's workspace
  if (record && record.workspaceId !== user.workspaceId) {
    return false;
  }

  const roleDef = ROLE_PERMISSIONS_MATRIX[user.role];
  if (!roleDef) {
    return false; // Default deny
  }

  // 1. Object-level check
  const allowedActions =
    roleDef.objects["*"] ?? roleDef.objects[objectType] ?? [];
  if (!allowedActions.includes(action)) {
    return false;
  }

  // 2. Record-level check (for standard rep roles, non-admin)
  if (record && user.role === "sales_rep") {
    // If updating or deleting a deal, must be the owner or creator
    if (
      (action === "update" || action === "delete") &&
      objectType === "deals"
    ) {
      if (
        record.ownerId &&
        record.ownerId !== user.id &&
        record.createdBy !== user.id
      ) {
        return false;
      }
    }
  }

  // 3. Field-level check
  if (field && roleDef.fieldPermissions?.[objectType]) {
    const fieldPerm = roleDef.fieldPermissions[objectType];

    // Check if field is hidden (cannot read or write)
    if (fieldPerm?.hidden?.includes(field)) {
      return false;
    }

    // Check if field is read-only when attempting to write/update
    if (
      (action === "create" || action === "update") &&
      fieldPerm?.readOnly?.includes(field)
    ) {
      return false;
    }
  }

  return true;
}
