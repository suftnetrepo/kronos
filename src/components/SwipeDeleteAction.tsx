import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
} from "react-native";
import { StyledPressable, Stack } from "fluent-styles";
import { TrashIcon } from "../icons/ui";
import { Text } from "./text";
import type { ViewStyle } from "react-native";

interface SwipeDeleteActionProps {
  children: React.ReactNode;
  onDelete: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  isOpen?: boolean;
  destructiveColor: string;
  itemId?: string; // Unique ID to detect list re-renders/recycling
}

/**
 * SwipeDeleteAction wraps content with a swipe-to-reveal delete action.
 * Swipe from right to left to reveal the delete button.
 */
export const SwipeDeleteAction: React.FC<SwipeDeleteActionProps> = ({
  children,
  onDelete,
  onOpenChange,
  isOpen = false,
  destructiveColor,
  itemId,
}) => {
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const maxScroll = -80; // Width of the delete action button

  // Initialize to closed state on mount
  useEffect(() => {
    scrollOffset.setValue(0);
    return () => {
      scrollOffset.setValue(0);
    };
  }, [scrollOffset]);

  // Reset to closed when itemId changes (list re-render/recycle)
  useEffect(() => {
    scrollOffset.setValue(0);
  }, [itemId, scrollOffset]);

  // Initialize pan responder with useMemo to ensure it's always available
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Constrain movement between 0 and maxScroll (never go positive to prevent right overshoot)
        let newValue = -gestureState.dx;
        // Hard clamp: no positive values (prevents exposing delete background)
        if (newValue > 0) {
          newValue = 0;
        } else if (newValue < maxScroll) {
          newValue = maxScroll;
        }
        scrollOffset.setValue(newValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Snap to either open or closed state
        const threshold = 40; // Minimum swipe distance to open
        if (-gestureState.dx > threshold) {
          // Open
          Animated.spring(scrollOffset, {
            toValue: maxScroll,
            useNativeDriver: false,
          }).start();
          onOpenChange?.(true);
        } else {
          // Close
          Animated.spring(scrollOffset, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
          onOpenChange?.(false);
        }
      },
    });
  }, [scrollOffset, maxScroll, onOpenChange]);

  // Close when isOpen prop changes to false (hard reset, not spring)
  useEffect(() => {
    if (!isOpen) {
      scrollOffset.setValue(0);
    }
  }, [isOpen, scrollOffset]);

  return (
    <View style={styles.container}>
      {/* Delete action background (revealed when swiped) */}
      <StyledPressable
        style={[styles.deleteAction, { backgroundColor: destructiveColor }]}
        onPress={onDelete}
      >
        <Stack alignItems="center" justifyContent="center" gap={4}>
          <TrashIcon size={24} color="white" strokeWidth={2} />
          <Text
            variant="caption"
            color="white"
            style={{ fontWeight: "700" }}
          >
            Delete
          </Text>
        </Stack>
      </StyledPressable>

      {/* Swipeable content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX: scrollOffset }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  content: {
    zIndex: 1,
    width: "100%",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
});
