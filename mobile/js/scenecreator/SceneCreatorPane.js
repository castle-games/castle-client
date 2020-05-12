import React from 'react';
import { View } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { useSafeArea } from 'react-native-safe-area-context';

import { CARD_HEADER_HEIGHT } from '../CardHeader';
import { ToolPane } from '../Tools';

import Viewport from '../viewport';

const SCREEN_HEIGHT = 100 * Viewport.vh;

export default SceneCreatorPane = React.memo(
  ({ element, visible, context, renderHeader, headerHeight }) => {
    const insets = useSafeArea();

    const renderContent = () => (
      <ToolPane element={element} context={context} style={{ margin: 16 }} />
    );

    const snapPoints = [
      (headerHeight ? headerHeight : 64) + insets.bottom,
      SCREEN_HEIGHT * 0.5,
      SCREEN_HEIGHT - CARD_HEADER_HEIGHT,
    ];

    return (
      <BottomSheet
        snapPoints={snapPoints}
        initialSnap={1}
        renderHeader={renderHeader}
        renderContent={renderContent}
        isOpen={visible}
        style={{ backgroundColor: '#fff', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
      />
    );
  }
);
