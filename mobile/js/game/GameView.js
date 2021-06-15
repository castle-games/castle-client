import * as Sentry from '@sentry/react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useListen, useCoreEvents } from '../core/CoreEvents';
import CastleCoreView from '../core/CastleCoreView';

import { GameLoading } from './GameLoading';

const styles = StyleSheet.create({
  container: { flex: 1 },
});

const FORWARD_LUA_LOGS = false;

// Read dimensions settings into the `{ width, height, upscaling, downscaling }`
// format for the native view
const computeDimensionsSettings = ({ metadata }) => {
  const { dimensions, scaling, upscaling, downscaling } = metadata;

  let dimensionsSettings = {
    width: 800,
    height: 450,
    upscaling: 'on',
    downscaling: 'on',
  };
  if (dimensions) {
    if (dimensions === 'full') {
      dimensionsSettings.width = 0;
      dimensionsSettings.height = 0;
    } else {
      if (typeof dimensions === 'string') {
        const xIndex = dimensions.indexOf('x');
        if (xIndex > 1) {
          // WxH
          const [widthStr, heightStr] = dimensions.split('x');
          dimensionsSettings.width = parseInt(widthStr) || 800;
          dimensionsSettings.height = parseInt(heightStr) || 450;
        } else if (xIndex == 0) {
          // xH
          dimensionsSettings.width = 0;
          dimensionsSettings.height = parseInt(dimensions.slice(1));
        } else if (xIndex == -1) {
          // W
          dimensionsSettings.width = parseInt(dimensions);
          dimensionsSettings.height = 0;
        }
      } else if (typeof dimensions === 'number') {
        dimensionsSettings.width = dimensions;
        dimensionsSettings.height = 0;
      }
    }
  }
  if (scaling) {
    dimensionsSettings.upscaling = scaling;
    dimensionsSettings.downscaling = scaling;
  }
  if (upscaling) {
    dimensionsSettings.upscaling = upscaling;
  }
  if (downscaling) {
    dimensionsSettings.downscaling = downscaling;
  }

  // Mobile overrides...
  dimensionsSettings.upscaling = 'on';
  dimensionsSettings.downscaling = 'on';

  return dimensionsSettings;
};

export const GameView = ({
  deckId,
  extras,
  windowed,
  onPressReload,
  onPressBack,
  onMessage,
  onLoaded,
  paused,
  isEditable,
}) => {
  const dimensionsSettings = computeDimensionsSettings({
    metadata: {
      dimensions: 800,
    },
  });

  const { engineDidMount, engineDidUnmount } = useCoreEvents();

  useEffect(() => {
    const id = Math.floor(Math.random() * Math.floor(1000));
    engineDidMount(id);
    return () => engineDidUnmount(id);
  }, []);

  // TODO: migrate these events to core engine
  useListen({
    eventName: 'GHOST_MESSAGE',
    handler: (params) => {
      if (onMessage) {
        onMessage(params);
      }
    },
  });

  useListen({
    eventName: 'GHOST_BACK',
    handler: (params) => {
      if (onPressBack) {
        onPressBack();
      }
    },
  });

  useListen({
    eventName: 'GHOST_ERROR',
    handler: ({ error, stacktrace }) => {
      if (!__DEV__) {
        Sentry.captureMessage(`lua error: ${error}\n${stacktrace}`);
      }
    },
  });

  if (FORWARD_LUA_LOGS) {
    // This is a constant, so it's ok to wrap hooks in it
    useListen({
      eventName: 'GHOST_PRINT',
      handler: (args) => {
        console.log('LUA: ', args.join(' '));
      },
    });

    useListen({
      eventName: 'GHOST_ERROR',
      handler: ({ error, stacktrace }) => {
        console.log(`LUA ERROR: ${error}\n${stacktrace}`);
      },
    });
  }

  const [landscape, setLandscape] = useState(false);
  const setOrientation = React.useCallback(
    ({
      nativeEvent: {
        layout: { width, height },
      },
    }) => setLandscape(width > height),
    []
  );

  useListen({
    eventName: 'SCENE_LOADED',
    handler: onLoaded,
  });

  return (
    <View style={styles.container} onLayout={setOrientation}>
      <CastleCoreView
        deckId={deckId}
        style={styles.container}
        dimensionsSettings={dimensionsSettings}
        paused={paused}
        isEditable={isEditable}
      />
      {/* 
HACK: something in here must have an inherent size greater than 0x0 or the game will never load
on android. currently, this is <GameLoading />
TODO: show if loading (new engine)
        */}
      {false ? <GameLoading /> : null}
    </View>
  );
};
