import ExcelJS from 'exceljs';

/**
 * Excel Generator Utility
 * Generates Excel spreadsheets for data export
 */

class ExcelGenerator {
  constructor() {
    this.primaryColor = '4F46E5';
    this.headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: this.primaryColor }
    };
    this.headerFont = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11
    };
  }

  /**
   * Create a new workbook
   */
  createWorkbook() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AkibaPlus';
    workbook.created = new Date();
    return workbook;
  }

  /**
   * Add worksheet with data
   */
  addWorksheet(workbook, sheetName, data, columns) {
    const worksheet = workbook.addWorksheet(sheetName);

    // Set columns
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15
    }));

    // Style header row
    worksheet.getRow(1).fill = this.headerFill;
    worksheet.getRow(1).font = this.headerFont;
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 20;

    // Add data rows
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // Add borders and alternating colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Alternating row colors
        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        }
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: String.fromCharCode(64 + columns.length) + '1'
    };

    return worksheet;
  }

  /**
   * Add summary sheet with key metrics
   */
  addSummarySheet(workbook, chamaName, reportTitle, metrics) {
    const worksheet = workbook.addWorksheet('Summary');

    // Title
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = chamaName;
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: this.primaryColor } };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Report title
    worksheet.mergeCells('A2:B2');
    worksheet.getCell('A2').value = reportTitle;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Generated date
    worksheet.mergeCells('A3:B3');
    worksheet.getCell('A3').value = `Generated: ${new Date().toLocaleString()}`;
    worksheet.getCell('A3').font = { size: 10, color: { argb: 'FF6B7280' } };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Metrics
    let row = 5;
    metrics.forEach(({ label, value }) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = value;
      worksheet.getCell(`B${row}`).alignment = { horizontal: 'right' };
      row++;
    });

    // Column widths
    worksheet.getColumn('A').width = 30;
    worksheet.getColumn('B').width = 20;

    return worksheet;
  }

  /**
   * Format currency for Excel
   */
  applyCurrencyFormat(worksheet, column) {
    worksheet.getColumn(column).eachCell((cell, rowNumber) => {
      if (rowNumber > 1 && typeof cell.value === 'number') {
        cell.numFmt = '"KES "#,##0.00';
      }
    });
  }

  /**
   * Format date for Excel
   */
  applyDateFormat(worksheet, column) {
    worksheet.getColumn(column).eachCell((cell, rowNumber) => {
      if (rowNumber > 1 && cell.value) {
        cell.numFmt = 'dd/mm/yyyy';
      }
    });
  }

  /**
   * Format percentage for Excel
   */
  applyPercentageFormat(worksheet, column) {
    worksheet.getColumn(column).eachCell((cell, rowNumber) => {
      if (rowNumber > 1 && typeof cell.value === 'number') {
        cell.numFmt = '0.00%';
      }
    });
  }

  /**
   * Convert workbook to buffer
   */
  async toBuffer(workbook) {
    return await workbook.xlsx.writeBuffer();
  }
}

export default new ExcelGenerator();
