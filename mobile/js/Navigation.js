import React from 'react';
import { enableScreens } from 'react-native-screens';
import { createNativeStackNavigator } from 'react-native-screens/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useSession } from './Session';

import { LoginScreen, CreateAccountScreen, ForgotPasswordScreen } from './AuthScreens';
import { CreateScreen } from './create/CreateScreen';
import { CreateDeckNavigator } from './create/CreateDeckNavigator';
import { HomeScreen } from './home/HomeScreen';
import { NotificationsScreen } from './notifications/NotificationsScreen';
import { PlayDeckScreen } from './play/PlayDeckScreen';
import { ViewSourceNavigator } from './create/ViewSourceNavigator';
import * as DeepLinks from './DeepLinks';
import { ProfileScreen } from './profile/ProfileScreen';
import * as GhostChannels from './ghost/GhostChannels';

import FastImage from 'react-native-fast-image';

enableScreens();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICON_SIZE = 28;

// App UI layout

const BrowseNavigator = () => (
  <Stack.Navigator
    initialRouteName="HomeScreen"
    screenOptions={{
      headerShown: false,
    }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="PlayDeck" component={PlayDeckScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen
      name="ViewSource"
      component={ViewSourceNavigator}
      options={{ gestureEnabled: false }}
    />
  </Stack.Navigator>
);

const CreateNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}>
    <Stack.Screen
      name="Create"
      component={CreateScreen}
      options={{
        title: 'Create',
      }}
    />
    <Stack.Screen
      name="CreateDeck"
      component={CreateDeckNavigator}
      options={{ gestureEnabled: false }}
    />
  </Stack.Navigator>
);

const NotificationsNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

const ProfileNavigator = () => (
  <Stack.Navigator
    initialRouteName="Profile"
    screenOptions={{
      headerShown: false,
    }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="PlayDeck" component={PlayDeckScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen
      name="ViewSource"
      component={ViewSourceNavigator}
      options={{ gestureEnabled: false }}
    />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Browse"
    tabBarOptions={{
      activeTintColor: '#fff',
      inactiveTintColor: '#888',
      style: {
        borderTopColor: '#888',
        backgroundColor: '#000',
      },
      showLabel: false,
    }}>
    <Tab.Screen
      name="Browse"
      component={BrowseNavigator}
      options={({ route }) => ({
        tabBarVisible: !route.state || route.state.index == 0,
        tabBarIcon: ({ focused, color }) => {
          return (
            <FastImage
              tintColor={color}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
              }}
              source={require('../assets/images/BottomTabs-browse.png')}
            />
          );
        },
      })}
    />
    <Tab.Screen
      name="Create"
      component={CreateNavigator}
      options={({ route }) => ({
        tabBarVisible: !route.state || route.state.index == 0,
        tabBarIcon: ({ focused, color }) => {
          return (
            <FastImage
              tintColor={color}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
              }}
              source={require('../assets/images/BottomTabs-create.png')}
            />
          );
        },
      })}
    />
    <Tab.Screen
      name="Notifications"
      component={NotificationsNavigator}
      options={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          return (
            <Image
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                tintColor: color,
              }}
              source={require('../assets/images/BottomTabs-profile.png')}
            />
          );
        },
      })}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileNavigator}
      options={({ route }) => ({
        tabBarVisible: !route.state || route.state.index == 0,
        tabBarIcon: ({ focused, color }) => {
          return (
            <FastImage
              tintColor={color}
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
              }}
              source={require('../assets/images/BottomTabs-profile.png')}
            />
          );
        },
      })}
    />
  </Tab.Navigator>
);

const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}>
    <Stack.Screen name="LoginScreen" component={LoginScreen} />
    <Stack.Screen name="CreateAccountScreen" component={CreateAccountScreen} />
    <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

function onNavigationStateChange(state) {
  GhostChannels.globalPause();
}

// https://reactnavigation.org/docs/themes/
const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#000',
  },
};

export const RootNavigator = () => {
  const { isSignedIn } = useSession();
  return (
    <NavigationContainer
      theme={NavigationTheme}
      ref={DeepLinks.setNavigationRef}
      onStateChange={onNavigationStateChange}>
      {isSignedIn ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
