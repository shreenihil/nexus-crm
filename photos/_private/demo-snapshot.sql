{
  "manifest": {
    "formatVersion": "1.0.0",
    "workspaceId": "01910000-0000-7000-8000-000000000001",
    "workspaceName": "Acme India Pvt Ltd",
    "exportedAt": "2026-10-17T13:44:22.085Z",
    "entityCounts": {
      "objects": 4,
      "attributes": 28,
      "records": 28,
      "pipelines": 2,
      "products": 8,
      "quotes": 2,
      "workflows": 3,
      "webhooks": 1,
      "auditEvents": 2
    },
    "latestAuditHash": "863f2ec1db051a911a49930b5f6d1ad227c79ca36c8d9f87ebe52e6a64e90f67",
    "auditChainLength": 2,
    "checksumSha256": "460e086241a3809152dc048f3e7ef9eda75309ae655ea7ab9d7eaf3f3ab1d6e5"
  },
  "schemas": {
    "objects": [
      {
        "id": "01910000-0000-7000-8000-000000000003",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "apiName": "companies",
        "singularLabel": "Company",
        "pluralLabel": "Companies",
        "icon": "Building2",
        "color": "#3B82F6",
        "description": "Business accounts, organizations, and clients",
        "isSystem": true,
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000004",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "apiName": "people",
        "singularLabel": "Person",
        "pluralLabel": "People",
        "icon": "Users",
        "color": "#10B981",
        "description": "Individual contacts, leads, and decision makers",
        "isSystem": true,
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000005",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "apiName": "deals",
        "singularLabel": "Deal",
        "pluralLabel": "Deals",
        "icon": "TrendingUp",
        "color": "#F59E0B",
        "description": "Sales opportunities, renewals, and pipelines",
        "isSystem": true,
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "id": "01a149ef-112a-78bd-a98f-61d58052eef7",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "apiName": "activities",
        "singularLabel": "Activity",
        "pluralLabel": "Activities",
        "icon": "CheckSquare",
        "color": "#8B5CF6",
        "description": "Tasks, notes, calls, meetings, and emails",
        "isSystem": true,
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      }
    ],
    "attributes": [
      {
        "apiName": "name",
        "label": "Company Name",
        "type": "text",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7258-9806-9c82f6dd4c91",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "domain",
        "label": "Primary Domain",
        "type": "url",
        "isRequired": false,
        "isUnique": true,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-73f5-91c3-b46f802e2ad5",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "industry",
        "label": "Industry",
        "type": "dropdown_single",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "optionsConfig": {
          "choices": [
            "SaaS",
            "Healthcare",
            "Finance",
            "Manufacturing",
            "Retail",
            "Other"
          ]
        },
        "id": "01a149ef-112a-7f9f-9821-d79cb0376166",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "annual_revenue",
        "label": "Annual Revenue",
        "type": "currency",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-70a3-abdc-69e4c4832eee",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "employee_count",
        "label": "Employee Count",
        "type": "number",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7916-874b-26f089073cc4",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "gstin",
        "label": "GSTIN",
        "type": "text",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-763a-8e85-c09a5ee8eb1e",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "pan",
        "label": "PAN",
        "type": "text",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-78eb-8d44-0c5d6db03a64",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "first_name",
        "label": "First Name",
        "type": "text",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-70c6-bdea-7f1c3e927e39",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "last_name",
        "label": "Last Name",
        "type": "text",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-79eb-8e1a-41edee570cba",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "email",
        "label": "Email Address",
        "type": "email",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7f07-9991-0771734d3c3d",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "phone",
        "label": "Phone Number",
        "type": "phone",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": false,
        "id": "01a149ef-112a-7c9a-9088-6238d28eb0ac",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "title",
        "label": "Job Title",
        "type": "text",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-726d-ae9a-c6dbb548069f",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "lifecycle_stage",
        "label": "Lifecycle Stage",
        "type": "dropdown_single",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "optionsConfig": {
          "choices": [
            "Lead",
            "MQL",
            "SQL",
            "Opportunity",
            "Customer",
            "Evangelist"
          ]
        },
        "id": "01a149ef-112a-7361-82dc-bab55974d6af",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "name",
        "label": "Deal Name",
        "type": "text",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-76e7-afb3-254179de6863",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "amount",
        "label": "Deal Amount",
        "type": "currency",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7b3d-aac4-2029eb6bb8b4",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "currency",
        "label": "Currency",
        "type": "dropdown_single",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "defaultValue": "INR",
        "optionsConfig": {
          "choices": [
            "INR",
            "USD",
            "EUR",
            "GBP",
            "AED",
            "SGD",
            "JPY"
          ]
        },
        "id": "01a149ef-112a-7b8f-85bb-718de1fed079",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "exchange_rate",
        "label": "Exchange Rate",
        "type": "number",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": false,
        "isSortable": false,
        "defaultValue": 1,
        "id": "01a149ef-112a-799e-9d1b-de97623fd235",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "base_amount",
        "label": "Base Currency Amount (INR)",
        "type": "currency",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7834-b2ab-43fe2a3d51ce",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "stage",
        "label": "Pipeline Stage",
        "type": "dropdown_single",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "optionsConfig": {
          "choices": [
            "Qualified",
            "Discovery",
            "Proposal Sent",
            "Negotiation",
            "Closed Won",
            "Closed Lost"
          ]
        },
        "id": "01a149ef-112a-714c-abf9-f2a7b2d569c6",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "probability",
        "label": "Win Probability %",
        "type": "number",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "defaultValue": 50,
        "id": "01a149ef-112a-74d3-85da-08df33025392",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "expected_value",
        "label": "Expected Value",
        "type": "formula",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "formulaDefinition": "{amount} * ({probability} / 100)",
        "id": "01a149ef-112a-7d52-a579-1bad7673b7b6",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "close_date",
        "label": "Target Close Date",
        "type": "date",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-79eb-8f15-a828d11331b9",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "commission_rate",
        "label": "Commission Rate %",
        "type": "number",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": false,
        "isSortable": false,
        "id": "01a149ef-112a-739f-8519-f5b62cf8a8ea",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "cost_basis",
        "label": "Internal Cost Basis",
        "type": "currency",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": false,
        "isSortable": false,
        "id": "01a149ef-112a-7d79-b025-7129884ffeb9",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "type",
        "label": "Activity Type",
        "type": "dropdown_single",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "optionsConfig": {
          "choices": [
            "task",
            "note",
            "call",
            "meeting",
            "email"
          ]
        },
        "id": "01a149ef-112a-7dea-ba0b-6ba23e09529f",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01a149ef-112a-78bd-a98f-61d58052eef7",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "subject",
        "label": "Subject",
        "type": "text",
        "isRequired": true,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7bcd-a513-6a1f2754b5fb",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01a149ef-112a-78bd-a98f-61d58052eef7",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "due_at",
        "label": "Due Date",
        "type": "datetime",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7b96-854e-493b253d034c",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01a149ef-112a-78bd-a98f-61d58052eef7",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "apiName": "completed_at",
        "label": "Completed Date",
        "type": "datetime",
        "isRequired": false,
        "isUnique": false,
        "isFilterable": true,
        "isSortable": true,
        "id": "01a149ef-112a-7d21-9dc3-bae2083f3fe9",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01a149ef-112a-78bd-a98f-61d58052eef7",
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      }
    ],
    "relationships": [
      {
        "id": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "fromObjectId": "01910000-0000-7000-8000-000000000003",
        "toObjectId": "01910000-0000-7000-8000-000000000004",
        "cardinality": "1:N",
        "fromLabel": "Company",
        "toLabel": "Contacts",
        "createdAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "id": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "fromObjectId": "01910000-0000-7000-8000-000000000003",
        "toObjectId": "01910000-0000-7000-8000-000000000005",
        "cardinality": "1:N",
        "fromLabel": "Company",
        "toLabel": "Deals",
        "createdAt": "2026-10-17T12:56:06.698Z"
      }
    ]
  },
  "data": {
    "records": [
      {
        "id": "01a149ef-112a-774e-a5f2-5f35436a8341",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Stark Industries",
          "domain": "https://starkindustries.com",
          "industry": "Manufacturing",
          "annual_revenue": 50000000,
          "employee_count": 12000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7bae-8afd-2f62e91a1e7e",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Wayne Enterprises",
          "domain": "https://waynecorp.com",
          "industry": "Finance",
          "annual_revenue": 85000000,
          "employee_count": 25000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7737-a2f0-db476dbd99fa",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Cyberdyne Systems",
          "domain": "https://cyberdyne.ai",
          "industry": "SaaS",
          "annual_revenue": 15000000,
          "employee_count": 850
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-70df-a655-fc9985dbe6e0",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Pied Piper Inc",
          "domain": "https://piedpiper.com",
          "industry": "SaaS",
          "annual_revenue": 4200000,
          "employee_count": 45
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7f1e-aa10-ccae7f95e866",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Tata Consultancy Services Ltd",
          "domain": "https://tcs.com",
          "industry": "SaaS",
          "annual_revenue": 24000000000,
          "employee_count": 600000,
          "gstin": "27AAACT2727Q1ZB",
          "pan": "AAACT2727Q"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-71e5-aebf-a8e80a3cf9bc",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Infosys BPM Ltd",
          "domain": "https://infosys.com",
          "industry": "SaaS",
          "annual_revenue": 18000000000,
          "employee_count": 330000,
          "gstin": "29AAACI4567M1ZV",
          "pan": "AAACI4567M"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-78c3-a742-659d63693937",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Reliance Retail Ventures",
          "domain": "https://relianceretail.com",
          "industry": "Retail",
          "annual_revenue": 30000000000,
          "employee_count": 400000,
          "gstin": "27AABCR1234F1ZQ",
          "pan": "AABCR1234F"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-746f-b429-53e895187dff",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "HDFC Enterprise Banking",
          "domain": "https://hdfcbank.com",
          "industry": "Finance",
          "annual_revenue": 20000000000,
          "employee_count": 170000,
          "gstin": "27AAACH2702H1Z1",
          "pan": "AAACH2702H"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7616-8ff5-bbff7a4d87af",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Wayne Enterprises, LLC",
          "domain": "https://waynecorp.com",
          "industry": "Finance",
          "annual_revenue": 85000000,
          "employee_count": 24500
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7754-9238-364a55a565b7",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Cyberdyne Systems Corp",
          "domain": "https://cyberdyne.ai",
          "industry": "SaaS",
          "annual_revenue": 15000000,
          "employee_count": 850
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7a32-9a13-c1026dccc762",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000003",
        "data": {
          "name": "Stark Industries Technologies",
          "domain": "https://starkindustries.com",
          "industry": "Manufacturing",
          "annual_revenue": 50000000,
          "employee_count": 12000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-14T12:56:06.698Z",
        "updatedAt": "2026-10-14T12:56:06.698Z",
        "deletedAt": "2026-10-14T12:56:06.698Z"
      },
      {
        "id": "01a149ef-112a-7341-872b-590a58950b56",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Tony",
          "last_name": "Stark",
          "email": "tony@starkindustries.com",
          "phone": "+1-212-555-0199",
          "title": "CEO & Chief Engineer",
          "lifecycle_stage": "Customer"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-78f5-bdd4-f2711b1aba87",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Anthony",
          "last_name": "Stark",
          "email": "tony.stark@starkindustries.com",
          "phone": "+1 212 555 0199",
          "title": "Chief Executive Officer",
          "lifecycle_stage": "Customer"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7839-bcef-c1646f26867e",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Bruce",
          "last_name": "Wayne",
          "email": "bruce@waynecorp.com",
          "phone": "+1-212-555-0144",
          "title": "Managing Director",
          "lifecycle_stage": "Opportunity"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-79ec-ae9a-f9073292ba68",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Sarah",
          "last_name": "Connor",
          "email": "sarah@cyberdyne.ai",
          "phone": "+1-310-555-0182",
          "title": "VP Security",
          "lifecycle_stage": "MQL"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7a41-b460-62d3f299c76a",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Richard",
          "last_name": "Hendricks",
          "email": "richard@piedpiper.com",
          "phone": "+1-650-555-0177",
          "title": "Founder & CEO",
          "lifecycle_stage": "Customer"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-72e0-a7f9-1d1d34c7fa35",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "K.",
          "last_name": "Krithivasan",
          "email": "krithi@tcs.com",
          "phone": "+91-22-6778-9999",
          "title": "CEO & Managing Director",
          "lifecycle_stage": "Customer"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7437-b261-f8f3c69c346f",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Salil",
          "last_name": "Parekh",
          "email": "salil.parekh@infosys.com",
          "phone": "+91-80-2852-0261",
          "title": "CEO & MD",
          "lifecycle_stage": "Customer"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-7796-acdc-e1a17627214c",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Isha",
          "last_name": "Ambani",
          "email": "isha.ambani@relianceretail.com",
          "phone": "+91-22-3555-5000",
          "title": "Executive Director",
          "lifecycle_stage": "Opportunity"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112a-79dd-89be-77f3a9d98538",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000004",
        "data": {
          "first_name": "Sashidhar",
          "last_name": "Jagdishan",
          "email": "sashi.j@hdfcbank.com",
          "phone": "+91-22-6652-1000",
          "title": "MD & CEO",
          "lifecycle_stage": "Customer"
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000011",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "Stark Enterprises Cloud Migration",
          "amount": 180000,
          "stage": "Negotiation",
          "probability": 80,
          "close_date": "2026-11-30",
          "commission_rate": 10,
          "cost_basis": 40000,
          "expected_value": 144000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000012",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "Wayne Corp Security Audit",
          "amount": 95000,
          "stage": "Proposal Sent",
          "probability": 60,
          "close_date": "2026-12-15",
          "commission_rate": 12,
          "cost_basis": 25000,
          "expected_value": 57000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000013",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "Cyberdyne Systems AI Pilot",
          "amount": 240000,
          "stage": "Qualified",
          "probability": 40,
          "close_date": "2027-01-20",
          "commission_rate": 8,
          "cost_basis": 60000,
          "expected_value": 96000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000014",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "Pied Piper Compression Platform",
          "amount": 65000,
          "stage": "Closed Won",
          "probability": 100,
          "close_date": "2026-10-01",
          "commission_rate": 15,
          "cost_basis": 10000,
          "expected_value": 65000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-794e-9a85-0846b44121fa",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "TCS Pan-India CRM Modernization",
          "amount": 125000000,
          "currency": "INR",
          "exchange_rate": 1,
          "base_amount": 125000000,
          "stage": "Proposal Sent",
          "probability": 70,
          "close_date": "2026-12-31",
          "commission_rate": 8,
          "cost_basis": 30000000,
          "expected_value": 87500000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-74f0-9f98-b1d908884051",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "Infosys Global Support Desk Expansion",
          "amount": 48000000,
          "currency": "INR",
          "exchange_rate": 1,
          "base_amount": 48000000,
          "stage": "Negotiation",
          "probability": 85,
          "close_date": "2026-11-15",
          "commission_rate": 10,
          "cost_basis": 12000000,
          "expected_value": 40800000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-7efa-bd84-880123fb94b5",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "TCS North America Cloud Integration",
          "amount": 1500000,
          "currency": "USD",
          "exchange_rate": 83.5,
          "base_amount": 125250000,
          "stage": "Proposal Sent",
          "probability": 65,
          "close_date": "2027-01-31",
          "commission_rate": 8,
          "cost_basis": 350000,
          "expected_value": 975000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000015",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "objectId": "01910000-0000-7000-8000-000000000005",
        "data": {
          "name": "Omni Consumer Products Security Suite",
          "amount": 110000,
          "stage": "Discovery",
          "probability": 20,
          "close_date": "2026-12-31",
          "commission_rate": 10,
          "cost_basis": 30000,
          "expected_value": 22000
        },
        "version": 1,
        "createdBy": "01910000-0000-7000-8000-000000000002",
        "updatedBy": "01910000-0000-7000-8000-000000000002",
        "createdAt": "2026-09-27T12:56:06.699Z",
        "updatedAt": "2026-09-27T12:56:06.699Z"
      }
    ],
    "recordLinks": [
      {
        "id": "01a149ef-112b-7601-8b2a-36458707bd34",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-774e-a5f2-5f35436a8341",
        "toRecordId": "01a149ef-112a-7341-872b-590a58950b56"
      },
      {
        "id": "01a149ef-112b-7076-a36e-6089d673ae75",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-7bae-8afd-2f62e91a1e7e",
        "toRecordId": "01a149ef-112a-7839-bcef-c1646f26867e"
      },
      {
        "id": "01a149ef-112b-7945-82f2-81c3f02224d0",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-7737-a2f0-db476dbd99fa",
        "toRecordId": "01a149ef-112a-79ec-ae9a-f9073292ba68"
      },
      {
        "id": "01a149ef-112b-76ae-a78a-f46aff2a714b",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-70df-a655-fc9985dbe6e0",
        "toRecordId": "01a149ef-112a-7a41-b460-62d3f299c76a"
      },
      {
        "id": "01a149ef-112b-70ad-bf8c-b67e733a5c0e",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-7f1e-aa10-ccae7f95e866",
        "toRecordId": "01a149ef-112a-72e0-a7f9-1d1d34c7fa35"
      },
      {
        "id": "01a149ef-112b-7c66-9c43-5d3486f9505e",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-71e5-aebf-a8e80a3cf9bc",
        "toRecordId": "01a149ef-112a-7437-b261-f8f3c69c346f"
      },
      {
        "id": "01a149ef-112b-7368-9d00-55ad4233685b",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-78c3-a742-659d63693937",
        "toRecordId": "01a149ef-112a-7796-acdc-e1a17627214c"
      },
      {
        "id": "01a149ef-112b-7325-b0ad-42b3c575a358",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7085-a7c9-34b35a9a2ebb",
        "fromRecordId": "01a149ef-112a-746f-b429-53e895187dff",
        "toRecordId": "01a149ef-112a-79dd-89be-77f3a9d98538"
      },
      {
        "id": "01a149ef-112b-7c20-85dc-feea736aaf9c",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-774e-a5f2-5f35436a8341",
        "toRecordId": "01910000-0000-7000-8000-000000000011"
      },
      {
        "id": "01a149ef-112b-7e8c-ab01-34f5f5c9d70c",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-7bae-8afd-2f62e91a1e7e",
        "toRecordId": "01910000-0000-7000-8000-000000000012"
      },
      {
        "id": "01a149ef-112b-7dd8-affa-1d39f6104c75",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-7737-a2f0-db476dbd99fa",
        "toRecordId": "01910000-0000-7000-8000-000000000013"
      },
      {
        "id": "01a149ef-112b-7556-bb88-0e1417f0c7f3",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-70df-a655-fc9985dbe6e0",
        "toRecordId": "01910000-0000-7000-8000-000000000014"
      },
      {
        "id": "01a149ef-112b-70c4-9760-fd25a350af43",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-7f1e-aa10-ccae7f95e866",
        "toRecordId": "01a149ef-112b-794e-9a85-0846b44121fa"
      },
      {
        "id": "01a149ef-112b-70ba-bfae-03e760197c6a",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-71e5-aebf-a8e80a3cf9bc",
        "toRecordId": "01a149ef-112b-74f0-9f98-b1d908884051"
      },
      {
        "id": "01a149ef-112b-7a2d-85ce-c85375ed3e2c",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "relationshipId": "01a149ef-112a-7871-9c2e-f5699e9ce0d1",
        "fromRecordId": "01a149ef-112a-7f1e-aa10-ccae7f95e866",
        "toRecordId": "01a149ef-112b-7efa-bd84-880123fb94b5"
      }
    ],
    "pipelines": [
      {
        "id": "01910000-0000-7000-8000-000000000006",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "name": "Standard B2B Sales Pipeline",
        "isDefault": true,
        "stages": [
          {
            "id": "discovery",
            "name": "Discovery",
            "stageOrder": 0,
            "winProbability": 20,
            "rottingDaysThreshold": 14,
            "color": "#3b82f6"
          },
          {
            "id": "qualification",
            "name": "Qualification",
            "stageOrder": 1,
            "winProbability": 40,
            "rottingDaysThreshold": 14,
            "color": "#8b5cf6"
          },
          {
            "id": "proposal",
            "name": "Proposal Sent",
            "stageOrder": 2,
            "winProbability": 60,
            "rottingDaysThreshold": 10,
            "color": "#06b6d4"
          },
          {
            "id": "negotiation",
            "name": "Negotiation",
            "stageOrder": 3,
            "winProbability": 80,
            "rottingDaysThreshold": 7,
            "color": "#f59e0b"
          },
          {
            "id": "closed_won",
            "name": "Closed Won",
            "stageOrder": 4,
            "winProbability": 100,
            "rottingDaysThreshold": 999,
            "color": "#10b981"
          },
          {
            "id": "closed_lost",
            "name": "Closed Lost",
            "stageOrder": 5,
            "winProbability": 0,
            "rottingDaysThreshold": 999,
            "color": "#ef4444"
          }
        ],
        "createdAt": "2026-10-17T12:56:06.698Z",
        "updatedAt": "2026-10-17T12:56:06.698Z"
      },
      {
        "id": "01a149ef-112b-795a-b0f6-6fc54ad14664",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "name": "Standard B2B Sales Pipeline",
        "isDefault": true,
        "stages": [
          {
            "id": "discovery",
            "name": "Discovery",
            "stageOrder": 0,
            "winProbability": 20,
            "rottingDaysThreshold": 14,
            "color": "#3b82f6"
          },
          {
            "id": "qualification",
            "name": "Qualification",
            "stageOrder": 1,
            "winProbability": 40,
            "rottingDaysThreshold": 14,
            "color": "#8b5cf6"
          },
          {
            "id": "proposal",
            "name": "Proposal Sent",
            "stageOrder": 2,
            "winProbability": 60,
            "rottingDaysThreshold": 10,
            "color": "#06b6d4"
          },
          {
            "id": "negotiation",
            "name": "Negotiation",
            "stageOrder": 3,
            "winProbability": 80,
            "rottingDaysThreshold": 7,
            "color": "#f59e0b"
          },
          {
            "id": "closed_won",
            "name": "Closed Won",
            "stageOrder": 4,
            "winProbability": 100,
            "rottingDaysThreshold": 999,
            "color": "#10b981"
          },
          {
            "id": "closed_lost",
            "name": "Closed Lost",
            "stageOrder": 5,
            "winProbability": 0,
            "rottingDaysThreshold": 999,
            "color": "#ef4444"
          }
        ],
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      }
    ],
    "products": [
      {
        "id": "01910000-0000-7000-8000-000000000031",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-ENT-M",
        "name": "Nexus CRM Enterprise Seat",
        "description": "Unlimited custom objects, full audit ledger, and API access",
        "unitPrice": 120,
        "billingPeriod": "monthly",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000032",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-GRW-M",
        "name": "Nexus CRM Growth Seat",
        "description": "Core CRM pipeline and contact management for growing teams",
        "unitPrice": 60,
        "billingPeriod": "monthly",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000033",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-SEC-A",
        "name": "Dedicated SSO & Security Suite",
        "description": "SAML 2.0, Okta/Google SSO, custom IP whitelisting",
        "unitPrice": 2400,
        "billingPeriod": "annual",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01910000-0000-7000-8000-000000000034",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-MIG-ONE",
        "name": "Enterprise Onboarding & Migration",
        "description": "Dedicated implementation architect and legacy CRM migration",
        "unitPrice": 4500,
        "billingPeriod": "one_time",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-7f62-9a65-e2c118b049a4",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-IN-ENT",
        "name": "Nexus CRM Enterprise Seat India",
        "description": "Complete Indian sovereign CRM with GST, audit hash chain, and regional VPC data isolation",
        "unitPrice": 9999,
        "billingPeriod": "monthly",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-79a8-af37-2b0bfc7c7289",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-IN-GRW",
        "name": "Nexus CRM Growth Seat India",
        "description": "Core CRM pipeline, contact management, and WhatsApp outreach for Indian teams",
        "unitPrice": 4999,
        "billingPeriod": "monthly",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-76dd-8d5a-27d5c42ab225",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-IN-GST",
        "name": "India GST & E-Invoicing Suite",
        "description": "Automated GSTR-1 matching, IRN generation, and GSTIN verification",
        "unitPrice": 49999,
        "billingPeriod": "annual",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-759f-8b87-c76fa85f21fb",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "sku": "NEX-IN-IMP",
        "name": "Enterprise Onboarding & Sovereign Migration",
        "description": "Dedicated implementation architect, legacy CRM data pipeline, and training",
        "unitPrice": 250000,
        "billingPeriod": "one_time",
        "isActive": true,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      }
    ],
    "quotes": [
      {
        "id": "01a149ef-112b-793c-a1df-f1bfeee5be55",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "dealId": "01910000-0000-7000-8000-000000000011",
        "quoteNumber": "Q-2026-001",
        "lineItems": [
          {
            "id": "line-1",
            "productId": "01910000-0000-7000-8000-000000000031",
            "productName": "Nexus CRM Enterprise Seat",
            "sku": "NEX-ENT-M",
            "billingPeriod": "monthly",
            "quantity": 50,
            "unitPrice": 120,
            "discountPercent": 10,
            "totalPrice": 5400
          },
          {
            "id": "line-2",
            "productId": "01910000-0000-7000-8000-000000000033",
            "productName": "Dedicated SSO & Security Suite",
            "sku": "NEX-SEC-A",
            "billingPeriod": "annual",
            "quantity": 1,
            "unitPrice": 2400,
            "discountPercent": 0,
            "totalPrice": 2400
          },
          {
            "id": "line-3",
            "productId": "01910000-0000-7000-8000-000000000034",
            "productName": "Enterprise Onboarding & Migration",
            "sku": "NEX-MIG-ONE",
            "billingPeriod": "one_time",
            "quantity": 1,
            "unitPrice": 4500,
            "discountPercent": 0,
            "totalPrice": 4500
          }
        ],
        "subtotal": 12300,
        "volumeDiscountPercent": 5,
        "discountAmount": 615,
        "taxRatePercent": 8.5,
        "taxAmount": 993.23,
        "total": 12678.23,
        "arr": 63840,
        "tcv": 71085,
        "status": "approved",
        "requiresApproval": false,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      },
      {
        "id": "01a149ef-112b-72a4-a554-42fbb6e80ec3",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "dealId": "01a149ef-112b-794e-9a85-0846b44121fa",
        "quoteNumber": "Q-2026-IN-001",
        "lineItems": [
          {
            "id": "line-1",
            "productId": "01a149ef-112b-7f62-9a65-e2c118b049a4",
            "productName": "Nexus CRM Enterprise Seat India",
            "sku": "NEX-IN-ENT",
            "billingPeriod": "monthly",
            "quantity": 200,
            "unitPrice": 9999,
            "discountPercent": 10,
            "totalPrice": 1799820
          },
          {
            "id": "line-2",
            "productId": "01a149ef-112b-76dd-8d5a-27d5c42ab225",
            "productName": "India GST & E-Invoicing Suite",
            "sku": "NEX-IN-GST",
            "billingPeriod": "annual",
            "quantity": 1,
            "unitPrice": 49999,
            "discountPercent": 0,
            "totalPrice": 49999
          },
          {
            "id": "line-3",
            "productId": "01a149ef-112b-759f-8b87-c76fa85f21fb",
            "productName": "Enterprise Onboarding & Sovereign Migration",
            "sku": "NEX-IN-IMP",
            "billingPeriod": "one_time",
            "quantity": 1,
            "unitPrice": 250000,
            "discountPercent": 0,
            "totalPrice": 250000
          }
        ],
        "subtotal": 2099819,
        "volumeDiscountPercent": 5,
        "discountAmount": 104990.95,
        "taxRatePercent": 18,
        "taxAmount": 359069.05,
        "total": 2353897.1,
        "arr": 20565447.05,
        "tcv": 21792848.05,
        "status": "approved",
        "requiresApproval": false,
        "createdAt": "2026-10-17T12:56:06.664Z",
        "updatedAt": "2026-10-17T12:56:06.664Z"
      }
    ],
    "workflows": [
      {
        "id": "wf-auto-lead-nurture",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "name": "Autonomous Inbound Lead Qualification & Routing",
        "description": "Evaluates inbound lead titles, applies VIP tags, and triggers omnichannel notifications",
        "isActive": true,
        "triggerType": "record.created",
        "triggerConfig": {
          "objectApiName": "people"
        },
        "rootNodeId": "node-trig-lead",
        "nodes": [
          {
            "id": "node-trig-lead",
            "type": "trigger",
            "title": "Lead Created (People)",
            "config": {
              "object": "people"
            },
            "nextNodes": [
              "node-cond-exec"
            ]
          },
          {
            "id": "node-cond-exec",
            "type": "condition",
            "title": "Is Executive Lead? (CEO / Founder / VP)",
            "config": {
              "field": "title",
              "operator": "contains",
              "value": "CEO"
            },
            "nextNodes": [
              "node-act-vip-tag"
            ],
            "elseNodes": [
              "node-act-std-tag"
            ]
          },
          {
            "id": "node-act-vip-tag",
            "type": "action",
            "title": "Tag Record as VIP & Priority 1",
            "actionType": "update_record",
            "config": {
              "entityName": "people",
              "patch": {
                "lifecycle_stage": "Opportunity"
              }
            },
            "nextNodes": [
              "node-act-notify-team"
            ]
          },
          {
            "id": "node-act-std-tag",
            "type": "action",
            "title": "Tag Record as Standard Lead",
            "actionType": "update_record",
            "config": {
              "entityName": "people",
              "patch": {
                "lifecycle_stage": "Lead"
              }
            },
            "nextNodes": [
              "node-act-send-email"
            ]
          },
          {
            "id": "node-act-notify-team",
            "type": "action",
            "title": "Create Executive SLA Follow-up Task",
            "actionType": "create_task",
            "config": {
              "title": "Executive Briefing Follow-up for {{first_name}} {{last_name}}",
              "description": "Priority SLA: 1 hour contact guarantee."
            }
          },
          {
            "id": "node-act-send-email",
            "type": "action",
            "title": "Send Standard Welcome Email",
            "actionType": "send_email",
            "config": {
              "subject": "Welcome to Sovereign Nexus CRM",
              "body": "Hi {{first_name}}, thank you for connecting with us."
            }
          }
        ],
        "createdAt": "2026-10-14T12:56:06.698Z",
        "updatedAt": "2026-10-14T12:56:06.698Z"
      },
      {
        "id": "wf-deal-won-webhook",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "name": "Closed-Won ERP Dispatch & Audit Sync",
        "description": "Dispatches enterprise deal payload to billing & provisioning systems via HMAC signed webhook",
        "isActive": true,
        "triggerType": "record.stage_changed",
        "triggerConfig": {
          "objectApiName": "deals"
        },
        "rootNodeId": "node-trig-deal",
        "nodes": [
          {
            "id": "node-trig-deal",
            "type": "trigger",
            "title": "Deal Stage Updated",
            "config": {
              "object": "deals"
            },
            "nextNodes": [
              "node-cond-won"
            ]
          },
          {
            "id": "node-cond-won",
            "type": "condition",
            "title": "Is Deal Closed Won?",
            "config": {
              "field": "stage",
              "operator": "==",
              "value": "Closed Won"
            },
            "nextNodes": [
              "node-act-erp-hook"
            ],
            "elseNodes": []
          },
          {
            "id": "node-act-erp-hook",
            "type": "action",
            "title": "Dispatch HMAC Outbound Webhook to ERP",
            "actionType": "outbound_webhook",
            "config": {
              "url": "https://hooks.acme-erp.internal/orders/sync",
              "secret": "whsec_prod_demo_9876543210fedcba"
            },
            "nextNodes": [
              "node-act-audit-task"
            ]
          },
          {
            "id": "node-act-audit-task",
            "type": "action",
            "title": "Create Customer Provisioning Task",
            "actionType": "create_task",
            "config": {
              "title": "Customer Provisioning for {{name}}",
              "description": "Verify invoice generation and KMS BYOK key deployment."
            }
          }
        ],
        "createdAt": "2026-10-14T12:56:06.698Z",
        "updatedAt": "2026-10-14T12:56:06.698Z"
      },
      {
        "id": "wf-deal-stalled-escalation",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "name": "Stalled High-Value Deal SLA Escalation (> ₹50L)",
        "description": "Triggers when a deal exceeding ₹50,00,000 (INR 5M or base equivalent) stalls in negotiation for 7+ days; notifies sales director and generates SLA intervention task",
        "isActive": true,
        "triggerType": "record.updated",
        "triggerConfig": {
          "objectApiName": "deals"
        },
        "rootNodeId": "node-trig-stalled",
        "nodes": [
          {
            "id": "node-trig-stalled",
            "type": "trigger",
            "title": "Deal Updated & Stage Analyzed",
            "config": {
              "object": "deals"
            },
            "nextNodes": [
              "node-cond-stalled-7d"
            ]
          },
          {
            "id": "node-cond-stalled-7d",
            "type": "condition",
            "title": "Is Deal Stalled in Stage >= 7 Days?",
            "config": {
              "field": "days_in_stage",
              "operator": ">=",
              "value": 7
            },
            "nextNodes": [
              "node-cond-val-50l"
            ],
            "elseNodes": []
          },
          {
            "id": "node-cond-val-50l",
            "type": "condition",
            "title": "Is Value >= ₹50,00,000 (Base Equivalent)?",
            "config": {
              "field": "amount",
              "operator": ">=",
              "value": 5000000
            },
            "nextNodes": [
              "node-act-alert-manager"
            ],
            "elseNodes": []
          },
          {
            "id": "node-act-alert-manager",
            "type": "action",
            "title": "Notify Sales Director via Priority Alert",
            "actionType": "send_email",
            "config": {
              "recipient": "director.sales@acme.corp",
              "subject": "URGENT SLA Escalation: Stalled Deal {{name}} > ₹50L",
              "body": "Deal {{name}} valued at {{amount}} has stalled for 7+ days. Executive intervention required."
            },
            "nextNodes": [
              "node-act-create-task"
            ]
          },
          {
            "id": "node-act-create-task",
            "type": "action",
            "title": "Create Executive SLA Intervention Task",
            "actionType": "create_task",
            "config": {
              "title": "Executive Intervention: Stalled Deal {{name}}",
              "description": "Schedule emergency deal review with sponsor and VP.",
              "dueDate": "2026-10-18T12:56:06.699Z"
            }
          }
        ],
        "createdAt": "2026-10-14T12:56:06.698Z",
        "updatedAt": "2026-10-14T12:56:06.698Z"
      }
    ],
    "outboundWebhooks": [
      {
        "id": "hook-sub-erp-1",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "targetUrl": "https://hooks.acme-erp.internal/orders/sync",
        "secret": "whsec_prod_demo_9876543210fedcba",
        "subscribedEvents": [
          "deal.won",
          "quote.approved",
          "record.created"
        ],
        "isActive": true,
        "description": "Enterprise ERP sync listener for closed-won deals",
        "createdAt": "2026-10-14T12:56:06.698Z",
        "updatedAt": "2026-10-14T12:56:06.698Z"
      }
    ]
  },
  "security": {
    "kmsKeys": [
      {
        "id": "kms-key-v1",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "version": 1,
        "status": "ACTIVE",
        "algorithm": "AES-256-GCM",
        "createdAt": "2026-10-14T12:56:06.698Z"
      }
    ],
    "auditLedger": [
      {
        "id": "01a149ef-112b-78e8-bcbd-477f585b06f2",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "actorType": "system",
        "action": "system.bootstrap",
        "payload": {
          "message": "Initialized Sovereign Nexus CRM workspace with standard schemas and seed dataset"
        },
        "prevHash": "0000000000000000000000000000000000000000000000000000000000000000",
        "currentHash": "66fcd65ab1c42110fec81f8d38f3c269d73327653a91e99f6f302950391cb152",
        "createdAt": "2026-10-17T12:56:06.699Z"
      },
      {
        "id": "01a149ef-112b-7471-bcbd-9dac47a151a4",
        "workspaceId": "01910000-0000-7000-8000-000000000001",
        "actorType": "user",
        "actorId": "01910000-0000-7000-8000-000000000002",
        "action": "metadata.schema.seed",
        "payload": {
          "objects": [
            "companies",
            "people",
            "deals",
            "activities"
          ]
        },
        "prevHash": "66fcd65ab1c42110fec81f8d38f3c269d73327653a91e99f6f302950391cb152",
        "currentHash": "863f2ec1db051a911a49930b5f6d1ad227c79ca36c8d9f87ebe52e6a64e90f67",
        "createdAt": "2026-10-17T12:56:06.699Z"
      }
    ]
  }
}