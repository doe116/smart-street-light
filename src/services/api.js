import { supabase } from './supabase.js';

export const apiService = {
  /**
   * Fetch current dashboard telemetry
   * @returns {Promise<any>}
   */
  async getDashboardStatus() {
    const { data, error } = await supabase
      .from('dashboard_status')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Fetch hardware system status and heartbeat details
   * @returns {Promise<any>}
   */
  async getDeviceStatus() {
    const { data, error } = await supabase
      .from('device_status')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Fetch all configurations from system_settings
   * @returns {Promise<Array>}
   */
  async getSystemSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * Update a specific configuration value in system_settings
   * @param {string} key 
   * @param {string} value 
   * @param {string} adminEmail
   * @returns {Promise<any>}
   */
  async updateSystemSetting(key, value, adminEmail = 'admin') {
    // 1. Update the setting
    const { data, error } = await supabase
      .from('system_settings')
      .update({ setting_value: String(value), updated_at: new Date().toISOString() })
      .eq('setting_key', key)
      .select();
    if (error) throw error;

    // 2. Insert admin log entry
    await this.logAdminAction(
      'setting_change',
      `Modified configuration '${key}' to value '${value}'`,
      adminEmail
    );

    return data;
  },

  /**
   * Insert a manual light control override command
   * @param {string} status 'ON' | 'OFF'
   * @param {string} mode 'manual' | 'auto' | 'timer'
   * @param {string} adminEmail
   * @returns {Promise<any>}
   */
  async sendLightCommand(status, mode, adminEmail = 'admin') {
    // Fetch current dashboard state to keep values unchanged
    let isDaytime = false;
    let ldrVal = 2000;
    try {
      const dash = await this.getDashboardStatus();
      isDaytime = dash.is_daytime;
    } catch (e) {
      console.warn('Could not read dashboard daytime status for command log:', e);
    }

    // 1. Insert into light_status to trigger database updates
    const { data, error } = await supabase
      .from('light_status')
      .insert({
        status,
        mode,
        triggered_by: 'manual',
        is_daytime: isDaytime,
        illumination_level: ldrVal,
        updated_at: new Date().toISOString()
      })
      .select();
    if (error) throw error;

    // 2. Register admin log entry
    await this.logAdminAction(
      'manual_command',
      `Manually switched lighting state to ${status} in mode ${mode.toUpperCase()}`,
      adminEmail,
      status
    );

    return data;
  },

  /**
   * Query vehicle detection history
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<Array>}
   */
  async getVehicleDetections(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('vehicle_detections')
      .select('*')
      .order('detected_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },

  /**
   * Log/Simulate a vehicle detection
   * @param {string} direction 'direction1' | 'direction2'
   * @param {number} sensorDistance 
   * @returns {Promise<any>}
   */
  async addVehicleDetection(direction, sensorDistance) {
    const { data, error } = await supabase
      .from('vehicle_detections')
      .insert({
        direction,
        sensor_distance: sensorDistance,
        detected_at: new Date().toISOString(),
        vehicle_count: 1
      })
      .select();
    if (error) throw error;
    return data;
  },


  /**
   * Query logs of admin actions
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<Array>}
   */
  async getAdminLogs(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },

  /**
   * Fetch traffic statistics views
   * @returns {Promise<Array>}
   */
  async getVehicleStatistics() {
    const { data, error } = await supabase
      .from('vehicle_statistics')
      .select('*');
    if (error) throw error;
    return data;
  },

  /**
   * Reset all dashboard metrics and clear logs
   * @param {string} adminEmail
   * @returns {Promise<boolean>}
   */
  async resetDashboardStats(adminEmail = 'admin') {
    // 1. Reset dashboard aggregates in dashboard_status
    const { error: dashError } = await supabase
      .from('dashboard_status')
      .update({
        total_vehicles_direction1: 0,
        total_vehicles_direction2: 0,
        total_vehicles_all: 0,
        last_vehicle_detected_at: null,
        last_updated: new Date().toISOString()
      })
      .eq('id', 1);
    if (dashError) throw dashError;

    // 2. Clear detections and states
    const { error: detError } = await supabase
      .from('vehicle_detections')
      .delete()
      .neq('id', 0); // deletes all rows
    if (detError) console.warn('Clear detections returned error or empty (ignoring if empty):', detError);

    const { error: lightError } = await supabase
      .from('light_status')
      .delete()
      .neq('id', 0);
    if (lightError) console.warn('Clear light status returned error or empty (ignoring if empty):', lightError);

    // 3. Log the reset action
    await this.logAdminAction('stats_reset', 'Reset all vehicle counters and purged log tables', adminEmail);
    return true;
  },

  /**
   * Fetch current database server time
   * @returns {Promise<string>}
   */
  async getServerTime() {
    const { data, error } = await supabase.rpc('get_server_time');
    if (error) throw error;
    return data;
  },

  /**
   * Helper to write records to admin_logs table
   * @param {string} actionType 
   * @param {string} details 
   * @param {string} user 
   * @param {string|null} lightStatus 
   */
  async logAdminAction(actionType, details, user, lightStatus = null) {
    try {
      await supabase
        .from('admin_logs')
        .insert({
          action_type: actionType,
          action_details: details,
          admin_user: user,
          light_status: lightStatus,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.error('Failed to log admin action:', e);
    }
  }
};
