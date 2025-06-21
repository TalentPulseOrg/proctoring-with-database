import axios from 'axios';

export interface ProctoringEventDetails {
    message: string;
    severity?: 'info' | 'warning' | 'alert';
    metadata?: Record<string, any>;
}

export interface ProctoringEvent {
    timestamp: string;
    event_type: string;
    details: ProctoringEventDetails;
}

class EventLogger {
    private sessionId: string;
    private events: ProctoringEvent[] = [];
    private apiBaseUrl: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    }

    async logEvent(eventType: string, details: ProctoringEventDetails): Promise<void> {
        try {
            const response = await axios.post(
                `${this.apiBaseUrl}/api/proctoring/events/${this.sessionId}`,
                {
                    event_type: eventType,
                    details: {
                        message: details.message,
                        severity: details.severity || 'info',
                        metadata: details.metadata || {}
                    }
                }
            );

            if (response.data.status === 'success') {
                this.events.push({
                    timestamp: new Date().toISOString(),
                    event_type: eventType,
                    details
                });
            } else {
                console.error('Failed to log event:', response.data.message);
            }
        } catch (error) {
            console.error('Failed to log event:', error);
            // Store event locally if API call fails
            this.events.push({
                timestamp: new Date().toISOString(),
                event_type: eventType,
                details
            });
        }
    }

    async getEvents(eventType?: string): Promise<ProctoringEvent[]> {
        try {
            const response = await axios.get(
                `${this.apiBaseUrl}/api/proctoring/events/${this.sessionId}`,
                { params: { event_type: eventType } }
            );
            return response.data;
        } catch (error) {
            console.error('Failed to fetch events:', error);
            return this.events;
        }
    }

    async exportJson(): Promise<void> {
        try {
            const response = await axios.get(
                `${this.apiBaseUrl}/api/proctoring/events/${this.sessionId}/export/json`
            );
            const blob = new Blob([JSON.stringify(this.events, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `proctoring_log_${this.sessionId}_${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export JSON:', error);
        }
    }

    async exportCsv(): Promise<void> {
        try {
            const response = await axios.get(
                `${this.apiBaseUrl}/api/proctoring/events/${this.sessionId}/export/csv`
            );
            const blob = new Blob([this.convertToCsv()], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `proctoring_log_${this.sessionId}_${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export CSV:', error);
        }
    }

    private convertToCsv(): string {
        const headers = ['timestamp', 'event_type', 'message', 'severity', 'metadata'];
        const rows = this.events.map(event => [
            event.timestamp,
            event.event_type,
            event.details.message,
            event.details.severity || '',
            JSON.stringify(event.details.metadata || {})
        ]);
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    async clearEvents(): Promise<void> {
        try {
            await axios.delete(`${this.apiBaseUrl}/api/proctoring/events/${this.sessionId}`);
            this.events = [];
        } catch (error) {
            console.error('Failed to clear events:', error);
        }
    }
}

export default EventLogger; 