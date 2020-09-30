import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import debounce from 'lodash.debounce';
import FastImage from 'react-native-fast-image';
import gql from 'graphql-tag';

import { Platform } from 'react-native';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { onError } from 'apollo-link-error';
import { ApolloLink, Observable } from 'apollo-link';
import { createUploadLink, ReactNativeFile } from 'apollo-upload-client';

import * as Amplitude from 'expo-analytics-amplitude';
import * as Constants from './Constants';
import * as GhostPushNotifications from './ghost/GhostPushNotifications';
import * as LocalId from './common/local-id';
import * as GhostChannels from './ghost/GhostChannels';

let gAuthToken, gUserId;
const TEST_AUTH_TOKEN = null;

const EMPTY_SESSION = {
  authToken: null,
  notifications: null,
};

const SessionContext = React.createContext(EMPTY_SESSION);

let CastleAsyncStorage =
  Platform.OS === 'ios'
    ? AsyncStorage
    : {
        getItem: GhostChannels.getCastleAsyncStorage,
        setItem: GhostChannels.setCastleAsyncStorage,
        removeItem: GhostChannels.removeCastleAsyncStorage,
      };

GhostPushNotifications.addTokenListener(async (token) => {
  if (!gAuthToken) {
    return;
  }

  let platform = await GhostPushNotifications.getPlatformAsync();

  await apolloClient.mutate({
    mutation: gql`
      mutation UpdatePushToken($token: String!, $platform: String!) {
        updatePushToken(token: $token, platform: $platform)
      }
    `,
    variables: { token, platform },
  });
});

