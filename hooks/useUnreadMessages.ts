import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import { useAuth } from "../contexts/AuthContext";
import MessagingService from "../services/api/MessagingService";
import { useSocket } from "./useSocket";

type UnreadMessagesState = {
  unreadConversationCount: number;
  isLoading: boolean;
  lastUpdatedAt?: number;
};

/**
 * Unread messages badge state for the Messages tab.
 *
 * Requirement:
 * - Show a red badge with the number of conversations that have unread messages.
 * - Hide the badge when the count is 0.
 * - Update in real time when receiving new messages or when messages are marked read.
 */
export const useUnreadMessages = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [state, setState] = useState<UnreadMessagesState>({
    unreadConversationCount: 0,
    isLoading: false,
  });

  const isRefreshingRef = useRef(false);
  const scheduledRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const refresh = useCallback(async () => {
    if (!user?._id) {
      setState((prev) => ({
        ...prev,
        unreadConversationCount: 0,
        isLoading: false,
      }));
      return;
    }

    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const conversations = await MessagingService.getUserConversations(1, 100);
      const unreadConversationCount = (conversations ?? []).filter(
        (c: any) => (c?.unreadCount ?? 0) > 0
      ).length;

      setState({
        unreadConversationCount,
        isLoading: false,
        lastUpdatedAt: Date.now(),
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    } finally {
      isRefreshingRef.current = false;
    }
  }, [user?._id]);

  const scheduleRefresh = useCallback(
    (delayMs: number = 350) => {
      if (scheduledRefreshTimerRef.current) {
        clearTimeout(scheduledRefreshTimerRef.current);
      }
      scheduledRefreshTimerRef.current = setTimeout(() => {
        refresh();
      }, delayMs);
    },
    [refresh]
  );

  // Initial load + refresh when app comes to foreground
  useEffect(() => {
    refresh();

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        scheduleRefresh(0);
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      sub.remove();
      if (scheduledRefreshTimerRef.current) {
        clearTimeout(scheduledRefreshTimerRef.current);
      }
    };
  }, [refresh, scheduleRefresh]);

  // Socket-driven real-time updates
  useEffect(() => {
    const cleanupNewMessage = socket.onNewMessage(() => {
      scheduleRefresh();
    });

    const cleanupMessagesRead = socket.onMessagesRead(() => {
      scheduleRefresh();
    });

    const cleanupMessageDeleted = socket.onMessageDeleted(() => {
      scheduleRefresh();
    });

    const cleanupConversationDeleted = socket.onConversationDeleted(() => {
      scheduleRefresh();
    });

    return () => {
      cleanupNewMessage?.();
      cleanupMessagesRead?.();
      cleanupMessageDeleted?.();
      cleanupConversationDeleted?.();
    };
  }, [scheduleRefresh, socket]);

  return {
    unreadConversationCount: state.unreadConversationCount,
    isLoading: state.isLoading,
    refresh,
  };
};
