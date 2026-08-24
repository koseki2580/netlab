import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { SEL } from '../selectors';

/**
 * POM for the sandbox surface (panel, tabs, edit popovers, parameters,
 * traffic, undo/reset, PCAP, intro). Methods either return a `Locator` for
 * the spec to assert against, or perform a high-level interaction.
 *
 * Specs MUST NOT reach past the POM into raw locators — see
 * `docs/dev/e2e-locators.md`.
 */
export class SandboxPage {
  constructor(private readonly page: Page) {}

  // -- navigation -----------------------------------------------------------

  async gotoMtu(extraQuery = '') {
    return this.gotoScenario('/networking/mtu-fragmentation', extraQuery);
  }

  async gotoScenario(scenarioHash: string, extraQuery = '') {
    const sep = extraQuery.length > 0 ? `&${extraQuery}` : '';
    await this.page.goto(`/?sandbox=1${sep}#${scenarioHash}`);
    await this.expectMounted();
  }

  async gotoUrl(url: string) {
    await this.page.goto(url);
    await this.expectMounted();
  }

  async expectMounted() {
    await expect(this.page.getByTestId(SEL.app.root)).toBeVisible();
    await expect(this.page.getByTestId(SEL.sandbox.panel)).toBeVisible();
  }

  // -- top-level locators ---------------------------------------------------

  panel(): Locator {
    return this.page.getByTestId(SEL.sandbox.panel);
  }
  surface(): Locator {
    return this.page.getByTestId(SEL.sandbox.surface);
  }
  canvasSlot(): Locator {
    return this.page.getByTestId(SEL.sandbox.canvasSlot);
  }
  resizeHandle(): Locator {
    return this.page.getByTestId(SEL.sandbox.resizeHandle);
  }
  narrationRegion(): Locator {
    return this.page.getByTestId(SEL.sandbox.narrationRegion);
  }
  proposalPending(): Locator {
    return this.page.getByTestId(SEL.sandbox.proposalPending);
  }

  // -- mode / collapse ------------------------------------------------------

  modeSwitch(): Locator {
    return this.page.getByTestId(SEL.sandbox.modeSwitch);
  }
  async toggleMode() {
    await this.modeSwitch().click();
  }
  async collapse() {
    await this.page.getByTestId(SEL.sandbox.collapse).click();
  }
  async pressShortcut(key: string) {
    await this.page.keyboard.press(key);
  }

  // -- tabs -----------------------------------------------------------------

  tab(kind: keyof typeof SEL.sandbox.tabs): Locator {
    return this.page.getByTestId(SEL.sandbox.tabs[kind]);
  }
  async clickTab(kind: keyof typeof SEL.sandbox.tabs) {
    await this.tab(kind).click();
  }

  /** Locator for the Edits tab's count badge text — `Edits (N)`. */
  editsTab(): Locator {
    return this.tab('edits');
  }
  async expectEditsCount(n: number) {
    await expect(this.editsTab()).toContainText(`(${n})`);
  }

  /** Currently visible tabpanel content. */
  tabpanel(): Locator {
    return this.page.locator('[role="tabpanel"]');
  }

  // -- edit-list / undo / reset --------------------------------------------

  editListItems(): Locator {
    return this.page.getByTestId(SEL.sandbox.edits.list);
  }
  async resetAllEdits() {
    await this.page.getByTestId(SEL.sandbox.edits.resetAll).click();
  }
  async revertEdit(index: number) {
    await this.page.getByTestId(SEL.sandbox.edits.revertEdit(index)).click();
  }

  // -- shortcuts dialog -----------------------------------------------------

  shortcutsHelpBtn(): Locator {
    return this.page.getByTestId(SEL.sandbox.shortcutsHelpBtn);
  }
  shortcutsDialog(): Locator {
    return this.page.getByTestId(SEL.sandbox.shortcutsDialog);
  }

  // -- intro overlay --------------------------------------------------------

  introOverlay(): Locator {
    return this.page.getByTestId(SEL.sandbox.introOverlay);
  }
  introStepPanel(): Locator {
    return this.page.getByTestId(SEL.sandbox.introStepPanel);
  }
  async startIntro() {
    await this.page.getByTestId(SEL.sandbox.introStart).click();
  }

  // -- traffic --------------------------------------------------------------

  trafficSource(): Locator {
    return this.page.getByTestId(SEL.sandbox.traffic.source);
  }
  trafficDestination(): Locator {
    return this.page.getByTestId(SEL.sandbox.traffic.destination);
  }
  trafficProtocol(): Locator {
    return this.page.getByTestId(SEL.sandbox.traffic.protocol);
  }
  async launchTraffic() {
    await this.page.getByTestId(SEL.sandbox.traffic.launch).click();
  }

  // -- parameters -----------------------------------------------------------

  paramEngineTickMs(): Locator {
    return this.page.getByTestId(SEL.sandbox.parameters.engineTickMs);
  }
  paramMaxTtl(): Locator {
    return this.page.getByTestId(SEL.sandbox.parameters.maxTtl);
  }

  // -- pcap -----------------------------------------------------------------

