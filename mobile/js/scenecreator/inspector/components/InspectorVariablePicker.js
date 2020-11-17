import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PopoverButton } from '../../PopoverProvider';
import { DropdownItemsList } from './InspectorDropdown';

import uuid from 'uuid/v4';

import * as SceneCreatorConstants from '../../SceneCreatorConstants';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  box: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    padding: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activeBox: {
    borderBottomWidth: 1,
    marginBottom: 1,
    borderStyle: 'dashed',
  },
  label: {
    fontSize: 16,
  },
});

export const InspectorVariablePicker = ({ value, onChange, style, context, ...props }) => {
  const items = context.variables || [];
  const { onVariablesChange } = context;

  let selectedItem;
  if (value && value !== 'none') {
    selectedItem = items.find((item) => item.id === value);
  }

  const addVariable = React.useCallback(
    (name) => {
      if (name) {
        name = name.replace(/\s/g, '');
        if (!name?.length) {
          return;
        }
        const existing = items?.length ? items : [];
        const newVariableId = uuid();
        onVariablesChange(
          [{ ...SceneCreatorConstants.EMPTY_VARIABLE, name, id: newVariableId }].concat(existing)
        );
        onChange(newVariableId);
      }
    },
    [items, onChange, onVariablesChange]
  );

  const popover = {
    Component: DropdownItemsList,
    items,
    selectedItem,
    height: 192,
    onSelectItem: (item) => onChange(item.id),
    showAddItem: true,
    onAddItem: addVariable,
  };

  let valueLabel = selectedItem ? selectedItem.name : '(none)';

  return (
    <View style={[styles.container, style]} {...props}>
      <PopoverButton
        style={styles.box}
        activeStyle={[styles.box, styles.activeBox]}
        popover={popover}>
        <Text>{valueLabel}</Text>
      </PopoverButton>
    </View>
  );
};
