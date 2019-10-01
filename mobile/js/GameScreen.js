import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { useLazyQuery, useQuery } from '@apollo/react-hooks';
import gql from 'graphql-tag';

import GhostView from './ghost/GhostView';
import * as GhostEvents from './ghost/GhostEvents';
import * as MainSwitcher from './MainSwitcher';
import * as LuaBridge from './LuaBridge';
import * as Session from './Session';
import * as GhostChannels from './ghost/GhostChannels';

// Lots of APIs need regular 'https://' URIs
const castleUriToHTTPSUri = uri => uri.replace(/^castle:\/\//, 'https://');

// Fetch a `Game` GraphQL entity based on `gameId` or `gameUri`
const useFetchGame = ({ gameId, gameUri }) => {
  let game = null;

  // Set up a query to get the `game` from a '.castle' `gameUri`. We set up a 'lazy query' and then
  // only actually call it if at least one of `gameId` or `gameUri` are present.
  const [callQuery, { loading: queryLoading, called: queryCalled, data: queryData }] = useLazyQuery(
    gql`
      query Game($url: String, $gameId: ID) {
        game(url: $url, gameId: $gameId) {
          gameId
          entryPoint
          metadata
          ...LuaGame
        }
      }
      ${LuaBridge.LUA_GAME_FRAGMENT}
    `,
    { variables: { url: gameUri && castleUriToHTTPSUri(gameUri), gameId } }
  );

  // If can query, query!
  if (gameId || gameUri) {
    if (!queryCalled) {
      callQuery();
    } else if (!queryLoading) {
      if (queryData && queryData.game) {
        // Query was successful!
        game = queryData.game;
      } else if (gameUri) {
        // Query wasn't successful, assume this is a direct entrypoint URI and use a stub `game`
        game = {
          entryPoint: gameUri,
          metadata: {},
        };
      }
    }
  }

  return { fetchedGame: game, fetching: queryLoading };
};

// Read dimensions settings into the `{ width, height, upscaling, downscaling }` format for `GhostView`
const computeDimensionsSettings = ({ metadata }) => {
  const { dimensions, scaling, upscaling, downscaling } = metadata;
  const dimensionsSettings = {
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
      const [widthStr, heightStr] = dimensions.split('x');
      dimensionsSettings.width = parseInt(widthStr) || 800;
      dimensionsSettings.height = parseInt(heightStr) || 450;
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
  return dimensionsSettings;
};

// Populate the 'INITIAL_DATA' channel that Lua reads for various initial settings (eg. the user
// object, initial audio volume, initial post, ...)
const useInitialData = ({ game, dimensionsSettings }) => {
  const [sent, setSent] = useState(false);
  const sending = useRef(false);

  // Fetch `me`
  const { loading: meLoading, data: meData } = useQuery(gql`
    query Me {
      me {
        ...LuaUser
      }
    }
    ${LuaBridge.LUA_USER_FRAGMENT}
  `);
  const isLoggedIn = Session.isSignedIn();
  const me = isLoggedIn && !meLoading && meData && meData.me;

  useEffect(() => {
    if (!sending.current && game && dimensionsSettings && (!isLoggedIn || me)) {
      // Ready to send to Lua
      sending.current = true;
      (async () => {
        await GhostChannels.clearAsync('INITIAL_DATA');
        await GhostChannels.pushAsync(
          'INITIAL_DATA',
          JSON.stringify({
            graphics: {
              width: dimensionsSettings.width,
              height: dimensionsSettings.height,
            },
            audio: { volume: 1 },
            user: {
              isLoggedIn,
              me: await LuaBridge.jsUserToLuaUser(me),
            },
            game: await LuaBridge.jsGameToLuaGame(game),
          })
        );
        setSent(true);
      })();
    }
  }, [game, dimensionsSettings]);

  return { sent };
};

// Clear Lua <-> JS events channels for a new game
const useClearLuaEvents = () => {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await GhostEvents.clearAsync();
      if (mounted) {
        setCleared(true);
      }
    })();
    return () => (mounted = false);
  }, []);

  return { cleared };
};

// Attach a handler to a Lua event, respecting component lifetime
const useLuaEvent = ({ eventsReady, eventName, handler }) => {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (eventsReady) {
      let mounted = true;
      const listener = GhostEvents.listen(eventName, params => {
        if (mounted) {
          savedHandler.current(params);
        }
      });
      return () => {
        mounted = false;
        listener.remove();
      };
    }
  }, [eventsReady, eventName]);
};

