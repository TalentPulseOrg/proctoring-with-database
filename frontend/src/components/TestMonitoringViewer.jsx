import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AppLayout from '../layouts/AppLayout';

const TestMonitoringViewer = ({ testId }) => {
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('screenshots');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/monitoring/test-data/${testId}`);
        setMonitoringData(response.data);
      } catch (err) {
        console.error('Error fetching monitoring data:', err);
        setError('Failed to load monitoring data');
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();
  }, [testId]);

  const getImageUrl = (image) => {
    return `${API_BASE_URL}/api/monitoring/image/${testId}/${image.type}/${image.filename}`;
  };

  const formatTimestamp = (timestamp) => {
    try {
      const [date, time] = timestamp.split('_');
      return `${date} ${time.replace(/-/g, ':')}`;
    } catch (e) {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="text-gray-500 text-center p-8">
        No monitoring data available for this test.
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            selectedTab === 'screenshots'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('screenshots')}
        >
          Screenshots ({monitoringData.screenshots.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            selectedTab === 'snapshots'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('snapshots')}
        >
          Snapshots ({monitoringData.snapshots.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            selectedTab === 'suspicious'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('suspicious')}
        >
          Suspicious ({monitoringData.suspicious_images.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            selectedTab === 'logs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedTab('logs')}
        >
          Logs
        </button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {selectedTab === 'logs' ? (
          <div className="space-y-4">
            {monitoringData.logs.map((log, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div className="font-medium">{log.type}</div>
                {log.details && (
                  <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitoringData[`${selectedTab}${selectedTab === 'suspicious' ? '_images' : ''}`].map((image) => (
              <div
                key={image.filename}
                className="relative group cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={getImageUrl(image)}
                  alt={image.filename}
                  className="w-full h-48 object-cover rounded-lg shadow-md"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <div className="text-sm">{formatTimestamp(image.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {selectedImage.type === 'suspicious' ? 'Suspicious Activity' : 
                 selectedImage.type === 'screenshot' ? 'Screen Capture' : 'Webcam Snapshot'}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <img
              src={getImageUrl(selectedImage)}
              alt={selectedImage.filename}
              className="w-full h-auto rounded-lg"
            />
            <div className="mt-4 text-sm text-gray-500">
              Captured at: {formatTimestamp(selectedImage.timestamp)}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default TestMonitoringViewer; 