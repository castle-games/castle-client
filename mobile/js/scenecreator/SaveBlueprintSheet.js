import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useGhostUI } from '../ghost/GhostUI';
import { sendDataPaneAction } from '../Tools';

import BottomSheetHeader from './BottomSheetHeader';
import CardCreatorBottomSheet from './CardCreatorBottomSheet';

import * as SceneCreatorConstants from './SceneCreatorConstants';

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
  label: {
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderTopWidth: 2,
    borderRadius: 3,
    borderColor: '#000',
    padding: 8,
    marginBottom: 8,
    color: '#000',
  },
  actions: {
    paddingVertical: 8,
  },
});

const SaveBlueprintForm = ({
  library,
  saveBlueprintData,
  isExisting,
  numOtherActors,
  sendAction,
  onClose,
}) => {
  const [title, setTitle] = React.useState(saveBlueprintData.title);
  const [description, setDescription] = React.useState(saveBlueprintData.description);

  // TODO: validate title and description

  let usedByLabel;
  if (isExisting) {
    if (numOtherActors == 0) {
      usedByLabel = 'No other actors use this blueprint.';
    } else if (numOtherActors == 1) {
      usedByLabel = 'One other actor uses this blueprint.';
    } else {
      usedByLabel = `${numOtherActors} other actors use this blueprint.`;
    }
  }

  const blueprintToSave = {
    ...saveBlueprintData,
    title,
    description,
  };

  let validationError;
  if (!blueprintToSave.title || !blueprintToSave.title.length) {
    validationError = 'The blueprint requires a title.';
  }
  if (!blueprintToSave.description || !blueprintToSave.description.length) {
    validationError = 'The blueprint requires a description.';
  }
  Object.entries(library).forEach(([entryId, entry]) => {
    if (
      entry.entryType === 'actorBlueprint' &&
      entry.title === blueprintToSave.title &&
      (!blueprintToSave.entryId || entryId !== blueprintToSave.entryId)
    ) {
      validationError =
        'This title is already used by another blueprint. Please enter a different title.';
    }
  });

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />
      <Text style={styles.label}>Description</Text>
      <TextInput value={description} onChangeText={setDescription} style={styles.input} />
      {isExisting ? <Text>{usedByLabel}</Text> : null}
      {validationError ? <Text>{validationError}</Text> : null}
      <View style={styles.actions}>
        {isExisting ? (
          <TouchableOpacity
            style={SceneCreatorConstants.styles.button}
            disabled={!!validationError}
            onPress={() => {
              sendAction('updateBlueprint', blueprintToSave);
              onClose();
            }}>
            <Text style={SceneCreatorConstants.styles.buttonLabel}>Update existing blueprint</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={SceneCreatorConstants.styles.button}
          disabled={!!validationError}
          onPress={() => {
            sendAction('addBlueprint', blueprintToSave);
            onClose();
          }}>
          <Text style={SceneCreatorConstants.styles.buttonLabel}>Save as new blueprint</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SaveBlueprintSheet = ({ isOpen, onClose, context }) => {
  let data, sendAction;

  const { root } = useGhostUI();
  const element = root?.panes ? root.panes['sceneCreatorBlueprints'] : null;
  if (element?.children.count) {
    Object.entries(element.children).forEach(([key, child]) => {
      if (child.type === 'data') {
        data = child.props.data;
        data.lastReportedEventId = child.lastReportedEventId;
        sendAction = (action, value) => sendDataPaneAction(element, action, value, key);
      }
    });
  }

  const renderHeader = () => <BottomSheetHeader title="Save blueprint" onClose={onClose} />;

  const renderContent = () => {
    if (!data) return <View />;

    return (
      <SaveBlueprintForm
        library={data.library}
        isExisting={data.isExisting}
        numOtherActors={data.numOtherActors}
        saveBlueprintData={data.saveBlueprintData}
        sendAction={sendAction}
        onClose={onClose}
      />
    );
  };

  return (
    <CardCreatorBottomSheet
      isOpen={isOpen}
      context={context}
      renderHeader={renderHeader}
      renderContent={renderContent}
    />
  );
};
