import { expect, test } from './fixtures/harness';

/** REQ-447 — Kubernetes networking: ClusterIP DNAT, NodePort under Cluster and Local (TC-2597, TC-2598). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2597: through the ClusterIP the backend sees the client Pod, and the reply comes from the ClusterIP', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/k8s-networking');
  await expect(page.getByTestId('k8s-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('k8s-reveal')).toHaveCount(0);
  await expect(page.getByTestId('k8s-hops')).toHaveCount(0);
  await page.getByTestId('k8s-guess-cluster-ip').click();
  await page.getByTestId('k8s-reveal-button').click();
  await expect(page.getByTestId('k8s-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('k8s-reveal')).toHaveAttribute('data-backend-sees', '10.244.1.5');
  await expect(page.getByTestId('k8s-reveal')).toHaveAttribute('data-reply-from', '10.96.0.10');
  await expect(page.getByTestId('k8s-hops').locator('tr[data-change="dnat"]')).toHaveCount(1);
});

test('TC-2598: a NodePort on a node with no backend is SNATed under Cluster and dropped under Local', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/k8s-networking');
  await page.getByTestId('k8s-guess-pod').click();
  await page.getByTestId('k8s-reveal-button').click();
  await expect(page.getByTestId('k8s-reveal')).toHaveAttribute('data-right', 'true');

  await expect(page.getByTestId('k8s-cluster-reveal-button')).toBeDisabled();
  await page.getByTestId('k8s-cluster-guess-kept').click();
  await page.getByTestId('k8s-cluster-reveal-button').click();
  await expect(page.getByTestId('k8s-cluster-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('k8s-cluster-reveal')).toHaveAttribute(
    'data-backend-sees',
    '10.0.0.1',
  );
  await expect(page.getByTestId('k8s-cluster-hops')).toHaveAttribute('data-extra-hops', '1');

  await page.getByTestId('k8s-local-guess-kept').click();
  await page.getByTestId('k8s-local-reveal-button').click();
  await expect(page.getByTestId('k8s-local-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('k8s-local-reveal')).toHaveAttribute('data-delivered', 'false');

  await expect(page.getByTestId('k8s-trace')).toHaveAttribute('data-backend-sees', '203.0.113.9');
  await expect(page.getByTestId('k8s-health')).toHaveAttribute('data-status', '200');
  await page.getByTestId('k8s-entry-node-a').click();
  await expect(page.getByTestId('k8s-trace')).toHaveAttribute('data-delivered', 'false');
  await expect(page.getByTestId('k8s-health')).toHaveAttribute('data-status', '503');
  await page.getByTestId('k8s-policy-Cluster').click();
  await expect(page.getByTestId('k8s-trace')).toHaveAttribute('data-backend-sees', '10.0.0.1');
  await expect(page.getByTestId('k8s-health')).toHaveAttribute('data-status', 'none');
});

test('TC-2665: in the explore card, NodePort under Cluster entering node-b reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/k8s-networking');
  await page.getByTestId('k8s-guess-pod').click();
  await page.getByTestId('k8s-reveal-button').click();
  await page.getByTestId('k8s-cluster-guess-snat').click();
  await page.getByTestId('k8s-cluster-reveal-button').click();
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('k8s-local-guess-dropped').click();
  await page.getByTestId('k8s-local-reveal-button').click();
  const first = page.getByTestId('challenge-cluster-no-hop');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-cluster-no-hop-hint')).toHaveCount(0);
  await page.getByTestId('challenge-cluster-no-hop-hint-button').click();
  await expect(page.getByTestId('challenge-cluster-no-hop-hint')).toBeVisible();
  await page.getByTestId('k8s-policy-Cluster').click();
  await expect(page.getByTestId('k8s-trace')).toHaveAttribute('data-extra-hops', '0');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-cluster-no-hop-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
