import { supabase } from './supabase.js';

let dashboardChannel = null;
let deviceChannel = null;
let detectionsChannel = null;
let lightChannel = null;
let logsChannel = null;

export const realtimeService = {
  /**
   * Subscribe to dashboard_status updates (Row level)
   * @param {function} callback 
   */
  subscribeToDashboardStatus(callback) {
    if (dashboardChannel) dashboardChannel.unsubscribe();

    dashboardChannel = supabase
      .channel('dashboard-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dashboard_status',
          filter: 'id=eq.1'
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('Dashboard Status subscription status:', status);
        }
      });

    return dashboardChannel;
  },

  /**
   * Subscribe to device_status updates (heartbeats, uptime)
   * @param {function} callback 
   */
  subscribeToDeviceStatus(callback) {
    if (deviceChannel) deviceChannel.unsubscribe();

    deviceChannel = supabase
      .channel('device-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_status',
          filter: 'id=eq.1'
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return deviceChannel;
  },

  /**
   * Subscribe to new vehicle detection events
   * @param {function} callback 
   */
  subscribeToDetections(callback) {
    if (detectionsChannel) detectionsChannel.unsubscribe();

    detectionsChannel = supabase
      .channel('vehicle-detections-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_detections'
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return detectionsChannel;
  },

  /**
   * Subscribe to new light status log records
   * @param {function} callback 
   */
  subscribeToLightStatus(callback) {
    if (lightChannel) lightChannel.unsubscribe();

    lightChannel = supabase
      .channel('light-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'light_status'
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return lightChannel;
  },

  /**
   * Subscribe to admin actions
   * @param {function} callback 
   */
  subscribeToAdminLogs(callback) {
    if (logsChannel) logsChannel.unsubscribe();

    logsChannel = supabase
      .channel('admin-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_logs'
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return logsChannel;
  },

  /**
   * Clean up all active listeners
   */
  unsubscribeAll() {
    const channels = [dashboardChannel, deviceChannel, detectionsChannel, lightChannel, logsChannel];
    for (const chan of channels) {
      if (chan) {
        chan.unsubscribe();
      }
    }
    dashboardChannel = null;
    deviceChannel = null;
    detectionsChannel = null;
    lightChannel = null;
    logsChannel = null;
    console.log('Unsubscribed from all real-time channels.');
  }
};
