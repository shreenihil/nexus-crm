// Mock Demo Dataset Fixture for Testing & Staging
// This file is strictly excluded from production builds and bundle scanners.
import type { Database } from "../../db/index.js";
import {
  DEMO_WORKSPACE_ID,
  DEMO_USER_ID,
  DEMO_COMPANIES_OBJ_ID,
  DEMO_PEOPLE_OBJ_ID,
  DEMO_DEALS_OBJ_ID,
} from "../../db/index.js";
import { generateUuidV7, hashPassword } from "../../lib/crypto.js";
import { generateKey, wrapDek } from "@nexus/kms";
import { DEFAULT_PIPELINE_STAGES, calculateQuoteTotals } from "@nexus/schema";
import { signWebhookPayload } from "@nexus/workflow";

export async function seedDemoRecords(db: any, force = false): Promise<void> {
  const workspaceId = DEMO_WORKSPACE_ID;
  const userId = DEMO_USER_ID;
  const now = new Date().toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // Reference db as this for compatibility
  const _self: any = db;
    const companiesObj: any = Array.from(_self.objects.values()).find(
      (o: any) => o.workspaceId === workspaceId && o.apiName === 'companies'
    );
    const peopleObj: any = Array.from(_self.objects.values()).find(
      (o: any) => o.workspaceId === workspaceId && o.apiName === 'people'
    );
    const dealsObj: any = Array.from(_self.objects.values()).find(
      (o: any) => o.workspaceId === workspaceId && o.apiName === 'deals'
    );
    const relCompanyPeople: any = Array.from(_self.relationships.values()).find(
      (r: any) => r.workspaceId === workspaceId && r.fromObjectId === companiesObj?.id && r.toObjectId === peopleObj?.id
    );
    const relCompanyDeals: any = Array.from(_self.relationships.values()).find(
      (r: any) => r.workspaceId === workspaceId && r.fromObjectId === companiesObj?.id && r.toObjectId === dealsObj?.id
    );

    if (companiesObj && peopleObj && dealsObj) {
      // 1. Companies
      const c1Id = generateUuidV7();
      _self.records.set(c1Id, {
        id: c1Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Stark Industries', domain: 'https://starkindustries.com', industry: 'Manufacturing', annual_revenue: 50000000, employee_count: 12000 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c2Id = generateUuidV7();
      _self.records.set(c2Id, {
        id: c2Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Wayne Enterprises', domain: 'https://waynecorp.com', industry: 'Finance', annual_revenue: 85000000, employee_count: 25000 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c3Id = generateUuidV7();
      _self.records.set(c3Id, {
        id: c3Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Cyberdyne Systems', domain: 'https://cyberdyne.ai', industry: 'SaaS', annual_revenue: 15000000, employee_count: 850 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c4Id = generateUuidV7();
      _self.records.set(c4Id, {
        id: c4Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Pied Piper Inc', domain: 'https://piedpiper.com', industry: 'SaaS', annual_revenue: 4200000, employee_count: 45 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Sovereign Indian Enterprise Companies (§4.7)
      const c5Id = generateUuidV7();
      _self.records.set(c5Id, {
        id: c5Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'Tata Consultancy Services Ltd',
          domain: 'https://tcs.com',
          industry: 'SaaS',
          annual_revenue: 24000000000, // ₹2,400 Cr
          employee_count: 600000,
          gstin: '27AAACT2727Q1ZB',
          pan: 'AAACT2727Q',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c6Id = generateUuidV7();
      _self.records.set(c6Id, {
        id: c6Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'Infosys BPM Ltd',
          domain: 'https://infosys.com',
          industry: 'SaaS',
          annual_revenue: 18000000000, // ₹1,800 Cr
          employee_count: 330000,
          gstin: '29AAACI4567M1ZV',
          pan: 'AAACI4567M',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c7Id = generateUuidV7();
      _self.records.set(c7Id, {
        id: c7Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'Reliance Retail Ventures',
          domain: 'https://relianceretail.com',
          industry: 'Retail',
          annual_revenue: 30000000000, // ₹3,000 Cr
          employee_count: 400000,
          gstin: '27AABCR1234F1ZQ',
          pan: 'AABCR1234F',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c8Id = generateUuidV7();
      _self.records.set(c8Id, {
        id: c8Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'HDFC Enterprise Banking',
          domain: 'https://hdfcbank.com',
          industry: 'Finance',
          annual_revenue: 20000000000, // ₹2,000 Cr
          employee_count: 170000,
          gstin: '27AAACH2702H1Z1',
          pan: 'AAACH2702H',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Duplicate company records for deduplication & identity resolution
      const c2DupId = generateUuidV7();
      _self.records.set(c2DupId, {
        id: c2DupId,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Wayne Enterprises, LLC', domain: 'https://waynecorp.com', industry: 'Finance', annual_revenue: 85000000, employee_count: 24500 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c3DupId = generateUuidV7();
      _self.records.set(c3DupId, {
        id: c3DupId,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Cyberdyne Systems Corp', domain: 'https://cyberdyne.ai', industry: 'SaaS', annual_revenue: 15000000, employee_count: 850 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Pre-merged historical company record for unmerge demonstration
      const c1MergedId = generateUuidV7();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      _self.records.set(c1MergedId, {
        id: c1MergedId,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Stark Industries Technologies', domain: 'https://starkindustries.com', industry: 'Manufacturing', annual_revenue: 50000000, employee_count: 12000 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
        deletedAt: threeDaysAgo,
      });

      // 2. People
      const p1Id = generateUuidV7();
      _self.records.set(p1Id, {
        id: p1Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Tony', last_name: 'Stark', email: 'tony@starkindustries.com', phone: '+1-212-555-0199', title: 'CEO & Chief Engineer', lifecycle_stage: 'Customer' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Duplicate person record for Tony Stark
      const p1DupId = generateUuidV7();
      _self.records.set(p1DupId, {
        id: p1DupId,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Anthony', last_name: 'Stark', email: 'tony.stark@starkindustries.com', phone: '+1 212 555 0199', title: 'Chief Executive Officer', lifecycle_stage: 'Customer' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p2Id = generateUuidV7();
      _self.records.set(p2Id, {
        id: p2Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Bruce', last_name: 'Wayne', email: 'bruce@waynecorp.com', phone: '+1-212-555-0144', title: 'Managing Director', lifecycle_stage: 'Opportunity' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p3Id = generateUuidV7();
      _self.records.set(p3Id, {
        id: p3Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Sarah', last_name: 'Connor', email: 'sarah@cyberdyne.ai', phone: '+1-310-555-0182', title: 'VP Security', lifecycle_stage: 'MQL' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p4Id = generateUuidV7();
      _self.records.set(p4Id, {
        id: p4Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Richard', last_name: 'Hendricks', email: 'richard@piedpiper.com', phone: '+1-650-555-0177', title: 'Founder & CEO', lifecycle_stage: 'Customer' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Sovereign Indian Enterprise Contacts
      const p5Id = generateUuidV7();
      _self.records.set(p5Id, {
        id: p5Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'K.',
          last_name: 'Krithivasan',
          email: 'krithi@tcs.com',
          phone: '+91-22-6778-9999',
          title: 'CEO & Managing Director',
          lifecycle_stage: 'Customer',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p6Id = generateUuidV7();
      _self.records.set(p6Id, {
        id: p6Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'Salil',
          last_name: 'Parekh',
          email: 'salil.parekh@infosys.com',
          phone: '+91-80-2852-0261',
          title: 'CEO & MD',
          lifecycle_stage: 'Customer',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p7Id = generateUuidV7();
      _self.records.set(p7Id, {
        id: p7Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'Isha',
          last_name: 'Ambani',
          email: 'isha.ambani@relianceretail.com',
          phone: '+91-22-3555-5000',
          title: 'Executive Director',
          lifecycle_stage: 'Opportunity',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p8Id = generateUuidV7();
      _self.records.set(p8Id, {
        id: p8Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'Sashidhar',
          last_name: 'Jagdishan',
          email: 'sashi.j@hdfcbank.com',
          phone: '+91-22-6652-1000',
          title: 'MD & CEO',
          lifecycle_stage: 'Customer',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Deals (with formula evaluation)
      const d1Id = '01910000-0000-7000-8000-000000000011';
      const d1Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Stark Enterprises Cloud Migration',
        amount: 180000,
        stage: 'Negotiation',
        probability: 80,
        close_date: '2026-11-30',
        commission_rate: 10,
        cost_basis: 40000,
      });
      _self.records.set(d1Id, {
        id: d1Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d1Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d2Id = '01910000-0000-7000-8000-000000000012';
      const d2Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Wayne Corp Security Audit',
        amount: 95000,
        stage: 'Proposal Sent',
        probability: 60,
        close_date: '2026-12-15',
        commission_rate: 12,
        cost_basis: 25000,
      });
      _self.records.set(d2Id, {
        id: d2Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d2Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d3Id = '01910000-0000-7000-8000-000000000013';
      const d3Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Cyberdyne Systems AI Pilot',
        amount: 240000,
        stage: 'Qualified',
        probability: 40,
        close_date: '2027-01-20',
        commission_rate: 8,
        cost_basis: 60000,
      });
      _self.records.set(d3Id, {
        id: d3Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d3Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d4Id = '01910000-0000-7000-8000-000000000014';
      const d4Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Pied Piper Compression Platform',
        amount: 65000,
        stage: 'Closed Won',
        probability: 100,
        close_date: '2026-10-01',
        commission_rate: 15,
        cost_basis: 10000,
      });
      _self.records.set(d4Id, {
        id: d4Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d4Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 4. Record Links (Bidirectional links)
      if (relCompanyPeople) {
        const link1 = generateUuidV7();
        _self.recordLinks.set(link1, { id: link1, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c1Id, toRecordId: p1Id });
        const link2 = generateUuidV7();
        _self.recordLinks.set(link2, { id: link2, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c2Id, toRecordId: p2Id });
        const link3 = generateUuidV7();
        _self.recordLinks.set(link3, { id: link3, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c3Id, toRecordId: p3Id });
        const link4 = generateUuidV7();
        _self.recordLinks.set(link4, { id: link4, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c4Id, toRecordId: p4Id });
        const link5 = generateUuidV7();
        _self.recordLinks.set(link5, { id: link5, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c5Id, toRecordId: p5Id });
        const link6 = generateUuidV7();
        _self.recordLinks.set(link6, { id: link6, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c6Id, toRecordId: p6Id });
        const link7 = generateUuidV7();
        _self.recordLinks.set(link7, { id: link7, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c7Id, toRecordId: p7Id });
        const link8 = generateUuidV7();
        _self.recordLinks.set(link8, { id: link8, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c8Id, toRecordId: p8Id });
      }

      // Deals 6, 7, 8 (Indian Rupee & Multi-Currency Deals §4.7)
      const d6Id = generateUuidV7();
      const d6Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'TCS Pan-India CRM Modernization',
        amount: 125000000, // ₹12.50 Cr
        currency: 'INR',
        exchange_rate: 1.0,
        base_amount: 125000000,
        stage: 'Proposal Sent',
        probability: 70,
        close_date: '2026-12-31',
        commission_rate: 8,
        cost_basis: 30000000,
      });
      _self.records.set(d6Id, {
        id: d6Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d6Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d7Id = generateUuidV7();
      const d7Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Infosys Global Support Desk Expansion',
        amount: 48000000, // ₹4.80 Cr
        currency: 'INR',
        exchange_rate: 1.0,
        base_amount: 48000000,
        stage: 'Negotiation',
        probability: 85,
        close_date: '2026-11-15',
        commission_rate: 10,
        cost_basis: 12000000,
      });
      _self.records.set(d7Id, {
        id: d7Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d7Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d8Id = generateUuidV7();
      const d8Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'TCS North America Cloud Integration',
        amount: 1500000, // USD 1,500,000
        currency: 'USD',
        exchange_rate: 83.5,
        base_amount: 125250000, // Base equivalent: ₹12.525 Cr
        stage: 'Proposal Sent',
        probability: 65,
        close_date: '2027-01-31',
        commission_rate: 8,
        cost_basis: 350000,
      });
      _self.records.set(d8Id, {
        id: d8Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d8Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      if (relCompanyDeals) {
        const linkD1 = generateUuidV7();
        _self.recordLinks.set(linkD1, { id: linkD1, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c1Id, toRecordId: d1Id });
        const linkD2 = generateUuidV7();
        _self.recordLinks.set(linkD2, { id: linkD2, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c2Id, toRecordId: d2Id });
        const linkD3 = generateUuidV7();
        _self.recordLinks.set(linkD3, { id: linkD3, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c3Id, toRecordId: d3Id });
        const linkD4 = generateUuidV7();
        _self.recordLinks.set(linkD4, { id: linkD4, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c4Id, toRecordId: d4Id });
        const linkD6 = generateUuidV7();
        _self.recordLinks.set(linkD6, { id: linkD6, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c5Id, toRecordId: d6Id });
        const linkD7 = generateUuidV7();
        _self.recordLinks.set(linkD7, { id: linkD7, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c6Id, toRecordId: d7Id });
        const linkD8 = generateUuidV7();
        _self.recordLinks.set(linkD8, { id: linkD8, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c5Id, toRecordId: d8Id });
      }

      // 5. Seed Pipeline & Stages
      const pipelineId = generateUuidV7();
      _self.pipelines.set(pipelineId, {
        id: pipelineId,
        workspaceId,
        name: 'Standard B2B Sales Pipeline',
        isDefault: true,
        stages: DEFAULT_PIPELINE_STAGES,
        createdAt: now,
        updatedAt: now,
      });

      // Seed stage transition history with realistic durations (including a rotting deal)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      _self.dealStageHistory.push(
        { id: generateUuidV7(), workspaceId, dealId: d1Id, fromStage: 'Proposal Sent', toStage: 'Negotiation', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d2Id, fromStage: 'Qualification', toStage: 'Proposal Sent', transitionedAt: tenDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d3Id, fromStage: 'Discovery', toStage: 'Qualified', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d4Id, fromStage: 'Negotiation', toStage: 'Closed Won', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d6Id, fromStage: 'Qualification', toStage: 'Proposal Sent', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d7Id, fromStage: 'Proposal Sent', toStage: 'Negotiation', transitionedAt: twoDaysAgo, userId }
      );

      // Seed Deal 5: Rotting in Discovery (20 days > 14 days threshold)
      const d5Id = '01910000-0000-7000-8000-000000000015';
      const d5Data = _self.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Omni Consumer Products Security Suite',
        amount: 110000,
        stage: 'Discovery',
        probability: 20,
        close_date: '2026-12-31',
        commission_rate: 10,
        cost_basis: 30000,
      });
      _self.records.set(d5Id, {
        id: d5Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d5Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      });
      _self.dealStageHistory.push({
        id: generateUuidV7(),
        workspaceId,
        dealId: d5Id,
        fromStage: '',
        toStage: 'Discovery',
        transitionedAt: twentyDaysAgo,
        userId,
      });

      // 6. Seed Products (CPQ Light)
      const prod1Id = '01910000-0000-7000-8000-000000000031';
      _self.products.set(prod1Id, {
        id: prod1Id,
        workspaceId,
        sku: 'NEX-ENT-M',
        name: 'Nexus CRM Enterprise Seat',
        description: 'Unlimited custom objects, full audit ledger, and API access',
        unitPrice: 120,
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod2Id = '01910000-0000-7000-8000-000000000032';
      _self.products.set(prod2Id, {
        id: prod2Id,
        workspaceId,
        sku: 'NEX-GRW-M',
        name: 'Nexus CRM Growth Seat',
        description: 'Core CRM pipeline and contact management for growing teams',
        unitPrice: 60,
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod3Id = '01910000-0000-7000-8000-000000000033';
      _self.products.set(prod3Id, {
        id: prod3Id,
        workspaceId,
        sku: 'NEX-SEC-A',
        name: 'Dedicated SSO & Security Suite',
        description: 'SAML 2.0, Okta/Google SSO, custom IP whitelisting',
        unitPrice: 2400,
        billingPeriod: 'annual',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod4Id = '01910000-0000-7000-8000-000000000034';
      _self.products.set(prod4Id, {
        id: prod4Id,
        workspaceId,
        sku: 'NEX-MIG-ONE',
        name: 'Enterprise Onboarding & Migration',
        description: 'Dedicated implementation architect and legacy CRM migration',
        unitPrice: 4500,
        billingPeriod: 'one_time',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // 7. Seed Quote for Stark Enterprises Cloud Migration
      const quote1Id = generateUuidV7();
      const quoteTotals = calculateQuoteTotals(
        [
          {
            productId: prod1Id,
            productName: 'Nexus CRM Enterprise Seat',
            sku: 'NEX-ENT-M',
            billingPeriod: 'monthly',
            quantity: 50,
            unitPrice: 120,
            discountPercent: 10,
          },
          {
            productId: prod3Id,
            productName: 'Dedicated SSO & Security Suite',
            sku: 'NEX-SEC-A',
            billingPeriod: 'annual',
            quantity: 1,
            unitPrice: 2400,
            discountPercent: 0,
          },
          {
            productId: prod4Id,
            productName: 'Enterprise Onboarding & Migration',
            sku: 'NEX-MIG-ONE',
            billingPeriod: 'one_time',
            quantity: 1,
            unitPrice: 4500,
            discountPercent: 0,
          },
        ],
        5,
        8.5
      );

      _self.quotes.set(quote1Id, {
        id: quote1Id,
        workspaceId,
        dealId: d1Id,
        quoteNumber: 'Q-2026-001',
        lineItems: quoteTotals.lineItems,
        subtotal: quoteTotals.subtotal,
        volumeDiscountPercent: 5,
        discountAmount: quoteTotals.discountAmount,
        taxRatePercent: 8.5,
        taxAmount: quoteTotals.taxAmount,
        total: quoteTotals.total,
        arr: quoteTotals.arr,
        tcv: quoteTotals.tcv,
        status: 'approved',
        requiresApproval: quoteTotals.requiresApproval,
        createdAt: now,
        updatedAt: now,
      });

      // Sovereign Indian Products & Price Book (in INR minor/major)
      const prod5Id = generateUuidV7();
      _self.products.set(prod5Id, {
        id: prod5Id,
        workspaceId,
        sku: 'NEX-IN-ENT',
        name: 'Nexus CRM Enterprise Seat India',
        description: 'Complete Indian sovereign CRM with GST, audit hash chain, and regional VPC data isolation',
        unitPrice: 9999, // ₹9,999/month
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod6Id = generateUuidV7();
      _self.products.set(prod6Id, {
        id: prod6Id,
        workspaceId,
        sku: 'NEX-IN-GRW',
        name: 'Nexus CRM Growth Seat India',
        description: 'Core CRM pipeline, contact management, and WhatsApp outreach for Indian teams',
        unitPrice: 4999, // ₹4,999/month
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod7Id = generateUuidV7();
      _self.products.set(prod7Id, {
        id: prod7Id,
        workspaceId,
        sku: 'NEX-IN-GST',
        name: 'India GST & E-Invoicing Suite',
        description: 'Automated GSTR-1 matching, IRN generation, and GSTIN verification',
        unitPrice: 49999, // ₹49,999/year
        billingPeriod: 'annual',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod8Id = generateUuidV7();
      _self.products.set(prod8Id, {
        id: prod8Id,
        workspaceId,
        sku: 'NEX-IN-IMP',
        name: 'Enterprise Onboarding & Sovereign Migration',
        description: 'Dedicated implementation architect, legacy CRM data pipeline, and training',
        unitPrice: 250000, // ₹2,50,000 one-time
        billingPeriod: 'one_time',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // 8. Seed Quote for TCS Pan-India CRM Modernization (with 18% Indian GST)
      const quote2Id = generateUuidV7();
      const tcsQuoteTotals = calculateQuoteTotals(
        [
          {
            productId: prod5Id,
            productName: 'Nexus CRM Enterprise Seat India',
            sku: 'NEX-IN-ENT',
            billingPeriod: 'monthly',
            quantity: 200,
            unitPrice: 9999,
            discountPercent: 10,
          },
          {
            productId: prod7Id,
            productName: 'India GST & E-Invoicing Suite',
            sku: 'NEX-IN-GST',
            billingPeriod: 'annual',
            quantity: 1,
            unitPrice: 49999,
            discountPercent: 0,
          },
          {
            productId: prod8Id,
            productName: 'Enterprise Onboarding & Sovereign Migration',
            sku: 'NEX-IN-IMP',
            billingPeriod: 'one_time',
            quantity: 1,
            unitPrice: 250000,
            discountPercent: 0,
          },
        ],
        5,
        18 // 18% GST (9% CGST + 9% SGST)
      );

      _self.quotes.set(quote2Id, {
        id: quote2Id,
        workspaceId,
        dealId: d6Id,
        quoteNumber: 'Q-2026-IN-001',
        lineItems: tcsQuoteTotals.lineItems,
        subtotal: tcsQuoteTotals.subtotal,
        volumeDiscountPercent: 5,
        discountAmount: tcsQuoteTotals.discountAmount,
        taxRatePercent: 18,
        taxAmount: tcsQuoteTotals.taxAmount,
        total: tcsQuoteTotals.total,
        arr: tcsQuoteTotals.arr,
        tcv: tcsQuoteTotals.tcv,
        status: 'approved',
        requiresApproval: tcsQuoteTotals.requiresApproval,
        createdAt: now,
        updatedAt: now,
      });

      // 9. Seed Omnichannel Communication Data (Phase 3)
      // Canned Snippets
      _self.snippets.set('snip-intro', {
        id: 'snip-intro',
        workspaceId,
        shortcut: '!intro',
        title: 'Welcome & Value Proposition',
        body: 'Hi {{first_name}},\n\nThanks for connecting with {{company}}! I would love to schedule a technical architecture walkthrough to discuss your data sovereignty and security requirements.\n\nBest,\nAlex Rivers',
        category: 'Sales',
      });
      _self.snippets.set('snip-quote', {
        id: 'snip-quote',
        workspaceId,
        shortcut: '!quote',
        title: 'Proposal Follow-up',
        body: 'Hi {{first_name}},\n\nFollowing up on our quote proposal for {{deal_name}}. Let me know if you would like to review the line items or SLA tiers.\n\nBest,\nAlex Rivers',
        category: 'Proposals',
      });
      _self.snippets.set('snip-sec', {
        id: 'snip-sec',
        workspaceId,
        shortcut: '!sec',
        title: 'Security & Compliance Briefing',
        body: 'Hi {{first_name}},\n\nHere is our security whitepaper detailing KMS envelope encryption, tamper-evident SHA-256 audit logs, and SOC 2 Type II compliance.\n\nBest,\nSecurity Team',
        category: 'Security',
      });

      // Default Communication Preferences
      [p1Id, p2Id, p3Id, p4Id].forEach((cid) => {
        _self.communicationPreferences.set(cid, {
          contactId: cid,
          workspaceId,
          emailOptOut: false,
          smsOptOut: false,
          updatedAt: now,
        });
      });

      // Thread 1: Stark Email Thread
      const th1Id = 'th-stark-email-1';
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const slaTimer = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      _self.threads.set(th1Id, {
        id: th1Id,
        workspaceId,
        subject: 'Enterprise Cloud Transformation Scope',
        channel: 'email',
        contactId: p1Id,
        companyId: c1Id,
        dealId: d1Id,
        status: 'open',
        assignedUserId: userId,
        slaDueAt: slaTimer,
        lastMessageAt: thirtyMinsAgo,
        unreadCount: 1,
        participantSummary: 'Tony Stark <tony@starkindustries.com>',
        snippetPreview: "Please send over the revised quote with 120 Enterprise seats and annual billing.",
        createdAt: threeHoursAgo,
        updatedAt: thirtyMinsAgo,
      });

      _self.messages.set('msg-stark-1', {
        id: 'msg-stark-1',
        threadId: th1Id,
        workspaceId,
        direction: 'inbound',
        channel: 'email',
        sender: { name: 'Tony Stark', email: 'tony@starkindustries.com' },
        recipients: [{ name: 'Alex Rivers', email: 'alex@acme.corp' }],
        subject: 'Enterprise Cloud Transformation Scope',
        bodyText: 'Hi Alex,\n\nWe have reviewed the preliminary architecture. Can you confirm if your platform supports customer-managed encryption keys (BYOK) and sub-millisecond query latency across 1M+ polymorphic records?\n\nBest,\nTony Stark',
        spfDkimStatus: 'pass',
        isInternalNote: false,
        attachments: [],
        createdAt: threeHoursAgo,
      });

      _self.messages.set('msg-stark-2', {
        id: 'msg-stark-2',
        threadId: th1Id,
        workspaceId,
        direction: 'outbound',
        channel: 'email',
        sender: { name: 'Alex Rivers', email: 'alex@acme.corp' },
        recipients: [{ name: 'Tony Stark', email: 'tony@starkindustries.com' }],
        subject: 'Re: Enterprise Cloud Transformation Scope',
        bodyText: 'Hi Tony,\n\nYes! We just verified our 1,000,000 record benchmark at p95 = 0.000 ms. In addition, all tenant records are cryptographically sealed with an immutable SHA-256 hash chain.\n\nBest,\nAlex Rivers',
        isInternalNote: false,
        attachments: [],
        createdAt: twoHoursAgo,
      });

      _self.messages.set('msg-stark-3', {
        id: 'msg-stark-3',
        threadId: th1Id,
        workspaceId,
        direction: 'internal',
        channel: 'internal_note',
        sender: { name: 'Arthur Dent', userId },
        recipients: [],
        bodyText: 'Spoke with engineering lead. We can provision the dedicated tenant enclave and provide custom webhook ingestion for their StarkNet streaming data. Finance approved up to 10% volume discount.',
        isInternalNote: true,
        attachments: [],
        createdAt: oneHourAgo,
      });

      _self.messages.set('msg-stark-4', {
        id: 'msg-stark-4',
        threadId: th1Id,
        workspaceId,
        direction: 'inbound',
        channel: 'email',
        sender: { name: 'Tony Stark', email: 'tony@starkindustries.com' },
        recipients: [{ name: 'Alex Rivers', email: 'alex@acme.corp' }],
        subject: 'Re: Enterprise Cloud Transformation Scope',
        bodyText: "That's exceptional. Please send over the revised quote with 120 Enterprise seats and annual billing.",
        spfDkimStatus: 'pass',
        isInternalNote: false,
        attachments: [],
        createdAt: thirtyMinsAgo,
      });

      // Thread 2: Wayne SMS Thread
      const th2Id = 'th-wayne-sms-1';
      _self.threads.set(th2Id, {
        id: th2Id,
        workspaceId,
        subject: 'Security Questionnaire Follow-up',
        channel: 'sms',
        contactId: p2Id,
        companyId: c2Id,
        dealId: d2Id,
        status: 'open',
        assignedUserId: userId,
        lastMessageAt: twoHoursAgo,
        unreadCount: 0,
        participantSummary: 'Bruce Wayne (+1-212-555-0144)',
        snippetPreview: 'Security committee is reviewing the encryption model. Looks solid.',
        createdAt: threeHoursAgo,
        updatedAt: twoHoursAgo,
      });

      _self.messages.set('msg-wayne-1', {
        id: 'msg-wayne-1',
        threadId: th2Id,
        workspaceId,
        direction: 'outbound',
        channel: 'sms',
        sender: { name: 'Alex Rivers', phone: '+1-800-555-0100' },
        recipients: [{ name: 'Bruce Wayne', phone: '+1-212-555-0144' }],
        bodyText: 'Hi Bruce, this is Alex from Nexus CRM. Did you have a chance to review the SOC 2 Type II report we sent over?',
        isInternalNote: false,
        attachments: [],
        createdAt: threeHoursAgo,
      });

      _self.messages.set('msg-wayne-2', {
        id: 'msg-wayne-2',
        threadId: th2Id,
        workspaceId,
        direction: 'inbound',
        channel: 'sms',
        sender: { name: 'Bruce Wayne', phone: '+1-212-555-0144' },
        recipients: [{ name: 'Alex Rivers', phone: '+1-800-555-0100' }],
        bodyText: 'Security committee is reviewing the encryption model. Looks solid.',
        isInternalNote: false,
        attachments: [],
        createdAt: twoHoursAgo,
      });

      // Thread 3: WhatsApp
      const th3Id = 'th-pied-whatsapp-1';
      _self.threads.set(th3Id, {
        id: th3Id,
        workspaceId,
        subject: 'API Integration & Webhook Signatures',
        channel: 'whatsapp',
        contactId: p4Id,
        companyId: c4Id,
        dealId: d4Id,
        status: 'resolved',
        assignedUserId: userId,
        lastMessageAt: oneHourAgo,
        unreadCount: 0,
        participantSummary: 'Richard Hendricks (+1-415-555-0177)',
        snippetPreview: 'HMAC-SHA256 signatures are working cleanly. Thanks!',
        createdAt: oneHourAgo,
        updatedAt: oneHourAgo,
      });

      _self.messages.set('msg-pied-1', {
        id: 'msg-pied-1',
        threadId: th3Id,
        workspaceId,
        direction: 'inbound',
        channel: 'whatsapp',
        sender: { name: 'Richard Hendricks', phone: '+1-415-555-0177' },
        recipients: [{ name: 'Nexus Support' }],
        bodyText: 'Hey Alex! Does your webhook engine support HMAC-SHA256 signatures for inbound event delivery?',
        isInternalNote: false,
        attachments: [],
        createdAt: oneHourAgo,
      });

      // Multi-Step Drip Sequence
      const seqId = 'seq-enterprise-outbound';
      _self.sequences.set(seqId, {
        id: seqId,
        workspaceId,
        name: 'Enterprise Outbound Cadence',
        description: 'Multi-step technical outreach for enterprise accounts',
        isActive: true,
        exitOnReply: true,
        exitOnMeetingBooked: true,
        exitOnDealWon: true,
        dailyDomainLimit: 50,
        steps: [
          {
            id: 'seq-step-1',
            stepOrder: 0,
            dayOffset: 0,
            type: 'email',
            subject: 'Sovereign Multi-Tenant CRM: Technical Briefing',
            body: 'Hi {{first_name}},\n\nNexus CRM delivers complete tenant sovereign isolation, sub-millisecond AST formula queries, and cryptographically verified audit trails.\n\nBest,\nAlex Rivers',
          },
          {
            id: 'seq-step-2',
            stepOrder: 1,
            dayOffset: 3,
            type: 'task_call',
            subject: 'Architecture Q&A Follow-up Call',
            body: 'Conduct discovery call to discuss compliance standards and KMS encryption requirements.',
          },
          {
            id: 'seq-step-3',
            stepOrder: 2,
            dayOffset: 7,
            type: 'email',
            subject: 'Case Study: 1M Polymorphic Records Query Benchmark',
            body: 'Hi {{first_name}},\n\nWanted to share our 1,000,000 record benchmark verified at p95 = 0.000 ms.\n\nBest,\nAlex Rivers',
          },
        ],
        createdAt: now,
        updatedAt: now,
      });

      _self.sequenceEnrollments.set('enr-bruce-1', {
        id: 'enr-bruce-1',
        workspaceId,
        sequenceId: seqId,
        contactId: p2Id,
        contactEmail: 'bruce@waynecorp.com',
        currentStepIndex: 1,
        nextStepDueAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
        status: 'running',
        enrolledAt: now,
        updatedAt: now,
      });

      // 8. Phase 4: Seed Merge History Demo Record (Stark Industries merge)
      const starkMergedHistId = 'merge-demo-hist-1';
      const starkWinner = _self.records.get(c1Id)!;
      const starkLoser = _self.records.get(c1MergedId)!;
      _self.mergeHistories.set(starkMergedHistId, {
        id: starkMergedHistId,
        workspaceId,
        entityName: 'companies',
        winnerRecordId: c1Id,
        loserRecordId: c1MergedId,
        snapshotWinnerBefore: JSON.parse(JSON.stringify(starkWinner)),
        snapshotLoserBefore: JSON.parse(JSON.stringify(starkLoser)),
        mergedData: { ...starkWinner.data, employee_count: 12000 },
        transferredLinksCount: 1,
        transferredActivitiesCount: 1,
        repointedLinks: [],
        repointedEntities: [],
        mergedBy: userId,
        mergedAt: threeDaysAgo,
        status: 'MERGED',
      });

      // 9. Scan and index initial duplicates for workspace
      _self.scanDuplicatesForWorkspace(workspaceId);

      // 10. Phase 5: Workflow Automation & Extensibility Engine
      const wf1Id = 'wf-auto-lead-nurture';
      _self.workflows.set(wf1Id, {
        id: wf1Id,
        workspaceId,
        name: 'Autonomous Inbound Lead Qualification & Routing',
        description: 'Evaluates inbound lead titles, applies VIP tags, and triggers omnichannel notifications',
        isActive: true,
        triggerType: 'record.created',
        triggerConfig: { objectApiName: 'people' },
        rootNodeId: 'node-trig-lead',
        nodes: [
          {
            id: 'node-trig-lead',
            type: 'trigger',
            title: 'Lead Created (People)',
            config: { object: 'people' },
            nextNodes: ['node-cond-exec'],
          },
          {
            id: 'node-cond-exec',
            type: 'condition',
            title: 'Is Executive Lead? (CEO / Founder / VP)',
            config: { field: 'title', operator: 'contains', value: 'CEO' },
            nextNodes: ['node-act-vip-tag'],
            elseNodes: ['node-act-std-tag'],
          },
          {
            id: 'node-act-vip-tag',
            type: 'action',
            title: 'Tag Record as VIP & Priority 1',
            actionType: 'update_record',
            config: { entityName: 'people', patch: { lifecycle_stage: 'Opportunity' } },
            nextNodes: ['node-act-notify-team'],
          },
          {
            id: 'node-act-std-tag',
            type: 'action',
            title: 'Tag Record as Standard Lead',
            actionType: 'update_record',
            config: { entityName: 'people', patch: { lifecycle_stage: 'Lead' } },
            nextNodes: ['node-act-send-email'],
          },
          {
            id: 'node-act-notify-team',
            type: 'action',
            title: 'Create Executive SLA Follow-up Task',
            actionType: 'create_task',
            config: {
              title: 'Executive Briefing Follow-up for {{first_name}} {{last_name}}',
              description: 'Priority SLA: 1 hour contact guarantee.',
            },
          },
          {
            id: 'node-act-send-email',
            type: 'action',
            title: 'Send Standard Welcome Email',
            actionType: 'send_email',
            config: {
              subject: 'Welcome to Sovereign Nexus CRM',
              body: 'Hi {{first_name}}, thank you for connecting with us.',
            },
          },
        ],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      const wf2Id = 'wf-deal-won-webhook';
      _self.workflows.set(wf2Id, {
        id: wf2Id,
        workspaceId,
        name: 'Closed-Won ERP Dispatch & Audit Sync',
        description: 'Dispatches enterprise deal payload to billing & provisioning systems via HMAC signed webhook',
        isActive: true,
        triggerType: 'record.stage_changed',
        triggerConfig: { objectApiName: 'deals' },
        rootNodeId: 'node-trig-deal',
        nodes: [
          {
            id: 'node-trig-deal',
            type: 'trigger',
            title: 'Deal Stage Updated',
            config: { object: 'deals' },
            nextNodes: ['node-cond-won'],
          },
          {
            id: 'node-cond-won',
            type: 'condition',
            title: 'Is Deal Closed Won?',
            config: { field: 'stage', operator: '==', value: 'Closed Won' },
            nextNodes: ['node-act-erp-hook'],
            elseNodes: [],
          },
          {
            id: 'node-act-erp-hook',
            type: 'action',
            title: 'Dispatch HMAC Outbound Webhook to ERP',
            actionType: 'outbound_webhook',
            config: {
              url: 'https://hooks.acme-erp.internal/orders/sync',
              secret: 'whsec_prod_demo_9876543210fedcba',
            },
            nextNodes: ['node-act-audit-task'],
          },
          {
            id: 'node-act-audit-task',
            type: 'action',
            title: 'Create Customer Provisioning Task',
            actionType: 'create_task',
            config: {
              title: 'Customer Provisioning for {{name}}',
              description: 'Verify invoice generation and KMS BYOK key deployment.',
            },
          },
        ],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      // Demo Workflow 3: Section 12.8 Golden Path Requirement
      // "Deal > ₹50 L (or base equivalent) stalls 7 days -> notify manager + create task"
      const wf3Id = 'wf-deal-stalled-escalation';
      _self.workflows.set(wf3Id, {
        id: wf3Id,
        workspaceId,
        name: 'Stalled High-Value Deal SLA Escalation (> ₹50L)',
        description: 'Triggers when a deal exceeding ₹50,00,000 (INR 5M or base equivalent) stalls in negotiation for 7+ days; notifies sales director and generates SLA intervention task',
        isActive: true,
        triggerType: 'record.updated',
        triggerConfig: { objectApiName: 'deals' },
        rootNodeId: 'node-trig-stalled',
        nodes: [
          {
            id: 'node-trig-stalled',
            type: 'trigger',
            title: 'Deal Updated & Stage Analyzed',
            config: { object: 'deals' },
            nextNodes: ['node-cond-stalled-7d'],
          },
          {
            id: 'node-cond-stalled-7d',
            type: 'condition',
            title: 'Is Deal Stalled in Stage >= 7 Days?',
            config: { field: 'days_in_stage', operator: '>=', value: 7 },
            nextNodes: ['node-cond-val-50l'],
            elseNodes: [],
          },
          {
            id: 'node-cond-val-50l',
            type: 'condition',
            title: 'Is Value >= ₹50,00,000 (Base Equivalent)?',
            config: { field: 'amount', operator: '>=', value: 5000000 },
            nextNodes: ['node-act-alert-manager'],
            elseNodes: [],
          },
          {
            id: 'node-act-alert-manager',
            type: 'action',
            title: 'Notify Sales Director via Priority Alert',
            actionType: 'send_email',
            config: {
              recipient: 'director.sales@acme.corp',
              subject: 'URGENT SLA Escalation: Stalled Deal {{name}} > ₹50L',
              body: 'Deal {{name}} valued at {{amount}} has stalled for 7+ days. Executive intervention required.',
            },
            nextNodes: ['node-act-create-task'],
          },
          {
            id: 'node-act-create-task',
            type: 'action',
            title: 'Create Executive SLA Intervention Task',
            actionType: 'create_task',
            config: {
              title: 'Executive Intervention: Stalled Deal {{name}}',
              description: 'Schedule emergency deal review with sponsor and VP.',
              dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            },
          },
        ],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      // Demo Outbound Webhook Subscription
      const hook1Id = 'hook-sub-erp-1';
      _self.outboundWebhooks.set(hook1Id, {
        id: hook1Id,
        workspaceId,
        targetUrl: 'https://hooks.acme-erp.internal/orders/sync',
        secret: 'whsec_prod_demo_9876543210fedcba',
        subscribedEvents: ['deal.won', 'quote.approved', 'record.created'],
        isActive: true,
        description: 'Enterprise ERP sync listener for closed-won deals',
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      // Demo Webhook Delivery Log
      const deliv1Id = 'del-log-erp-1';
      const samplePayload = {
        event: 'deal.won',
        timestamp: threeDaysAgo,
        deal: {
          id: d4Id,
          name: 'Pied Piper Compression Platform',
          amount: 65000,
          stage: 'Closed Won',
        },
      };
      _self.webhookDeliveries.set(deliv1Id, {
        id: deliv1Id,
        workspaceId,
        subscriptionId: hook1Id,
        targetUrl: 'https://hooks.acme-erp.internal/orders/sync',
        event: 'deal.won',
        payload: samplePayload,
        signature: signWebhookPayload('whsec_prod_demo_9876543210fedcba', samplePayload),
        timestamp: threeDaysAgo,
        statusCode: 200,
        status: 'SUCCESS',
        responseSummary: 'HTTP 200 OK - Order 88392 Queued for Provisioning',
        durationMs: 38,
        deliveredAt: threeDaysAgo,
      });

      // Demo Workflow Execution Run
      const run1Id = 'run-demo-lead-1';
      _self.workflowRuns.set(run1Id, {
        id: run1Id,
        workspaceId,
        workflowId: wf1Id,
        status: 'completed',
        triggerEvent: 'record.created:people',
        triggerRecordId: p1Id,
        context: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
        stepLogs: [
          {
            nodeId: 'node-trig-lead',
            nodeTitle: 'Lead Created (People)',
            nodeType: 'trigger',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { triggerEvent: 'record.created:people', triggeredAt: threeDaysAgo, recordId: p1Id },
            executedAt: threeDaysAgo,
            durationMs: 1,
          },
          {
            nodeId: 'node-cond-exec',
            nodeTitle: 'Is Executive Lead? (CEO / Founder / VP)',
            nodeType: 'condition',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { expression: 'title contains CEO', evaluatedTo: true },
            executedAt: threeDaysAgo,
            durationMs: 1,
          },
          {
            nodeId: 'node-act-vip-tag',
            nodeTitle: 'Tag Record as VIP & Priority 1',
            nodeType: 'action',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { updated: true, targetId: p1Id, patch: { lifecycle_stage: 'Opportunity' } },
            executedAt: threeDaysAgo,
            durationMs: 2,
          },
          {
            nodeId: 'node-act-notify-team',
            nodeTitle: 'Create Executive SLA Follow-up Task',
            nodeType: 'action',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { taskCreated: true, task: { title: 'Executive Briefing Follow-up for Tony Stark' } },
            executedAt: threeDaysAgo,
            durationMs: 3,
          },
        ],
        durationMs: 7,
        executedAt: threeDaysAgo,
        executedBy: userId,
      });

      // 11. Phase 6: Platform Sovereignty, KMS Envelope Encryption & BYOK
      const masterKek = generateKey();
      const masterKeyId = 'kms-key-v1';
      _self.kmsKeys.set(masterKeyId, {
        id: masterKeyId,
        workspaceId,
        version: 1,
        status: 'ACTIVE',
        algorithm: 'AES-256-GCM',
        keyHex: masterKek.toString('hex'),
        createdAt: threeDaysAgo,
      });

      const initialDek = generateKey();
      const initialEnvelope = {
        ...wrapDek(masterKek, initialDek, 'dek-tenant-main', 1),
        workspaceId,
      };
      _self.encryptedDeks.set(initialEnvelope.dekId, initialEnvelope);
  }
}

