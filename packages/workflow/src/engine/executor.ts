/**
 * Deterministic DAG workflow execution engine.
 * Executes node graphs with step-level input/output capture and branch routing.
 */

import { evaluateFormula, substituteTemplateVariables } from "@nexus/schema";
import { WorkflowNode, validateWorkflowDAG } from "../dag/validator.js";
import { signWebhookPayload } from "../webhooks/signer.js";

export interface WorkflowExecutionContext {
  workspaceId: string;
  triggerEvent: string;
  triggerRecord?: Record<string, any>;
  variables: Record<string, any>;
  actorId?: string;
  // External hooks and dispatchers injected by runtime
  onUpdateRecord?: (
    entityName: string,
    id: string,
    patch: Record<string, any>,
  ) => Promise<any>;
  onCreateRecord?: (
    entityName: string,
    data: Record<string, any>,
  ) => Promise<any>;
  onSendCommunication?: (
    channel: string,
    payload: Record<string, any>,
  ) => Promise<any>;
  onDispatchWebhook?: (
    url: string,
    secret: string,
    payload: Record<string, any>,
  ) => Promise<any>;
}

export interface WorkflowStepLog {
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  status: "success" | "failed" | "skipped";
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  error?: string;
  executedAt: string;
  durationMs: number;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  status: "completed" | "failed";
  stepLogs: WorkflowStepLog[];
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  finalVariables: Record<string, any>;
  error?: string;
}

/**
 * Executes a validated workflow graph given an execution context.
 */
