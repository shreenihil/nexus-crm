import { describe, it, expect } from "vitest";
import { can, type UserContext } from "../index.js";

describe("Permissions Engine — can() Multi-layer Enforcement", () => {
  const tenantA = "00000000-0000-0000-0000-00000000000a";
  const tenantB = "00000000-0000-0000-0000-00000000000b";

  const ownerUser: UserContext = {
    id: "u1",
    workspaceId: tenantA,
    role: "owner",
  };
  const supportUser: UserContext = {
    id: "u2",
    workspaceId: tenantA,
    role: "support",
  };
  const salesRepUser: UserContext = {
    id: "u3",
    workspaceId: tenantA,
    role: "sales_rep",
  };

  it("Owner has full CRUD access to all objects", () => {
    expect(can(ownerUser, "create", "deals")).toBe(true);
    expect(can(ownerUser, "read", "invoices")).toBe(true);
    expect(can(ownerUser, "delete", "companies")).toBe(true);
    expect(can(ownerUser, "manage_schema", "custom_objects")).toBe(true);
  });

  it("Customer Support has NO access to deals, quotes, or invoices", () => {
    expect(can(supportUser, "read", "people")).toBe(true);
    expect(can(supportUser, "update", "companies")).toBe(true);
    expect(can(supportUser, "read", "deals")).toBe(false);
    expect(can(supportUser, "read", "invoices")).toBe(false);
    expect(can(supportUser, "create", "quotes")).toBe(false);
  });

  it("Sales Rep is blocked from hidden financial fields on deals", () => {
    expect(can(salesRepUser, "read", "deals")).toBe(true);
    expect(can(salesRepUser, "read", "deals", null, "name")).toBe(true);
    expect(can(salesRepUser, "read", "deals", null, "amount")).toBe(true);
    // Hidden fields:
    expect(can(salesRepUser, "read", "deals", null, "commission_rate")).toBe(
      false,
    );
    expect(can(salesRepUser, "read", "deals", null, "cost_basis")).toBe(false);
  });

  it("Cross-tenant records are strictly denied even for owners", () => {
    const recordFromTenantB = {
      workspaceId: tenantB,
      ownerId: "u1",
    };

    // Owner of Tenant A trying to access Tenant B record
    expect(can(ownerUser, "read", "deals", recordFromTenantB)).toBe(false);
    expect(can(ownerUser, "update", "deals", recordFromTenantB)).toBe(false);
    expect(can(ownerUser, "delete", "deals", recordFromTenantB)).toBe(false);
  });

  it("Unknown role defaults to deny (Default-Deny)", () => {
    const unknownUser = {
      id: "u99",
      workspaceId: tenantA,
      role: "unknown_role" as any,
    };
    expect(can(unknownUser, "read", "people")).toBe(false);
  });
});
