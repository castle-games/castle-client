import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOptimisticBehaviorValue } from '../InspectorUtilities';
import { InspectorNumberInput } from '../components/InspectorNumberInput';
import { InspectorCheckbox } from '../components/InspectorCheckbox';

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    paddingRight: 0,
  },
  label: {
    fontWeight: 'bold',
    paddingBottom: 16,
    fontSize: 16,
  },
  properties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    paddingRight: 16,
  },
  inputContainer: {
    width: '50%',
    paddingRight: 16,
    paddingBottom: 16,
  },
  inputLabel: {
    paddingBottom: 4,
    fontSize: 16,
  },
});

const LayoutInput = ({ behavior, propName, label, sendAction }) => {
  const [lastNativeUpdate, setLastNativeUpdate] = React.useState(0);
  const [value, sendValue] = useOptimisticBehaviorValue({
    behavior,
    propName,
    sendAction,
    onNativeUpdate: () => setLastNativeUpdate(lastNativeUpdate + 1),
  });

  const onChange = React.useCallback(
    (value) => {
      if (behavior.isActive) {
        sendValue(`set:${propName}`, value);
      }
    },
    [behavior.isActive, sendValue]
  );

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <InspectorNumberInput
        value={value}
        lastNativeUpdate={lastNativeUpdate}
        onChange={onChange}
        {...behavior.propertySpecs[propName].props}
      />
    </View>
  );
};

export default InspectorLayout = ({ body, circleShape, sendActions }) => {
  const onChangeCircleShape = React.useCallback(
    (value) => {
      if (value) {
        return sendActions.CircleShape('add');
      } else {
        return sendActions.CircleShape('remove');
      }
    },
    [sendActions.circleShape]
  );

  const [visible, setVisibleAction] = useOptimisticBehaviorValue({
    behavior: body,
    propName: 'visible',
    sendAction: sendActions.Body,
  });
  const onChangeVisible = React.useCallback(
    (visible) => {
      setVisibleAction('set:visible', visible);
    },
    [setVisibleAction]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Layout</Text>
      <View style={styles.properties}>
        {circleShape?.isActive ? (
          <LayoutInput
            behavior={circleShape}
            propName="radius"
            label="Radius"
            sendAction={sendActions.CircleShape}
          />
        ) : (
          <React.Fragment>
            <LayoutInput
              behavior={body}
              propName="width"
              label="Width"
              sendAction={sendActions.Body}
            />
            <LayoutInput
              behavior={body}
              propName="height"
              label="Height"
              sendAction={sendActions.Body}
            />
          </React.Fragment>
        )}
        <LayoutInput
          behavior={body}
          propName="x"
          label="X Position"
          sendAction={sendActions.Body}
        />
        <LayoutInput
          behavior={body}
          propName="y"
          label="Y Position"
          sendAction={sendActions.Body}
        />
        <LayoutInput
          behavior={body}
          propName="angle"
          label="Rotation"
          sendAction={sendActions.Body}
        />
      </View>
      <View style={styles.row}>
        <InspectorCheckbox value={visible} onChange={onChangeVisible} label="Visible" />
      </View>
    </View>
  );
};
