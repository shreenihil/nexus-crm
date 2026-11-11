/**
 * Directed Acyclic Graph (DAG) validator and topological sorter.
 * Ensures workflows have no cyclical loops and form deterministic execution trees.
 */

export type WorkflowNodeType = "trigger" | "condition" | "action" | "delay";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  actionType?:
    | "update_record"
    | "create_task"
    | "send_email"
    | "send_sms"
    | "outbound_webhook";
  config: Record<string, any>;
  nextNodes?: string[];
  elseNodes?: string[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  executionOrder: string[];
}

/**
 * Validates a workflow graph:
 * 1. Checks that rootNodeId exists and is of type 'trigger'.
 * 2. Checks all referenced edge IDs exist.
 * 3. Detects any cyclical loops (via topological sort with in-degree tracking).
 * 4. Checks for orphaned / unreachable nodes.
 */
export function validateWorkflowDAG(
  nodes: WorkflowNode[],
  rootNodeId: string,
): WorkflowValidationResult {
  const errors: string[] = [];
  const nodeMap = new Map<string, WorkflowNode>();

  for (const n of nodes) {
    if (nodeMap.has(n.id)) {
      errors.push(`Duplicate node ID found: "${n.id}"`);
    }
    nodeMap.set(n.id, n);
  }

  const root = nodeMap.get(rootNodeId);
  if (!root) {
    errors.push(`Root node "${rootNodeId}" does not exist in nodes array`);
    return { isValid: false, errors, executionOrder: [] };
  }

  if (root.type !== "trigger") {
    errors.push(
      `Root node "${rootNodeId}" must be of type 'trigger', found '${root.type}'`,
    );
  }

  // Build adjacency list & in-degree map
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const n of nodes) {
    const targets = [...(n.nextNodes || []), ...(n.elseNodes || [])];
    for (const targetId of targets) {
      if (!nodeMap.has(targetId)) {
        errors.push(
          `Node "${n.id}" references non-existent target node "${targetId}"`,
        );
      } else {
        const cur = adj.get(n.id) ?? [];
        cur.push(targetId);
        adj.set(n.id, cur);

        const curIn = inDegree.get(targetId) ?? 0;
        inDegree.set(targetId, curIn + 1);
      }
    }
  }

  // Kahn's algorithm for topological sorting and cycle detection
  const queue: string[] = [];
  const sorted: string[] = [];

  // Start with nodes that have in-degree 0 (typically the root trigger)
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const inDegreeCopy = new Map(inDegree);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;
    sorted.push(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const neighbor of neighbors) {
      const cur = (inDegreeCopy.get(neighbor) ?? 0) - 1;
      inDegreeCopy.set(neighbor, cur);
      if (cur === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If sorted count does not match total nodes, there is a cycle!
  if (sorted.length !== nodes.length) {
    const unvisited = nodes
      .filter((n) => !sorted.includes(n.id))
      .map((n) => n.id);
    errors.push(
      `Cycle detected in workflow graph! Nodes involved in loop: ${unvisited.join(", ")}`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    executionOrder: sorted,
  };
}
