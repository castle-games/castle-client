import gql from 'graphql-tag';
import AsyncStorage from '@react-native-community/async-storage';
import uuid from 'uuid';
import md5 from 'md5';
import { Alert } from 'react-native';

import { sendAsync, useListen } from '../ghost/GhostEvents';
import * as Session from '../Session';

///
/// Lua -> JS -> Lua calls
///

let localStorageKey = '';
const awaitingLocalStorageKey = (async () => {
  localStorageKey = await AsyncStorage.getItem('LOCAL_STORAGE_KEY');
  if (!localStorageKey) {
    localStorageKey = uuid();
    await AsyncStorage.setItem('LOCAL_STORAGE_KEY', localStorageKey);
  }
})();

const storageIdForGame = async (game) => {
  if (game.storageId) {
    return game.storageId;
  } else if (game.isLocal) {
    await awaitingLocalStorageKey;
    return md5(localStorageKey + game.url);
  } else {
    return md5(game.url);
  }
};

export const JS = {
  // Test method called by 'ghost-tests'
  async sayHello({ name }) {
    if (name !== 'l') {
      console.log(`responding 'hello, ${name}' in 2 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return `js: hello, ${name}!`;
    } else {
      console.log(`throwing an error in 2 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      throw new Error("js: 'l' not allowed!");
    }
  },

  // System

  async alert({ title, message, okLabel, cancelLabel }, { game }) {
    return await new Promise((resolve) => {
      const cancelButton = {
        text: cancelLabel,
        style: 'cancel',
        onPress: () => resolve('cancel'),
      };
      const okButton = {
        text: okLabel || 'OK',
        onPress: () => resolve('ok'),
      };
      Alert.alert(title, message, cancelLabel ? [cancelButton, okButton] : [okButton]);
    });
  },

  // Game

  async gameLoad({ gameIdOrUrl, params }, { game }) {
    // Decide whether it's a `gameId` or a `gameUri`
    let gameId = null;
    let gameUri = null;
    if (gameIdOrUrl.includes('://')) {
      gameUri = gameIdOrUrl;
    } else {
      gameId = gameIdOrUrl;
    }

    // Go to game with current game as `referrerGame`! Don't steal focus if game was running in
    // the background..
    /* TODO: open game
    goToGame({
      gameId,
      gameUri,
      focus: false,
      extras: { referrerGame: game, initialParams: params },
    }); */
  },

  // Storage

  async storageGetGlobal({ key }, { game }) {
    const result = await Session.apolloClient.query({
      query: gql`
        query StorageGetGlobal($storageId: String!, $key: String!) {
          gameGlobalStorage(storageId: $storageId, key: $key) {
            value
          }
        }
      `,
      variables: { storageId: await storageIdForGame(game), key },
      fetchPolicy: 'no-cache',
    });
    if (result.errors && result.errors.length) {
      throw new Error(result.errors[0].message);
    }
    if (result.data && result.data.gameGlobalStorage && result.data.gameGlobalStorage.value) {
      return result.data.gameGlobalStorage.value;
    }
    return null;
  },

  async storageSetGlobal({ key, value }, { game }) {
    const result = await Session.apolloClient.mutate({
      mutation: gql`
        mutation StorageSetGlobal($storageId: String!, $key: String!, $value: String) {
          setGameGlobalStorage(storageId: $storageId, key: $key, value: $value)
        }
      `,
      variables: {
        storageId: await storageIdForGame(game),
        key,
        value: value === undefined ? null : value,
      },
      fetchPolicy: 'no-cache',
    });
    if (result.errors && result.errors.length) {
      throw new Error(result.errors[0].message);
    }
  },

  async storageGetUser({ key }, { game }) {
    const result = await Session.apolloClient.query({
      query: gql`
        query StorageGetUser($storageId: String!, $key: String!) {
          gameUserStorage(storageId: $storageId, key: $key) {
            value
          }
        }
      `,
      variables: { storageId: await storageIdForGame(game), key },
      fetchPolicy: 'no-cache',
    });
    if (result.errors && result.errors.length) {
      throw new Error(result.errors[0].message);
    }
    if (result.data && result.data.gameUserStorage && result.data.gameUserStorage.value) {
      return result.data.gameUserStorage.value;
    }
    return null;
  },

  async storageSetUser({ key, value }, { game }) {
    const result = await Session.apolloClient.mutate({
      mutation: gql`
        mutation StorageSetUser($storageId: String!, $key: String!, $value: String) {
          setGameUserStorage(storageId: $storageId, key: $key, value: $value)
        }
      `,
      variables: {
        storageId: await storageIdForGame(game),
        key,
        value: value === undefined ? null : value,
      },
      fetchPolicy: 'no-cache',
    });
    if (result.errors && result.errors.length) {
      throw new Error(result.errors[0].message);
    }
  },

  // GraphQL

  async gqlQuery({ query, variables, fetchPolicy, errorPolicy, fetchResults }, { game }) {
    const result = await Session.apolloClient.query({
      query: gql(query),
      variables,
      fetchPolicy,
      errorPolicy,
      fetchResults,
    });
    return result;
  },

  async gqlMutate(
    {
      mutation,
      variables,
      fetchPolicy,
      errorPolicy,
      awaitRefetchQueries,
      optimisticResponse,
      refetchQueries,
    },
    { game }
  ) {
    const result = await Session.apolloClient.mutate({
      mutation: gql(mutation),
      variables,
      fetchPolicy,
      errorPolicy,
      awaitRefetchQueries,
      optimisticResponse,
      refetchQueries,
    });
    return result;
  },
};

const onJSCallRequest = (context) => async ({ id, methodName, arg }) => {
  const response = { id };
  try {
    const method = JS[methodName];
    if (method) {
      response.result = await method(arg, context);
    }
  } catch (e) {
    response.error = e.toString();
  }
  sendAsync('JS_CALL_RESPONSE', response);
};

export const useLuaBridge = ({ game }) => {
  useListen({
    eventName: 'JS_CALL_REQUEST',
    handler: onJSCallRequest({ game }),
  });
};
