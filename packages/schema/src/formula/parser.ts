import { type Token } from './lexer';

export type ASTNode =
  | { type: 'NumberLiteral'; value: number }
  | { type: 'StringLiteral'; value: string }
  | { type: 'Identifier'; name: string }
  | { type: 'BinaryExpression'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] };

export class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  parse(): ASTNode {
    const node = this.parseExpression();
    if (this.current().type !== 'EOF') {
      throw new Error(`Unexpected token after expression: '${this.current().value}'`);
    }
    return node;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private consume(expectedType?: string): Token {
    const tok = this.current();
    if (expectedType && tok.type !== expectedType) {
      throw new Error(`Expected token type ${expectedType}, found ${tok.type} ('${tok.value}')`);
    }
    this.pos++;
    return tok;
  }

  // Expression: equality and comparison operators
  private parseExpression(): ASTNode {
    let left = this.parseComparison();

    while (
      this.current().type === 'OPERATOR' &&
      ['==', '!='].includes(this.current().value as string)
    ) {
      const op = this.consume().value as string;
      const right = this.parseComparison();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }

    return left;
  }

  // Comparison: >, <, >=, <=
  private parseComparison(): ASTNode {
    let left = this.parseTerm();

    while (
      this.current().type === 'OPERATOR' &&
      ['>', '<', '>=', '<='].includes(this.current().value as string)
    ) {
      const op = this.consume().value as string;
      const right = this.parseTerm();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }

    return left;
  }

  // Term: + and -
  private parseTerm(): ASTNode {
    let left = this.parseFactor();

    while (
      this.current().type === 'OPERATOR' &&
      ['+', '-'].includes(this.current().value as string)
    ) {
      const op = this.consume().value as string;
      const right = this.parseFactor();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }

    return left;
  }

  // Factor: * and /
  private parseFactor(): ASTNode {
    let left = this.parsePrimary();

    while (
      this.current().type === 'OPERATOR' &&
      ['*', '/'].includes(this.current().value as string)
    ) {
      const op = this.consume().value as string;
      const right = this.parsePrimary();
      left = { type: 'BinaryExpression', operator: op, left, right };
    }

    return left;
  }

  // Primary: Number, String, Identifier, Function Call, or (Expression)
  private parsePrimary(): ASTNode {
    const tok = this.current();

    if (tok.type === 'NUMBER') {
      this.consume();
      return { type: 'NumberLiteral', value: tok.value as number };
    }

    if (tok.type === 'STRING') {
      this.consume();
      return { type: 'StringLiteral', value: tok.value as string };
    }

    if (tok.type === 'IDENTIFIER') {
      const name = this.consume().value as string;

      // Check for Function Call: NAME(arg1, arg2...)
      if (this.current().type === 'LPAREN') {
        this.consume('LPAREN');
        const args: ASTNode[] = [];
        if (this.current().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.current().type === 'COMMA') {
            this.consume('COMMA');
            args.push(this.parseExpression());
          }
        }
        this.consume('RPAREN');
        return { type: 'FunctionCall', name: name.toUpperCase(), args };
      }

      return { type: 'Identifier', name };
    }

    if (tok.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseExpression();
      this.consume('RPAREN');
      return expr;
    }

    throw new Error(`Unexpected token in primary expression: '${tok.value}'`);
  }
}
