import { readFile } from 'node:fs/promises';
import { runNetlabRun, type CliFormat } from './runner';

declare const __NETLAB_VERSION__: string;

const USAGE = `Usage: netlab-run <scenario-id> <session.json> <assertions.json> [--tap|--json] [--verbose]

Flags:
  --help      Show this help.
  --version   Show the package version.
  --tap       Emit TAP output (default).
  --json      Emit JSON output.
  --verbose   Include assertion diagnostics when available.
`;

interface ParsedArgv {
  readonly kind: 'run';
  readonly scenarioId: string;
  readonly sessionPath: string;
  readonly assertionsPath: string;
  readonly format: CliFormat;
  readonly verbose: boolean;
}

type ParseResult =
  | ParsedArgv
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | { readonly kind: 'error'; readonly message: string };

function parseArgv(argv: readonly string[]): ParseResult {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { kind: 'help' };
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    return { kind: 'version' };
  }

  let format: CliFormat = 'tap';
  let verbose = false;
  const positional: string[] = [];

  for (const arg of argv) {
    switch (arg) {
      case '--tap':
        format = 'tap';
        break;
      case '--json':
        format = 'json';
        break;
      case '--verbose':
        verbose = true;
        break;
      default:
        if (arg.startsWith('-')) {
          return { kind: 'error', message: `[netlab-run] unknown flag: ${arg}` };
        }
        positional.push(arg);
    }
  }

  if (positional.length !== 3) {
    return { kind: 'error', message: '[netlab-run] expected 3 positional arguments' };
  }

  const [scenarioId, sessionPath, assertionsPath] = positional;
  if (!scenarioId || !sessionPath || !assertionsPath) {
    return { kind: 'error', message: '[netlab-run] invalid positional arguments' };
  }

  return {
    kind: 'run',
    scenarioId,
    sessionPath,
    assertionsPath,
    format,
    verbose,
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgv(argv);

  switch (parsed.kind) {
    case 'help':
      process.stdout.write(USAGE);
      return 0;
    case 'version':
      process.stdout.write(`${__NETLAB_VERSION__}\n`);
      return 0;
    case 'error':
      process.stderr.write(`${parsed.message}\n${USAGE}`);
      return 2;
    case 'run': {
      const [sessionText, assertionsText] = await Promise.all([
        readFile(parsed.sessionPath, 'utf8'),
        readFile(parsed.assertionsPath, 'utf8'),
      ]);
      const result = await runNetlabRun({
        scenarioId: parsed.scenarioId,
        sessionText,
        assertionsText,
        format: parsed.format,
        verbose: parsed.verbose,
      });
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      return result.exitCode;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 2;
    });
}
