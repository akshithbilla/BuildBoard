// Create an api.js utility file for centralized API calls
const API_BASE_URL = "https://myportfolify.onrender.com";

// Helper function to handle API requests
async function apiRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const config = {
    method,
    credentials: 'include', // Important for cookies/sessions
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
    
    if (!response.ok) {
      // Handle 401 specifically to trigger reauthentication
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
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
      return { authenticated: false, error: error.message };
    }
  },

  async login(email, password) {
    return apiRequest('/login', 'POST', { username: email, password });
  },

  async logout() {
    return apiRequest('/logout', 'GET');
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

  async createProfile(username) {
    return apiRequest('/api/profiles', 'POST', { username });
  },

  async updateProfile(profileData) {
    return apiRequest('/api/profiles/me/profile', 'PUT', { profile: profileData });
  },

  async updateTemplate(template) {
    return apiRequest('/api/profiles/me/template', 'PUT', { template });
  }
};

// Project-related functions
export const projectService = {
  async getProjects() {
    const profile = await apiRequest('/api/profiles/me');
    return profile.projects || [];
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