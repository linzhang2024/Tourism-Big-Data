import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const TOKEN_KEY = 'auth_token';

let quotaModalElement: HTMLDivElement | null = null;

const showQuotaExceededModal = (message: string) => {
  console.log('[配额超限] 显示配额不足弹窗');
  
  if (quotaModalElement) {
    document.body.removeChild(quotaModalElement);
    quotaModalElement = null;
  }

  const modal = document.createElement('div');
  modal.id = 'quota-exceeded-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    animation: fadeIn 0.3s ease;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 16px;
    max-width: 480px;
    width: 90%;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.4s ease;
  `;

  content.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
      padding: 2rem;
      text-align: center;
      color: white;
    ">
      <div style="
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: pulse 2s infinite;
      ">⚠️</div>
      <h2 style="
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      ">配额不足</h2>
      <p style="
        margin: 0;
        opacity: 0.9;
        font-size: 0.95rem;
      ">您的资源配额已用完</p>
    </div>
    <div style="padding: 2rem;">
      <div style="
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 1rem 1.25rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      ">
        <p style="
          margin: 0;
          color: #92400e;
          font-size: 0.95rem;
          line-height: 1.5;
        ">${message}</p>
      </div>
      
      <div style="
        background: #f8fafc;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      ">
        <h4 style="
          margin: 0 0 1rem 0;
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        ">
          <span>💡</span>
          如何提升配额？
        </h4>
        <ul style="
          margin: 0;
          padding-left: 1.5rem;
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.8;
        ">
          <li>联系系统管理员申请提升配额</li>
          <li>说明您的业务需求和预期用量</li>
          <li>管理员审核通过后将调整您的配额</li>
        </ul>
      </div>

      <div style="
        display: flex;
        gap: 1rem;
      ">
        <button 
          id="quota-modal-close"
          style="
            flex: 1;
            padding: 0.875rem 1.5rem;
            background: #e5e7eb;
            color: #374151;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='#d1d5db'"
          onmouseout="this.style.background='#e5e7eb'"
        >
          知道了
        </button>
        <button 
          id="quota-modal-contact"
          style="
            flex: 1;
            padding: 0.875rem 1.5rem;
            background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          "
          onmouseover="this.style.transform='scale(1.02)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          <span>📧</span>
          联系管理员
        </button>
      </div>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);
  quotaModalElement = modal;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;
  document.head.appendChild(style);

  const closeModal = () => {
    if (quotaModalElement) {
      quotaModalElement.style.animation = 'fadeIn 0.3s ease reverse';
      setTimeout(() => {
        if (quotaModalElement && quotaModalElement.parentNode) {
          document.body.removeChild(quotaModalElement);
        }
        quotaModalElement = null;
      }, 300);
    }
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  const closeBtn = content.querySelector('#quota-modal-close');
  const contactBtn = content.querySelector('#quota-modal-contact');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      const adminEmail = 'admin@example.com';
      const subject = encodeURIComponent('配额提升申请');
      const body = encodeURIComponent(
        '尊敬的管理员：\n\n' +
        '我需要提升我的资源配额。以下是我的需求：\n\n' +
        '• 行程数量配额：当前不足，需要提升\n' +
        '• AI调用次数配额：当前不足，需要提升\n\n' +
        '请审阅我的申请，如有需要请联系我。\n\n' +
        '此致\n' +
        '用户'
      );
      window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
    });
  }

  document.addEventListener('keydown', function escHandler(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
};

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

const isQuotaExceededError = (status: number | undefined, data: any, message: string): boolean => {
  if (status !== 403) return false;
  
  const quotaKeywords = [
    'quota', '配额', '上限', '限制', 'exceeded', '已达', '用完', '不足',
    'itinerary', '行程', 'ai', 'AI', '调用', '次数'
  ];
  
  const checkText = (text: string) => {
    return quotaKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  if (typeof data === 'object') {
    if (data.detail && checkText(data.detail)) return true;
    if (data.message && checkText(data.message)) return true;
    if (data.error && checkText(data.error)) return true;
  }
  
  if (message && checkText(message)) return true;
  
  return false;
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
      let responseData: any = null;
      
      if (error.response?.data && typeof error.response.data === 'object') {
        responseData = error.response.data;
        if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      }
      
      if (isQuotaExceededError(status, responseData, errorMessage)) {
        console.warn('[Axios 拦截器] 检测到配额超限错误');
        console.warn(`[Axios 拦截器] 错误详情: ${errorMessage}`);
        
        let displayMessage = errorMessage;
        if (displayMessage === '请求失败，请稍后重试') {
          displayMessage = '您的资源配额已用完，无法继续操作。';
        }
        
        showQuotaExceededModal(displayMessage);
        
        const handledError = new Error(errorMessage) as any;
        handledError.isHandled = true;
        handledError.isQuotaExceeded = true;
        handledError.response = error.response;
        handledError.status = status;
        return Promise.reject(handledError);
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
