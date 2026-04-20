import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

// ============================================
// TYPES
// ============================================

export interface NotificationPayload {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
}

export interface FailedNotification {
    id: string;
    userId: string;
    payload: NotificationPayload;
    retryCount: number;
    lastAttempt: number;
    error: string;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

// ============================================
// NOTIFICATION QUEUE (Failed Notification Storage)
// ============================================

class NotificationQueue {
    private queue: FailedNotification[] = [];
    private readonly maxRetries = 3;
    private readonly retryDelays = [1000, 3000, 10000]; // Exponential backoff
    private isProcessing = false;

    add(notification: FailedNotification) {
        // Prevent duplicates
        if (!this.queue.find(n => n.id === notification.id)) {
            this.queue.push(notification);
            this.saveToStorage();
            console.log(`[NotificationQueue] Added failed notification: ${notification.id}`);
        }
    }

    remove(id: string) {
        this.queue = this.queue.filter(n => n.id !== id);
        this.saveToStorage();
    }

    getAll(): FailedNotification[] {
        return [...this.queue];
    }

    getPending(): FailedNotification[] {
        return this.queue.filter(n => n.retryCount < this.maxRetries);
    }

    private saveToStorage() {
        try {
            localStorage.setItem('failed_notifications', JSON.stringify(this.queue));
        } catch (e) {
            console.warn('[NotificationQueue] Failed to save to localStorage:', e);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('failed_notifications');
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`[NotificationQueue] Loaded ${this.queue.length} failed notifications from storage`);
            }
        } catch (e) {
            console.warn('[NotificationQueue] Failed to load from localStorage:', e);
        }
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const pending = this.getPending();

        for (const notification of pending) {
            const delay = this.retryDelays[Math.min(notification.retryCount, this.retryDelays.length - 1)];
            const timeSinceLastAttempt = Date.now() - notification.lastAttempt;

            if (timeSinceLastAttempt < delay) continue;

            console.log(`[NotificationQueue] Retrying notification ${notification.id} (attempt ${notification.retryCount + 1})`);

            try {
                const { error } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: notification.userId,
                        title: notification.payload.title,
                        message: notification.payload.message,
                        type: notification.payload.type,
                        link: notification.payload.link,
                        read: false,
                    });

                if (error) throw error;

                console.log(`[NotificationQueue] Successfully sent notification ${notification.id}`);
                this.remove(notification.id);
            } catch (error) {
                notification.retryCount++;
                notification.lastAttempt = Date.now();
                notification.error = String(error);
                this.saveToStorage();

                if (notification.retryCount >= this.maxRetries) {
                    console.error(`[NotificationQueue] Max retries reached for ${notification.id}, giving up`);
                }
            }
        }

        this.isProcessing = false;
    }
}

// ============================================
// CONNECTION MANAGER (Heartbeat & Reconnection)
// ============================================

type StatusCallback = (status: ConnectionStatus) => void;

class ConnectionManager {
    private status: ConnectionStatus = 'disconnected';
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private readonly heartbeatIntervalMs = 30000; // 30 seconds
    private readonly maxReconnectDelay = 30000; // Max 30 seconds
    private reconnectAttempts = 0;
    private statusCallbacks: Set<StatusCallback> = new Set();
    private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();

    getStatus(): ConnectionStatus {
        return this.status;
    }

    onStatusChange(callback: StatusCallback): () => void {
        this.statusCallbacks.add(callback);
        // Immediately call with current status
        callback(this.status);
        return () => this.statusCallbacks.delete(callback);
    }

