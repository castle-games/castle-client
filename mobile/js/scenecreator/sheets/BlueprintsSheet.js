import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheetHeader } from '../../components/BottomSheetHeader';
import { CardCreatorBottomSheet } from './CardCreatorBottomSheet';
import { sendDataPaneAction, useGhostUI } from '../../ghost/GhostUI';
import * as Constants from '../../Constants';

import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';

const styles = StyleSheet.create({
  container: {},
  itemContainer: {
    borderColor: Constants.colors.grayOnWhiteBorder,
    borderBottomWidth: 1,
    padding: 16,
    flexDirection: 'row',
  },
  preview: {
    width: 64,
    height: 64,
    borderRadius: 3,
    marginRight: 16,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 22,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  image: {
    width: 64,
    height: 64,
  },
  copyButton: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});

const CORE_BLUEPRINT_SORT_ORDER = ['Ball', 'Wall', 'Text box', 'Navigation button'];

const orderedEntries = (library, type = 'actorBlueprint') => {
  if (!library) return [];

  let entries = Object.entries(library).map(([entryId, entry]) => entry);
  entries = entries.filter((entry) => entry.entryType === type);
  entries = entries.sort((a, b) => {
    if (a.isCore !== b.isCore) {
      // sort all core entries after all custom entries
      return a.isCore ? 1 : -1;
    } else if (a.isCore && b.isCore) {
      // sort core entries according to prebaked order
      const aOrder = CORE_BLUEPRINT_SORT_ORDER.indexOf(a.title),
        bOrder = CORE_BLUEPRINT_SORT_ORDER.indexOf(b.title);
      if (aOrder !== -1 && bOrder !== -1) {
        return aOrder < bOrder ? -1 : 1;
      }
    }
    // sort all other entries alphabetically
    return a.title.localeCompare(b.title);
  });
  return entries;
};

const BlueprintItem = ({ entry, onPress, isRule, onPressCopy }) => {
  return (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
      <View style={[styles.preview, entry.base64Png ? null : { backgroundColor: '#ddd' }]}>
        {entry.base64Png ? (
          <FastImage
            source={{ uri: `data:image/png;base64,${entry.base64Png}` }}
            style={styles.image}
          />
        ) : null}
      </View>
      <View style={{ flexShrink: 1, width: '100%' }}>
        <Text style={styles.title}>{entry.title}</Text>
        <Text style={styles.description}>{entry.description}</Text>
      </View>
      {!entry.isCore && !isRule ? (
        <TouchableOpacity style={styles.copyButton} onPress={() => onPressCopy(entry.entryId)}>
          <Feather name="copy" size={24} color="#888" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

export const BlueprintsSheet = ({ element, isOpen, onClose, title, onSelectBlueprint, isRule }) => {
  if (!element) {
    return null;
  }

  let blueprintsData, sendAction;
  if (element.children.count) {
    Object.entries(element.children).forEach(([key, child]) => {
      if (child.type === 'data') {
        const data = child.props.data;
        blueprintsData = data;
        sendAction = (action, value) => sendDataPaneAction(element, action, value, key);
      }
    });
  }

  if (!onSelectBlueprint) {
    onSelectBlueprint = (entryId) => sendAction('addBlueprintToScene', entryId);
  }

  const copyBlueprint = React.useCallback(
    (entryId) => {
      // TODO: copy library entry for this id in JS
      const library = blueprintsData?.library;
      if (library) {
        const entry = library[entryId];
        // console.log(`copy entry: ${JSON.stringify(entry, null, 2)}`);
      }
    },
    [sendAction, blueprintsData]
  );

  const renderHeader = () => <BottomSheetHeader title={title ?? 'Blueprints'} onClose={onClose} />;

  const renderContent = () => (
    <View style={styles.container}>
      {!isOpen
        ? null
        : orderedEntries(blueprintsData?.library).map((entry, ii) => {
            if (entry.entryType === 'actorBlueprint') {
              return (
                <BlueprintItem
                  key={`blueprint-item-${ii}`}
                  entry={entry}
                  onPress={() => {
                    onSelectBlueprint(entry.entryId);
                    onClose();
                  }}
                  onPressCopy={copyBlueprint}
                  isRule={isRule}
                />
              );
            } else return null;
          })}
    </View>
  );

  return (
    <CardCreatorBottomSheet
      isOpen={isOpen}
      renderHeader={renderHeader}
      renderContent={renderContent}
    />
  );
};

// needed when the blueprints sheet is used outside of the CardCreatorSheetManager root sheets
export const RuleBlueprintsSheet = (props) => {
  const { root } = useGhostUI();
  const element = root?.panes ? root.panes['sceneCreatorBlueprints'] : null;
  return <BlueprintsSheet {...props} element={element} isRule />;
};
