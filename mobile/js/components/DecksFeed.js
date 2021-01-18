import React from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  InteractionManager,
  StyleSheet,
  View,
} from 'react-native';
import { CardCell } from './CardCell';
import { PlayDeckActions, PlayDeckActionsSkeleton } from '../play/PlayDeckActions';
import { PlayDeckNavigator } from '../play/PlayDeckNavigator';
import { useIsFocused, useFocusEffect } from '../ReactNavigation';
import { useListen } from '../ghost/GhostEvents';

import tinycolor from 'tinycolor2';
import Viewport from '../common/viewport';

import * as Constants from '../Constants';
import * as Utilities from '../common/utilities';

const { vw, vh } = Viewport;

// Determines how much horizontal padding to add to each card to ensure proper spacing
//
// Design goal is for the selected card to be entirely visible as well as the top
// half of the next card's header. Rather than do a bunch of fancy math to figure
// out the appropriate amount of padding at each screen size I just looked at a few
// phones to figure out ratios that accomplish that:
//
// Phone: vw / vh = ratio | amount of padding needed
// iPhone SE: 3.75 / 6.67 = 0.56 | 20
// Pixel 3a: 3.6 / 6.92 = 0.52 | 0
// Pixel 4a: 3.93 / 7.85 = 0.50 | 0

const getItemHorzPadding = () => {
  const ratio = vw / vh;
  if (ratio >= 0.56) {
    return 20;
  } else if (ratio >= 0.54) {
    return 10;
  } else {
    return 0;
  }
};

const FEED_HEADER_HEIGHT = 56;
const DECK_FEED_ITEM_MARGIN = 24;
const DECK_FEED_ITEM_HEIGHT =
  (1 / Constants.CARD_RATIO) * (100 * vw - getItemHorzPadding() * 2) + // height of card
  DECK_FEED_ITEM_MARGIN; // margin below cell

const FEED_ITEM_TOP_Y = FEED_HEADER_HEIGHT + 24;

const SPRING_CONFIG = {
  tension: 100,
  friction: 50,
  overshootClamping: true,
  useNativeDriver: true,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderTopLeftRadius: Constants.CARD_BORDER_RADIUS,
    borderTopRightRadius: Constants.CARD_BORDER_RADIUS,
  },
  itemContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: DECK_FEED_ITEM_MARGIN,
  },
  itemCard: {
    aspectRatio: Constants.CARD_RATIO,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCardSkeleton: {
    backgroundColor: '#262626',
    borderRadius: Constants.CARD_BORDER_RADIUS,
  },
  itemHeader: {
    position: 'absolute',
    width: '100%',
    height: 52,
    top: 0,
  },
  itemHeaderSkeleton: {
    backgroundColor: '#3C3C3C',
    borderTopLeftRadius: Constants.CARD_BORDER_RADIUS,
    borderTopRightRadius: Constants.CARD_BORDER_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  absoluteFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});

const makeCardAspectFitStyles = () => {
  if (Viewport.useSmallFeedItem) {
    return styles.itemContainer;
  }
  return [
    styles.itemContainer,
    {
      paddingHorizontal: getItemHorzPadding(),
    },
  ];
};

const cardAspectFitStyles = makeCardAspectFitStyles();

const makeBackgroundColor = (card) => {
  let baseColor, backgroundColor;
  if (card?.backgroundColor) {
    baseColor = card.backgroundColor;
  } else if (card?.backgroundImage?.primaryColor) {
    baseColor = card.backgroundImage.primaryColor;
  } else {
    baseColor = '#333';
  }
  let base = tinycolor(baseColor);

  // Using a brightness check rather than isDark/isLight because we mostly want to darken
  // the color to contrast with the white text only in cases where the card background
  // is very dark do we want to lighten.
  let brightness = base.getBrightness();
  if (brightness < 60) {
    backgroundColor = base.lighten(15).toString();
  } else {
    backgroundColor = base.darken(15).toString();
  }
  return backgroundColor;
};

