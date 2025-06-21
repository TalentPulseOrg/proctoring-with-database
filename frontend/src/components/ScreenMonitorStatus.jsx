import React from 'react';
import { useScreenMonitor } from '../contexts/ScreenMonitorContext';

const ScreenMonitorStatus = () => {
    const { warningCount, isFullscreen, isTestActive } = useScreenMonitor();

    if (!isTestActive) return null;

    return (
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
    );
};

export default ScreenMonitorStatus; 