export async function executeWorkflowDAG(
  workflowId: string,
  nodes: WorkflowNode[],
  rootNodeId: string,
  context: WorkflowExecutionContext,
): Promise<WorkflowExecutionResult> {
  const startedAt = new Date().toISOString();
  const startTime = performance.now();
  const stepLogs: WorkflowStepLog[] = [];
  const currentVariables = {
    ...context.variables,
    ...(context.triggerRecord ? { record: context.triggerRecord } : {}),
  };

  // 1. Validate DAG integrity
  const validation = validateWorkflowDAG(nodes, rootNodeId);
  if (!validation.isValid) {
    const errorMsg = `DAG validation failed: ${validation.errors.join("; ")}`;
    return {
      workflowId,
      status: "failed",
      stepLogs,
      startedAt,
      completedAt: new Date().toISOString(),
      totalDurationMs: Math.round(performance.now() - startTime),
      finalVariables: currentVariables,
      error: errorMsg,
    };
  }

  const nodeMap = new Map<string, WorkflowNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Traversal queue starting at root trigger
  const queue: string[] = [rootNodeId];
  const visited = new Set<string>();
  const MAX_EXECUTION_STEPS = 50;
  let stepsCount = 0;

  while (queue.length > 0) {
    stepsCount++;
    if (stepsCount > MAX_EXECUTION_STEPS) {
      const errorMsg = `Workflow execution aborted: loop protection triggered (exceeded maximum of ${MAX_EXECUTION_STEPS} steps)`;
      return {
        workflowId,
        status: "failed",
        stepLogs,
        startedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: Math.round(performance.now() - startTime),
        finalVariables: currentVariables,
        error: errorMsg,
      };
    }

    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const stepStart = performance.now();
    const executedAt = new Date().toISOString();
    const stepInput = JSON.parse(JSON.stringify(currentVariables));

    try {
      let stepOutput: Record<string, any> = {};
      let nextNodesToQueue: string[] = [];

      switch (node.type) {
        case "trigger": {
          stepOutput = {
            triggerEvent: context.triggerEvent,
            triggeredAt: executedAt,
            recordId: context.triggerRecord?.id,
          };
          nextNodesToQueue = node.nextNodes || [];
          break;
        }

        case "condition": {
          const expression = node.config.expression || "";
          let conditionPassed = false;

          if (expression) {
            try {
              // Flatten variables for formula evaluation
              const flatContext: Record<string, any> = {};
              for (const [k, v] of Object.entries(currentVariables)) {
                if (typeof v === "object" && v !== null) {
                  for (const [subK, subV] of Object.entries(v)) {
                    flatContext[`${k}_${subK}`] = subV;
                  }
                }
                flatContext[k] = v;
              }

              const result = evaluateFormula(expression, flatContext);
              conditionPassed = Boolean(result);
            } catch {
              conditionPassed = false;
            }
          } else if (node.config.field) {
            // Direct field comparison
            const actual =
              currentVariables.record?.[node.config.field] ??
              (currentVariables as Record<string, any>)[node.config.field];
            const op = node.config.operator || "==";
            const expected = node.config.value;

            if (op === "==")
              conditionPassed = String(actual) === String(expected);
            else if (op === "!=")
              conditionPassed = String(actual) !== String(expected);
            else if (op === ">")
              conditionPassed = Number(actual) > Number(expected);
            else if (op === "<")
              conditionPassed = Number(actual) < Number(expected);
            else if (op === ">=")
              conditionPassed = Number(actual) >= Number(expected);
            else if (op === "<=")
              conditionPassed = Number(actual) <= Number(expected);
            else if (op === "contains")
              conditionPassed = String(actual || "").includes(String(expected));
          }

          stepOutput = {
            expression:
              expression ||
              `${node.config.field} ${node.config.operator} ${node.config.value}`,
            evaluatedTo: conditionPassed,
          };

          // Route down true branch (nextNodes) or false branch (elseNodes)
          if (conditionPassed) {
            nextNodesToQueue = node.nextNodes || [];
          } else {
            nextNodesToQueue = node.elseNodes || [];
          }
          break;
        }

        case "action": {
          const actionType = node.actionType || node.config.actionType;

          if (actionType === "update_record") {
            const entityName = node.config.entityName || "records";
            const targetId =
              node.config.recordId || currentVariables.record?.id;
            const patch = node.config.patch || {};

            if (context.onUpdateRecord && targetId) {
              const res = await context.onUpdateRecord(
                entityName,
                targetId,
                patch,
              );
              stepOutput = { updated: true, targetId, patch, result: res };
            } else {
              stepOutput = { updated: true, targetId, patch, simulated: true };
            }
            if (
              currentVariables.record &&
              currentVariables.record.id === targetId
            ) {
              Object.assign(currentVariables.record, patch);
            }
          } else if (actionType === "create_task") {
            const title = substituteTemplateVariables(
              node.config.title || "Follow-up Task",
              currentVariables.record || {},
            );
            const description = substituteTemplateVariables(
              node.config.description || "",
              currentVariables.record || {},
            );

            const taskPayload = {
              title,
              description,
              assignedTo: node.config.assignedTo || context.actorId,
              dueDate:
                node.config.dueDate ||
                new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              relatedRecordId: currentVariables.record?.id,
            };

            if (context.onCreateRecord) {
              const res = await context.onCreateRecord("tasks", taskPayload);
              stepOutput = { taskCreated: true, task: res };
            } else {
              stepOutput = {
                taskCreated: true,
                task: taskPayload,
                simulated: true,
              };
            }
          } else if (actionType === "send_email" || actionType === "send_sms") {
            const body = substituteTemplateVariables(
              node.config.body || "",
              currentVariables.record || {},
            );
            const subject = substituteTemplateVariables(
              node.config.subject || "",
              currentVariables.record || {},
            );
            const recipient =
              node.config.recipient ||
              currentVariables.record?.email ||
              currentVariables.record?.phone;

            const commPayload = {
              channel: actionType === "send_email" ? "email" : "sms",
              recipient,
              subject,
              body,
            };

            if (context.onSendCommunication) {
              const res = await context.onSendCommunication(
                commPayload.channel,
                commPayload,
              );
              stepOutput = { sent: true, communication: res };
            } else {
              stepOutput = {
                sent: true,
                communication: commPayload,
                simulated: true,
              };
            }
          } else if (actionType === "outbound_webhook") {
            const url =
              node.config.url || "https://api.partner.example/webhook";
            const secret = node.config.secret || "default-webhook-secret";
            const payload = {
              event: context.triggerEvent,
              timestamp: executedAt,
              data: currentVariables.record || currentVariables,
            };

            const signature = signWebhookPayload(secret, payload);

            if (context.onDispatchWebhook) {
              const res = await context.onDispatchWebhook(url, secret, payload);
              stepOutput = {
                webhookDelivered: true,
                url,
                signature,
                response: res,
              };
            } else {
              stepOutput = {
                webhookDelivered: true,
                url,
                signature,
                simulated: true,
              };
            }
          } else {
            stepOutput = { executed: true, actionType, config: node.config };
          }

          nextNodesToQueue = node.nextNodes || [];
          break;
        }

        case "delay": {
          const durationSeconds = Number(node.config.durationSeconds) || 60;
          stepOutput = {
            delayedSeconds: durationSeconds,
            resumeAt: new Date(
              Date.now() + durationSeconds * 1000,
            ).toISOString(),
          };
          nextNodesToQueue = node.nextNodes || [];
          break;
        }

        default: {
          nextNodesToQueue = node.nextNodes || [];
          break;
        }
      }

      const durationMs = Math.round(performance.now() - stepStart);
      stepLogs.push({
        nodeId: node.id,
        nodeTitle: node.title,
        nodeType: node.type,
        status: "success",
        inputData: stepInput,
        outputData: stepOutput,
        executedAt,
        durationMs,
      });

      for (const nextId of nextNodesToQueue) {
        if (!visited.has(nextId)) {
          queue.push(nextId);
        }
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - stepStart);
      stepLogs.push({
        nodeId: node.id,
        nodeTitle: node.title,
        nodeType: node.type,
        status: "failed",
        inputData: stepInput,
        error: err.message || "Execution error",
        executedAt,
        durationMs,
      });

      return {
        workflowId,
        status: "failed",
        stepLogs,
        startedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: Math.round(performance.now() - startTime),
        finalVariables: currentVariables,
        error: `Node "${node.title}" (${node.id}) failed: ${err.message}`,
      };
    }
  }

  return {
    workflowId,
    status: "completed",
    stepLogs,
    startedAt,
    completedAt: new Date().toISOString(),
    totalDurationMs: Math.round(performance.now() - startTime),
    finalVariables: currentVariables,
  };
}
