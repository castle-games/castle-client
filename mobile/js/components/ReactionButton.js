import React from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import * as Constants from '../Constants';

import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  tension: 100,
  friction: 50,
  overshootClamping: true,
  useNativeDriver: true,
};

const styles = StyleSheet.create({
  container: {
    ...Constants.styles.dropShadow,

    // TODO: actual react button
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexShrink: 0,
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const ReactionButton = () => {
  const buttonScale = React.useRef(new Animated.Value(1)).current;
  const onPress = React.useCallback(() => {
    Animated.stagger(100, [
      Animated.spring(buttonScale, { toValue: 2, ...SPRING_CONFIG }),
      Animated.spring(buttonScale, { toValue: 1, ...SPRING_CONFIG }),
    ]).start();
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.container, { transform: [{ scale: buttonScale }] }]}>
      <FontAwesome5 name="fire-alt" size={24} color="#000" />
    </AnimatedPressable>
  );
};
