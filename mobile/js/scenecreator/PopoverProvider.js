import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import Viewport from '../viewport';

const { vw, vh } = Viewport;

/**
 * Usage:
 *
 * const MyContentComponent = ({ name }) => <Text>Hello {name}, it's the popover contents</Text>;
 *
 * <PopoverButton popover={{ Component: MyContentComponent, name: 'ben' }} style={blah}>
 *   <Text>This button launches a popover next to itself when pressed</Text>
 * </PopoverButton>
 */

const styles = StyleSheet.create({
  boundary: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  popover: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
  },
  empty: {
    padding: 16,
  },
});

const PopoverContext = React.createContext({});
export const usePopover = () => React.useContext(PopoverContext);

const PopoverEmptyContents = () => (
  <View style={styles.empty}>
    <Text>The popover!!!</Text>
  </View>
);

const POPOVER_MARGIN = 16;
const EMPTY_POPOVER = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  Component: PopoverEmptyContents,
};

const Popover = () => {
  const { currentPopover, closePopover } = usePopover();
  let { x, y, width, height, Component, measureRef, visible, ...props } = currentPopover;

  let [position, setPosition] = React.useState({ left: undefined, top: undefined });
  React.useEffect(() => {
    if (measureRef) {
      measureRef.measure((x, y, anchorWidth, anchorHeight, anchorLeft, anchorTop) => {
        let popoverLeft = anchorLeft + anchorWidth * 0.5 - width * 0.5;
        let popoverTop = anchorTop - height - POPOVER_MARGIN;

        // constrain to screen
        // TODO: flip orientation instead of moving
        if (popoverLeft < POPOVER_MARGIN) {
          popoverLeft = POPOVER_MARGIN;
        } else if (popoverLeft + width > vw * 100) {
          popoverLeft = vw * 100 - width - POPOVER_MARGIN;
        }
        if (popoverTop < POPOVER_MARGIN) {
          popoverTop = POPOVER_MARGIN;
        } else if (popoverTop + height > vh * 100) {
          popoverTop = vh * 100 - height - POPOVER_MARGIN;
        }

        setPosition({ left: popoverLeft, top: popoverTop });
      });
    } else if (x !== undefined && y !== undefined) {
      setPosition({ left: x, top: y });
    }
  }, [measureRef, x, y]);

  if (!visible || position.left === undefined || position.top === undefined) {
    return null;
  }
  return (
    <React.Fragment>
      <TouchableWithoutFeedback onPress={closePopover}>
        <View style={styles.boundary} />
      </TouchableWithoutFeedback>
      <View style={[styles.popover, { left: position.left, top: position.top, width, height }]}>
        <Component {...props} />
      </View>
    </React.Fragment>
  );
};

export const PopoverButton = ({ popover, children, ...props }) => {
  const { showPopover } = usePopover();
  const container = React.useRef(null);
  const onPress = () => showPopover({ measureRef: container.current, ...popover });
  return (
    <TouchableOpacity ref={container} onPress={onPress} {...props}>
      {children}
    </TouchableOpacity>
  );
};

export const PopoverProvider = (props) => {
  const [state, setState] = React.useState({
    visible: false,
    ...EMPTY_POPOVER,
  });

  const showPopover = React.useCallback(
    (props) => setState({ visible: true, ...EMPTY_POPOVER, ...props }),
    [setState]
  );
  const closePopover = React.useCallback(() => setState({ visible: false, ...EMPTY_POPOVER }), []);

  const value = {
    currentPopover: {
      ...state,
    },
    showPopover,
    closePopover,
  };

  return (
    <PopoverContext.Provider value={value}>
      {props.children}
      <Popover />
    </PopoverContext.Provider>
  );
};
