import React from 'react';
import gql from 'graphql-tag';
import { View, StyleSheet, Text } from 'react-native';
import { CardsSet } from '../components/CardsSet';
import { ConfigureDeck } from './ConfigureDeck';
import { DeckHeader } from './DeckHeader';
import { DeckVisibilitySheet } from './DeckVisibilitySheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SheetBackgroundOverlay } from '../components/SheetBackgroundOverlay';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { useNavigation, useFocusEffect } from '../ReactNavigation';
import { useActionSheet } from '@expo/react-native-action-sheet';

import * as LocalId from '../common/local-id';
import * as Session from '../Session';
import * as Utilities from '../common/utilities';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

const DECK_FRAGMENT = `
  id
  deckId
  title
  visibility
  accessPermissions
  parentDeckId
  parentDeck {
    creator { username }
    initialCard {
      backgroundImage { url }
    }
  }
  previewVideo { url }
  cards {
    id
    cardId
    title
    lastModified
    backgroundImage {
      url
      smallUrl
      privateCardUrl
      primaryColor
    }
    scene {
      data
      sceneId
    }
  }
  initialCard {
    id
    cardId
  }
`;

export const CreateDeckScreen = (props) => {
  let lastFocusedTime;
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();
  const deckId = props.route.params.deckIdToEdit;
  const [mode, setMode] = React.useState('cards');
  const [deck, setDeck] = React.useState(null);
  const [visibilitySheetVisible, setVisibilitySheetVisible] = React.useState(false);

  const openVisibilitySheet = React.useCallback(() => setVisibilitySheetVisible(true), []);
  const closeVisibilitySheet = React.useCallback(() => setVisibilitySheetVisible(false), []);

  if (!deckId || LocalId.isLocalId(deckId)) {
    throw new Error(`CreateDeckScreen requires an existing deck id`);
  }

  const [saveDeck] = useMutation(
    gql`
      mutation UpdateDeck($deck: DeckInput!) {
        updateDeckV2(deck: $deck) {
          ${DECK_FRAGMENT}
        }
      }
    `
  );

  const [deleteDeck] = useMutation(
    gql`
      mutation DeleteDeck($deckId: ID!) {
        deleteDeck(deckId: $deckId)
      }
    `
  );

  const [deleteCard] = useMutation(
    gql`
      mutation DeleteCard($cardId: ID!) {
        deleteCard(cardId: $cardId)
      }
    `
  );

  const [duplicateCard] = useMutation(
    gql`
      mutation DuplicateCard($cardId: ID!) {
        duplicateCard(cardId: $cardId) {
          ${Session.CARD_FRAGMENT}
        }
      }`
  );

  const loadDeck = useQuery(
    gql`
      query Deck($deckId: ID!) {
        deck(deckId: $deckId) {
          ${DECK_FRAGMENT}
        }
      }
    `,
    { variables: { deckId }, fetchPolicy: 'no-cache' }
  );

  const _maybeSaveDeck = async () => {
    if (deck && deck.isChanged) {
      const deckUpdateFragment = {
        deckId,
        title: deck.title,
        visibility: deck.visibility,
        accessPermissions: deck.accessPermissions,
      };
      saveDeck({ variables: { deck: deckUpdateFragment } });
      setDeck({ ...deck, isChanged: false });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (lastFocusedTime) {
        loadDeck.refetch();
      }
      lastFocusedTime = Date.now();
      return () => _maybeSaveDeck(); // save on blur
    }, [deck])
  );

  const _goBack = async () => {
    await _maybeSaveDeck();
    navigation.goBack();
  };

  const _deleteDeck = async () => {
    await deleteDeck({ variables: { deckId } });
    _goBack();
  };

  if (!loadDeck.loading && !loadDeck.error && loadDeck.data && deck === null) {
    setDeck(loadDeck.data.deck);
  }

  const _changeDeck = (changes) => {
    setDeck({
      ...deck,
      ...changes,
      isChanged: true,
    });
  };

  const maybeDeleteCard = React.useCallback(
    (cardId) => {
      showActionSheetWithOptions(
        {
          title: 'Delete card?',
          options: ['Delete Card', 'Cancel'],
          destructiveButtonIndex: 0,
        },
        (index) => {
          if (index === 0) {
            const newCards = deck.cards.filter((c) => c.cardId !== cardId);
            deleteCard({ variables: { cardId } });
            setDeck({
              ...deck,
              cards: newCards,
            });
          }
        }
      );
    },
    [deleteCard, deck?.cards, setDeck, showActionSheetWithOptions]
  );

  const _showCardOptions = (card) => {
    let destructiveButtonIndex = undefined;
    let actions = [
      {
        name: 'Use as Top Card',
        action: async () => {
          const { deck: updatedDeck } = await Session.saveDeck(
            { ...card, makeInitialCard: true },
            { ...deck, initialCard: { cardId: card.cardId, id: card.id } }
          );
          setDeck(updatedDeck);
        },
      },
      {
        name: 'Duplicate Card',
        action: async () => {
          const newCard = await duplicateCard({ variables: { cardId: card.cardId } });
          setDeck({
            ...deck,
            cards: deck.cards.concat([newCard.data.duplicateCard]),
          });
        },
      },
    ];

    if (card.cardId !== deck.initialCard.cardId) {
      actions.push({
        name: 'Delete Card',
        action: () => maybeDeleteCard(card.cardId),
      });
      destructiveButtonIndex = actions.length - 1;
    }

    actions.push({
      name: 'Cancel',
      action: () => {},
    });

    showActionSheetWithOptions(
      {
        title: Utilities.makeCardPreviewTitle(card),
        options: actions.map((action) => action.name),
        destructiveButtonIndex,
        cancelButtonIndex: actions.length - 1,
      },
      async (buttonIndex) => {
        actions[buttonIndex].action();
      }
    );
  };

  const _navigateToCreateCard = React.useCallback(
    (card) => {
      if (deck?.deckId) {
        navigation.navigate('CreateDeck', {
          deckIdToEdit: deck.deckId,
          cardIdToEdit: card.cardId,
        });
      }
    },
    [deck]
  );

  const onChangeVisibility = React.useCallback(
    async (visibility) => {
      const deckUpdateFragment = {
        deckId,
        visibility,
      };
      saveDeck({ variables: { deck: deckUpdateFragment } });
      setDeck({ ...deck, visibility });
    },
    [setDeck, saveDeck, deck]
  );

  const onChangeAccessPermissions = React.useCallback(
    async (accessPermissions) => {
      const deckUpdateFragment = { deckId, accessPermissions };
      saveDeck({ variables: { deck: deckUpdateFragment } });
      setDeck({ ...deck, accessPermissions });
    },
    [setDeck, saveDeck, deck]
  );

  return (
    <React.Fragment>
      <SafeAreaView style={styles.container}>
        <DeckHeader
          deck={deck}
          onPressBack={_goBack}
          mode={mode}
          onPressVisible={openVisibilitySheet}
          onChangeMode={(mode) => {
            _maybeSaveDeck();
            return setMode(mode);
          }}
        />
        {mode === 'cards' ? (
          <CardsSet
            showNewCard
            deck={deck}
            onShowCardOptions={_showCardOptions}
            onPress={_navigateToCreateCard}
          />
        ) : (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <ConfigureDeck
              deck={deck}
              onChange={_changeDeck}
              onDeleteDeck={_deleteDeck}
              onChangeAccessPermissions={onChangeAccessPermissions}
            />
          </View>
        )}
      </SafeAreaView>
      {visibilitySheetVisible ? <SheetBackgroundOverlay onPress={closeVisibilitySheet} /> : null}
      <DeckVisibilitySheet
        isOpen={visibilitySheetVisible}
        onClose={closeVisibilitySheet}
        deck={deck}
        onChangeVisibility={onChangeVisibility}
      />
    </React.Fragment>
  );
};
