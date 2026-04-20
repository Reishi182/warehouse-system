/**
 * ═══════════════════════════════════════════════════════════════════
 * TAB LEADER ELECTION — Single Realtime Subscription per Browser
 * ═══════════════════════════════════════════════════════════════════
 *
 * Problem: Every browser tab opens its own Supabase Realtime channels.
 * With 3 tabs open → 3× subscriptions → 3× entries in realtime.subscription
 * → 3× postgres_changes evaluations per WAL event → 3× DB cost.
 *
 * Solution: Use the Web BroadcastChannel API to run a leader election.
 * Only ONE tab (the "leader") subscribes to Realtime at any given time.
 * When the leader tab closes, followers elect a new leader within seconds.
 *
 * This is 100% free — BroadcastChannel is a native browser API (no library).
 * Supported: Chrome 54+, Firefox 38+, Edge 79+, Safari 15.4+
 *
 * Usage:
 *   const isLeader = useTabLeader();
 *   if (isLeader) {
 *     // set up Supabase Realtime subscriptions here
 *   }
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';

const CHANNEL_NAME = 'warehouse-tab-leader-v1';
const HEARTBEAT_INTERVAL_MS = 2000;  // Leader pings every 2s
const LEADER_TIMEOUT_MS = 6000;      // Follower waits 6s before claiming leadership

type LeaderMessage =
    | { type: 'HEARTBEAT'; leaderId: string }
    | { type: 'CLAIM'; leaderId: string }
    | { type: 'RESIGN'; leaderId: string };

/**
 * Returns `true` if this tab is currently the elected leader.
 * Only the leader tab should open Supabase Realtime subscriptions.
 */
export function useTabLeader(): boolean {
    const [isLeader, setIsLeader] = useState(false);
    const tabId = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const leaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentLeaderIdRef = useRef<string | null>(null);
    const isLeaderRef = useRef(false);

    useEffect(() => {
        // BroadcastChannel not supported in some older environments
        if (typeof BroadcastChannel === 'undefined') {
            // Fallback: always be the leader (single-tab mode)
            setIsLeader(true);
            return;
        }

        const bc = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = bc;

        const claimLeadership = () => {
            isLeaderRef.current = true;
            setIsLeader(true);
            currentLeaderIdRef.current = tabId.current;
            console.log(`[TabLeader] 👑 Tab ${tabId.current} is now the LEADER`);

            // Broadcast claim so other tabs know
            bc.postMessage({ type: 'CLAIM', leaderId: tabId.current } satisfies LeaderMessage);

            // Start heartbeat so followers know we're alive
            heartbeatRef.current = setInterval(() => {
                bc.postMessage({ type: 'HEARTBEAT', leaderId: tabId.current } satisfies LeaderMessage);
            }, HEARTBEAT_INTERVAL_MS);
        };

        const resignLeadership = () => {
            if (!isLeaderRef.current) return;
            isLeaderRef.current = false;
            setIsLeader(false);
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
            bc.postMessage({ type: 'RESIGN', leaderId: tabId.current } satisfies LeaderMessage);
            console.log(`[TabLeader] Tab ${tabId.current} resigned leadership`);
        };

        const resetLeaderTimeout = () => {
            if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current);
            leaderTimeoutRef.current = setTimeout(() => {
                // No heartbeat received in time → current leader is gone → claim leadership
                console.log(`[TabLeader] Leader timed out, ${tabId.current} claiming leadership`);
                claimLeadership();
            }, LEADER_TIMEOUT_MS);
        };

        bc.onmessage = (event: MessageEvent<LeaderMessage>) => {
            const msg = event.data;

            if (msg.type === 'HEARTBEAT' || msg.type === 'CLAIM') {
                // Another tab is (still) the leader
                if (isLeaderRef.current && msg.leaderId !== tabId.current) {
                    // Two leaders detected (race condition on startup) — lower ID wins
                    if (msg.leaderId < tabId.current) {
                        resignLeadership();
                    }
                    return;
                }
                currentLeaderIdRef.current = msg.leaderId;
                resetLeaderTimeout(); // Reset our wait timer
            }

            if (msg.type === 'RESIGN') {
                // Leader explicitly resigned → immediately try to claim
                if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current);
                claimLeadership();
            }
        };

        // On startup: wait briefly to hear from any existing leader.
        // Use a small random jitter to avoid all tabs claiming at once.
        const jitter = Math.random() * 500;
        leaderTimeoutRef.current = setTimeout(() => {
            // If no leader has spoken after the initial timeout, claim leadership
            if (!currentLeaderIdRef.current) {
                claimLeadership();
            } else {
                // A leader exists — start the ongoing timeout guard
                resetLeaderTimeout();
            }
        }, 1000 + jitter);

        // Resign when the tab closes
        const handleUnload = () => resignLeadership();
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            resignLeadership();
            if (leaderTimeoutRef.current) clearTimeout(leaderTimeoutRef.current);
            bc.close();
        };
    }, []);

    return isLeader;
}
