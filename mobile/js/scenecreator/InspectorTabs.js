import React from 'react';
import { StyleSheet, View } from 'react-native';

import { sendDataPaneAction } from '../Tools';

import * as Constants from '../Constants';
import * as Inspector from './inspector/behaviors/InspectorBehaviors';

const styles = StyleSheet.create({});

const GeneralTab = ({ behaviors, sendActions, isTextActorSelected }) => {
  if (isTextActorSelected) {
    return (
      <React.Fragment>
        <Inspector.TextContent text={behaviors.Text} sendAction={sendActions.Text} />
        <Inspector.TextLayout text={behaviors.Text} sendAction={sendActions.Text} />
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <Inspector.Drawing
          drawing={behaviors.Drawing}
          drawing2={behaviors.Drawing2}
          sendAction={sendActions.Drawing}
        />
        <Inspector.Tags tags={behaviors.Tags} sendAction={sendActions.Tags} />
        <Inspector.Layout
          body={behaviors.Body}
          circleShape={behaviors.CircleShape}
          sendActions={sendActions}
        />
      </React.Fragment>
    );
  }
};

const MovementTab = ({ behaviors, sendActions }) => {
  const movementBehaviors = ['Bouncy', 'Friction', 'Falling', 'SpeedLimit', 'Slowdown'];
  return (
    <React.Fragment>
      <Inspector.Motion moving={behaviors.Moving} sendAction={sendActions.Moving} />
      {movementBehaviors
        .filter((name) => behaviors[name].isActive)
        .map((name) => (
          <Inspector.Behavior
            key={`behavior-${name}`}
            behavior={behaviors[name]}
            sendAction={sendActions[name]}
          />
        ))}
      {behaviors.Sliding.isActive ? (
        <Inspector.AxisLock
          sliding={behaviors.Sliding}
          body={behaviors.Body}
          sendActions={sendActions}
        />
      ) : null}
    </React.Fragment>
  );
};

export const InspectorTabs = ({ element, isTextActorSelected, selectedTab }) => {
  let behaviors, sendActions;
  if (element.children.count) {
    behaviors = {};
    sendActions = {};
    Object.entries(element.children).forEach(([key, child]) => {
      if (child.type === 'data') {
        const data = child.props.data;
        behaviors[data.name] = data;
        behaviors[data.name].lastReportedEventId = child.lastReportedEventId;
        sendActions[data.name] = (action, value) => sendDataPaneAction(element, action, value, key);
      }
    });
  }

  if (!behaviors) {
    return <View />;
  }

  let tabContents;
  switch (selectedTab) {
    case 'rules': {
      tabContents = <InspectorRules rules={behaviors.Rules} sendAction={sendActions.Rules} />;
      break;
    }
    case 'movement': {
      tabContents = <MovementTab sendActions={sendActions} behaviors={behaviors} />;
      break;
    }
    case 'general':
    default: {
      tabContents = (
        <GeneralTab
          sendActions={sendActions}
          behaviors={behaviors}
          isTextActorSelected={isTextActorSelected}
        />
      );
    }
  }

  return tabContents;
};
