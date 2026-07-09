/**
 * IoT Smart Street Light Helper Utilities
 */

export const helpers = {
  /**
   * Format an ISO date string into a localized human-readable format
   * @param {string|Date} isoString 
   * @returns {string}
   */
  formatDateTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  /**
   * Format just the time part
   * @param {string|Date} isoString 
   * @returns {string}
   */
  formatTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  /**
   * Create a friendly "time ago" string (e.g. "3 mins ago")
   * @param {string|Date} isoString 
   * @returns {string}
   */
  timeAgo(isoString) {
    if (!isoString) return 'never';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'never';
    
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  /**
   * Convert an array of objects to a CSV string and download it
   * @param {Array<object>} data 
   * @param {string} filename 
   */
  exportToCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
      alert('No data to export.');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export to Excel format (creates an Excel compatible CSV/XML file)
   * @param {Array<object>} data 
   * @param {string} filename 
   */
  exportToExcel(data, filename = 'export.xls') {
    if (!data || !data.length) {
      alert('No data to export.');
      return;
    }

    // Creating an Excel Spreadsheet XML structure
    const headers = Object.keys(data[0]);
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Sheet1">
  <Table>
   <Row>`;
    
    // Write headers
    for (const header of headers) {
      xml += `<Cell><Data ss:Type="String">${header}</Data></Cell>`;
    }
    xml += `</Row>`;

    // Write values
    for (const row of data) {
      xml += `<Row>`;
      for (const header of headers) {
        const val = row[header];
        const type = typeof val === 'number' ? 'Number' : 'String';
        const cleaned = val === null || val === undefined ? '' : String(val);
        xml += `<Cell><Data ss:Type="${type}">${cleaned}</Data></Cell>`;
      }
      xml += `</Row>`;
    }

    xml += `  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export data table to PDF via browser print window
   * @param {string} title 
   * @param {Array<string>} headers 
   * @param {Array<object>} data 
   * @param {Array<string>} keys 
   */
  exportToPDF(title, headers, data, keys) {
    if (!data || !data.length) {
      alert('No data to export.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to export PDF.');
      return;
    }

    let rowsHtml = '';
    for (const row of data) {
      rowsHtml += '<tr>';
      for (const key of keys) {
        const val = row[key];
        rowsHtml += `<td>${val === null || val === undefined ? '--' : val}</td>`;
      }
      rowsHtml += '</tr>';
    }

    const headersHtml = headers.map(h => `<th>${h}</th>`).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #0ea5e9; font-size: 24px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; color: #1f2937; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>${headersHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Generated on ${new Date().toLocaleString()} | Smart Street Light System</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
