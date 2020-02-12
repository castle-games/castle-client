import React, { useState, Fragment } from 'react';
import { View, Text, StatusBar, Clipboard } from 'react-native';
import FastImage from 'react-native-fast-image';

import { TouchableOpacity } from 'react-native-gesture-handler';

import * as MainSwitcher from './MainSwitcher';

// The bar displaying the invite link
const InviteBar = ({ url }) => {
  const [copied, setCopied] = useState(false);

  return (
    <View
      style={{
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: '#222',
      }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          backgroundColor: '#222',
          borderRadius: 4,
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}
        onPress={() => {
          Clipboard.setString(url);
          setCopied(true);
        }}>
        <Text style={{ flex: 1, color: '#fff' }}>{copied ? 'Copied!' : url}</Text>
        <FastImage
          style={{
            flex: 0,
            width: 24,
            height: 12,
          }}
          source={require('../assets/images/hyperlink.png')}
        />
      </TouchableOpacity>
    </View>
  );
};

const GameHeader = ({
  game,
  sessionId,
  onPressReload,
  onPressNextInputsMode,
  onPressSwitchActionKeyCode,
  onPressToggleLogsVisible,
  onPressBack,
}) => {
  const [inviting, setInviting] = useState(false);

      //<StatusBar backgroundColor="#000" barStyle="light-content" />

  return (
    <Fragment>
      <View
        style={{
          width: '100%',
          backgroundColor: '#000',
          borderBottomWidth: 1,
          borderColor: '#222',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}>
        <TouchableOpacity
          style={{
            paddingBottom: 8,
            paddingHorizontal: 16,
          }}
          onPress={() => {
            if (onPressBack) {
              onPressBack();
            } else {
              MainSwitcher.switchTo('navigator');
            }
          }}>
          <Text style={{ color: '#bbb' }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingBottom: 8,
            paddingHorizontal: 16,
          }}
          onPress={onPressReload}>
          <Text style={{ color: '#bbb' }}>Reload</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingBottom: 8,
            paddingHorizontal: 16,
          }}
          onPress={onPressToggleLogsVisible}>
          <Text style={{ color: '#bbb' }}>Logs</Text>
        </TouchableOpacity>
        {sessionId ? (
          <TouchableOpacity
            style={{
              paddingBottom: 8,
              paddingHorizontal: 16,
            }}
            onPress={() => {
              if (inviting) {
                setInviting(false);
              } else {
                setInviting(true);
              }
            }}>
            <Text style={{ color: '#bbb' }}>Invite</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={{
            paddingBottom: 8,
            paddingHorizontal: 16,
          }}
          onPress={onPressNextInputsMode}>
          <Text style={{ color: '#bbb' }}>Controls</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            paddingBottom: 8,
            paddingHorizontal: 16,
          }}
          onPress={onPressSwitchActionKeyCode}>
          <Text style={{ color: '#bbb' }}>Button</Text>
        </TouchableOpacity>
      </View>
      {inviting ? <InviteBar url={game.url + '#' + sessionId} /> : null}
    </Fragment>
  );
};

export default GameHeader;