export const Provider = (props) => {
  const [state, setState] = useState({ authToken: null, userId: null, initialized: false });

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!state.initialized) {
        if (TEST_AUTH_TOKEN) {
          gAuthToken = TEST_AUTH_TOKEN;
        } else {
          gAuthToken = await CastleAsyncStorage.getItem('AUTH_TOKEN');
          gUserId = await CastleAsyncStorage.getItem('USER_ID');
          Amplitude.setUserId(gUserId);
        }

        if (mounted) {
          setState({
            ...state,
            authToken: gAuthToken,
            userId: gUserId,
            initialized: true,
          });
        }
      }
    })();

    return () => (mounted = false);
  }, []);

  const useNewAuthTokenAsync = React.useCallback(
    async ({ userId, token }) => {
      if (!TEST_AUTH_TOKEN) {
        apolloClient.resetStore();
        gAuthToken = token;
        gUserId = userId;

        if (token) {
          await CastleAsyncStorage.setItem('AUTH_TOKEN', token);
          await CastleAsyncStorage.setItem('USER_ID', userId);

          await GhostPushNotifications.requestTokenAsync();
          Amplitude.setUserId(gUserId);
        } else {
          await CastleAsyncStorage.removeItem('AUTH_TOKEN');
          await CastleAsyncStorage.removeItem('USER_ID');
          Amplitude.setUserId(null);
          Amplitude.clearUserProperties();
        }
      }

      return setState({
        ...state,
        authToken: gAuthToken,
        userId: gUserId,
      });
    },
    [state]
  );

  const signInAsync = React.useCallback(
    async ({ username, password }) => {
      const userId = await userIdForUsernameAsync(username);
      const result = await apolloClient.mutate({
        mutation: gql`
          mutation SignIn($userId: ID!, $password: String!) {
            login(userId: $userId, password: $password) {
              userId
              token
              photo {
                url
              }
            }
          }
        `,
        variables: { userId, password },
      });
      if (result && result.data && result.data.login && result.data.login.userId) {
        if (Platform.OS == 'android') {
          try {
            GhostChannels.saveSmartLockCredentials(username, password, result.data.login.photo.url);
          } catch (e) {}
        }

        await useNewAuthTokenAsync(result.data.login);
      }
    },
    [useNewAuthTokenAsync]
  );

  const signOutAsync = React.useCallback(async () => {
    await apolloClient.mutate({
      mutation: gql`
        mutation SignOut {
          logout
        }
      `,
    });
    await useNewAuthTokenAsync({});
  }, [useNewAuthTokenAsync]);

  const signUpAsync = React.useCallback(
    async ({ username, name, email, password }) => {
      const result = await apolloClient.mutate({
        mutation: gql`
          mutation SignUp($name: String!, $username: String!, $email: String!, $password: String!) {
            signup(user: { name: $name, username: $username }, email: $email, password: $password) {
              userId
              token
              photo {
                url
              }
            }
          }
        `,
        variables: { username, name, email, password },
      });
      if (result && result.data && result.data.signup && result.data.signup.userId) {
        if (Platform.OS == 'android') {
          try {
            GhostChannels.saveSmartLockCredentials(
              username,
              password,
              result.data.signup.photo.url
            );
          } catch (e) {}
        }

        await useNewAuthTokenAsync(result.data.signup);
      }
    },
    [useNewAuthTokenAsync]
  );

  const fetchNotificationsAsync = React.useCallback(async () => {
    if (!state.authToken) {
      return false;
    }
    const result = await apolloClient.query({
      query: gql`
      query {
        notifications(limit: 64) {
          notificationId
          type
          status
          body
          userIds
          users {
            userId
            username
            photo {
              url
            }
          }
          deckId
          deck {
            ${Constants.FEED_ITEM_DECK_FRAGMENT}
          }
          updatedTime
        }
      }
    `,
      fetchPolicy: 'no-cache',
    });
    const notifications = result?.data?.notifications ?? null;
    return setState({
      ...state,
      notifications,
    });
  }, [state]);

  const markNotificationsReadAsync = React.useCallback(
    debounce(async ({ notificationIds }) => {
      const result = await apolloClient.mutate({
        mutation: gql`
          mutation SetNotificationsStatus($notificationIds: [ID]!, $status: NotificationStatus!) {
            setNotificationsStatus(notificationIds: $notificationIds, status: $status)
          }
        `,
        variables: {
          notificationIds,
          status: 'seen',
        },
      });
      return setState({
        ...state,
        notifications: state.notifications.map((n) => {
          if (notificationIds.includes(n.notificationId)) {
            return {
              ...n,
              status: 'seen',
            };
          }
          return n;
        }),
      });
    }, 100),
    [state]
  );

  const notificationsBadgeCount = state.notifications
    ? state.notifications.reduce((accum, n) => accum + (n.status === 'unseen'), 0)
    : null;

  const value = {
    ...state,
    userId: state.userId,
    isSignedIn: !!state.authToken,
    signInAsync,
    signOutAsync,
    signUpAsync,
    fetchNotificationsAsync,
    markNotificationsReadAsync,
    notificationsBadgeCount,
  };
  return <SessionContext.Provider value={value}>{props.children}</SessionContext.Provider>;
};

export const useSession = () => React.useContext(SessionContext);

// for checking auth state outside of react component tree
export const isSignedIn = () => gAuthToken !== null;

// Based on https://www.apollographql.com/docs/react/migrating/boost-migration/
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) =>
          console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
        );
      }
      if (networkError) {
        console.log(`[Network error]: ${networkError}`);
      }
    }),
    new ApolloLink(
      (operation, forward) =>
        new Observable((observer) => {
          let handle;
          Promise.resolve(operation)
            .then((operation) => {
              const headers = {};
              headers['X-Platform'] = 'mobile';
              if (gAuthToken) {
                headers['X-Auth-Token'] = gAuthToken;
              }
              operation.setContext({ headers });
            })
            .then(() => {
              handle = forward(operation).subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: observer.complete.bind(observer),
              });
            })
            .catch(observer.error.bind(observer));
          return () => {
            if (handle) handle.unsubscribe();
          };
        })
    ),
    createUploadLink({
      uri: 'https://api.castle.xyz/graphql',
    }),
  ]),
  cache: new InMemoryCache({
    cacheRedirects: {
      Query: {
        card: (_, args, { getCacheKey }) => getCacheKey({ __typename: 'Card', id: args.cardId }),
      },
    },
  }),
});

