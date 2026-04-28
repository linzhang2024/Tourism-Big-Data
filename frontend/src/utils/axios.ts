import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const TOKEN_KEY = 'auth_token';

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
      console.error(`[Axios 拦截器] 响应错误: ${error.response?.status} ${error.config?.url}`);
      
      if (error.response?.status === 401) {
        console.warn('[Axios 拦截器] 收到 401 未授权响应，可能 Token 已过期');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiAxios = createAxiosInstance();

export default apiAxios;
