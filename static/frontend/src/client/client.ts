import axios from 'axios';

/**
 * Environment-based configuration for backend services
 * Supports both SSR (internal K8s URLs) and browser (public CloudFront URL) contexts
 */
export const config = {
  // Public API base URL for browser-side requests (via CloudFront/ALB)
  publicApiBase: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  
  // Internal Kubernetes service URLs for SSR
  triposrInternal: process.env.TRIPOSR_SERVICE_URL || 
    `http://triposr-service.${process.env.K8S_NAMESPACE || '3d-inferencing'}.svc.cluster.local:8000`,
  
  stable3dgenInternal: process.env.STABLE3DGEN_SERVICE_URL || 
    `http://stable3dgen-service.${process.env.K8S_NAMESPACE || '3d-inferencing'}.svc.cluster.local:8000`,
  
  direct3ds2Internal: process.env.DIRECT3DS2_SERVICE_URL || 
    `http://direct3d-s2-service.${process.env.K8S_NAMESPACE || '3d-inferencing'}.svc.cluster.local:8000`,
  
  assetManagerInternal: process.env.ASSET_MANAGER_SERVICE_URL || 
    `http://asset-manager-service.${process.env.K8S_NAMESPACE || '3d-inferencing'}.svc.cluster.local:8000`,
};

/**
 * Axios instance for JSON requests
 * Used by business services for standard API calls
 */
export const apiClient = axios.create({
  baseURL: config.publicApiBase,
  timeout: 180000, // 3 minutes for long-running 3D generation
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Axios instance for FormData/multipart requests
 * Used for image uploads and file transfers
 */
export const apiClientFormData = axios.create({
  baseURL: config.publicApiBase,
  timeout: 180000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Request interceptor for logging (development only)
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.request.use(
    (config) => {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  apiClientFormData.interceptors.request.use(
    (config) => {
      console.log(`[API FormData Request] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API FormData Request Error]', error);
      return Promise.reject(error);
    }
  );
}

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API Error] ${error.response.status}: ${error.response.statusText}`);
      console.error('[API Error Details]', error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('[API Error] No response received:', error.message);
    } else {
      // Error in request setup
      console.error('[API Error] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

apiClientFormData.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[API FormData Error] ${error.response.status}: ${error.response.statusText}`);
      console.error('[API FormData Error Details]', error.response.data);
    } else if (error.request) {
      console.error('[API FormData Error] No response received:', error.message);
    } else {
      console.error('[API FormData Error] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);
