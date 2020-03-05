import React, { Fragment } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, Linking } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useQuery } from '@apollo/react-hooks';
import gql from 'graphql-tag';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { GameCard, GAME_CARD_FRAGMENT } from './HomeScreen';
import { useSession } from './Session';
import * as GameScreen from './GameScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfilePhoto = (props) => {
  const { loading: queryLoading, error: queryError, data: queryData } = useQuery(
    gql`
      query User($userId: ID!) {
        user(userId: $userId) {
          userId
          photo {
            fileId
            url
          }
        }
      }
    `,
    { variables: { userId: props.userId } }
  );

  return (
    <View
      style={{
        backgroundColor: '#eee',
        borderRadius: 1000000,
        overflow: 'hidden',
      }}>
      {queryLoading ? null : (
        <FastImage
          style={{
            width: '100%',
            aspectRatio: 1,
          }}
          source={{ uri: queryData.user.photo.url }}
        />
      )}
    </View>
  );
};

const ProfileScreen = () => {
  const { navigate } = useNavigation();
  const { signOutAsync } = useSession();

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content'); // needed for tab navigator
    }, [])
  );

  const { loading: queryLoading, error: queryError, data: queryData } = useQuery(gql`
    query Me {
      me {
        userId
        name
        username
        gameItems {
          gameId
          ...GameCard
        }
        websiteUrl
      }
    }
    ${GAME_CARD_FRAGMENT}
  `);

  const onPressLogOut = async () => {
    await signOutAsync();
    GameScreen.goToGame({});
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f2f2f2',
      }}>
      <StatusBar barStyle="dark-content" />
      {queryLoading || queryError ? null : (
        <Fragment>
          <SafeAreaView
            style={{
              width: '100%',
              alignItems: 'center',
              paddingBottom: 24,
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 1,
              },
              shadowOpacity: 0.2,
              shadowRadius: 1.41,
              elevation: 2,
            }}>
            <View style={{ width: 96, paddingVertical: 16 }}>
              <ProfilePhoto userId={queryData.me.userId} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontFamily: 'RTAliasGrotesk-Bold' }}>
                {queryData.me.name}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 18, fontFamily: 'RTAliasGrotesk-Regular' }}>
                @{queryData.me.username}
              </Text>
              <View style={{ marginTop: 16, flexDirection: 'row' }}>
                {queryData.me.websiteUrl ? (
                  <TouchableOpacity
                    style={{
                      marginRight: 16,
                    }}
                    onPress={() => {
                      Linking.openURL(queryData.me.websiteUrl);
                    }}>
                    <Text>{queryData.me.websiteUrl}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={onPressLogOut}>
                  <Text style={{ color: '#aaa' }}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
          <ScrollView
            contentContainerStyle={{
              padding: 8,
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}>
            {queryData.me.gameItems.map((game) => (
              <View style={{ width: '50%', padding: 8 }} key={game.gameId}>
                <GameCard game={game} />
              </View>
            ))}
          </ScrollView>
        </Fragment>
      )}
    </View>
  );
};

export default ProfileScreen;
