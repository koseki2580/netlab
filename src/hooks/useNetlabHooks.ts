import { useNetlabContext } from '../components/NetlabContext';

export function useNetlabHooks() {
  const { hookEngine } = useNetlabContext();
  return {
    on: hookEngine.on.bind(hookEngine),
    emit: hookEngine.emit.bind(hookEngine),
  };
}
