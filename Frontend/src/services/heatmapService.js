import { fetchHeatmap as fetchHeatmapData } from './api.js';
class HeatmapService {
  /**
   * Get heatmap data with optional filters
   * @param {Object} filters - Filter options (area, severity, timeRange, etc.)
   * @returns {Promise<Object>} Heatmap data response
   */
  async getHeatmapData(filters = {}) {
    try {
      const response = await fetchHeatmapData(filters);
      return {
        success: true,
        data: response.data?.data || [],
        source: response.source,
        lastUpdated: response.lastUpdated,
      };
    } catch (error) {
      console.error('HeatmapService: Failed to fetch heatmap data:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
  /**
   * Get heatmap statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Heatmap statistics
   */
  async getHeatmapStats(filters = {}) {
    try {
      const response = await this.getHeatmapData(filters);
      if (!response.success) {
        return response;
      }
      const data = response.data;
      const stats = {
        totalPoints: data.length,
        avgIntensity:
          data.reduce((sum, point) => sum + point.intensity, 0) / data.length ||
          0,
        maxIntensity: Math.max(...data.map((point) => point.intensity), 0),
        minIntensity: Math.min(...data.map((point) => point.intensity), 1),
        areaCoverage: this.calculateAreaCoverage(data),
      };
      return {
        success: true,
        data: stats,
        source: response.source,
      };
    } catch (error) {
      console.error('HeatmapService: Failed to calculate stats:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
  /**
   * Calculate area coverage percentage
   * @param {Array} data - Heatmap data points
   * @returns {number} Coverage percentage
   */
  calculateAreaCoverage(data) {
    // Simplified calculation - in real app would use actual geographic area
    const uniqueAreas = new Set(data.map((point) => point.area || 'Unknown'));
    return (uniqueAreas.size / 10) * 100; // Assuming 10 total areas
  }
  /**
   * Get heatmap intensity distribution
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Intensity distribution
   */
  async getIntensityDistribution(filters = {}) {
    try {
      const response = await this.getHeatmapData(filters);
      if (!response.success) {
        return response;
      }
      const data = response.data;
      const distribution = {
        low: data.filter((point) => point.intensity < 0.3).length,
        medium: data.filter(
          (point) => point.intensity >= 0.3 && point.intensity < 0.7
        ).length,
        high: data.filter((point) => point.intensity >= 0.7).length,
      };
      return {
        success: true,
        data: distribution,
        source: response.source,
      };
    } catch (error) {
      console.error('HeatmapService: Failed to calculate distribution:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
}
export default new HeatmapService();
