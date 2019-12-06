import * as Constants from '~/common/constants';
import * as Urls from '~/common/urls';
import * as url from 'url';

import CastleApiClient from 'castle-api-client';

export const API = CastleApiClient(Constants.API_HOST);

// fetches partial user data to support some owning object
const NESTED_GAME_OWNER = `
  owner {
    userId
    name
    username
    gamesCount
    gamesSumPlayCount
    photo {
      url
      height
      width
    }
  }
`;

// fetches all the data needed to render a full user profile
const FULL_USER_FIELDS = `
  userId
  username
  isAnonymous
  name
  email
  websiteUrl
  itchUsername
  twitterUsername
  createdTime
  updatedTime
  gamesCount
  gamesSumPlayCount
  lastUserStatus {
    userStatusId
    status
    isRecent
    lastPing
    platform
    game {
      gameId
      name
      url
    }
  }
  photo {
    url
    height
    width
  }
`;

const GAME_FIELDS = `
  gameId
  title
  url
  sourceUrl
  isCastleHosted
  slug
  createdTime
  updatedTime
  description
  metadata
  entryPoint
  serverEntryPoint
  sessionId
  playCount
  coverImage {
    url
    height
    width
  }
  draft
  storageId
  chatChannelId
  hostedFiles
`;

const GAME_ITEMS = `
  gameItems {
    ${GAME_FIELDS}
    ${NESTED_GAME_OWNER}
  }
`;

const POST_FIELDS = `
  postId
  creator {
    userId
    username
    name
    photo {
      url
    }
  }
  message
  media {
    url
    width
    height
  }
  hasData
  url
  createdTime
`;

const NOTIFICATION_FIELDS = `
  appNotificationId
  type
  body
  status
  chatMessageId
  chatChannelId
  gameId
  authorUserId
  postId
  createdTime
`;

const CURRENT_USER_QUERY = `
  me {
    ${FULL_USER_FIELDS}
    ${GAME_ITEMS}
  }

  getNotificationPreferencesV2

  userStatusHistory {
    userStatusId
    status
    lastPing
    game {
      ${GAME_FIELDS}
      ${NESTED_GAME_OWNER}
    }
  }
`;

const _getHeadersAsync = () => API.client._getRequestHeadersAsync();

export const getAccessTokenAsync = async () => {
  let headers = await _getHeadersAsync();
  if (!headers) {
    return null;
  }

  return headers['X-Auth-Token'];
};

const _graphqlThrow = async (graphql, params, key) => {
  const result = await API.graphqlAsync(graphql, params);
  if (result.errors && result.errors.length) {
    throw new Error(`Error: ${result.errors[0].message}`);
  }
  if (key) {
    return result.data[key];
  } else {
    return result;
  }
};

const _graphqlDontThrow = async (graphql, params, key) => {
  try {
    const result = await _graphqlThrow(graphql, params, key);
    return result;
  } catch (e) {
    console.warn(`The graphql call resulted in an error, but we're not throwing: ${e}`);
    return false;
  }
};

export const setNotificationPreferences = ({ preferences }) =>
  _graphqlDontThrow(
    `
      mutation($preferences: Json!) {
        setNotificationPreferencesV2(preferences: $preferences)
      }
    `,
    { preferences }
  );

export const sendResetPasswordEmail = ({ userId }) =>
  _graphqlDontThrow(
    `
      mutation($userId: ID!) {
        sendResetPasswordEmail(userId: $userId)
      }
    `,
    { userId }
  );

export const getExistingUser = async ({ who }) =>
  _graphqlDontThrow(
    `
      query($who: String!) {
        userForLoginInput(who: $who) {
          userId
          name
          username
          photo {
            url
            height
            width
          }
        }
      }
    `,
    { who },
    'userForLoginInput'
  );

export async function signup({ name, username, email, password }) {
  const response = await API.graphqlAsync(
    `
      mutation($name: String!, $username: String!, $email: String!, $password: String!) {
        signup(user: { name: $name, username: $username }, email: $email, password: $password) {
          ${FULL_USER_FIELDS}
          ${GAME_ITEMS}
          token
        }
      }
    `,
    {
      name,
      username,
      email,
      password,
    }
  );

  if (response.error) {
    return false;
  }

  if (response.errors) {
    return response;
  }

  await API.client.setTokenAsync(response.data.signup.token);

  return response;
}