const userIdForUsernameAsync = async (username) => {
  const {
    data: {
      userForLoginInput: { userId },
    },
  } = await apolloClient.query({
    query: gql`
      query GetUserId($username: String!) {
        userForLoginInput(who: $username) {
          userId
        }
      }
    `,
    variables: { username },
  });
  return userId;
};

export const resetPasswordAsync = async ({ username }) => {
  const userId = await userIdForUsernameAsync(username);
  const result = await apolloClient.mutate({
    mutation: gql`
      mutation ResetPassword($userId: ID!) {
        sendResetPasswordEmail(userId: $userId)
      }
    `,
    variables: { userId },
  });
  return result;
};

export const CARD_FRAGMENT = `
  id
  cardId
  title
  lastModified
  backgroundImage {
    fileId
    url
  }
  scene {
    data
    sceneId
  }
`;

const DECK_FRAGMENT = `
  id
  deckId
  title
  initialCard {
    id
    cardId
  }
  creator {
    userId
    username
    photo {
      url
    }
  }
  variables
`;

export const prefetchCardsAsync = async ({ cardId }) => {
  const {
    data: { prefetchCards },
  } = await apolloClient.query({
    query: gql`
      query PrefetchCards($cardId: ID!) {
        prefetchCards(cardId: $cardId) {
          ${CARD_FRAGMENT}
        }
      }
    `,
    variables: { cardId },
  });

  prefetchCards.forEach((card) => {
    if (card.backgroundImage && card.backgroundImage.url) {
      FastImage.preload([{ uri: card.backgroundImage.url }]);
    }
  });
};

async function createNewDestinationCards(deckId, sceneData) {
  // if any 'send player to card' rule has a LocalId destination, save a blank card there
  let actors, data;
  try {
    if (deckId && sceneData) {
      data = JSON.parse(sceneData);
      actors = data.snapshot?.actors;
    }
  } catch (_) {}

  let cardsCreated = [];
  if (actors) {
    for (let ii = 0; ii < actors.length; ii++) {
      const actor = actors[ii];
      const components = actor?.bp?.components;
      if (components && components.Text && components.Rules && components.Rules.rules) {
        for (let jj = 0; jj < components.Rules.rules.length; jj++) {
          const rule = components.Rules.rules[jj];
          if (rule.trigger?.name === 'tap') {
            let response = rule.response;
            while (response && response.params) {
              if (response.name === 'send player to card') {
                const cardId = response.params.card?.cardId;
                if (cardId && LocalId.isLocalId(cardId)) {
                  const result = await apolloClient.mutate({
                    mutation: gql`
                      mutation UpdateDeckAndCard($deck: DeckInput!, $card: CardInput!) {
                        updateCardAndDeckV2(
                          deck: $deck,
                          card: $card,
                        ) {
                          card {
                            ${CARD_FRAGMENT}
                          }
                        }
                      }
                    `,
                    variables: {
                      deck: { deckId },
                      card: { cardId: cardId, blocks: [] },
                    },
                  });
                  const cardCreated = result.data.updateCardAndDeckV2.card;
                  cardsCreated.push(cardCreated);
                  LocalId.setIdIsSaved(cardId);
                }
              }
              response = response.params.nextResponse;
            }
          }
        }
      }
    }
  }
  return cardsCreated;
}

