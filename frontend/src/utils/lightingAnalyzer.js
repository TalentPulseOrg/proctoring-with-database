/**
 * Analyzes the lighting conditions of a webcam frame
 * @param {HTMLCanvasElement} canvas - The canvas element containing the frame
 * @returns {Object} Object containing lighting analysis results
 */
export const analyzeLighting = (canvas) => {
  console.log('Starting lighting analysis...');
  
  if (!canvas) {
    console.error('Canvas is null or undefined');
    return {
      status: 'error',
      message: 'Checking lighting...',
      is_adequate: false
    };
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return {
      status: 'error',
      message: 'Checking lighting...',
      is_adequate: false
    };
  }

  console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let totalBrightness = 0;
  const pixelCount = data.length / 4; // Each pixel has 4 values (RGBA)
  
  console.log('Processing', pixelCount, 'pixels');
  
  // Calculate average brightness using the luminance formula
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate brightness using the luminance formula
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
  }
  
  const averageBrightness = totalBrightness / pixelCount;
  console.log('Average brightness:', averageBrightness);
  
  // Define lighting conditions
  let status = 'normal';
  let message = 'Lighting is good';
  
  if (averageBrightness < 80) {
    status = 'too_dark';
    message = 'Room is too dark';
  } else if (averageBrightness > 200) {
    status = 'too_bright';
    message = 'Room is too bright';
  }
  
  console.log('Lighting status:', status, 'Message:', message);
  
  return {
    averageBrightness,
    status,
    message,
    is_adequate: status === 'normal'
  };
}; 