export async function createAnonymousUser() {
  const response = await API.graphqlAsync(
    `
      mutation {
        createAnonymousUser {
          ${FULL_USER_FIELDS}
          token
        }
      }
    `
  );

  if (response.errors) {
    throw new Error(`Couldn't create anon user: ${response.errors[0].message}`);
  }
  if (
    !response.data ||
    !response.data.createAnonymousUser ||
    !response.data.createAnonymousUser.token
  ) {
    throw new Error(`Couldn't create anon user: no token: ${JSON.stringify(response)}`);
  }
  await API.client.setTokenAsync(response.data.createAnonymousUser.token);
  return response.data.createAnonymousUser;
}

export async function login({ userId, password }) {
  const response = await API.graphqlAsync(
    `
      mutation($userId: ID!, $password: String!) {
        login(userId: $userId, password: $password) {
          ${FULL_USER_FIELDS}
          ${GAME_ITEMS}
          token
        }
      }
    `,
    {
      userId,
      password,
    }
  );

  // TOOD(jim): Write a global error handler.
  if (response.error) {
    return false;
  }

  if (response.errors) {
    return response;
  }

  await API.client.setTokenAsync(response.data.login.token);
  return response.data.login;
}

export const getUser = ({ userId }) =>
  _graphqlDontThrow(
    `
    query($userId: ID!) {
      user(userId: $userId) {
        ${FULL_USER_FIELDS}
        ${GAME_ITEMS}
      }
    }
  `,
    { userId },
    'user'
  );

export const getUsers = ({ userIds }) =>
  _graphqlDontThrow(
    `
    query($userIds: [ID]!) {
      users(userIds: $userIds) {
        ${FULL_USER_FIELDS}
        ${GAME_ITEMS}
      }
    }
  `,
    { userIds },
    'users'
  );

export const getCurrentUser = async () => {
  const result = await _graphqlDontThrow(`
    query {
      ${CURRENT_USER_QUERY}
    }
  `);
  if (!result) {
    return false;
  }
  return {
    user: result.data.me,
    settings: {
      notifications: result.data.getNotificationPreferencesV2,
    },
    userStatusHistory: result.data.userStatusHistory,
  };
};

export const getAllGames = (limit) =>
  _graphqlDontThrow(
    `
    query($limit: Int) {
      allGames(limit: $limit) {
        ${GAME_FIELDS}
        ${NESTED_GAME_OWNER}
      }
    }`,
    { limit },
    'allGames'
  );

export const getTrendingGames = () =>
  _graphqlDontThrow(
    `
    query {
      trendingGames {
        ${GAME_FIELDS}
        ${NESTED_GAME_OWNER}
      }
    }
  `,
    null,
    'trendingGames'
  );

export const getFeaturedExamples = () =>
  _graphqlDontThrow(
    `
    query {
      featuredExamples {
        ${GAME_FIELDS}
        ${NESTED_GAME_OWNER}
      }
    }
  `,
    null,
    'featuredExamples'
  );

export const logout = () => {
  API.client.setTokenAsync(null);
  return !!_graphqlDontThrow(`
      mutation {
        logout
      }
    `);
};

export const getGameByURL = (url) =>
  _graphqlThrow(
    `
    query GetGame($url: String!) {
      game(url: $url) {
        ${GAME_FIELDS}
        ${NESTED_GAME_OWNER}
      }
    }
    `,
    { url },
    'game'
  );

export const getGameByGameId = (gameId) =>
  _graphqlThrow(
    `
    query GetGame($gameId: ID!) {
      game(gameId: $gameId) {
        ${GAME_FIELDS}
        ${NESTED_GAME_OWNER}
      }
    }
    `,
    { gameId },
    'game'
  );

export const uploadImageAsync = ({ file }) =>
  _graphqlDontThrow(
    `
      mutation($file: Upload!) {
        uploadFile(file: $file) {
          fileId
          hash
          name
          encoding
          mimeType
          userId
          user {
            userId
            username
            name
          }
          uploadedTime
          width
          height
          originUrl
          url
        }
      }
    `,
    { file },
    'uploadFile'
  );

