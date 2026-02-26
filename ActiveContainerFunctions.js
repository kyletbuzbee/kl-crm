/**
 * Active Container Functions
 * Tier 2 Business Service - Handles roll-off container tracking
 * Headers: Location Name, Location Address, City, Zip Code, Current Deployed Asset(s), Container Size
 */

var ActiveContainerFunctions = (function() {
  'use strict';

  /**
   * Get all active containers
   * @param {Object} filters - Optional filters (companyId, companyName, zipCode, city)
   * @returns {Object} Standardized return: {success: boolean, data: Array, error: string}
   */
  function getActiveContainers(filters) {
    try {
      filters = filters || {};
      
      var accessResult = SharedUtils.checkSpreadsheetAccess('ActiveContainerFunctions.getActiveContainers');
      if (!accessResult.success) {
        return { success: false, data: null, error: accessResult.error };
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(CONFIG.SHEETS.ACTIVE_CONTAINERS);

      if (!sheet) {
        // Try alternative sheet name for backwards compatibility
        sheet = ss.getSheetByName('Active');
      }

      if (!sheet) {
        return { success: true, data: [], error: null };
      }

      var data = SharedUtils.getSafeSheetData(CONFIG.SHEETS.ACTIVE_CONTAINERS);
      
      if (!data || data.length === 0) {
        return { success: true, data: [], error: null };
      }

      // Apply filters if provided
      var filteredData = data;
      
      if (filters.companyId) {
        var companyIdFilter = filters.companyId.toLowerCase();
        filteredData = filteredData.filter(function(row) {
          return row['Company ID'] && row['Company ID'].toString().toLowerCase().indexOf(companyIdFilter) !== -1;
        });
      }

      if (filters.companyName) {
        var companyNameFilter = filters.companyName.toLowerCase();
        filteredData = filteredData.filter(function(row) {
          return row['Company Name'] && row['Company Name'].toString().toLowerCase().indexOf(companyNameFilter) !== -1;
        });
      }

      if (filters.zipCode) {
        filteredData = filteredData.filter(function(row) {
          return row['Zip Code'] === filters.zipCode;
        });
      }

      if (filters.city) {
        var cityFilter = filters.city.toLowerCase();
        filteredData = filteredData.filter(function(row) {
          return row['City'] && row['City'].toString().toLowerCase().indexOf(cityFilter) !== -1;
        });
      }

      return { success: true, data: filteredData, error: null };

    } catch (e) {
      return ErrorHandling.handleError(e, {
        functionName: 'ActiveContainerFunctions.getActiveContainers',
        severity: 'MEDIUM'
      });
    }
  }

  /**
   * Get container statistics
   */
  function getContainerStats() {
    try {
      var result = getActiveContainers();
      
      if (!result.success) {
        return result;
      }

      var containers = result.data;
      var stats = {
        totalContainers: containers.length,
        byContainerSize: {},
        byZipCode: {},
        byCity: {}
      };

      containers.forEach(function(container) {
        // Count by container size
        var size = container['Container Size'] || 'Unknown';
        if (!stats.byContainerSize[size]) {
          stats.byContainerSize[size] = 0;
        }
        stats.byContainerSize[size]++;

        // Count by zip code
        var zip = container['Zip Code'] || 'Unknown';
        if (!stats.byZipCode[zip]) {
          stats.byZipCode[zip] = 0;
        }
        stats.byZipCode[zip]++;

        // Count by city
        var city = container['City'] || 'Unknown';
        if (!stats.byCity[city]) {
          stats.byCity[city] = 0;
        }
        stats.byCity[city]++;
      });

      return { success: true, data: stats, error: null };

    } catch (e) {
      return ErrorHandling.handleError(e, {
        functionName: 'ActiveContainerFunctions.getContainerStats',
        severity: 'MEDIUM'
      });
    }
  }

  return {
    getActiveContainers: getActiveContainers,
    getContainerStats: getContainerStats
  };

})();

function getActiveContainers(filters) { return ActiveContainerFunctions.getActiveContainers(filters); }
function getContainerStats() { return ActiveContainerFunctions.getContainerStats(); }
