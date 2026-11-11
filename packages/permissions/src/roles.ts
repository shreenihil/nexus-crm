import type { WorkspaceRole } from "@nexus/schema";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "export"
  | "import"
  | "manage_schema";

export interface FieldPermission {
  hidden?: string[];
  readOnly?: string[];
}

export interface RolePermissions {
  objects: Record<string, Action[]>;
  fieldPermissions?: Record<string, FieldPermission>;
}

export const ROLE_PERMISSIONS_MATRIX: Record<WorkspaceRole, RolePermissions> = {
  owner: {
    objects: {
      "*": [
        "create",
        "read",
        "update",
        "delete",
        "export",
        "import",
        "manage_schema",
      ],
    },
  },
  admin: {
    objects: {
      "*": [
        "create",
        "read",
        "update",
        "delete",
        "export",
        "import",
        "manage_schema",
      ],
    },
  },
  sales_manager: {
    objects: {
      people: ["create", "read", "update", "delete", "export"],
      companies: ["create", "read", "update", "delete", "export"],
      deals: ["create", "read", "update", "delete", "export"],
      activities: ["create", "read", "update", "delete"],
      quotes: ["create", "read", "update"],
    },
  },
  sales_rep: {
    objects: {
      people: ["create", "read", "update", "export"],
      companies: ["create", "read", "update"],
      deals: ["create", "read", "update"],
      activities: ["create", "read", "update", "delete"],
      quotes: ["create", "read"],
    },
    fieldPermissions: {
      deals: {
        hidden: ["commission_rate", "cost_basis"],
      },
      quotes: {
        readOnly: ["discount_percentage"],
      },
    },
  },
  support: {
    objects: {
      people: ["read", "update"],
      companies: ["read", "update"],
      activities: ["create", "read", "update"],
    },
  },
  finance: {
    objects: {
      companies: ["read"],
      deals: ["read"],
      quotes: ["create", "read", "update"],
      invoices: ["create", "read", "update", "export"],
      payments: ["create", "read", "update", "export"],
    },
  },
  read_only: {
    objects: {
      people: ["read"],
      companies: ["read"],
      deals: ["read"],
      activities: ["read"],
      quotes: ["read"],
      invoices: ["read"],
    },
  },
};