export const saveDeck = async (card, deck, variables, isAutosave = false) => {
  const deckUpdateFragment = {
    deckId: deck.deckId,
    title: deck.title,
  };
  const cardUpdateFragment = {
    cardId: card.cardId,
    title: card.title,
    backgroundImageFileId: card.backgroundImage ? card.backgroundImage.fileId : undefined,
    sceneData: card.changedSceneData ? card.changedSceneData : card.scene.data,
    blocks: card.blocks
      ? card.blocks.map((block) => {
          return {
            type: block.type,
            destinationCardId: block.destinationCardId,
            title: block.title,
            metadata: block.metadata,
          };
        })
      : [],
    makeInitialCard: card.makeInitialCard || undefined,
  };
  if (variables) {
    deckUpdateFragment.variables = variables;
  }

  const result = await apolloClient.mutate({
    mutation: gql`
        mutation UpdateDeckAndCard($deck: DeckInput!, $card: CardInput!, $isAutosave: Boolean) {
          updateCardAndDeckV2(
            deck: $deck,
            card: $card,
            isAutosave: $isAutosave,
          ) {
            deck {
              ${DECK_FRAGMENT}
            }
            card {
              ${CARD_FRAGMENT}
            }
          }
        }
      `,
    variables: { deck: deckUpdateFragment, card: cardUpdateFragment, isAutosave },
  });

  let updatedCard = result.data.updateCardAndDeckV2.card;
  let newCards = [...deck.cards];

  let existingIndex = deck.cards.findIndex((old) => old.cardId === updatedCard.cardId);
  if (existingIndex >= 0) {
    newCards[existingIndex] = updatedCard;
  } else {
    newCards.push(updatedCard);
  }

  // mark any local ids as nonlocal
  if (LocalId.isLocalId(card.cardId)) {
    LocalId.setIdIsSaved(card.cardId);
  }
  if (LocalId.isLocalId(deck.deckId)) {
    LocalId.setIdIsSaved(deck.deckId);
  }

  // create any destination cards marked as 'new' which are referenced by this card
  const cardsCreated = await createNewDestinationCards(deck.deckId, card.changedSceneData);
  if (cardsCreated) {
    newCards = newCards.concat(cardsCreated);
  }

  return {
    card: updatedCard,
    deck: {
      ...result.data.updateCardAndDeckV2.deck,
      cards: newCards,
    },
  };
};

export const getDeckById = async (deckId) => {
  const result = await apolloClient.query({
    query: gql`
      query GetDeckById($deckId: ID!) {
        deck(deckId: $deckId) {
          ${DECK_FRAGMENT}
          cards {
            ${CARD_FRAGMENT}
          }
        }
      }
    `,
    variables: { deckId },
    fetchPolicy: 'no-cache',
  });
  return result.data.deck;
};

export const getDecksByIds = async (deckIds, fields) => {
  if (!deckIds || !deckIds.length) return [];

  fields =
    fields ??
    `
    ${DECK_FRAGMENT}
    cards {
      ${CARD_FRAGMENT}
    }`;
  if (!deckIds || !deckIds.length) return [];
  let queries = [];
  deckIds.forEach((deckId, ii) => {
    queries.push(`
        deck${ii}: deck(deckId: "${deckId}") {
          ${fields}
        }
    `);
  });
  const result = await apolloClient.query({
    query: gql`
      query {
        ${queries.join('\n')}
      }`,
  });

  if (result && result.data) {
    return Object.entries(result.data).map(([alias, deck]) => deck);
  } else if (result?.errors) {
    throw new Error(`getDecksByIds: ${result.errors[0]}`);
  }
  return [];
};

export const uploadFile = async ({ uri }) => {
  const name = uri.match(/[^/]*$/)[0] || '';
  const extension = name.match(/[^.]*$/)[0] || '';
  const result = await apolloClient.mutate({
    mutation: gql`
      mutation UploadFile($file: Upload!) {
        uploadFile(file: $file) {
          fileId
          url
        }
      }
    `,
    variables: {
      file: new ReactNativeFile({
        uri,
        name,
        type:
          extension === 'jpg'
            ? 'image/jpeg'
            : extension === 'jpg'
            ? 'image/jpeg'
            : extension === 'png'
            ? 'image/png'
            : 'application/octet-stream',
      }),
    },
    fetchPolicy: 'no-cache',
  });
  return result?.data?.uploadFile;
};
