import React from 'react';
import { Keyboard, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { useSafeArea } from 'react-native-safe-area-context';
import { CARD_HEADER_HEIGHT } from '../CreateCardHeader';

import Viewport from '../../common/viewport';

import * as Constants from '../../Constants';

const SCREEN_HEIGHT = 100 * Viewport.vh;
const CARD_HEIGHT = (1 / Constants.CARD_RATIO) * 100 * Viewport.vw;

export const CardCreatorBottomSheet = React.memo(({ element, headerHeight = 64, ...props }) => {
  const insets = useSafeArea();

  const middleSnapPoint = element?.props?.contentHeight ?? SCREEN_HEIGHT * 0.4;
  const beltInset = props.snapBelowBelt
    ? 100 * Viewport.vw * (1 / Constants.CARD_WITH_BELT_RATIO - 1 / Constants.CARD_RATIO)
    : 0;

  const snapPoints = [
    // bottom snap is the bottom edge of the card,
    // unless that would be too small and then it's the header height of the panel
    Math.max(
      SCREEN_HEIGHT - (insets.top + CARD_HEADER_HEIGHT + CARD_HEIGHT),
      headerHeight + insets.bottom
    ),

    Math.max(
      middleSnapPoint,
      380 // middle snap should sit above the keyboard on small screens
    ),

    // top snap is flush with the bottom of the belt
    SCREEN_HEIGHT - (CARD_HEADER_HEIGHT + insets.top + beltInset),
  ];

  return (
    <BottomSheet
      snapPoints={snapPoints}
      initialSnap={1}
      headerHeight={headerHeight}
      onOpenEnd={Keyboard.dismiss}
      onCloseEnd={Keyboard.dismiss}
      style={{
        backgroundColor: '#fff',
        borderTopLeftRadius: Constants.CARD_BORDER_RADIUS,
        borderTopRightRadius: Constants.CARD_BORDER_RADIUS,
        ...Constants.styles.dropShadowUp,
      }}
      onSnap={props.onSnap}
      {...props}
    />
  );
});