  pcapDownload(): Locator {
    return this.page.getByTestId(SEL.sandbox.pcapDownload);
  }
  pcapDownloadBaseline(): Locator {
    return this.page.getByTestId(SEL.sandbox.pcapDownloadBaseline);
  }
  pcapDownloadWhatif(): Locator {
    return this.page.getByTestId(SEL.sandbox.pcapDownloadWhatif);
  }
  pcapDownloadCombined(): Locator {
    return this.page.getByTestId(SEL.sandbox.pcapDownloadCombined);
  }
  pcapBranchSelect(): Locator {
    return this.page.getByTestId(SEL.sandbox.pcapBranchSelect);
  }

  // -- export session / scenario -------------------------------------------

  async exportSession() {
    await this.page.getByTestId(SEL.sandbox.exportSession).click();
  }
  importSessionInput(): Locator {
    return this.page.getByTestId(SEL.sandbox.importSessionInput);
  }
  importSessionPreview(): Locator {
    return this.page.getByTestId(SEL.sandbox.importSessionPreview);
  }
  async applyImportedSession() {
    await this.page.getByTestId(SEL.sandbox.importSessionApply).click();
  }

  async openExportScenario() {
    await this.page.getByTestId(SEL.sandbox.exportScenarioOpen).click();
  }
  exportScenarioDialog(): Locator {
    return this.page.getByTestId(SEL.sandbox.exportScenarioDialog);
  }
  exportScenarioId(): Locator {
    return this.page.getByTestId(SEL.sandbox.exportScenarioId);
  }
  exportScenarioTitle(): Locator {
    return this.page.getByTestId(SEL.sandbox.exportScenarioTitle);
  }
  exportScenarioSummary(): Locator {
    return this.page.getByTestId(SEL.sandbox.exportScenarioSummary);
  }
  exportScenarioPreseed(): Locator {
    return this.page.getByTestId(SEL.sandbox.exportScenarioPreseed);
  }
  exportScenarioPreview(): Locator {
    return this.page.getByTestId(SEL.sandbox.exportScenarioPreview);
  }
  async downloadScenarioTypescript() {
    await this.page.getByTestId(SEL.sandbox.exportScenarioDownload).click();
  }

  // -- annotations ----------------------------------------------------------

  async showAnnotationsOnly() {
    await this.page.getByTestId(SEL.sandbox.annotationsFilter).check();
  }
  annotationListItem(): Locator {
    return this.page.getByTestId(SEL.sandbox.annotationListItem);
  }

  // -- fast mode toggle -----------------------------------------------------

  fastModeToggle(): Locator {
    return this.page.getByTestId(SEL.sandbox.fastModeToggle);
  }
  async enableFastMode() {
    await this.fastModeToggle().check();
  }

  // -- edit popover (anchored to a canvas node) ----------------------------

  /**
   * Right-click a device by its visible name and wait for the sandbox edit
   * popover. Anchored on the device's own test id, so it finds the device
   * whichever engine drew it.
   */
  async rightClickNodeByLabel(label: string) {
    await this.page
      .getByTestId(SEL.canvas.node)
      .filter({ hasText: label })
      .first()
      .click({ button: 'right', force: true });
    await expect(this.editPopover()).toBeVisible();
  }

  /**
   * Right-click a link on the canvas. A link is drawn by the graph engine, so
   * it is addressed through the engine's own shape rather than a test id of
   * ours — the one gesture with no product-side hook to aim at.
   */
  async rightClickLink() {
    await this.page.locator('.netlab-edge').first().click({ button: 'right', force: true });
    await expect(this.editPopover()).toBeVisible();
  }

  editPopover(): Locator {
    return this.page.getByTestId(SEL.sandbox.editPopover.root);
  }

  async applyMtuEdit(label: string, valueBytes: string) {
    await this.rightClickNodeByLabel(label);
    const popover = this.editPopover();
    await popover.getByTestId(SEL.sandbox.editPopover.mtuInput).fill(valueBytes);
    await popover.getByTestId(SEL.sandbox.editPopover.mtuApply).click();
  }

  popoverNatKind(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.natKind);
  }
  popoverNatTranslateTo(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.natTranslateTo);
  }
  async popoverNatAdd() {
    await this.editPopover().getByTestId(SEL.sandbox.editPopover.natAdd).click();
  }
  popoverNatEditorRemoveFirst(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.natEditorRemoveFirst);
  }

  popoverRouteNetwork(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.routeNetwork);
  }
  popoverRouteNextHop(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.routeNextHop);
  }
  popoverRouteInterface(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.routeInterface);
  }
  async popoverRouteAdd() {
    await this.editPopover().getByTestId(SEL.sandbox.editPopover.routeAdd).click();
  }

  popoverNodeNote(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.nodeNote);
  }
  async popoverApplyNote() {
    await this.editPopover().getByTestId(SEL.sandbox.editPopover.nodeNoteApply).click();
  }

  popoverLossPercent(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.lossPercent);
  }
  async popoverApplyLink() {
    await this.editPopover().getByTestId(SEL.sandbox.editPopover.linkApply).click();
  }

  popoverTcpSyn(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.tcpSynFlag);
  }
  popoverTcpRst(): Locator {
    return this.editPopover().getByTestId(SEL.sandbox.editPopover.tcpRstFlag);
  }
  async popoverApplyTcpFlags() {
    await this.editPopover().getByTestId(SEL.sandbox.editPopover.tcpFlagsApply).click();
  }
}
