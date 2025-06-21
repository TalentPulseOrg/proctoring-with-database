import React, { useEffect, useState } from 'react';
import EventLogger, { ProctoringEvent } from '../utils/eventLogger';

interface ProctoringEventPanelProps {
    sessionId: string;
    isAdmin?: boolean;
}

const ProctoringEventPanel: React.FC<ProctoringEventPanelProps> = ({ sessionId, isAdmin = false }) => {
    const [events, setEvents] = useState<ProctoringEvent[]>([]);
    const [selectedEventType, setSelectedEventType] = useState<string | undefined>();
    const [logger] = useState(() => new EventLogger(sessionId));

    const eventTypes = [
        'tab_switch',
        'multiple_faces',
        'gaze_away',
        'left_frame',
        'suspicious_movement',
        'poor_lighting',
        'shortcut_attempt',
        'audio_alert'
    ];

    const fetchEvents = async () => {
        const fetchedEvents = await logger.getEvents(selectedEventType);
        setEvents(fetchedEvents);
    };

    useEffect(() => {
        fetchEvents();
        // Set up polling for new events
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, [selectedEventType]);

    const handleExportJson = async () => {
        await logger.exportJson();
    };

    const handleExportCsv = async () => {
        await logger.exportCsv();
    };

    const handleClearEvents = async () => {
        await logger.clearEvents();
        setEvents([]);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'alert':
                return 'text-red-600';
            case 'warning':
                return 'text-orange-500';
            default:
                return 'text-green-600';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">Proctoring Events</h2>
                
                <div className="flex flex-wrap gap-4 items-center">
                    <select
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                    >
                        <option value="">All Events</option>
                        {eventTypes.map(type => (
                            <option key={type} value={type}>
                                {type.replace('_', ' ')}
                            </option>
                        ))}
                    </select>

                    {isAdmin && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportJson}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Export JSON
                            </button>
                            <button
                                onClick={handleExportCsv}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Export CSV
                            </button>
                            <button
                                onClick={handleClearEvents}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                Clear Events
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Event Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Message
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Severity
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {events.map((event, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {event.event_type}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {event.details.message}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={getSeverityColor(event.details.severity || 'info')}>
                                            {event.details.severity || 'info'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProctoringEventPanel; 