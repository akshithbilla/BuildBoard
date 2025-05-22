const API_BASE_URL = "https://myportfolify.onrender.com";

// Helper function to handle API requests
async function apiRequest(endpoint, method = 'GET', body = null, headers = {}, retries = 1) {
  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!response.ok) {
      // Handle 401 specifically to trigger reauthentication
      if (response.status === 401) {
        // Clear any invalid auth state
        localStorage.removeItem('authToken');
        throw new Error('Session expired. Please login again.');
      }
      
      // Try to get error message from response
      const errorData = isJson ? await response.json() : { 
        message: await response.text() || `Request failed with status ${response.status}`
      };
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    // Verify we have JSON before parsing
    if (!isJson) {
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE html>')) {
        throw new Error('Received HTML response instead of JSON');
      }
      throw new Error('Invalid response format from server');
    }

    return await response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    
    // Retry logic for certain errors
    if (retries > 0 && 
        (error.message.includes('Network Error') || 
         error.message.includes('Failed to fetch'))) {
      console.log(`Retrying request to ${endpoint}...`);
      return apiRequest(endpoint, method, body, headers, retries - 1);
    }
    
    throw error;
  }
}

// Auth-related functions
export const authService = {
  async checkAuth() {
    try {
      const data = await apiRequest('/check-auth');
      return { authenticated: true, user: data.user };
    } catch (error) {
      return { 
        authenticated: false, 
        error: error.message,
        requiresLogin: error.message.includes('Session expired') 
      };
    }
  },

  async login(email, password) {
    const data = await apiRequest('/login', 'POST', { username: email, password });
    // Store token if your backend uses JWT
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return data;
  },

  async logout() {
    localStorage.removeItem('authToken');
    return apiRequest('/logout', 'POST');
  },

  async register(email, password) {
    return apiRequest('/register', 'POST', { username: email, password });
  }
};

// Profile-related functions
export const profileService = {
  async getProfile() {
    return apiRequest('/api/profiles/me');
  },

  async checkUsername(username) {
    return apiRequest(`/api/profiles/check-username?username=${encodeURIComponent(username)}`);
  },

  async createProfile(username) {
    return apiRequest('/api/profiles', 'POST', { username });
  },

  async updateProfile(profileData) {
    return apiRequest('/api/profiles/me', 'PUT', profileData);
  },

  async updateTemplate(template) {
    return apiRequest('/api/profiles/me/template', 'PUT', { template });
  }
};

// Project-related functions
export const projectService = {
  async getProjects() {
    const data = await apiRequest('/api/profiles/me/projects');
    return data.projects || [];
  },

  async getProject(projectId) {
    return apiRequest(`/api/profiles/me/projects/${projectId}`);
  },

  async addProject(projectData) {
    return apiRequest('/api/profiles/me/projects', 'POST', projectData);
  },

  async updateProject(projectId, projectData) {
    return apiRequest(`/api/profiles/me/projects/${projectId}`, 'PUT', projectData);
  },

  async deleteProject(projectId) {
    return apiRequest(`/api/profiles/me/projects/${projectId}`, 'DELETE');
  }
};