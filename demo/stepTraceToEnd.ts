import type { SimulationEngine } from '../src/simulation/SimulationEngine';

/**
 * How many steps to drive before giving up on a trace that never reports
 * `done`. Traces in these lessons are a handful of hops; the ceiling exists so
 * a trace that stalls costs one unresponsive button rather than the tab.
 */
const MAX_STEPS = 400;

/**
 * Run the current trace to its end.
 *
 * The engine normally lives in a worker, so `step()` posts a message and the
 * resulting state arrives on a later task. Two lessons drove this with
 * `while (status !== 'done') { step(); await Promise.resolve(); }`, which
 * drains only the microtask queue — the queue the worker's reply never reaches.
 * The loop therefore never saw `done`, posted step commands as fast as it
 * could, and the renderer ran out of memory and died inside a second.
 *
 * Yielding a task instead lets the reply land, and the ceiling means a trace
 * that never finishes stops the loop rather than the browser.
 */
export async function stepTraceToEnd(engine: SimulationEngine): Promise<void> {
  if (!engine.getState().currentTraceId) return;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (engine.getState().status === 'done') return;
    engine.step();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}
