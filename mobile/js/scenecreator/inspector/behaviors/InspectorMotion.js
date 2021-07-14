import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BehaviorPropertyInputRow } from '../components/BehaviorPropertyInputRow';
import { useCoreState, sendBehaviorAction } from '../../../core/CoreEvents';

import * as Constants from '../../../Constants';
import * as SceneCreatorConstants from '../../SceneCreatorConstants';

const styles = StyleSheet.create({
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    paddingBottom: 16,
  },
  properties: {},
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 4,
    borderColor: Constants.colors.black,
    borderWidth: 1,
    borderBottomWidth: 2,
    marginBottom: 8,
  },
  segmentedControlLabels: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  segmentedControlItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderColor: Constants.colors.black,
    fontSize: 16,
  },
  segmentedControlItemSelected: {
    backgroundColor: Constants.colors.black,
  },
  segmentedControlLabelSelected: {
    color: Constants.colors.white,
    fontWeight: 'bold',
  },
  segmentedControlLabel: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  segmentedControlLabelText: {
    fontSize: 12,
    textAlign: 'center',
    color: Constants.colors.grayText,
  },
  segmentedControlLabelTextSelected: {
    color: Constants.colors.black,
  },
});

const BodyTypeControl = ({ isMovingActive, isRotatingMotionActive }) => {
  const sendDynamicAction = React.useCallback((...args) => sendBehaviorAction('Moving', ...args), [
    sendBehaviorAction,
  ]);
  const sendFixedAction = React.useCallback(
    (...args) => sendBehaviorAction('RotatingMotion', ...args),
    [sendBehaviorAction]
  );

  const items = [
    {
      name: 'None',
      label: 'Does not move',
      onSelect: () => {
        if (isMovingActive) {
          sendDynamicAction('remove');
        } else if (isRotatingMotionActive) {
          sendFixedAction('remove');
        }
      },
    },
    {
      name: 'Fixed',
      label: 'Moves at a constant rate',
      onSelect: () => {
        if (isMovingActive) {
          sendDynamicAction('swap', { name: 'RotatingMotion' });
        } else {
          sendFixedAction('add');
        }
      },
    },
    {
      name: 'Dynamic',
      label: 'Moved by other forces',
      onSelect: () => {
        if (isRotatingMotionActive) {
          sendFixedAction('swap', { name: 'Moving' });
        } else {
          sendDynamicAction('add');
        }
      },
    },
  ];

  const selectedItemIndex = isMovingActive ? 2 : isRotatingMotionActive ? 1 : 0;
  const onChange = (index) => {
    if (index !== selectedItemIndex) {
      items[index].onSelect();
    }
  };

  return (
    <React.Fragment>
      <View style={styles.segmentedControl}>
        {items.map((item, ii) => (
          <TouchableOpacity
            key={`item-${ii}`}
            onPress={() => onChange(ii)}
            style={[
              styles.segmentedControlItem,
              ii === selectedItemIndex ? styles.segmentedControlItemSelected : null,
              { width: `${(1 / items.length) * 100}%` },
              ii > 0 ? { borderLeftWidth: 1 } : null,
            ]}>
            <Text
              style={[
                styles.segmentedControlItem,
                ii === selectedItemIndex ? styles.segmentedControlLabelSelected : null,
              ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.segmentedControlLabels}>
        {items.map((item, ii) => (
          <View
            key={`label-${ii}`}
            style={[styles.segmentedControlLabel, { width: `${(1 / items.length) * 100}%` }]}>
            <Text
              style={[
                styles.segmentedControlLabelText,
                ii == selectedItemIndex ? styles.segmentedControlLabelTextSelected : null,
              ]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </React.Fragment>
  );
};

export default InspectorMotion = ({ moving, rotatingMotion, selectedActorData }) => {
  let activeBehavior, activeBehaviorSendAction, activeComponent;
  const movingComponent = useCoreState('EDITOR_SELECTED_COMPONENT:Moving');
  const rotatingMotionComponent = useCoreState('EDITOR_SELECTED_COMPONENT:RotatingMotion');
  const isMovingActive = selectedActorData.behaviors.Moving?.isActive;
  const isRotatingMotionActive = selectedActorData.behaviors.RotatingMotion?.isActive;

  let rotationPropertyName, rotatingPropSendAction, rotationPropertyDisplayValue;
  if (isMovingActive) {
    // dynamic body
    activeBehavior = moving;
    activeComponent = movingComponent;
    activeBehaviorSendAction = (...args) => sendBehaviorAction('Moving', ...args);
    rotatingPropSendAction = activeBehaviorSendAction;
    rotationPropertyName = 'angularVelocity';
  } else if (isRotatingMotionActive) {
    // kinematic body
    activeBehavior = rotatingMotion;
    activeComponent = rotatingMotionComponent;

    // need to reconcile units because engine's rotating motion is expressed in full rotations
    // per second, while moving is expressed in degrees
    rotatingPropSendAction = (action, property, value) =>
      sendBehaviorAction('RotatingMotion', action, property, value / 360);
    activeBehaviorSendAction = (...args) => sendBehaviorAction('RotatingMotion', ...args);
    rotationPropertyName = 'rotationsPerSecond';
    rotationPropertyDisplayValue = (value) => value * 360;
  }

  return (
    <View style={SceneCreatorConstants.styles.behaviorContainer}>
      <Text style={SceneCreatorConstants.styles.behaviorHeader}>
        <Text style={SceneCreatorConstants.styles.behaviorHeaderName}>Motion</Text>
      </Text>
      <View style={SceneCreatorConstants.styles.behaviorProperties}>
        <BodyTypeControl
          isMovingActive={isMovingActive}
          isRotatingMotionActive={isRotatingMotionActive}
        />
        {activeBehavior && activeComponent ? (
          <React.Fragment>
            <BehaviorPropertyInputRow
              behavior={activeBehavior}
              component={activeComponent}
              propName="vx"
              label="X velocity"
              sendAction={activeBehaviorSendAction}
            />
            <BehaviorPropertyInputRow
              behavior={activeBehavior}
              component={activeComponent}
              propName="vy"
              label="Y velocity"
              sendAction={activeBehaviorSendAction}
            />
            <BehaviorPropertyInputRow
              behavior={activeBehavior}
              component={activeComponent}
              propName={rotationPropertyName}
              label="Rotational velocity"
              sendAction={rotatingPropSendAction}
              displayValue={rotationPropertyDisplayValue}
            />
            {activeBehavior == moving ? (
              <BehaviorPropertyInputRow
                behavior={activeBehavior}
                component={activeComponent}
                propName="density"
                label="Density"
                step={0.1}
                sendAction={activeBehaviorSendAction}
              />
            ) : null}
          </React.Fragment>
        ) : null}
      </View>
    </View>
  );
};
