export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER' // e.g. {amount} or amount
  | 'OPERATOR'   // +, -, *, /, >, <, >=, <=, ==, !=
  | 'LPAREN'     // (
  | 'RPAREN'     // )
  | 'COMMA'      // ,
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string | number;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i]!;

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number literals
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(input[i + 1] || ''))) {
      let numStr = '';
      while (i < input.length && /[0-9.]/.test(input[i]!)) {
        numStr += input[i]!;
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    // String literals ('hello' or "hello")
    if (char === "'" || char === '"') {
      const quote = char;
      i++;
      let str = '';
      while (i < input.length && input[i] !== quote) {
        str += input[i]!;
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Field reference in braces: {field_name}
    if (char === '{') {
      i++;
      let field = '';
      while (i < input.length && input[i] !== '}') {
        field += input[i]!;
        i++;
      }
      i++; // skip '}'
      tokens.push({ type: 'IDENTIFIER', value: field.trim() });
      continue;
    }

    // Identifiers or Function names (e.g. IF, COALESCE, field_name)
    if (/[a-zA-Z_]/.test(char)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]!)) {
        ident += input[i]!;
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: ident });
      continue;
    }

    // Two-character operators (==, !=, >=, <=)
    const twoChar = input.slice(i, i + 2);
    if (['==', '!=', '>=', '<='].includes(twoChar)) {
      tokens.push({ type: 'OPERATOR', value: twoChar });
      i += 2;
      continue;
    }

    // Single-character operators (+, -, *, /, >, <)
    if (['+', '-', '*', '/', '>', '<'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character in formula: '${char}' at index ${i}`);
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}
