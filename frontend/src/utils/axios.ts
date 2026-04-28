import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const TOKEN_KEY = 'auth_token';

const showGlobalError = (message: string) => {
  console.error('[全局错误]', message);
  
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      font-size: 0.95rem;
      font-weight: 500;
      max-width: 400px;
      transform: translateX(120%);
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-size: 1.2rem;">🚫</span>
      <span>${message}</span>
    </div>
  `;
  
  toast.style.transform = 'translateX(0)';
  
  setTimeout(() => {
    if (toast) {
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }, 5000);
};

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (token) {
        console.log(`[Axios 拦截器] 请求: ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`[Axios 拦截器] 添加 Authorization Header: Bearer ${token.substring(0, 20)}...`);
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log(`[Axios 拦截器] 请求: ${config.method?.toUpperCase()} ${config.url} (无 Token)`);
      }
      
      return config;
    },
    (error: AxiosError) => {
      console.error('[Axios 拦截器] 请求错误:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log(`[Axios 拦截器] 响应: ${response.status} ${response.config.url}`);
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.config?.url;
      
      console.error(`[Axios 拦截器] 响应错误: ${status} ${url}`);
      
      let errorMessage = '请求失败，请稍后重试';
      
      if (error.response?.data && typeof error.response.data === 'object') {
        const data = error.response.data as any;
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      
      if (status === 401) {
        console.warn('[Axios 拦截器] 收到 401 未授权响应，Token 已过期');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('auth_user');
        
        showGlobalError('登录已过期，请重新登录');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
        const silentError = new Error('登录已过期') as any;
        silentError.isHandled = true;
        silentError.response = error.response;
        return Promise.reject(silentError);
      }
      
      if (status === 403) {
        console.warn(`[Axios 拦截器] 收到 403 禁止访问响应: ${url}`);
        console.warn(`[Axios 拦截器] 错误详情: ${errorMessage}`);
        
        const isItineraryUrl = url?.includes('/itinerary');
        const isGetRequest = error.config?.method?.toUpperCase() === 'GET';
        
        if (isItineraryUrl && isGetRequest) {
          console.log('[Axios 拦截器] 这是行程页面的获取请求，让组件自行处理权限提示');
        } else {
          showGlobalError(`访问被拒绝: ${errorMessage}`);
        }
        
        const handledError = new Error(errorMessage) as any;
        handledError.isHandled = true;
        handledError.response = error.response;
        handledError.status = status;
        return Promise.reject(handledError);
      }
      
      if (status === 404) {
        console.warn(`[Axios 拦截器] 收到 404 资源不存在: ${url}`);
        const handledError = new Error('请求的资源不存在') as any;
        handledError.isHandled = true;
        handledError.response = error.response;
        return Promise.reject(handledError);
      }
      
      if (status && status >= 500) {
        console.error(`[Axios 拦截器] 服务器错误 ${status}: ${url}`);
        showGlobalError('服务器错误，请稍后重试');
        const handledError = new Error('服务器错误，请稍后重试') as any;
        handledError.isHandled = true;
        handledError.response = error.response;
        return Promise.reject(handledError);
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiAxios = createAxiosInstance();

export default apiAxios;