// Keep track of Lua loading state
const useLuaLoading = ({ eventsReady }) => {
  // Maintain list of network requests Lua is making
  const [networkRequests, setNetworkRequests] = useState([]);
  useLuaEvent({
    eventsReady,
    eventName: 'GHOST_NETWORK_REQUEST',
    handler: async ({ type, id, url, method }) => {
      if (type === 'start') {
        // Add to `networkRequests` if `url` is new
        setNetworkRequests(networkRequests =>
          !networkRequests.find(req => req.url == url)
            ? [...networkRequests, { id, url, method }]
            : networkRequests
        );
      }
      if (type === 'stop') {
        // Wait for a slight bit then remove from `networkRequests`
        await new Promise(resolve => setTimeout(resolve, 60));
        setNetworkRequests(networkRequests => networkRequests.filter(req => req.id !== id));
      }
    },
  });

  // Maintain whether Lua finished loading (`love.load` is done)
  const [loaded, setLoaded] = useState(false);
  useLuaEvent({
    eventsReady,
    eventName: 'CASTLE_GAME_LOADED',
    handler: () => setLoaded(true),
  });

  return { networkRequests, loaded };
};

// A line of text in the loader overlay
const LoaderText = ({ children }) => (
  <Text style={{ color: 'white', fontSize: 12 }}>{children}</Text>
);

// Given a `gameId` or `gameUri`, run and display the game! The lifetime of this component must match the
// lifetime of the game run -- it must be unmounted when the game is stopped and a new instance mounted
// if a new game should be run (or even if the same game should be restarted).
const GameView = ({ gameId, gameUri }) => {
  const fetchGameHook = useFetchGame({ gameId, gameUri });
  const game = fetchGameHook.fetchedGame;

  const dimensionsSettings = game && computeDimensionsSettings({ metadata: game.metadata });

  const initialDataHook = useInitialData({ game, dimensionsSettings });

  const clearLuaEventsHook = useClearLuaEvents();
  const eventsReady = clearLuaEventsHook.cleared;

  const luaLoadingHook = useLuaLoading({ eventsReady });

  return (
    <View style={{ flex: 1 }}>
      {game && clearLuaEventsHook.cleared && initialDataHook.sent ? (
        // Render `GhostView` when ready
        <GhostView
          style={{ width: '100%', height: '100%' }}
          uri={game.entryPoint}
          dimensionsSettings={dimensionsSettings}
        />
      ) : null}

      {!luaLoadingHook.loaded ? (
        // Render loader overlay until Lua finishes loading
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            padding: 8,
          }}>
          {fetchGameHook.fetching ? (
            // Game is being fetched
            <LoaderText>Fetching game...</LoaderText>
          ) : !game && !gameUri ? (
            // No game to run
            <LoaderText>No game</LoaderText>
          ) : luaLoadingHook.networkRequests.length === 0 ? (
            // Game is fetched and Lua isn't making network requests, but `love.load` isn't finished yet
            <LoaderText>Loading game...</LoaderText>
          ) : (
            // Game is fetched and Lua is making network requests
            luaLoadingHook.networkRequests.map(({ url }) => (
              <LoaderText key={url}>Fetching {url}</LoaderText>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
};

// Navigate to a game given its `gameId` or `gameUri`.
export let goToGame = ({ gameId, gameUri }) => {};

// Top-level component which stores the `gameId` or  `gameUri` state. This component is mounted for the
// entire lifetime of the app and mounts fresh `GameView` instances for each game run.
const GameScreen = () => {
  const [gameId, setGameId] = useState(null);
  const [gameUri, setGameUri] = useState(null);

  goToGame = ({ gameId: newGameId, gameUri: newGameUri, focus = true }) => {
    if (focus) {
      MainSwitcher.switchTo('game');
    }

    // Prefer `gameId`, then `gameUri`
    if (newGameId) {
      setGameId(newGameId);
      setGameUri(null);
    }
    if (newGameUri) {
      setGameId(null);
      setGameUri(newGameUri);
    }
  };

  // Use `key` to mount a new instance of `GameView` when the game changes
  return <GameView key={gameId || gameUri} gameId={gameId} gameUri={gameUri} />;
};

export default GameScreen;