// renders the current focused deck in the feed
const CurrentDeckCell = ({
  deck,
  isPlaying,
  onPressDeck,
  playingTransition,
  previewVideoPaused,
}) => {
  const initialCard = deck?.initialCard;
  const [ready, setReady] = React.useState(false);
  const isFocused = useIsFocused();

  React.useEffect(() => {
    let timeout;
    const task = InteractionManager.runAfterInteractions(() => {
      if (deck && isPlaying && isFocused) {
        timeout = setTimeout(() => {
          setReady(true);
        }, 10);
      } else {
        setReady(false);
      }
    });
    return () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      setReady(false);
      task.cancel();
    };
  }, [deck, isPlaying, isFocused]);

  const onSelectPlay = () => onPressDeck({ deckId: deck.deckId });
  const onPressBack = React.useCallback(() => onPressDeck({ deckId: undefined }), [onPressDeck]);
  const backgroundColor = makeBackgroundColor(initialCard);

  if (Constants.Android) {
    const onHardwareBackPress = React.useCallback(() => {
      if (isPlaying) {
        onPressBack();
        return true;
      }
      return false;
    }, [isPlaying, onPressBack]);

    // with no game loaded, use standard back handler
    useFocusEffect(
      React.useCallback(() => {
        BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);

        return () => BackHandler.removeEventListener('hardwareBackPress', onHardwareBackPress);
      }, [onHardwareBackPress])
    );

    // after the game loads, it listens for keyboard events and
    // causes react native's back button event to fail
    useListen({
      eventName: 'CASTLE_SYSTEM_BACK_BUTTON',
      handler: onHardwareBackPress,
    });
  }

  // when playing, move the header and footer to the screen edges
  const playingHeaderY = playingTransition.interpolate({
    inputRange: [0, 1.01],
    outputRange: [0, -FEED_ITEM_TOP_Y],
  });

  if (!initialCard) return null;

  return (
    <View
      style={[
        cardAspectFitStyles,
        {
          overflow: 'visible',
          paddingHorizontal: isPlaying ? 0 : getItemHorzPadding(),
        },
      ]}>
      <View style={styles.itemCard}>
        <CardCell
          card={initialCard}
          previewVideo={!ready && deck?.previewVideo && isFocused ? deck.previewVideo : undefined}
          onPress={onSelectPlay}
          previewVideoPaused={previewVideoPaused}
        />
        {ready ? (
          <View style={styles.absoluteFill}>
            <PlayDeckNavigator
              deckId={deck.deckId}
              initialCardId={deck.initialCard && deck.initialCard.cardId}
              initialDeckState={Utilities.makeInitialDeckState(deck)}
            />
          </View>
        ) : null}
      </View>
      <Animated.View style={[styles.itemHeader, { transform: [{ translateY: playingHeaderY }] }]}>
        <PlayDeckActions
          deck={deck}
          isPlaying={isPlaying}
          onPressBack={onPressBack}
          backgroundColor={makeBackgroundColor(deck.initialCard)}
          additionalPadding={getItemHorzPadding()}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonFeed = () => {
  return (
    <View
      style={{
        height: '100%',
        width: '100%',
        paddingTop: FEED_ITEM_TOP_Y,
      }}>
      <View style={cardAspectFitStyles}>
        <View style={[styles.itemCard, styles.itemCardSkeleton]}>
          <View style={[styles.itemHeader, styles.itemHeaderSkeleton]}>
            <PlayDeckActionsSkeleton />
          </View>
        </View>
      </View>
      <View style={cardAspectFitStyles}>
        <View style={[styles.itemCard, styles.itemCardSkeleton]}>
          <View style={[styles.itemHeader, styles.itemHeaderSkeleton]}>
            <PlayDeckActionsSkeleton />
          </View>
        </View>
      </View>
    </View>
  );
};

// TODO: BEN: taken from PlayDeckScreen
/*
      
  // reset index into decks if decks changes
  React.useEffect(() => setDeckIndex(Math.min(initialDeckIndex, decks.length - 1)), [
    decks?.length,
    initialDeckIndex,
  ]);

*/

// NOTE: onRefresh is currently ignored on Android (see further note below)
// otherwise, FlatList props work here.
export const DecksFeed = ({ decks, isPlaying, onPressDeck, ...props }) => {
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // state from expanding/collapsing a deck to play it
  // note: non-native duplicate is needed for just the background color fade (not supported by native)
  const startingPosition = isPlaying === true ? 1.01 : 0;
  const playingTransition = React.useRef(new Animated.Value(startingPosition)).current;
  const playingTransitionNonNative = React.useRef(new Animated.Value(0)).current;
  const playingOffsetPrevY = playingTransition.interpolate({
    inputRange: [0, 1.01],
    outputRange: [0, -150],
  });
  const playingOffsetNextY = playingTransition.interpolate({
    inputRange: [0, 1.01],
    outputRange: [0, 300],
  });
  const backgroundColor = makeBackgroundColor(decks ? decks[currentCardIndex]?.initialCard : null);
  const playingBackgroundColor = playingTransitionNonNative.interpolate({
    inputRange: [0, 0.6, 1.01],
    outputRange: [
      'rgba(0, 0, 0, 1)',
      tinycolor(backgroundColor).toRgbString(),
      tinycolor(backgroundColor).toRgbString(),
    ],
  });

  React.useEffect(() => {
    Animated.spring(playingTransition, { toValue: isPlaying ? 1.01 : 0, ...SPRING_CONFIG }).start();
    Animated.spring(playingTransitionNonNative, {
      toValue: isPlaying ? 1.01 : 0,
      ...SPRING_CONFIG,
      useNativeDriver: false,
    }).start();
  }, [isPlaying]);

  const renderItem = React.useCallback(
    ({ item, index }) => {
      const deck = item;
      if (index === currentCardIndex) {
        return (
          <CurrentDeckCell
            deck={deck}
            isPlaying={isPlaying}
            onPressDeck={onPressDeck}
            playingTransition={playingTransition}
            previewVideoPaused={paused}
          />
        );
      } else {
        let translateStyles;
        if (index === currentCardIndex - 1) {
          translateStyles = { transform: [{ translateY: playingOffsetPrevY }] };
        } else if (index === currentCardIndex + 1) {
          translateStyles = { transform: [{ translateY: playingOffsetNextY }] };
        }
        return (
          <Animated.View style={[cardAspectFitStyles, translateStyles]}>
            <View style={styles.itemCard}>
              {deck ? (
                <CardCell
                  card={deck.initialCard}
                  previewVideo={deck?.previewVideo}
                  previewVideoPaused
                />
              ) : null}
            </View>
            {deck ? (
              <View style={styles.itemHeader}>
                <PlayDeckActions
                  deck={deck}
                  disabled={true}
                  backgroundColor={makeBackgroundColor(deck.initialCard)}
                  additionalPadding={getItemHorzPadding()}
                />
              </View>
            ) : null}
          </Animated.View>
        );
      }
    },
    [currentCardIndex, isPlaying, paused]
  );

  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 90 }).current;
  const onViewableItemsChanged = React.useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentCardIndex(viewableItems[0].index);
    }
  }, []);

  const getItemLayout = React.useCallback(
    (data, index) => ({
      length: DECK_FEED_ITEM_HEIGHT,
      offset: DECK_FEED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const onScrollBeginDrag = React.useCallback(() => setPaused(true), []);
  const onScrollEndDrag = React.useCallback(() => setPaused(false), []);

  // android: refresh control will still intercept pan events on the game
  // even when scrollEnabled is false. further, dynamically changing the value of onRefresh
  // on android messes up the scrollview rendering. so, just disable it
  const onRefresh = Constants.Android ? undefined : props.onRefresh;

  return (
    <>
      {!decks && <SkeletonFeed />}
      <Animated.View style={[styles.container, { backgroundColor: playingBackgroundColor }]}>
        <FlatList
          {...props}
          data={decks}
          contentContainerStyle={{ paddingTop: FEED_ITEM_TOP_Y }}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          keyExtractor={(item, index) => item?.deckId}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isPlaying}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          snapToAlignment="start"
          snapToInterval={DECK_FEED_ITEM_HEIGHT}
          decelerationRate="fast"
          pagingEnabled
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          initialNumToRender={3}
          windowSize={5}
          maxToRenderPerBatch={3}
          onRefresh={onRefresh}
        />
      </Animated.View>
    </>
  );
};
