import React from 'react';
import {
  Keyboard,
  View,
  PixelRatio,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeArea, SafeAreaView } from 'react-native-safe-area-context';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as GhostUI from '../ghost/GhostUI';

import * as Constants from '../Constants';
import * as Utilities from '../common/utilities';

import Viewport from '../common/viewport';

import * as GhostEvents from '../ghost/GhostEvents';

import { CardScene } from '../game/CardScene';
import { CardSceneLoading } from './CardSceneLoading';
import { CardText } from '../components/CardText';
import { CreateCardContext } from './CreateCardContext';
import { CreateCardBottomActions, CARD_BOTTOM_MIN_HEIGHT } from './CreateCardBottomActions';
import { CreateCardHeader, CARD_HEADER_HEIGHT } from './CreateCardHeader';
import { DrawingCardHeader, DRAWING_CARD_HEADER_HEIGHT } from './drawing/DrawingCardHeader';
import {
  DrawingCardBottomActions,
  DRAWING_CARD_FOOTER_HEIGHT,
} from './drawing/DrawingCardBottomActions';
import { PopoverProvider } from './PopoverProvider';
import { SheetProvider } from './SheetProvider';
import { PlayDeckActions } from '../play/PlayDeckActions';

import {
  getInspectorBehaviors,
  getTextActorsData,
  getActiveTool,
  getInspectorTags,
  getInspectorActions,
} from './SceneCreatorUtilities';

const CARD_HEIGHT = (1 / Constants.CARD_RATIO) * 100 * Viewport.vw;

const MAX_AVAILABLE_CARD_HEIGHT = 100 * Viewport.vh - CARD_HEADER_HEIGHT - CARD_BOTTOM_MIN_HEIGHT;
const DRAWING_MAX_AVAILABLE_CARD_HEIGHT =
  100 * Viewport.vh - DRAWING_CARD_HEADER_HEIGHT - DRAWING_CARD_FOOTER_HEIGHT;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cardBody: {
    // contains just the card as a child
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: Constants.CARD_BORDER_RADIUS,
    aspectRatio: Constants.CARD_RATIO,
    width: '100%',
    overflow: 'hidden',
  },
  scene: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  textActorsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
});

// TODO: find a cleaner way to get these
const getLibraryEntries = (root) => {
  const element = root?.panes ? root.panes['sceneCreatorBlueprints'] : null;
  if (!element) return null;

  let blueprintsData;
  if (element.children.count) {
    Object.entries(element.children).forEach(([key, child]) => {
      if (child.type === 'data') {
        blueprintsData = child.props.data;
      }
    });
  }

  return blueprintsData?.library;
};

const getExpressions = (root) => {
  const element = root?.panes ? root.panes['sceneCreatorExpressions'] : null;
  if (!element) return null;

  let expressions;
  if (element.children.count) {
    expressions = element.children.data?.props?.data?.expressions;
  }
  return expressions;
};