export const setUserPhotoAsync = ({ userId, fileId }) =>
  _graphqlDontThrow(
    `
      mutation ($userId: ID!, $photoFileId: ID!) {
       updateUser(
         userId: $userId
         user: { photoFileId: $photoFileId }
       ) {
         userId
         photo {
           url
         }
       }
      }
    `,
    {
      userId,
      photoFileId: fileId,
    },
    'updateUser'
  );

export const updateUserAsync = ({ userId, user }) =>
  _graphqlDontThrow(
    `
      mutation ($userId: ID!, $name: String, $websiteUrl: String, $itchUsername: String, $twitterUsername: String) {
       updateUser(
         userId: $userId
         user: {
           name: $name
           websiteUrl: $websiteUrl
           itchUsername: $itchUsername
           twitterUsername: $twitterUsername
         }
       ) {
         userId
       }
      }
    `,
    {
      userId,
      ...user,
    },
    'updateUser'
  );

const _validatePublishGameResult = (result) => {
  if (result.errors && result.errors.length) {
    const error = result.errors[0];
    const code = error.extensions ? error.extensions.code : '';
    if (code === 'REGISTER_GAME_DUPLICATE_URL') {
      throw new Error(`A game already exists in Castle with this url.`);
    } else if (code === 'REGISTER_GAME_DUPLICATE_SLUG') {
      throw new Error(`You have already added a game with this name.`);
    } else if (code === 'REGISTER_GAME_INVALID_CASTLE_FILE') {
      if (error.message == 'Owner must not be empty') {
        throw new Error(`The given Castle project file is missing the 'owner' field.`);
      } else {
        throw new Error(`The file at this url doesn't look like a valid Castle project file.`);
      }
    } else if (code === 'REGISTER_GAME_INVALID_USERNAME') {
      throw new Error(`The \`owner\` given at this url does not match your username.`);
    } else {
      throw new Error(`The Castle server returned an error: ${error.message}`);
    }
  }
  return true;
};

// read the game at this source url and try to publish it to my account.
// optional gameId means we intend to update an existing game.
export const publishGame = async (sourceUrl, gameId = null) => {
  const result = await _graphqlThrow(
    `
      mutation($url: String!, $gameId: ID) {
        publishGame(url: $url, gameId: $gameId) {
          ${GAME_FIELDS}
        }
      }
    `,
    {
      url: sourceUrl,
      gameId,
    }
  );

  _validatePublishGameResult(result);
  return result.data.publishGame;
};

export const previewLocalGame = async (castleFileContents, gameId = null) => {
  const result = await _graphqlThrow(
    `
      query PreviewLocalGame($castleFile: String!, $gameId: ID) {
        previewLocalGame(castleFile: $castleFile, gameId: $gameId) {
          ${GAME_FIELDS}
          ${NESTED_GAME_OWNER}
        }
      }
    `,
    {
      castleFile: castleFileContents,
      gameId,
    }
  );

  _validatePublishGameResult(result);
  return result.data.previewLocalGame;
};

export const previewGameAtUrl = async (url, gameId = null) => {
  const result = await _graphqlThrow(
    `
      query PreviewGameAtUrl($url: String!, $gameId: ID) {
        previewGameAtUrl(url: $url, gameId: $gameId) {
          ${GAME_FIELDS}
          ${NESTED_GAME_OWNER}
        }
      }
    `,
    { url, gameId }
  );

  _validatePublishGameResult(result);
  return result.data.previewGameAtUrl;
};

export const recordUserStatus = (status, isNewSession, game) => {
  if (game.gameId) {
    return _recordUserStatusRegisteredGame(status, isNewSession, game.gameId);
  } else {
    return _recordUserStatusUnregisteredGame(status, isNewSession, game);
  }
};

