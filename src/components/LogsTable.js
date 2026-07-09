/**
 * LogsTable Component
 * Reusable paginated table component for displaying logs and data lists.
 */
export class LogsTable {
  /**
   * @param {string} containerId Container selector
   * @param {object} options Options config
   * @param {Array<string>} options.headers Display column headers
   * @param {Array<string>} options.keys Object keys to display
   * @param {function} options.formatters Key value formatters
   */
  constructor(containerId, options) {
    this.container = document.getElementById(containerId);
    this.headers = options.headers || [];
    this.keys = options.keys || [];
    this.formatters = options.formatters || {};
    
    this.data = [];
    this.page = 1;
    this.hasMore = false;
    this.onPrevPage = null;
    this.onNextPage = null;
  }

  /**
   * Set data and refresh view
   * @param {Array} data 
   * @param {number} page 
   * @param {boolean} hasMore 
   */
  update(data, page, hasMore) {
    this.data = data;
    this.page = page;
    this.hasMore = hasMore;
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.data || this.data.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
          <p class="text-secondary mt-3">No log records found.</p>
        </div>
      `;
      return;
    }

    const headersHtml = this.headers.map(h => `<th>${h}</th>`).join('');
    
    const rowsHtml = this.data.map(row => {
      const cells = this.keys.map(key => {
        let val = row[key];
        if (this.formatters[key]) {
          val = this.formatters[key](val, row);
        }
        return `<td>${val === null || val === undefined ? '--' : val}</td>`;
      }).join('');
      
      return `<tr>${cells}</tr>`;
    }).join('');

    this.container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0" style="color: var(--text-primary);">
          <thead class="table-light" style="background-color: var(--bg-secondary); border-color: var(--border-subtle); color: var(--text-secondary);">
            <tr>
              ${headersHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      
      <div class="d-flex align-items-center justify-content-between mt-3 px-3">
        <span class="text-muted" style="font-size: 0.85rem;">Page ${this.page}</span>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" id="btn-prev-page" ${this.page === 1 ? 'disabled' : ''}>
            <i class="bi bi-chevron-left"></i> Previous
          </button>
          <button class="btn btn-outline-secondary" id="btn-next-page" ${!this.hasMore ? 'disabled' : ''}>
            Next <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    `;

    // Bind pagination event listeners
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.page > 1 && this.onPrevPage) {
          this.onPrevPage();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.hasMore && this.onNextPage) {
          this.onNextPage();
        }
      });
    }
  }
}