export const CreateCardScreen = ({
  card,
  deck,
  loading,
  deckState,
  resetDeckState,
  goToDeck,
  goToCard,
  cardNeedsSave,
  saveAndGoToDeck,
  saveAndGoToCard,
  onVariablesChange,
  onSceneMessage,
  onSceneRevertData,
  saveAction = 'none',
}) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const { root, globalActions, sendGlobalAction, transformAssetUri } = GhostUI.useGhostUI();

  const [activeSheet, setActiveSheet] = React.useState(null);
  React.useEffect(Keyboard.dismiss, [activeSheet]);

  const [isShowingTextActors, setShowingTextActors] = React.useState(true);
  const [isShowingDraw, setIsShowingDraw] = React.useState(false);

  const isSceneLoaded = !!globalActions;
  const isPlaying = globalActions?.performing;
  const selectedActorId = globalActions?.selectedActorId;
  const hasSelection = selectedActorId !== undefined;
  const { behaviors, behaviorActions } = getInspectorBehaviors(root);
  const inspectorActions = getInspectorActions(root);
  const { activeToolData, activeToolAction } = getActiveTool(root);
  const { textActors, isTextActorSelected } = getTextActorsData(root, isPlaying);
  const { tagToActorIds } = getInspectorTags(behaviors?.Tags);

  // lua's behaviors can be "tools"
  React.useEffect(() => {
    if (globalActions?.activeToolBehaviorId) {
      const activeToolBehavior = globalActions.tools.find(
        (behavior) => behavior.behaviorId === globalActions.activeToolBehaviorId
      );
      // show/hide new draw tool
      if (activeToolBehavior && activeToolBehavior.name == 'Draw2') {
        setIsShowingDraw(true);
      } else {
        setIsShowingDraw(false);
      }
    }
  }, [globalActions?.activeToolBehaviorId]);

  React.useEffect(() => {
    if (hasSelection) {
      // when going from no selection to selection, close any other sheets
      setActiveSheet(null);
    }
  }, [hasSelection]);

  React.useEffect(resetDeckState, [isPlaying]);

  const selectActor = React.useCallback((actorId) => {
    GhostEvents.sendAsync('SELECT_ACTOR', {
      actorId,
    });
  }, []);

  const maybeSaveAndGoToDeck = React.useCallback(async () => {
    // don't prompt on back button unless the card has changes and
    // we're in the card creator
    if (cardNeedsSave() && saveAction === 'save') {
      showActionSheetWithOptions(
        {
          title: 'Save changes?',
          options: ['Save', 'Discard', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex == 0) {
            return saveAndGoToDeck();
          } else if (buttonIndex == 1) {
            return goToDeck();
          }
        }
      );
    } else {
      return goToDeck();
    }
  }, [cardNeedsSave, saveAndGoToDeck, goToDeck]);

  const maybeSaveAndGoToCard = React.useCallback(
    async (nextCard) => {
      if (!cardNeedsSave() || saveAction === 'none') {
        // no changes, or unable to save
        return goToCard(nextCard);
      } else {
        const title = Utilities.makeCardPreviewTitle(nextCard, deck);
        if (saveAction === 'save') {
          showActionSheetWithOptions(
            {
              title: `Save changes and go to '${title}'?`,
              options: ['Save and go', 'Cancel'],
              cancelButtonIndex: 1,
            },
            (buttonIndex) => {
              if (buttonIndex == 0) {
                return saveAndGoToCard(nextCard);
              }
            }
          );
        } else {
          // can't clone and go to card, so prompt to discard before leaving
          showActionSheetWithOptions(
            {
              title: `Discard changes and go to '${title}'?`,
              options: ['Discard and go', 'Cancel'],
              cancelButtonIndex: 1,
            },
            (buttonIndex) => {
              if (buttonIndex == 0) {
                return goToCard(nextCard);
              }
            }
          );
        }
      }
    },
    [cardNeedsSave, saveAndGoToCard, goToCard]
  );

  const onSelectBackupData = React.useCallback(
    (data) => {
      setActiveSheet(null);
      onSceneRevertData(data);
    },
    [onSceneRevertData, setActiveSheet]
  );

  GhostEvents.useListen({
    eventName: 'NAVIGATE_TO_CARD',
    handler: ({ card }) => maybeSaveAndGoToCard(card),
  });

  if (Constants.Android) {
    // after the game loads, it listens for keyboard events and
    // causes react native's back button event to fail
    GhostEvents.useListen({
      eventName: 'CASTLE_SYSTEM_BACK_BUTTON',
      handler: maybeSaveAndGoToDeck,
    });
  }

  const cardBackgroundStyles = {
    backgroundColor: card.backgroundImage ? '#000' : '#f2f2f2',
    justifyContent: isTextActorSelected ? 'flex-start' : 'flex-end',
  };

  let cardFitStyles = null;
  if (isShowingDraw) {
    if ((Viewport.vw * 100) / DRAWING_MAX_AVAILABLE_CARD_HEIGHT > 0.91) {
      cardFitStyles = {
        aspectRatio: 0.91,
        width: undefined,
        height: DRAWING_MAX_AVAILABLE_CARD_HEIGHT,
      };
    } else {
      cardFitStyles = { aspectRatio: 0.91, width: '100%' };
    }
  } else {
    if ((Viewport.vw * 100) / MAX_AVAILABLE_CARD_HEIGHT > Constants.CARD_RATIO) {
      cardFitStyles = { width: undefined, height: MAX_AVAILABLE_CARD_HEIGHT };
    }
  }

  const isCardTextVisible =
    (isShowingTextActors || isPlaying) &&
    !isShowingDraw &&
    textActors &&
    Object.keys(textActors).length;

  const contextValue = {
    deck,
    card,
    isPlaying,
    selectedActorId,
    hasSelection,
    isTextActorSelected,
    behaviors,
    behaviorActions,
    library: getLibraryEntries(root),
    expressions: getExpressions(root),
    transformAssetUri,
    onSelectBackupData,
    isShowingTextActors,
    setShowingTextActors,
    variables: card.variables,
    onVariablesChange,
    tagToActorIds,
    activeToolData,
    activeToolAction,
    saveAction,
    ...inspectorActions,
  };

  // SafeAreaView doesn't respond to statusbar being hidden right now
  // https://github.com/facebook/react-native/pull/20999
  return (
    <CreateCardContext.Provider value={contextValue}>
      <PopoverProvider>
        <SafeAreaView style={styles.container}>
          {isShowingDraw ? (
            <DrawingCardHeader onPressBack={() => sendGlobalAction('resetActiveTool')} />
          ) : (
            <CreateCardHeader
              card={card}
              isEditable
              mode={activeSheet}
              onChangeMode={setActiveSheet}
              onPressBack={maybeSaveAndGoToDeck}
            />
          )}
          <View style={styles.cardBody}>
            <View style={[styles.card, cardBackgroundStyles, cardFitStyles]}>
              <CardScene
                interactionEnabled={true}
                key={`card-scene-${card.scene && card.scene.sceneId}`}
                style={styles.scene}
                card={card}
                isEditing={true}
                isEditable={true}
                deckState={deckState}
                onMessage={onSceneMessage}
              />
              {isCardTextVisible ? (
                <View style={styles.textActorsContainer}>
                  <CardText
                    disabled={loading}
                    visible={isCardTextVisible}
                    textActors={textActors}
                    card={card}
                    onSelect={selectActor}
                    isEditable={!isPlaying}
                  />
                </View>
              ) : null}
              {isPlaying ? <PlayDeckActions deck={deck} disabled /> : null}
              {isSceneLoaded ? null : <CardSceneLoading />}
            </View>
            {isShowingDraw ? (
              <DrawingCardBottomActions />
            ) : (
              <CreateCardBottomActions
                card={card}
                onAdd={() => setActiveSheet('sceneCreatorBlueprints')}
                onOpenLayout={() => setActiveSheet('sceneCreatorSettings')}
                onSave={saveAndGoToDeck}
                isSceneLoaded={isSceneLoaded}
                isPlayingScene={isPlaying}
                creatorUsername={deck?.creator?.username}
                saveAction={saveAction}
              />
            )}
          </View>
        </SafeAreaView>
        <SheetProvider
          activeSheet={activeSheet}
          setActiveSheet={setActiveSheet}
          isShowingDraw={isShowingDraw}
        />
      </PopoverProvider>
    </CreateCardContext.Provider>
  );
};
