import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export class VehicleChart {
  /**
   * @param {string} canvasId Canvas element ID
   * @param {string} type 'bar' | 'line' | 'doughnut'
   */
  constructor(canvasId, type = 'line') {
    this.canvasId = canvasId;
    this.type = type;
    this.chart = null;
    
    // Default theme color variables (matching Light mode initially)
    this.textColor = '#475569';
    this.gridColor = '#e2e8f0';
  }

  /**
   * Detect current theme and update label/grid colors accordingly
   */
  updateThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.textColor = isDark ? '#94a3b8' : '#475569';
    this.gridColor = isDark ? '#1e293b' : '#e2e8f0';
    
    if (this.chart) {
      if (this.chart.options.scales && this.chart.options.scales.x) {
        this.chart.options.scales.x.grid.color = this.gridColor;
        this.chart.options.scales.x.ticks.color = this.textColor;
      }
      if (this.chart.options.scales && this.chart.options.scales.y) {
        this.chart.options.scales.y.grid.color = this.gridColor;
        this.chart.options.scales.y.ticks.color = this.textColor;
      }
      if (this.chart.options.plugins && this.chart.options.plugins.legend) {
        this.chart.options.plugins.legend.labels.color = this.textColor;
      }
      this.chart.update();
    }
  }

  /**
   * Render or update the chart with labels and data values
   * @param {Array<string>} labels 
   * @param {Array<number>} dataset1 Direction 1 values
   * @param {Array<number>} dataset2 Direction 2 values
   * @param {string} label1 Name of direction 1
   * @param {string} label2 Name of direction 2
   */
  render(labels, dataset1, dataset2 = null, label1 = 'Direction 1', label2 = 'Direction 2') {
    const ctx = document.getElementById(this.canvasId);
    if (!ctx) return;

    this.updateThemeColors();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const primaryColor = isDark ? '#38bdf8' : '#0ea5e9';
    const successColor = isDark ? '#34d399' : '#10b981';

    if (this.chart) {
      this.chart.destroy();
    }

    const datasets = [
      {
        label: label1,
        data: dataset1,
        borderColor: primaryColor,
        backgroundColor: this.type === 'line' ? 'rgba(56, 189, 248, 0.08)' : primaryColor,
        borderWidth: 3,
        fill: this.type === 'line',
        tension: 0.35,
        pointBackgroundColor: primaryColor,
        pointHoverRadius: 7
      }
    ];

    if (dataset2 !== null) {
      datasets.push({
        label: label2,
        data: dataset2,
        borderColor: successColor,
        backgroundColor: this.type === 'line' ? 'rgba(52, 211, 153, 0.08)' : successColor,
        borderWidth: 3,
        fill: this.type === 'line',
        tension: 0.35,
        pointBackgroundColor: successColor,
        pointHoverRadius: 7
      });
    }

    this.chart = new Chart(ctx, {
      type: this.type,
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                family: 'Plus Jakarta Sans',
                weight: '600',
                size: 11
              },
              color: this.textColor
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#0f172a',
            titleFont: { family: 'Outfit', weight: '700' },
            bodyFont: { family: 'Plus Jakarta Sans' },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: this.type !== 'doughnut' ? {
          x: {
            grid: {
              color: this.gridColor,
              drawBorder: false
            },
            ticks: {
              color: this.textColor,
              font: { family: 'Plus Jakarta Sans', size: 10 }
            }
          },
          y: {
            grid: {
              color: this.gridColor,
              drawBorder: false
            },
            ticks: {
              color: this.textColor,
              font: { family: 'Plus Jakarta Sans', size: 10 },
              stepSize: 1
            },
            beginAtZero: true
          }
        } : undefined
      }
    });
  }
}
