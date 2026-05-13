import { NetlabError } from '../../../errors';
import type { PacketHop, PacketTrace } from '../../../types/simulation';

export type TraceFilterPredicate = (item: PacketHop | PacketTrace) => boolean;

export type TraceFilterResult =
  | { readonly ok: true; readonly predicate: TraceFilterPredicate; readonly ast: FilterAst }
  | { readonly ok: false; readonly error: NetlabError };

type FieldName =
  | 'ip.src'
  | 'ip.dst'
  | 'ip.addr'
  | 'tcp.port'
  | 'udp.port'
  | 'eth.addr'
  | 'protocol';

type Operator = '==' | '!=';

type FilterAst =
  | { readonly kind: 'identity' }
  | {
      readonly kind: 'comparison';
      readonly field: FieldName;
      readonly op: Operator;
      readonly value: string;
    }
  | { readonly kind: 'not'; readonly child: FilterAst }
  | { readonly kind: 'and'; readonly left: FilterAst; readonly right: FilterAst }
  | { readonly kind: 'or'; readonly left: FilterAst; readonly right: FilterAst };

type TokenKind = 'word' | 'number' | '==' | '!=' | '&&' | '||' | '!' | '(' | ')' | 'eof';

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly column: number;
}

const FIELDS = new Set<FieldName>([
  'ip.src',
  'ip.dst',
  'ip.addr',
  'tcp.port',
  'udp.port',
  'eth.addr',
  'protocol',
]);

const PROTOCOLS = new Set(['arp', 'icmp', 'tcp', 'udp', 'dhcp', 'dns', 'http', 'igmp']);

export function parseTraceFilter(input: string): TraceFilterResult {
  try {
    const tokens = tokenize(input);
    if (tokens.length === 1) {
      return success({ kind: 'identity' });
    }

    const parser = new Parser(tokens);
    const ast = parser.parse();
    return success(ast);
  } catch (error) {
    if (error instanceof NetlabError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: parseError(error instanceof Error ? error.message : String(error), 0),
    };
  }
}

function success(ast: FilterAst): TraceFilterResult {
  return {
    ok: true,
    ast,
    predicate: compileTraceFilter(ast),
  };
}

export function compileTraceFilter(ast: FilterAst): TraceFilterPredicate {
  const hopPredicate = compileHopPredicate(ast);
  return (item) => {
    if (isTrace(item)) {
      return item.hops.some(hopPredicate);
    }
    return hopPredicate(item);
  };
}

function compileHopPredicate(ast: FilterAst): (hop: PacketHop) => boolean {
  switch (ast.kind) {
    case 'identity':
      return () => true;
    case 'comparison':
      return (hop) => compareValues(valuesForField(hop, ast.field), ast.op, ast.value);
    case 'not': {
      const child = compileHopPredicate(ast.child);
      return (hop) => !child(hop);
    }
    case 'and': {
      const left = compileHopPredicate(ast.left);
      const right = compileHopPredicate(ast.right);
      return (hop) => left(hop) && right(hop);
    }
    case 'or': {
      const left = compileHopPredicate(ast.left);
      const right = compileHopPredicate(ast.right);
      return (hop) => left(hop) || right(hop);
    }
  }
}

function compareValues(values: readonly string[], op: Operator, value: string): boolean {
  const expected = normalizeComparable(value);
  const matched = values.map(normalizeComparable).includes(expected);
  return op === '==' ? matched : !matched;
}

function valuesForField(hop: PacketHop, field: FieldName): string[] {
  switch (field) {
    case 'ip.src':
      return [hop.srcIp];
    case 'ip.dst':
      return [hop.dstIp];
    case 'ip.addr':
      return [hop.srcIp, hop.dstIp];
    case 'tcp.port':
      return isProtocol(hop, 'tcp') ? portValues(hop) : [];
    case 'udp.port':
      return isProtocol(hop, 'udp') ? portValues(hop) : [];
    case 'eth.addr':
      return [
        hop.srcMac,
        hop.dstMac,
        hop.arpFrame?.srcMac,
        hop.arpFrame?.dstMac,
        hop.arpFrame?.payload.senderMac,
        hop.arpFrame?.payload.targetMac,
      ].filter((value): value is string => typeof value === 'string');
    case 'protocol':
      return [protocolValue(hop)];
  }
}

function portValues(hop: PacketHop): string[] {
  return [hop.srcPort, hop.dstPort]
    .filter((value): value is number => typeof value === 'number')
    .map(String);
}