async function _recordUserStatusUnregisteredGame(status, isNewSession, game) {
  let coverImageUrl;
  if (game.coverImage && game.coverImage.url) {
    coverImageUrl = game.coverImage.url;
  } else if (game.metadata && game.metadata.coverImage) {
    let resolvedUrl = url.resolve(game.url, game.metadata.coverImage);
    if (!Urls.isPrivateUrl(resolvedUrl)) {
      coverImageUrl = resolvedUrl;
    }
  } else if (game.metadata && game.metadata.coverImageUrl) {
    // coverImageUrl is deprecated
    if (!Urls.isPrivateUrl(game.metadata.coverImageUrl)) {
      coverImageUrl = game.metadata.coverImageUrl;
    }
  }
  const result = await API.graphqlAsync(
    /* GraphQL */ `
      mutation(
        $status: String!
        $url: String!
        $title: String
        $coverImage: String
        $isNewSession: Boolean
      ) {
        recordUserStatus(
          status: $status
          isNewSession: $isNewSession
          unregisteredGame: { url: $url, title: $title, coverImage: $coverImage }
        ) {
          userStatusId
        }
      }
    `,
    {
      status,
      isNewSession,
      url: game.url,
      title: game.title ? game.title : game.name, // name is deprecated
      coverImage: coverImageUrl,
    }
  );
  return result;
}

async function _recordUserStatusRegisteredGame(status, isNewSession, gameId) {
  const result = await API.graphqlAsync(
    /* GraphQL */ `
      mutation($status: String!, $isNewSession: Boolean, $registeredGameId: ID!) {
        recordUserStatus(
          status: $status
          isNewSession: $isNewSession
          registeredGameId: $registeredGameId
        ) {
          userStatusId
        }
      }
    `,
    {
      status,
      isNewSession,
      registeredGameId: gameId,
    }
  );
  return result;
}

export const multiplayerJoinAsync = (gameId, castleFileUrl, entryPoint, sessionId, isStaging) =>
  _graphqlDontThrow(
    `
        mutation(
          $gameId: ID
          $castleFileUrl: String
          $entryPoint: String
          $sessionId: String
          $isStaging: Boolean
        ) {
          joinMultiplayerSession(
            gameId: $gameId
            castleFileUrl: $castleFileUrl
            entryPoint: $entryPoint
            sessionId: $sessionId
            isStaging: $isStaging
          ) {
            sessionId
            address
            isNewSession
            sessionToken
          }
        }
      `,
    {
      gameId,
      castleFileUrl,
      entryPoint,
      sessionId,
      isStaging,
    },
    'joinMultiplayerSession'
  );

export const gameServerLogsAsync = (gameId, castleFileUrl, entryPoint) =>
  _graphqlDontThrow(
    `
        query($gameId: ID, $castleFileUrl: String, $entryPoint: String) {
          gameServerLogs(gameId: $gameId, castleFileUrl: $castleFileUrl, entryPoint: $entryPoint)
        }
      `,
    {
      gameId,
      castleFileUrl,
      entryPoint,
    },
    'gameServerLogs'
  );

export const getMultiplayerRegions = () =>
  _graphqlDontThrow(
    `
    query {
      multiplayerRegions {
        name
        pingAddress
      }
    }`,
    null,
    'multiplayerRegions'
  );

export const updatePings = (pings, timeZone) =>
  _graphqlDontThrow(
    `
      mutation($pings: [UserPing]!, $timeZone: String) {
        updatePings(pings: $pings, timeZone: $timeZone)
      }
    `,
    {
      pings,
      timeZone,
    }
  );

export const getGameGlobalStorageValueAsync = ({ storageId, key }) =>
  _graphqlThrow(
    `
      query($storageId: String!, $key: String!) {
        gameGlobalStorage(storageId: $storageId, key: $key) {
          value
        }
      }
    `,
    { storageId, key },
    'gameGlobalStorage'
  );

export const setGameGlobalStorageAsync = ({ storageId, key, value }) =>
  _graphqlThrow(
    `
      mutation($storageId: String!, $key: String!, $value: String) {
        setGameGlobalStorage(storageId: $storageId, key: $key, value: $value)
      }
    `,
    { storageId, key, value },
    'setGameGlobalStorage'
  );

export const getGameUserStorageValueAsync = ({ storageId, key }) =>
  _graphqlThrow(
    `
      query($storageId: String!, $key: String!) {
        gameUserStorage(storageId: $storageId, key: $key) {
          value
        }
      }
    `,
    { storageId, key },
    'gameUserStorage'
  );

