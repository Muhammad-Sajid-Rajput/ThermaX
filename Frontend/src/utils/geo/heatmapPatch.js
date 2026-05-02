/**
 * Patch for leaflet.heat to fix Canvas2D willReadFrequently warning
 * This monkey-patches the canvas context creation to include the willReadFrequently attribute
 */

export const patchLeafletHeat = () => {
  // Store original getContext method
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  // Override getContext to add willReadFrequently for 2d contexts
  HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
    // Check if this is a 2d context and if the caller is likely from leaflet.heat
    if (contextType === '2d') {
      // Check if the call stack contains references to leaflet.heat
      const stack = new Error().stack;
      if (stack && (stack.includes('leaflet.heat') || stack.includes('heat.js'))) {
        // Add willReadFrequently attribute to the context options
        const options = args[0] || {};
        options.willReadFrequently = true;
        args[0] = options;
      }
    }
    
    return originalGetContext.apply(this, [contextType, ...args]);
  };

  // Return cleanup function
  return () => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  };
};

/**
 * Alternative approach: Patch L.heatLayer directly if available
 */
export const patchHeatLayer = () => {
  if (window.L && window.L.heatLayer) {
    const originalHeatLayer = window.L.heatLayer;
    
    window.L.heatLayer = function(latlngs, options) {
      // Ensure the heat layer is created with optimized canvas settings
      const layer = originalHeatLayer.call(this, latlngs, options);
      
      // If the layer has a canvas element, patch its context
      if (layer._canvas) {
        const canvas = layer._canvas;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx && layer._ctx) {
          layer._ctx = ctx;
        }
      }
      
      return layer;
    };
    
    // Copy static methods
    Object.setPrototypeOf(window.L.heatLayer, originalHeatLayer);
    Object.getOwnPropertyNames(originalHeatLayer).forEach(name => {
      if (name !== 'prototype' && name !== 'name' && name !== 'length') {
        window.L.heatLayer[name] = originalHeatLayer[name];
      }
    });
  }
};
