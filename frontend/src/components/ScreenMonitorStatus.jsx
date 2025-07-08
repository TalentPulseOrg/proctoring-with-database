import React from 'react';
import { useScreenMonitor } from '../contexts/ScreenMonitorContext';
import AppLayout from '../layouts/AppLayout'; // Added import for AppLayout

const ScreenMonitorStatus = () => {
    const { warningCount, isFullscreen, isTestActive } = useScreenMonitor();

    if (!isTestActive) return null;

    return (
        <AppLayout>
            <div className="bg-gray-100 p-3 rounded-md">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500">Warnings</span>
                        <span className="text-lg font-bold text-red-600">{warningCount}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500">Status</span>
                        <span className={`text-sm font-medium ${isFullscreen ? 'text-green-600' : 'text-red-600'}`}>
                            {isFullscreen ? 'Fullscreen Active' : 'Not Fullscreen'}
                        </span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default ScreenMonitorStatus; 