function protocolValue(hop: PacketHop): string {
  if (hop.arpFrame || hop.event === 'arp-request' || hop.event === 'arp-reply') {
    return 'arp';
  }
  return hop.protocol.toLowerCase();
}

function isProtocol(hop: PacketHop, protocol: string): boolean {
  return protocolValue(hop) === protocol;
}

function normalizeComparable(value: string): string {
  return value.toLowerCase();
}

function isTrace(item: PacketHop | PacketTrace): item is PacketTrace {
  return Array.isArray((item as PacketTrace).hops);
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): FilterAst {
    const ast = this.parseOr();
    const next = this.peek();
    if (next.kind !== 'eof') {
      throw parseError(`Unexpected token "${next.text}"`, next.column);
    }
    return ast;
  }

  private parseOr(): FilterAst {
    let left = this.parseAnd();
    while (this.match('||')) {
      left = { kind: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): FilterAst {
    let left = this.parseUnary();
    while (this.match('&&')) {
      left = { kind: 'and', left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): FilterAst {
    if (this.match('!')) {
      return { kind: 'not', child: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FilterAst {
    if (this.match('(')) {
      const expression = this.parseOr();
      this.expect(')', 'Expected closing parenthesis');
      return expression;
    }
    return this.parseComparison();
  }

  private parseComparison(): FilterAst {
    const fieldToken = this.expect('word', 'Expected field name');
    if (!FIELDS.has(fieldToken.text as FieldName)) {
      throw parseError(`Unknown trace filter field "${fieldToken.text}"`, fieldToken.column);
    }
    const op = this.peek();
    if (op.kind !== '==' && op.kind !== '!=') {
      throw parseError('Expected == or != operator', op.column);
    }
    this.index += 1;
    const value = this.expectValue();
    validateComparison(fieldToken.text as FieldName, value);
    return {
      kind: 'comparison',
      field: fieldToken.text as FieldName,
      op: op.kind,
      value: value.text,
    };
  }

  private expectValue(): Token {
    const token = this.peek();
    if (token.kind !== 'word' && token.kind !== 'number') {
      throw parseError('Expected comparison value', token.column);
    }
    this.index += 1;
    return token;
  }

  private expect(kind: TokenKind, message: string): Token {
    const token = this.peek();
    if (token.kind !== kind) {
      throw parseError(message, token.column);
    }
    this.index += 1;
    return token;
  }

  private match(kind: TokenKind): boolean {
    if (this.peek().kind !== kind) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private peek(): Token {
    const token = this.tokens[this.index];
    if (token) {
      return token;
    }
    const fallback = this.tokens[this.tokens.length - 1];
    if (!fallback) {
      throw parseError('Unexpected empty token stream', 0);
    }
    return fallback;
  }
}

function validateComparison(field: FieldName, value: Token): void {
  if ((field === 'tcp.port' || field === 'udp.port') && !/^\d+$/.test(value.text)) {
    throw parseError(`${field} expects a numeric port`, value.column);
  }
  if (field === 'protocol' && !PROTOCOLS.has(value.text.toLowerCase())) {
    throw parseError(`Unsupported protocol "${value.text}"`, value.column);
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    if (!char || /\s/.test(char)) {
      index += 1;
      continue;
    }

    const two = input.slice(index, index + 2);
    if (two === '==' || two === '!=' || two === '&&' || two === '||') {
      tokens.push({ kind: two, text: two, column: index });
      index += 2;
      continue;
    }
    if (char === '!' || char === '(' || char === ')') {
      tokens.push({ kind: char, text: char, column: index });
      index += 1;
      continue;
    }
    if (isAtomChar(char)) {
      const start = index;
      while (index < input.length && isAtomChar(input[index] ?? '')) {
        index += 1;
      }
      const text = input.slice(start, index);
      tokens.push({
        kind: /^\d+$/.test(text) ? 'number' : 'word',
        text,
        column: start,
      });
      continue;
    }
    throw parseError(`Unexpected character "${char}"`, index);
  }

  tokens.push({ kind: 'eof', text: '', column: input.length });
  return tokens;
}

function isAtomChar(char: string): boolean {
  return /[A-Za-z0-9_.:-]/.test(char);
}

function parseError(message: string, column: number): NetlabError {
  return new NetlabError({
    code: 'trace-filter/parse',
    message: `[netlab] ${message}`,
    context: { column },
  });
}
