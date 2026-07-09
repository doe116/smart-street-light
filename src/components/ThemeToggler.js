/**
 * Theme Toggler Component
 * Manages Dark & Light modes, updates document data-theme attributes, and persists preferences.
 */
export class ThemeToggler {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.themeKey = 'ssl-dashboard-theme';
    this.currentTheme = localStorage.getItem(this.themeKey) || 'light';
    
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.render();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.themeKey, theme);
    this.currentTheme = theme;
  }

  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    this.render();
  }

  render() {
    if (!this.container) return;
    
    const iconClass = this.currentTheme === 'light' ? 'bi-moon-stars-fill' : 'bi-sun-fill';
    const tooltipText = this.currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    
    this.container.innerHTML = `
      <button class="theme-toggle-btn" title="${tooltipText}" id="theme-toggle-button">
        <i class="bi ${iconClass}"></i>
      </button>
    `;
    
    document.getElementById('theme-toggle-button').addEventListener('click', () => this.toggle());
  }
}
