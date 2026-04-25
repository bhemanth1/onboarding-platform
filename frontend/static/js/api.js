/**
 * API Service - Handles all backend communication
 */

const API_BASE = 'http://localhost:8000/api';

class APIService {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Employee endpoints
  static getEmployees() {
    return this.request('/employees');
  }

  static getEmployee(id) {
    return this.request(`/employees/${id}`);
  }

  static createEmployee(data) {
    return this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Onboarding endpoints
  static getOnboardingCases() {
    return this.request('/onboarding/cases');
  }

  static getCase(caseId) {
    return this.request(`/onboarding/cases/${caseId}`);
  }

  static getCasesByPhase(phase) {
    return this.request(`/onboarding/cases/phase/${phase}`);
  }

  static getCasesByStatus(status) {
    return this.request(`/onboarding/cases/status/${status}`);
  }

  static updateCaseProgress(caseId, progress) {
    return this.request(`/onboarding/cases/${caseId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
  }

  static updateCaseStatus(caseId, status) {
    return this.request(`/onboarding/cases/${caseId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // HIL endpoints
  static triggerHILGate(caseId, gateNumber, gateName) {
    return this.request('/hil/gates/trigger', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, gate_number: gateNumber, gate_name: gateName }),
    });
  }

  static getHILGates(caseId) {
    return this.request(`/hil/gates/${caseId}`);
  }

  static approveHILGate(gateId, notes) {
    return this.request(`/hil/gates/${gateId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ decision_notes: notes }),
    });
  }

  // Audit endpoints
  static getAuditLogs(caseId) {
    return this.request(`/audit/logs/${caseId}`);
  }

  static getRecentActivity() {
    return this.request('/audit/activity');
  }

  // Health check
  static async health() {
    try {
      return await this.request('/health');
    } catch (error) {
      console.warn('Backend not available:', error);
      return null;
    }
  }
}

// Initialize API and check connection
window.API = APIService;