export const setGameUserStorageAsync = ({ storageId, key, value }) =>
  _graphqlThrow(
    `
      mutation($storageId: String!, $key: String!, $value: String) {
        setGameUserStorage(storageId: $storageId, key: $key, value: $value)
      }
    `,
    { storageId, key, value },
    'setGameUserStorage'
  );

export const createPostAsync = async ({ sourceGameId, message, mediaFileId, data }) => {
  const result = await _graphqlThrow(
    `
      mutation($sourceGameId: ID, $message: Json, $mediaFileId: ID, $data: String) {
        createPost(
          postInput: {
            sourceGameId: $sourceGameId
            message: $message
            mediaFileId: $mediaFileId
            data: $data
          }
        ) {
          postId
        }
      }
    `,
    { sourceGameId, message, mediaFileId, data },
    'createPost'
  );

  return result.postId;
};

export const allPostsAsync = ({ pageSize = 20, pageAfterPostId } = {}) =>
  _graphqlThrow(
    `
      query($pageSize: Int, $pageAfterPostId: ID) {
        allPosts(pageSize: $pageSize, pageAfterPostId: $pageAfterPostId) {
          ${POST_FIELDS}
          sourceGame {
            ${GAME_FIELDS}
          }
        }
      }
    `,
    { pageSize, pageAfterPostId },
    'allPosts'
  );

export const postsForGameId = (gameId, { pageSize = 20, pageAfterPostId } = {}) =>
  _graphqlThrow(
    `
      query($gameId: ID!, $pageSize: Int, $pageAfterPostId: ID) {
        postsForGame(gameId: $gameId, pageSize: $pageSize, pageAfterPostId: $pageAfterPostId) {
          ${POST_FIELDS}
        }
      }
    `,
    { gameId, pageSize, pageAfterPostId },
    'postsForGame'
  );

export const postsForUserId = (userId, { pageSize = 20, pageAfterPostId } = {}) =>
  _graphqlThrow(
    `
      query($userId: ID!, $pageSize: Int, $pageAfterPostId: ID) {
        postsForUser(userId: $userId, pageSize: $pageSize, pageAfterPostId: $pageAfterPostId) {
          ${POST_FIELDS}
          sourceGame {
            ${GAME_FIELDS}
          }
        }
      }
    `,
    { userId, pageSize, pageAfterPostId },
    'postsForUser'
  );

export const postDataAsync = async ({ postId }) => {
  const post = await _graphqlThrow(
    `
      query($postId: ID!) {
        post(postId: $postId) {
          data
        }
      }
    `,
    { postId },
    'post'
  );

  return post.data;
};

export const getPostById = (postId) =>
  _graphqlDontThrow(
    `
      query($postId: ID!) {
        post(postId: $postId) {
          ${POST_FIELDS}
          sourceGame {
            ${GAME_FIELDS}
          }
        }
      }
    `,
    { postId },
    'post'
  );

export const search = async (query) => {
  const result = await _graphqlDontThrow(
    `query($text: String!) {
      search(text: $text) {
        users {
          ${FULL_USER_FIELDS}
        }
        games {
          ${GAME_FIELDS}
          ${NESTED_GAME_OWNER}
        }
      }
    }`,
    { text: query }
  );

  if (!result) {
    return false;
  }

  return {
    query,
    ...result.data.search,
  };
};

// used for voice chat
export const getMediaServiceAsync = (metadata) =>
  _graphqlThrow(
    `
      query($metadata: Json) {
        mediaService(metadata: $metadata) {
          type
          address
        }
      }
    `,
    { metadata },
    'mediaService'
  );

export const setAppNotificationsStatusAsync = (appNotificationIds, status) =>
  _graphqlThrow(
    `
      mutation($appNotificationIds: [ID]!, $status: AppNotificationStatus!) {
        setAppNotificationsStatus(
          appNotificationIds: $appNotificationIds,
          status: $status
        )
      }
    `,
    { appNotificationIds, status },
    'setAppNotificationsStatus'
  );

export const appNotificationsAsync = () =>
  _graphqlThrow(
    `
      query {
        appNotifications {
          ${NOTIFICATION_FIELDS}
        }
      }
    `,
    null,
    'appNotifications'
  );
