import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetlabUIContext } from '../components/NetlabUIContext';
import { AreaBackground } from './AreaBackground';

interface AreaBackgroundStoryProps {
  highlighted: boolean;
}

function AreaBackgroundStory({ highlighted }: AreaBackgroundStoryProps) {
  return (
    <NetlabUIContext.Provider
      value={{
        selectedNodeId: null,
        setSelectedNodeId: () => {},
        highlightedAreaId: highlighted ? 'area-private' : null,
        setHighlightedAreaId: () => {},
      }}
    >
      <AreaBackground
        data={{
          areaId: 'area-private',
          name: 'Private LAN',
          type: 'private',
          width: 360,
          height: 180,
        }}
        id="__area__area-private"
        type="netlab-area"
        selected={false}
      />
    </NetlabUIContext.Provider>
  );
}

const meta: Meta<typeof AreaBackgroundStory> = {
  title: 'Areas/AreaBackground',
  component: AreaBackgroundStory,
  args: {
    highlighted: true,
  },
};

export default meta;

type Story = StoryObj<typeof AreaBackgroundStory>;

export const Highlighted: Story = {};

export const Resting: Story = {
  args: {
    highlighted: false,
  },
};
