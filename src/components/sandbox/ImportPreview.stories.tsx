import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DecodedExportedSession } from '../../sandbox/session-io/schema';
import { NETLAB_TOOL_VERSION, SESSION_SCHEMA_VERSION } from '../../sandbox/session-io/schema';
import { EditSession } from '../../sandbox/EditSession';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { EDITS } from '../../testing/fixtures/sandbox';
import { ImportPreview } from './ImportPreview';

const session = EditSession.empty().push(EDITS.mtu).push(EDITS.param).push(EDITS.traffic);

const decoded: DecodedExportedSession = {
  exported: {
    schemaVersion: SESSION_SCHEMA_VERSION,
    scenarioId: 'fragmented-echo',
    initialScenarioId: 'fragmented-echo',
    initialParameters: DEFAULT_PARAMETERS,
    backing: session.backing,
    head: session.head,
    orphanedSnapshots: [],
    savedAt: '2026-04-21T09:00:00.000Z',
    toolVersion: NETLAB_TOOL_VERSION,
  },
  session,
};

const meta: Meta<typeof ImportPreview> = {
  title: 'Sandbox/ImportPreview',
  component: ImportPreview,
  args: {
    decoded,
    onApply: () => {},
    onCancel: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof ImportPreview>;

export const ThreeEdits: Story = {};

export const SingleEdit: Story = {
  args: {
    decoded: {
      ...decoded,
      session: EditSession.empty().push(EDITS.mtu),
    },
  },
};
