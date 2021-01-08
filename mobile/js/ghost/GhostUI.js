import React, { memo, useEffect, useMemo } from 'react';
import url from 'url';
import { sendAsync, useListen } from './GhostEvents';
import * as EventEmitter from '../EventEmitter';

/**
 *  GhostUI manages the state of the castle tool ui "DOM".
 *  We listen for diffs to the tree via a channel from lua
 *  and apply them to the root node.
 *
 *  const { root, setRoot } = useGhostUI();
 */

const GhostUIContext = React.createContext({
  root: {},
  setRoot: (root) => {},
});

const GhostFastDataContext = React.createContext({
  fastData: {},
  setFastData: (root) => {},
});

const ENTRYPOINT = 'https://raw.githubusercontent.com/castle-xyz/scene-creator/master/Client.lua';
const GLOBAL_ACTIONS_PANE_KEY = 'sceneCreatorGlobalActions';

// We get state diffs from Lua. This function applies those diffs to
// a previous state to produce the new state.
const applyDiff = (t, diff) => {
  if (diff == null) {
    return t;
  }

  // If it's an exact diff just return it
  if (diff.__exact) {
    delete diff.__exact;
    return diff;
  }

  // Copy untouched keys, then apply diffs to touched keys
  t = typeof t === 'object' ? t : {};
  const u = {};
  for (let k in t) {
    if (!(k in diff)) {
      u[k] = t[k];
    }
  }
  for (let k in diff) {
    const v = diff[k];
    if (typeof v === 'object') {
      u[k] = applyDiff(t[k], v);
    } else if (v !== '__NIL') {
      u[k] = v;
    }
  }
  return u;
};

const removeFastDataFromDiff = (diff, fastDataDiff = {}) => {
  if (diff == null) {
    return { diff, fastDataDiff };
  }

  for (let k in diff) {
    const v = diff[k];
    if (k.startsWith('fast-data-')) {
      fastDataDiff[k.substring('fast-data-'.length)] = JSON.parse(JSON.stringify(v));
      diff[k] = {};
    }

    if (typeof v === 'object') {
      let result = removeFastDataFromDiff(diff[k], fastDataDiff);
      diff[k] = result.diff;
      fastDataDiff = result.fastDataDiff;
    }
  }

  return { diff, fastDataDiff };
};

const doesDiffHaveChanges = (diff) => {
  for (let k in diff) {
    const v = diff[k];

    if (typeof v !== 'object') {
      return true;
    } else if (doesDiffHaveChanges(v)) {
      return true;
    }
  }

  return false;
};

export const Provider = (props) => {
  // Maintain tools state
  const [root, setRoot] = React.useState({});

  // Listen for updates
  useListen({
    eventName: 'CASTLE_TOOLS_UPDATE',
    handler: (diffJson) => {
      let { diff, fastDataDiff } = removeFastDataFromDiff(JSON.parse(diffJson));

      if (doesDiffHaveChanges(diff)) {
        setRoot((oldRoot) => applyDiff(oldRoot, diff));
      }

      if (doesDiffHaveChanges(fastDataDiff)) {
        EventEmitter.sendEvent('fastDataDiff', fastDataDiff);
      }
    },
    onRemove: () => setRoot({}),
  });

  const forceRender = React.useCallback(() => setRoot(JSON.parse(JSON.stringify(root))), [root]);
  const transformAssetUri = (uri) => url.resolve(ENTRYPOINT, uri) || uri;

  // scene creator global actions pane
  let globalActions, sendGlobalAction;
  if (root.panes && paneVisible(root.panes[GLOBAL_ACTIONS_PANE_KEY])) {
    const pane = root.panes[GLOBAL_ACTIONS_PANE_KEY];
    sendGlobalAction = (action) => sendDataPaneAction(pane, action);
    globalActions = getPaneData(pane);
  }

  const value = {
    root,
    setRoot,
    globalActions,
    sendGlobalAction,
    forceRender,
    transformAssetUri,
  };

  return <GhostUIContext.Provider value={value}>{props.children}</GhostUIContext.Provider>;
};

export const FastDataProvider = (props) => {
  const [fastData, setFastData] = React.useState({});

  useEffect(() => {
    let listenerId = EventEmitter.addListener('fastDataDiff', (fastDataDiff) => {
      setFastData((oldFastData) => applyDiff(oldFastData, fastDataDiff));
    });

    return () => {
      EventEmitter.removeListener(listenerId);
    };
  });

  const value = {
    fastData,
    setFastData,
  };

  return (
    <GhostFastDataContext.Provider value={value}>{props.children}</GhostFastDataContext.Provider>
  );
};

export const useGhostUI = () => React.useContext(GhostUIContext);
export const useGhostFastData = () => React.useContext(GhostFastDataContext);

export const useFastDataMemo = (key, Comp) => {
  return (props) => {
    let context = useGhostFastData();
    let dataRoot = context.fastData[key];

    let data, action;

    if (dataRoot && dataRoot.props) {
      data = dataRoot.props.data;
      action = useMemo(
        () => (action, value) => {
          return sendEvent(dataRoot.pathId, { type: action, value });
        },
        [dataRoot]
      );
    } else {
      data = {};
      action = useMemo(() => () => {}, [dataRoot]);
    }

    let NewComp = useMemo(
      () =>
        memo(({ data, action, ...props }) => {
          return <Comp fastData={data} fastAction={action} {...props} />;
        }),
      []
    );

    return <NewComp data={data} action={action} {...props} />;
  };
};

export const useGhostThemeListener = ({ setLightColors, setDarkColors }) => {
  const { forceRender } = useGhostUI();
  React.useEffect(() => {
    setLightColors();
    forceRender();
  }, []);
  useListen({
    eventName: 'CASTLE_TOOLS_COLORS',
    handler: ({ isDark = false } = {}) => {
      if (isDark) {
        setDarkColors();
      } else {
        setLightColors();
      }
      forceRender();
    },
  });
};

export const getPaneData = (element) => {
  if (element) {
    let data;
    const dataChild = element.children['data'];
    if (dataChild) {
      return dataChild.props.data;
    }
  }
  return null;
};

// Whether a pane should be rendered
const paneVisible = (element) => element && element.children && element.children.count > 0;

let nextEventId = 1;
const sendEvent = (pathId, event) => {
  const eventId = nextEventId++;
  sendAsync('CASTLE_TOOL_EVENT', { pathId, event: { ...event, eventId } });
  return eventId;
};

export const sendDataPaneAction = (paneElement, action, value, childId) => {
  const dataChildPathId = paneElement.children[childId ?? 'data'].pathId;
  return sendEvent(dataChildPathId, { type: action, value });
};

// Lua CJSON encodes sparse arrays as objects with stringified keys, use this to convert back
export const objectToArray = (input) => {
  if (Array.isArray(input)) {
    return input;
  }

  const output = [];
  let i = '0' in input ? 0 : 1;
  for (;;) {
    const strI = i.toString();
    if (!(strI in input)) {
      break;
    }
    output.push(input[strI]);
    ++i;
  }
  return output;
};