    private setStatus(status: ConnectionStatus) {
        if (this.status !== status) {
            this.status = status;
            console.log(`[ConnectionManager] Status changed: ${status}`);
            this.statusCallbacks.forEach(cb => cb(status));
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            // ✅ Use auth.getSession() — zero DB cost, just checks local token validity
            // Previously hit notifications table every 30s (real DB query = egress cost)
            const { error } = await supabase.auth.getSession();
            return !error;
        } catch {
            return false;
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) return;

        console.log('[ConnectionManager] Starting heartbeat');
        this.heartbeatInterval = setInterval(async () => {
            const isConnected = await this.checkConnection();

            if (isConnected && this.status !== 'connected') {
                this.setStatus('connected');
                this.reconnectAttempts = 0;
                // Process any queued notifications when reconnected
                notificationQueue.processQueue();
            } else if (!isConnected && this.status === 'connected') {
                this.setStatus('disconnected');
                this.scheduleReconnect();
            }
        }, this.heartbeatIntervalMs);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) return;

        const delay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        console.log(`[ConnectionManager] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
        this.setStatus('reconnecting');

        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            this.reconnectAttempts++;

            const isConnected = await this.checkConnection();
            if (isConnected) {
                this.setStatus('connected');
                this.reconnectAttempts = 0;
                await this.resubscribeAll();
                notificationQueue.processQueue();
            } else {
                this.scheduleReconnect();
            }
        }, delay);
    }

    registerChannel(name: string, channel: ReturnType<typeof supabase.channel>) {
        this.channels.set(name, channel);
    }

    unregisterChannel(name: string) {
        const channel = this.channels.get(name);
        if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(name);
        }
    }

    private async resubscribeAll() {
        console.log(`[ConnectionManager] Resubscribing to ${this.channels.size} channels`);
        // Channels auto-reconnect in Supabase, but we can force refresh here if needed
        for (const [name, channel] of this.channels) {
            try {
                await channel.unsubscribe();
                await channel.subscribe();
                console.log(`[ConnectionManager] Resubscribed to ${name}`);
            } catch (e) {
                console.warn(`[ConnectionManager] Failed to resubscribe to ${name}:`, e);
            }
        }
    }

    cleanup() {
        this.stopHeartbeat();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        for (const [name] of this.channels) {
            this.unregisterChannel(name);
        }
    }
}

// ============================================
// SINGLETONS
// ============================================

export const notificationQueue = new NotificationQueue();
export const connectionManager = new ConnectionManager();

// Load failed notifications on module init
if (typeof window !== 'undefined') {
    notificationQueue.loadFromStorage();
}

// ============================================
// SEND NOTIFICATION WITH RETRY
// ============================================

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function sendNotificationWithRetry(
    userId: string,
    payload: NotificationPayload
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: payload.title,
                message: payload.message,
                type: payload.type,
                link: payload.link,
                read: false,
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[sendNotificationWithRetry] Failed, queueing for retry:', error);

        notificationQueue.add({
            id: generateId(),
            userId,
            payload,
            retryCount: 0,
            lastAttempt: Date.now(),
            error: String(error),
        });

        return false;
    }
}

export async function sendNotificationToRoleWithRetry(
    role: UserRole | UserRole[],
    payload: NotificationPayload
): Promise<void> {
    try {
        let query = supabase.from('profiles').select('user_id');

        if (Array.isArray(role)) {
            query = query.in('role', role);
        } else {
            query = query.eq('role', role);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) {
            console.error('[sendNotificationToRoleWithRetry] Error fetching users:', usersError);
            return;
        }

        if (!users || users.length === 0) {
            console.warn(`[sendNotificationToRoleWithRetry] No users found with role: ${role}`);
            return;
        }

        console.log(`[sendNotificationToRoleWithRetry] Sending to ${users.length} user(s)`);

        // Send to each user with retry support
        const results = await Promise.allSettled(
            users.map(user => sendNotificationWithRetry(user.user_id, payload))
        );

        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length;
        if (failed > 0) {
            console.warn(`[sendNotificationToRoleWithRetry] ${failed}/${users.length} notifications queued for retry`);
        }
    } catch (error) {
        console.error('[sendNotificationToRoleWithRetry] Error:', error);
    }
}

export async function sendNotificationToUserWithRetry(
    userId: string,
    payload: NotificationPayload
): Promise<boolean> {
    return sendNotificationWithRetry(userId, payload);
}
