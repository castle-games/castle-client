import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddBehaviorSheet } from './components/AddBehaviorSheet';
import { useCardCreator } from '../CreateCardContext';
import { SaveBlueprintSheet } from './components/SaveBlueprintSheet';

import * as SceneCreatorConstants from '../SceneCreatorConstants';
import * as Inspector from './behaviors/InspectorBehaviors';
import * as InspectorUtilities from './InspectorUtilities';

const styles = StyleSheet.create({
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  blueprintContainer: {
    padding: 16,
    alignItems: 'center',
  },
  blueprintTitle: {
    fontWeight: 'bold',
    paddingBottom: 16,
    fontSize: 16,
  },
});

const GeneralTab = ({ behaviors, sendActions, addChildSheet }) => {
  const { isTextActorSelected } = useCardCreator();
  return (
    <React.Fragment>
      <View style={styles.blueprintContainer}>
        <TouchableOpacity
          style={SceneCreatorConstants.styles.button}
          onPress={() =>
            addChildSheet({
              key: 'saveBlueprint',
              Component: SaveBlueprintSheet,
            })
          }>
          <Text style={SceneCreatorConstants.styles.buttonLabel}>Save blueprint</Text>
        </TouchableOpacity>
      </View>
      {isTextActorSelected && (
        <React.Fragment>
          <Inspector.TextContent text={behaviors.Text} sendAction={sendActions.Text} />
          <Inspector.TextLayout text={behaviors.Text} sendAction={sendActions.Text} />
        </React.Fragment>
      )}
      {!isTextActorSelected && (
        <Inspector.Drawing drawing2={behaviors.Drawing2} sendAction={sendActions.Drawing2} />
      )}
      <Inspector.Tags tags={behaviors.Tags} sendAction={sendActions.Tags} />

      {!isTextActorSelected && (
        <Inspector.Layout
          body={behaviors.Body}
          circleShape={behaviors.CircleShape}
          sendActions={sendActions}
        />
      )}
    </React.Fragment>
  );
};

const MovementTab = ({ behaviors, sendActions, addChildSheet }) => {
  let movementBehaviors = InspectorUtilities.filterAvailableBehaviors({
    allBehaviors: behaviors,
    possibleBehaviors: Inspector.MotionBehaviors.reduce(
      (behaviors, group) => behaviors.concat(group.behaviors),
      []
    ),
  });

  return (
    <React.Fragment>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={SceneCreatorConstants.styles.button}
          onPress={() =>
            addChildSheet({
              key: 'addBehavior',
              Component: AddBehaviorSheet,
              behaviors,
              addBehavior: (key) => sendActions[key]('add'),
            })
          }>
          <Text style={SceneCreatorConstants.styles.buttonLabel}>Add a behavior</Text>
        </TouchableOpacity>
      </View>
      <Inspector.Motion
        moving={behaviors.Moving}
        rotatingMotion={behaviors.RotatingMotion}
        sendActions={sendActions}
      />
      {movementBehaviors &&
        movementBehaviors
          .filter((name) => behaviors[name]?.isActive)
          .map((name) => {
            let Component = Inspector[name] ?? Inspector.Behavior;
            return (
              <Component
                key={`behavior-${name}`}
                behavior={behaviors[name]}
                sendAction={sendActions[name]}
              />
            );
          })}
    </React.Fragment>
  );
};

export const InspectorTabs = ({ selectedTab, addChildSheet }) => {
  const { behaviors, behaviorActions: sendActions } = useCardCreator();

  if (!behaviors) {
    return <View />;
  }

  let tabContents;
  switch (selectedTab) {
    case 'rules': {
      tabContents = (
        <Inspector.Rules
          behaviors={behaviors}
          sendActions={sendActions}
          addChildSheet={addChildSheet}
        />
      );
      break;
    }
    case 'movement': {
      tabContents = (
        <MovementTab
          sendActions={sendActions}
          behaviors={behaviors}
          addChildSheet={addChildSheet}
        />
      );
      break;
    }
    case 'general':
    default: {
      tabContents = (
        <GeneralTab sendActions={sendActions} behaviors={behaviors} addChildSheet={addChildSheet} />
      );
    }
  }

  return tabContents;
};
