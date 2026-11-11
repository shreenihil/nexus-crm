import { tokenize } from "./lexer";
import { Parser, type ASTNode } from "./parser";

export type RecordContext = Record<string, any>;

export function evaluateAST(node: ASTNode, context: RecordContext): any {
  switch (node.type) {
    case "NumberLiteral":
      return node.value;

    case "StringLiteral":
      return node.value;

    case "Identifier": {
      // Support dot notation like company.annual_revenue
      const parts = node.name.split(".");
      let current: any = context;
      for (const part of parts) {
        if (
          part === "__proto__" ||
          part === "constructor" ||
          part === "prototype"
        )
          return null;
        if (current == null || typeof current !== "object") return null;
        if (!Object.prototype.hasOwnProperty.call(current, part)) return null;
        current = current[part];
      }
      return current ?? null;
    }

    case "BinaryExpression": {
      const left = evaluateAST(node.left, context);
      const right = evaluateAST(node.right, context);

      switch (node.operator) {
        case "+":
          if (typeof left === "string" || typeof right === "string") {
            return String(left ?? "") + String(right ?? "");
          }
          return (Number(left) || 0) + (Number(right) || 0);

        case "-":
          return (Number(left) || 0) - (Number(right) || 0);

        case "*":
          return (Number(left) || 0) * (Number(right) || 0);

        case "/": {
          const divisor = Number(right) || 0;
          if (divisor === 0) return 0; // Prevent divide by zero error
          return (Number(left) || 0) / divisor;
        }

        case ">":
          return left > right;

        case "<":
          return left < right;

        case ">=":
          return left >= right;

        case "<=":
          return left <= right;

        case "==":
          return left == right;

        case "!=":
          return left != right;

        default:
          throw new Error(`Unsupported binary operator: '${node.operator}'`);
      }
    }

    case "FunctionCall": {
      const { name, args } = node;

      switch (name) {
        case "IF": {
          if (args.length !== 3) {
            throw new Error(
              `IF function expects 3 arguments, received ${args.length}`,
            );
          }
          const condition = evaluateAST(args[0]!, context);
          return condition
            ? evaluateAST(args[1]!, context)
            : evaluateAST(args[2]!, context);
        }

        case "COALESCE": {
          for (const arg of args) {
            const val = evaluateAST(arg, context);
            if (val !== null && val !== undefined && val !== "") {
              return val;
            }
          }
          return null;
        }

        case "ROUND": {
          if (args.length < 1 || args.length > 2) {
            throw new Error(
              `ROUND expects 1 or 2 arguments, received ${args.length}`,
            );
          }
          const val = Number(evaluateAST(args[0]!, context)) || 0;
          const decimals = args[1]
            ? Number(evaluateAST(args[1], context)) || 0
            : 0;
          const factor = Math.pow(10, decimals);
          return Math.round(val * factor) / factor;
        }

        case "CONCAT": {
          return args
            .map((arg) => String(evaluateAST(arg, context) ?? ""))
            .join("");
        }

        case "MAX": {
          const vals = args.map(
            (arg) => Number(evaluateAST(arg, context)) || 0,
          );
          return Math.max(...vals);
        }

        case "MIN": {
          const vals = args.map(
            (arg) => Number(evaluateAST(arg, context)) || 0,
          );
          return Math.min(...vals);
        }

        default:
          throw new Error(`Unknown formula function: '${name}'`);
      }
    }

    default:
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }
}

/**
 * Parses and evaluates a safe formula expression string against record data.
 */
export function evaluateFormula(
  expression: string,
  context: RecordContext = {},
): any {
  if (!expression || expression.trim() === "") return null;
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return evaluateAST(ast, context);
}
