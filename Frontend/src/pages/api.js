const API_BASE_URL = "https://myportfolify.onrender.com";

// Enhanced API request handler with better error handling
async function apiRequest(endpoint, method = 'GET', body = null, headers = {}, retries = 1) {
  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  // Add auth token if available
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        throw new Error('Session expired. Please login again.');
      }
      
      // Try to extract error message
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = isJson ? await response.json() : await response.text();
        errorMessage = errorData.message || errorData || errorMessage;
      } catch (e) {
        console.error('Error parsing error response:', e);
      }
      throw new Error(errorMessage);
    }

    // Handle empty responses
    if (response.status === 204) {
      return null;
    }

    // Validate JSON response
    if (!isJson) {
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE html>')) {
        throw new Error('Server returned HTML instead of JSON');
      }
      throw new Error('Invalid response format from server');
    }

    return await response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    
    // Retry for network errors
    if (retries > 0 && 
        (error.message.includes('Network Error') || 
         error.message.includes('Failed to fetch'))) {
      console.log(`Retrying request to ${endpoint}...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay before retry
      return apiRequest(endpoint, method, body, headers, retries - 1);
    }
    
    throw error;
  }
}

// ✅ UPDATED Auth Service
export const authService = {
  async checkAuth() {
    try {
      const data = await apiRequest('/check-auth'); // ← updated to match backend
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
    const data = await apiRequest('/api/auth/login', 'POST', { email, password });
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    return data;
  },

  async logout() {
    localStorage.removeItem('authToken');
    return apiRequest('/api/auth/logout', 'POST');
  },

  async register(email, password, username) {
    return apiRequest('/api/auth/register', 'POST', { email, password, username });
  }
};

// Profile Service
export const profileService = {
  async getProfile() {
    return apiRequest('/api/profiles/me');
  },

  async checkUsername(username) {
    return apiRequest(`/api/profiles/check-username?username=${encodeURIComponent(username)}`);
  },

  async createProfile(profileData) {
    return apiRequest('/api/profiles', 'POST', profileData);
  },

  async updateProfile(profileData) {
    return apiRequest('/api/profiles/me', 'PUT', profileData);
  },

  async updateTemplate(template) {
    return apiRequest('/api/profiles/me/template', 'PATCH', { template });
  },

  async generateSite() {
    return apiRequest('/api/profiles/me/generate', 'POST');
  }
};

// Project Service
export const projectService = {
  async getProjects() {
    const data = await apiRequest('/api/projects');
    return Array.isArray(data) ? data : [];
  },

  async getProject(projectId) {
    return apiRequest(`/api/projects/${projectId}`);
  },

  async createProject(projectData) {
    return apiRequest('/api/projects', 'POST', projectData);
  },

  async updateProject(projectId, projectData) {
    return apiRequest(`/api/projects/${projectId}`, 'PUT', projectData);
  },

  async deleteProject(projectId) {
    return apiRequest(`/api/projects/${projectId}`, 'DELETE');
  }
};
