import { apiService } from '../services/api.js';
import { realtimeService } from '../services/realtime.js';
import { LogsTable } from '../components/LogsTable.js';
import { helpers } from '../utils/helpers.js';

let logsTableInstance = null;
let currentOffset = 0;
const LIMIT = 15;
let page = 1;
let allLogs = []; // Cache all logs for export

export const LogsPage = {
  async mount(container) {
    container.innerHTML = `
      <div class="glass-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h4 class="mb-1" style="font-family: var(--font-display); font-weight: 700;">Admin Activity Log</h4>
          <p class="text-secondary mb-0" style="font-size: 0.85rem;">Audit log of settings modifications and manual overrides</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline-secondary btn-sm" id="btn-export-csv">
            <i class="bi bi-file-earmark-spreadsheet me-1"></i> CSV
          </button>
          <button class="btn btn-outline-secondary btn-sm" id="btn-export-excel">
            <i class="bi bi-file-earmark-excel me-1"></i> Excel
          </button>
          <button class="btn btn-outline-info btn-sm" id="btn-export-pdf">
            <i class="bi bi-file-earmark-pdf me-1"></i> PDF
          </button>
        </div>
      </div>
      
      <div class="glass-card">
        <div id="logs-table-container"></div>
      </div>
    `;

    // Instantiate paginated LogsTable component
    logsTableInstance = new LogsTable('logs-table-container', {
      headers: ['Timestamp', 'Admin User', 'Action Type', 'Details', 'Light Status'],
      keys: ['created_at', 'admin_user', 'action_type', 'action_details', 'light_status'],
      formatters: {
        created_at: (val) => helpers.formatDateTime(val),
        action_type: (val) => {
          let badgeClass = 'bg-secondary';
          if (val === 'manual_command') badgeClass = 'bg-primary';
          if (val === 'setting_change') badgeClass = 'bg-info';
          if (val === 'stats_reset') badgeClass = 'bg-danger';
          if (val === 'system_init') badgeClass = 'bg-success';
          return `<span class="badge ${badgeClass}">${val.toUpperCase().replace('_', ' ')}</span>`;
        },
        light_status: (val) => {
          if (!val) return '--';
          const badgeClass = val === 'ON' ? 'bg-success' : 'bg-secondary';
          return `<span class="badge ${badgeClass}">${val}</span>`;
        }
      }
    });

    // Configure pagination event handlers
    logsTableInstance.onNextPage = () => {
      page++;
      currentOffset += LIMIT;
      this.fetchLogs();
    };

    logsTableInstance.onPrevPage = () => {
      if (page > 1) {
        page--;
        currentOffset -= LIMIT;
        this.fetchLogs();
      }
    };

    // Load initial data
    await this.fetchLogs();

    // Load all logs for exporting
    this.fetchAllLogsForExport();

    // Subscribe to real-time logs inserted in DB
    realtimeService.subscribeToAdminLogs((newLog) => {
      // Show desktop alert/toast
      this.showToast(newLog);
      // Refresh page 1
      page = 1;
      currentOffset = 0;
      this.fetchLogs();
      this.fetchAllLogsForExport();
    });

    // Attach export event listeners
    document.getElementById('btn-export-csv').addEventListener('click', () => this.export('csv'));
    document.getElementById('btn-export-excel').addEventListener('click', () => this.export('excel'));
    document.getElementById('btn-export-pdf').addEventListener('click', () => this.export('pdf'));
  },

  async fetchLogs() {
    try {
      const logs = await apiService.getAdminLogs(LIMIT + 1, currentOffset);
      const hasMore = logs.length > LIMIT;
      const displayData = hasMore ? logs.slice(0, LIMIT) : logs;
      
      logsTableInstance.update(displayData, page, hasMore);
    } catch (e) {
      console.error('Failed to load admin logs:', e);
    }
  },

  async fetchAllLogsForExport() {
    try {
      // Pull first 200 logs for exports
      allLogs = await apiService.getAdminLogs(200, 0);
    } catch (e) {
      console.error('Failed to pre-fetch logs for export:', e);
    }
  },

  export(format) {
    const filename = `Admin_Logs_Export_${new Date().toISOString().slice(0,10)}`;
    const keys = ['created_at', 'admin_user', 'action_type', 'action_details', 'light_status'];
    const headers = ['Timestamp', 'Admin User', 'Action Type', 'Details', 'Light Status'];
    
    // Format timestamp for export readability
    const formattedData = allLogs.map(log => ({
      ...log,
      created_at: helpers.formatDateTime(log.created_at)
    }));

    if (format === 'csv') {
      helpers.exportToCSV(formattedData, `${filename}.csv`);
    } else if (format === 'excel') {
      helpers.exportToExcel(formattedData, `${filename}.xls`);
    } else if (format === 'pdf') {
      helpers.exportToPDF('Admin Activity Logs', headers, formattedData, keys);
    }
  },

  showToast(log) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.85rem;"><i class="bi bi-shield-lock-fill text-primary me-2"></i>Admin Override Logged</div>
        <div class="text-secondary" style="font-size: 0.80rem;">${log.action_details}</div>
      </div>
      <button class="btn btn-close btn-sm" onclick="this.parentElement.remove()"></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  },

  unmount() {
    // Unsubscribe from real-time changes
    realtimeService.unsubscribeAll();
    logsTableInstance = null;
  }
};
