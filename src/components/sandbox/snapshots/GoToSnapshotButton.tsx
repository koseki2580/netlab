import { useSandbox } from '../../../sandbox/useSandbox';

export function GoToSnapshotButton({ id, name }: { readonly id: string; readonly name: string }) {
  const sandbox = useSandbox();

  return (
    <button
      type="button"
      aria-label={`Go to snapshot ${name}`}
      onClick={() => sandbox.revertToSnapshot(id)}
    >
      Go to
    </button>
  );
}
