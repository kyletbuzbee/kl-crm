/**
 * Sales Functions
 * Tier 2 Business Service - Handles scrap metal purchase transactions
 * Headers: Sales ID, Date, Company Name, Company ID, Material, Weight, Price, Date Range, Name / Company, Material, Weight (s), Payment Amount
 */

var SalesFunctions = (function() {
  'use strict';

  /**
   * Get sales data with optional filters
   */
  function getSalesData(filters) {
    try {
      filters = filters || {};
      
      var accessResult = SharedUtils.checkSpreadsheetAccess('SalesFunctions.getSalesData');
      if (!accessResult.success) {
        return { success: false, data: null, error: accessResult.error };
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SALES);

      if (!sheet) {
        return { success: true, data: [], error: null };
      }

      var data = SharedUtils.getSafeSheetData(CONFIG.SHEETS.SALES);
      
      if (!data || data.length === 0) {
        return { success: true, data: [], error: null };
      }

      // Apply filters if provided
      var filteredData = data;
      
      if (filters.company) {
        var companyFilter = filters.company.toLowerCase();
        filteredData = filteredData.filter(function(row) {
          var company = row['Company Name'] || '';
          return company && company.toString().toLowerCase().indexOf(companyFilter) !== -1;
        });
      }

      if (filters.material) {
        var materialFilter = filters.material.toLowerCase();
        filteredData = filteredData.filter(function(row) {
          var material = row['Material'] || '';
          return material && material.toString().toLowerCase().indexOf(materialFilter) !== -1;
        });
      }

      if (filters.startDate && filters.endDate) {
        var startDate = new Date(filters.startDate);
        var endDate = new Date(filters.endDate);
        filteredData = filteredData.filter(function(row) {
          if (!row['Date']) return false;
          var saleDate = new Date(row['Date']);
          return saleDate >= startDate && saleDate <= endDate;
        });
      }

      return { success: true, data: filteredData, error: null };

    } catch (e) {
      return ErrorHandling.handleError(e, {
        functionName: 'SalesFunctions.getSalesData',
        severity: 'MEDIUM'
      });
    }
  }

  /**
   * Create a new sales record
   */
  function createSale(saleData) {
    try {
      if (!saleData || !saleData['Company Name']) {
        return { success: false, data: null, error: 'Company Name is required' };
      }

      var accessResult = SharedUtils.checkSpreadsheetAccess('SalesFunctions.createSale');
      if (!accessResult.success) {
        return { success: false, data: null, error: accessResult.error };
      }

      var ss = accessResult.spreadsheet;
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SALES);

      if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.SALES);
        var headers = CONFIG.HEADERS.SALES;
        sheet.appendRow(headers);
      }

      // Build row data matching CONFIG.HEADERS.SALES exactly (8 columns)
      var rowData = [
        saleData['Sales ID'] || '',
        saleData['Date'] || new Date(),
        saleData['Company Name'] || '',
        saleData['Company ID'] || '',
        saleData['Material'] || '',
        saleData['Weight'] || '',
        saleData['Price'] || '',
        saleData['Payment Amount'] || ''
      ];

      sheet.appendRow(rowData);

      return { 
        success: true, 
        data: { companyName: saleData['Company Name'], material: saleData.Material }, 
        error: null 
      };

    } catch (e) {
      return ErrorHandling.handleError(e, {
        functionName: 'SalesFunctions.createSale',
        severity: 'HIGH'
      });
    }
  }

  /**
   * Get sales summary
   */
  function getSalesSummary(companyName) {
    try {
      var filters = companyName ? { company: companyName } : {};
      var salesResult = getSalesData(filters);
      
      if (!salesResult.success) {
        return salesResult;
      }

      var salesData = salesResult.data;
      var summary = {
        totalTransactions: salesData.length,
        totalWeight: 0,
        totalPayout: 0,
        byCompany: {},
        byMaterial: {}
      };

      salesData.forEach(function(sale) {
        // Sum weight
        var weight = parseFloat((sale['Weight'] || '0').toString().replace(/,/g, ''));
        if (!isNaN(weight)) {
          summary.totalWeight += weight;
        }

        // Sum payout
        var payout = parseFloat((sale['Payment Amount'] || '0').toString().replace(/[$,]/g, ''));
        if (!isNaN(payout)) {
          summary.totalPayout += payout;
        }

        // Group by company
        var company = sale['Company Name'] || 'Unknown';
        if (!summary.byCompany[company]) {
          summary.byCompany[company] = { count: 0, weight: 0, payout: 0 };
        }
        summary.byCompany[company].count++;
        summary.byCompany[company].weight += weight;
        summary.byCompany[company].payout += payout;

        // Group by material
        var material = sale['Material'] || 'Unknown';
        if (!summary.byMaterial[material]) {
          summary.byMaterial[material] = { count: 0, weight: 0, payout: 0 };
        }
        summary.byMaterial[material].count++;
        summary.byMaterial[material].weight += weight;
        summary.byMaterial[material].payout += payout;
      });

      return { success: true, data: summary, error: null };

    } catch (e) {
      return ErrorHandling.handleError(e, {
        functionName: 'SalesFunctions.getSalesSummary',
        severity: 'MEDIUM'
      });
    }
  }

  function getSalesByDateRange(startDate, endDate) {
    return getSalesData({ startDate: startDate, endDate: endDate });
  }

  function getTopMaterials(limit) {
    limit = limit || 10;
    var summaryResult = getSalesSummary();
    if (!summaryResult.success) return summaryResult;

    var materials = Object.keys(summaryResult.data.byMaterial).map(function(material) {
      return {
        material: material,
        count: summaryResult.data.byMaterial[material].count,
        weight: summaryResult.data.byMaterial[material].weight,
        payout: summaryResult.data.byMaterial[material].payout
      };
    });

    materials.sort(function(a, b) { return b.weight - a.weight; });
    return { success: true, data: materials.slice(0, limit), error: null };
  }

  function getTopCompanies(limit) {
    limit = limit || 10;
    var summaryResult = getSalesSummary();
    if (!summaryResult.success) return summaryResult;

    var companies = Object.keys(summaryResult.data.byCompany).map(function(company) {
      return {
        company: company,
        count: summaryResult.data.byCompany[company].count,
        weight: summaryResult.data.byCompany[company].weight,
        payout: summaryResult.data.byCompany[company].payout
      };
    });

    companies.sort(function(a, b) { return b.payout - a.payout; });
    return { success: true, data: companies.slice(0, limit), error: null };
  }

  return {
    getSalesData: getSalesData,
    createSale: createSale,
    getSalesSummary: getSalesSummary,
    getSalesByDateRange: getSalesByDateRange,
    getTopMaterials: getTopMaterials,
    getTopCompanies: getTopCompanies
  };

})();

function getSalesData(filters) { return SalesFunctions.getSalesData(filters); }
function createSale(saleData) { return SalesFunctions.createSale(saleData); }
function getSalesSummary(companyName) { return SalesFunctions.getSalesSummary(companyName); }
function getSalesByDateRange(startDate, endDate) { return SalesFunctions.getSalesByDateRange(startDate, endDate); }
function getTopMaterials(limit) { return SalesFunctions.getTopMaterials(limit); }
function getTopCompanies(limit) { return SalesFunctions.getTopCompanies(limit); }
