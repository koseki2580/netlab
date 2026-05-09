import type { Assertion, AssertionContext, AssertionResult } from './types';
import { evaluateAssertion } from './built-in';

export type AssertionEvaluator<A extends Assertion = Assertion> = (
  assertion: A,
  context: AssertionContext,
) => Promise<AssertionResult> | AssertionResult;

export async function evaluateRegisteredAssertion(
  assertion: Assertion,
  context: AssertionContext,
): Promise<AssertionResult> {
  return evaluateAssertion(assertion, context);
}
