import * as Constants from '~/common/constants';
import * as Actions from '~/common/actions';
import * as Strings from '~/common/strings';
import * as Urls from '~/common/urls';
import * as Utilities from '~/common/utilities';

import { NativeBinds } from '~/native/nativebinds';

const path = Utilities.path();

export const createDirectoryAsync = async (path) => execNodeAsync('createDirectory', { path });

export const extractAsync = async (zipPath, toDirectory) =>
  execNodeAsync('extract', { zipPath, toDirectory });

export const getHomeDirAsync = async () => execNodeAsync('getHomeDir', {});

export const getProjectFilenameAtPathAsync = async (path) =>
  execNodeAsync('getProjectFilenameAtPath', { path });

let publishPreviousHashes = {};

export async function publishProjectAsync(projectUrl) {
  if (!Urls.isPrivateUrl(projectUrl)) {
    throw new Error(`Failed to upload project from ${projectUrl}: Only local urls are supported`);
  }
  let localProjectPath;
  try {
    if (!Strings.isEmpty(path.extname(projectUrl))) {
      localProjectPath = path.dirname(projectUrl);
    } else {
      localProjectPath = projectUrl;
    }
    localProjectPath = localProjectPath.replace('file://', '');
    let token = await Actions.getAccessTokenAsync();
    let result = await execNodeAsync('publishProject', {
      dir: localProjectPath,
      apiHost: Constants.API_HOST,
      token,
      previousHashes: publishPreviousHashes,
    });

    for (let i = 0; i < result.hashes.length; i++) {
      publishPreviousHashes[result.hashes[i]] = true;
    }

    return result.devUrl;
  } catch (e) {
    throw new Error(`Failed to upload project at ${localProjectPath}: ${e}`);
  }
}

export async function uploadScreenCaptureAsync(path) {
  try {
    let token = await Actions.getAccessTokenAsync();
    let result = await execNodeAsync('uploadScreenCapture', {
      path,
      apiHost: Constants.API_HOST,
      token,
    });

    return result;
  } catch (e) {
    throw new Error(`Failed to upload screen capture: ${e}`);
  }
}

export async function uploadFileAsync(path, params) {
  try {
    let token = await Actions.getAccessTokenAsync();
    let result = await execNodeAsync('uploadFile', {
      path,
      apiHost: Constants.API_HOST,
      token,
      params,
    });

    return result;
  } catch (e) {
    throw new Error(`Failed to upload file: ${e}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let nextExecId = 0;
let execResults = {};
export async function execNodeAsync(action, args) {
  let execId = nextExecId++;

  await NativeBinds.execNode({
    execId,
    input: btoa(
      JSON.stringify({
        action,
        args,
      })
    ),
  });

  while (!execResults[execId]) {
    await sleep(100);
  }

  let unparsedResult = execResults[execId];
  delete execResults[execId];

  let result;
  try {
    result = JSON.parse(atob(unparsedResult));
  } catch (e) {
    throw new Error(`Error parsing as JSON: ${unparsedResult}. Error: ${e}`);
  }

  return result;
}

export async function execNodeCompleteEvent(e) {
  execResults[e.params.execId] = e.params.result;
}
