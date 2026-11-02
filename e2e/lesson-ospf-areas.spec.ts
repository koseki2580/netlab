import { expect, test } from './fixtures/harness';

/**
 * TC-1101, TC-1102, TC-1103 — the OSPF areas lesson reads the simulator's
 * calculation; the Dynamic Routing lesson gives the BGP decision order.
 */
test.describe('English', () => {
  test.use({ appLocale: 'en', viewportPreset: 'desktop' });

  test('a router’s LSDB by area, and routes with path types', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/ospf-areas');
    await expect(page.getByTestId('ospf-calculated-note')).toContainText(
      'The simulator sends no OSPF packets',
    );
    const lsdb = page.getByTestId('ospf-lsdb');
    await expect(lsdb.getByTestId('ospf-lsdb-area-0.0.0.1')).toContainText(
      'Type 2 · network 10.1.0.0/24 from the DR 2.2.2.2',
    );
    await expect(lsdb.getByTestId('ospf-lsdb-area-0.0.0.0')).toHaveCount(0);

    await page.getByTestId('ospf-router-select').selectOption('r1');
    await expect(page.getByTestId('ospf-router-role')).toHaveText('ABR');
    await expect(lsdb.getByTestId('ospf-lsdb-area-0.0.0.0')).toContainText(
      'Type 3 · summary 10.1.0.0/16 from 1.1.1.1',
    );

    await page.getByTestId('ospf-router-select').selectOption('r6');
    await expect(page.getByTestId('ospf-route-10.1.0.0/16')).toContainText('inter-area');
    await expect(page.getByTestId('ospf-route-203.0.113.0/24')).toHaveText(
      '203.0.113.0/24 — E2 — 20',
    );
  });

  test('a better router waits; the BDR takes over; a restart elects afresh', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/routing/ospf-areas');
    const dr = page.getByTestId('ospf-lan-dr');
    const bdr = page.getByTestId('ospf-lan-bdr');
    await expect(dr).toHaveText('DR: R2');
    await expect(bdr).toHaveText('BDR: R3');

    await page.getByTestId('ospf-lan-toggle-r7').click();
    await expect(page.getByTestId('ospf-lan-toggle-r7')).toHaveText('stop R7');
    await expect(dr).toHaveText('DR: R2');
    await expect(bdr).toHaveText('BDR: R3');

    await page.getByTestId('ospf-lan-toggle-r2').click();
    await expect(dr).toHaveText('DR: R3');
    await expect(bdr).toHaveText('BDR: R7');

    await page.getByTestId('ospf-lan-restart').click();
    await expect(dr).toHaveText('DR: R7');
    await expect(bdr).toHaveText('BDR: R2');
  });

  test('Dynamic Routing lists the BGP decision order', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/dynamic');
    await page.getByTestId('dynamic-protocol-bgp').click();
    await expect(page.getByTestId('dynamic-bgp-decision')).toContainText('ORIGIN');
    await expect(page.getByTestId('dynamic-bgp-med')).toContainText(
      'a lower MED from another AS changes nothing',
    );
  });
});

test.describe('Japanese', () => {
  test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

  test('the lesson reads in Japanese', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/ospf-areas');
    await expect(page.getByTestId('ospf-calculated-note')).toContainText(
      'シミュレータは OSPF のパケットを送りません',
    );
    await expect(page.getByTestId('ospf-lsdb-area-0.0.0.1')).toContainText(
      'Type 2・ネットワーク 10.1.0.0/24（DR 2.2.2.2 から）',
    );
    await page.getByTestId('ospf-lan-toggle-r7').click();
    await expect(page.getByTestId('ospf-lan-toggle-r7')).toHaveText('R7 を停止');
    await expect(page.getByTestId('ospf-lan-dr')).toHaveText('DR: R2');
  });
});

test.describe('phone', () => {
  test.use({ appLocale: 'en', viewportPreset: 'phone' });

  test('the lesson fits a phone screen', async ({ page, demoPage }) => {
    await demoPage.goto('/routing/ospf-areas');
    await expect(page.getByTestId('ospf-lan-dr')).toHaveText('DR: R2');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
