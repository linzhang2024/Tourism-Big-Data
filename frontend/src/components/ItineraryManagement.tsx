import React, { useState, useEffect, useCallback } from 'react';
import { 
  ItineraryDetail, 
  ItineraryCreate, 
  ItineraryUpdate, 
  DayPlan, 
  Activity,
  InterestPreference 
} from '../types';
import { 
  getItineraries, 
  createItinerary, 
  updateItinerary, 
  deleteItinerary,
  generateItinerary 
} from '../api';
import { useAuth } from '../contexts/AuthContext';

const interestOptions: { value: InterestPreference; label: string }[] = [
  { value: 'culture', label: '🏛️ 文化古迹' },
  { value: 'nature', label: '🌿 自然风光' },
  { value: 'food', label: '🍜 美食探索' },
  { value: 'shopping', label: '🛍️ 购物血拼' },
  { value: 'adventure', label: '🧗 户外冒险' },
  { value: 'relaxation', label: '🧘 休闲放松' },
];

interface ItineraryFormData {
  title: string;
  departure: string;
  destination: string;
  days: number;
  budget: string;
  interests: InterestPreference[];
  travel_style: string;
}

const initialFormData: ItineraryFormData = {
  title: '',
  departure: '北京',
  destination: '三亚',
  days: 5,
  budget: '5000',
  interests: ['culture', 'food'],
  travel_style: '',
};

interface ItineraryManagementProps {}

export const ItineraryManagement: React.FC<ItineraryManagementProps> = () => {
  const { hasPermission, hasAnyPermission } = useAuth();
  const [itineraries, setItineraries] = useState<ItineraryDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccessError, setHasAccessError] = useState(false);
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [editingItinerary, setEditingItinerary] = useState<ItineraryDetail | null>(null);
  const [deletingItinerary, setDeletingItinerary] = useState<ItineraryDetail | null>(null);
  const [viewingItinerary, setViewingItinerary] = useState<ItineraryDetail | null>(null);
  
  const [formData, setFormData] = useState<ItineraryFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlans, setGeneratedPlans] = useState<DayPlan[] | null>(null);
  const [generatedEstimatedCost, setGeneratedEstimatedCost] = useState<number | null>(null);

  const canView = hasAnyPermission(['itinerary:view', 'data:view']);
  const canViewDetail = hasPermission('itinerary:view');
  const canCreate = hasPermission('itinerary:create');
  const canUpdate = hasPermission('itinerary:update');
  const canDelete = hasPermission('itinerary:delete');

  const fetchItineraries = useCallback(async () => {
    if (!canView) {
      console.log('[行程管理] 用户没有查看权限，跳过数据获取');
      return;
    }
    
    setLoading(true);
    setError(null);
    setHasAccessError(false);
    
    try {
      console.log('[行程管理] 开始获取行程列表...');
      const data = await getItineraries();
      console.log('[行程管理] 获取行程列表成功:', data.length, '条');
      setItineraries(data);
    } catch (err: any) {
      console.error('[行程管理] 获取行程列表失败:', err);
      
      if (err.response?.status === 403) {
        setHasAccessError(true);
        setError('您没有权限查看行程数据');
      } else {
        setError(err instanceof Error ? err.message : '获取行程列表失败');
      }
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const openCreateModal = () => {
    if (!canCreate) {
      console.log('[行程管理] 用户没有创建权限');
      return;
    }
    setEditingItinerary(null);
    setFormData(initialFormData);
    setGeneratedPlans(null);
    setGeneratedEstimatedCost(null);
    setShowFormModal(true);
  };

  const openEditModal = (itinerary: ItineraryDetail) => {
    if (!canUpdate) {
      console.log('[行程管理] 用户没有编辑权限');
      return;
    }
    setEditingItinerary(itinerary);
    setFormData({
      title: itinerary.title,
      departure: itinerary.departure,
      destination: itinerary.destination,
      days: itinerary.days,
      budget: itinerary.budget?.toString() || '',
      interests: (itinerary.interests as InterestPreference[]) || [],
      travel_style: itinerary.travel_style || '',
    });
    setGeneratedPlans(itinerary.daily_plans);
    setGeneratedEstimatedCost(itinerary.estimated_total_cost || null);
    setShowFormModal(true);
  };

  const openDeleteModal = (itinerary: ItineraryDetail) => {
    if (!canDelete) {
      console.log('[行程管理] 用户没有删除权限');
      return;
    }
    setDeletingItinerary(itinerary);
    setShowDeleteModal(true);
  };

  const openDetailModal = (itinerary: ItineraryDetail) => {
    if (!canViewDetail && !canView) {
      console.log('[行程管理] 用户没有查看详情权限');
      return;
    }
    setViewingItinerary(itinerary);
    setShowDetailModal(true);
  };

  const handleGenerateItinerary = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      console.log('[行程管理] 开始生成行程...');
      const response = await generateItinerary({
        departure: formData.departure,
        destination: formData.destination,
        days: formData.days,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        interests: formData.interests,
        travel_style: formData.travel_style || undefined,
      });
      console.log('[行程管理] 行程生成成功');
      setGeneratedPlans(response.daily_plans);
      setGeneratedEstimatedCost(response.estimated_total_cost || null);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: response.title }));
      }
    } catch (err) {
      console.error('[行程管理] 生成行程失败:', err);
      setError(err instanceof Error ? err.message : '生成行程失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (editingItinerary) {
        console.log('[行程管理] 开始更新行程:', editingItinerary.id);
        const updateData: ItineraryUpdate = {
          title: formData.title,
          departure: formData.departure,
          destination: formData.destination,
          days: formData.days,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          interests: formData.interests,
          travel_style: formData.travel_style || undefined,
          daily_plans: generatedPlans || undefined,
          estimated_total_cost: generatedEstimatedCost || undefined,
        };
        await updateItinerary(editingItinerary.id, updateData);
        console.log('[行程管理] 更新行程成功');
      } else {
        if (!generatedPlans) {
          setError('请先生成行程计划');
          setFormLoading(false);
          return;
        }
        console.log('[行程管理] 开始创建行程');
        const createData: ItineraryCreate = {
          title: formData.title,
          departure: formData.departure,
          destination: formData.destination,
          days: formData.days,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          interests: formData.interests,
          travel_style: formData.travel_style || undefined,
          daily_plans: generatedPlans,
          estimated_total_cost: generatedEstimatedCost || undefined,
          tips: [],
        };
        await createItinerary(createData);
        console.log('[行程管理] 创建行程成功');
      }
      
      setShowFormModal(false);
      fetchItineraries();
    } catch (err) {
      console.error('[行程管理] 提交失败:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItinerary) return;
    
    setFormLoading(true);
    setError(null);

    try {
      console.log('[行程管理] 开始删除行程:', deletingItinerary.id);
      await deleteItinerary(deletingItinerary.id);
      console.log('[行程管理] 删除行程成功');
      setShowDeleteModal(false);
      fetchItineraries();
    } catch (err) {
      console.error('[行程管理] 删除失败:', err);
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleInterest = (interest: InterestPreference) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (!canView && !hasAccessError) {
    return (
      <div className="itinerary-management">
        <div className="form-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ color: '#6b7280', marginBottom: '1rem' }}>暂无权限查看</h3>
          <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>
            您的账号没有行程查看权限
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            如需查看，请联系管理员开通 itinerary:view 或 data:view 权限
          </p>
        </div>
      </div>
    );
  }

  if (hasAccessError) {
    return (
      <div className="itinerary-management">
        <div className="form-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
          <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>访问被拒绝</h3>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
            服务器拒绝了您的访问请求
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            请确认您的账号是否拥有相应的访问权限
          </p>
          <button
            onClick={fetchItineraries}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="itinerary-management">
      <div className="form-card">
        <div className="card-header">
          <h2>🗺️ 行程管理</h2>
          {canCreate && (
            <button className="add-btn" onClick={openCreateModal}>
              ➕ 新增行程
            </button>
          )}
        </div>

        {error && !hasAccessError && (
          <div className="error-message">{error}</div>
        )}

        {loading ? (
          <div className="loading">⏳ 加载中...</div>
        ) : itineraries.length === 0 ? (
          <div className="empty-row">
            <p>暂无行程数据</p>
            {canCreate && (
              <button className="add-btn" onClick={openCreateModal} style={{ marginTop: '1rem' }}>
                创建第一个行程
              </button>
            )}
            {!canCreate && (
              <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                您没有创建行程的权限，仅可查看现有数据
              </p>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="role-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>行程标题</th>
                  <th>路线</th>
                  <th>天数</th>
                  <th>预估费用</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {itineraries.map(itinerary => (
                  <tr key={itinerary.id}>
                    <td>{itinerary.id}</td>
                    <td className="role-name">{itinerary.title}</td>
                    <td>
                      <span>{itinerary.departure}</span>
                      <span style={{ margin: '0 0.5rem' }}>→</span>
                      <span>{itinerary.destination}</span>
                    </td>
                    <td>{itinerary.days} 天</td>
                    <td>
                      {itinerary.estimated_total_cost 
                        ? `¥${itinerary.estimated_total_cost.toLocaleString()}` 
                        : '-'}
                    </td>
                    <td className="date-cell">{formatDate(itinerary.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(canViewDetail || canView) && (
                          <button
                            className="permission-btn"
                            onClick={() => openDetailModal(itinerary)}
                            title="查看详情"
                          >
                            👁️ 查看
                          </button>
                        )}
                        {canUpdate ? (
                          <button
                            className="permission-btn"
                            onClick={() => openEditModal(itinerary)}
                            title="编辑"
                          >
                            ✏️ 编辑
                          </button>
                        ) : (
                          <button
                            className="permission-btn"
                            disabled
                            title="您没有编辑权限"
                            style={{ 
                              opacity: 0.5, 
                              cursor: 'not-allowed',
                              background: '#9ca3af'
                            }}
                          >
                            ✏️ 编辑
                          </button>
                        )}
                        {canDelete ? (
                          <button
                            className="permission-btn"
                            onClick={() => openDeleteModal(itinerary)}
                            title="删除"
                            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                          >
                            🗑️ 删除
                          </button>
                        ) : (
                          <button
                            className="permission-btn"
                            disabled
                            title="您没有删除权限"
                            style={{ 
                              opacity: 0.5, 
                              cursor: 'not-allowed',
                              background: '#9ca3af'
                            }}
                          >
                            🗑️ 删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!canCreate && itineraries.length > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1rem', 
            background: '#fef3c7', 
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            ⚠️ 提示：您只有查看权限，无法进行新增、编辑或删除操作
          </div>
        )}
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => !formLoading && setShowFormModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItinerary ? '✏️ 编辑行程' : '➕ 新增行程'}</h3>
              <button className="close-btn" onClick={() => setShowFormModal(false)} disabled={formLoading}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">行程标题 <span className="required">*</span></label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：北京→三亚5天4晚深度游"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="departure">出发地 <span className="required">*</span></label>
                  <input
                    id="departure"
                    type="text"
                    value={formData.departure}
                    onChange={e => setFormData(prev => ({ ...prev, departure: e.target.value }))}
                    placeholder="例如：北京"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="destination">目的地 <span className="required">*</span></label>
                  <input
                    id="destination"
                    type="text"
                    value={formData.destination}
                    onChange={e => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="例如：三亚"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="days">行程天数 <span className="required">*</span></label>
                  <select
                    id="days"
                    value={formData.days}
                    onChange={e => setFormData(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 30].map(d => (
                      <option key={d} value={d}>{d} 天</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="budget">预算金额（元）</label>
                  <input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={e => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="例如：5000"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>兴趣偏好</label>
                <div className="checkbox-group">
                  {interestOptions.map(option => (
                    <div
                      key={option.value}
                      className={`checkbox-item ${formData.interests.includes(option.value) ? 'selected' : ''}`}
                      onClick={() => toggleInterest(option.value)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(option.value)}
                        onChange={() => toggleInterest(option.value)}
                        style={{ display: 'none' }}
                      />
                      <span>{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleGenerateItinerary}
                  disabled={isGenerating}
                  style={{ marginBottom: '1rem' }}
                >
                  {isGenerating ? '⏳ AI 正在规划您的行程...' : '🤖 AI 生成行程计划'}
                </button>
              </div>

              {generatedPlans && (
                <div className="form-group">
                  <label>生成的行程计划</label>
                  <div 
                    style={{ 
                      background: '#f9fafb', 
                      borderRadius: '8px', 
                      padding: '1rem',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    {generatedEstimatedCost !== null && (
                      <div style={{ marginBottom: '1rem', fontWeight: 600, color: '#667eea' }}>
                        预估总费用: ¥{generatedEstimatedCost.toLocaleString()}
                      </div>
                    )}
                    {generatedPlans.map(dayPlan => (
                      <div key={dayPlan.day} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <strong>第 {dayPlan.day} 天:</strong> {dayPlan.summary}
                        <div style={{ color: '#6b7280', marginLeft: '1rem' }}>
                          {dayPlan.activities.length} 个活动
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowFormModal(false)}
                  disabled={formLoading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={formLoading || !generatedPlans}
                  style={{ width: 'auto' }}
                >
                  {formLoading ? '⏳ 保存中...' : (editingItinerary ? '✓ 保存修改' : '✓ 创建行程')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deletingItinerary && (
        <div className="modal-overlay" onClick={() => !formLoading && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ 确认删除</h3>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)} disabled={formLoading}>
                ×
              </button>
            </div>

            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              确定要删除行程 <strong>"{deletingItinerary.title}"</strong> 吗？
              <br />
              <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>此操作不可撤销！</span>
            </p>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={formLoading}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={formLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {formLoading ? '⏳ 删除中...' : '✓ 确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && viewingItinerary && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>📋 行程详情</h3>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>{viewingItinerary.title}</h3>
              
              <div className="result-summary" style={{ justifyContent: 'flex-start', gap: '1.5rem', marginBottom: '1rem' }}>
                <div className="summary-item">
                  <div className="summary-label">🚀 出发地</div>
                  <div className="summary-value">{viewingItinerary.departure}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">📍 目的地</div>
                  <div className="summary-value">{viewingItinerary.destination}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">📅 天数</div>
                  <div className="summary-value">{viewingItinerary.days} 天</div>
                </div>
                {viewingItinerary.estimated_total_cost !== undefined && (
                  <div className="summary-item">
                    <div className="summary-label">💰 预估费用</div>
                    <div className="summary-value">¥{viewingItinerary.estimated_total_cost.toLocaleString()}</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                创建时间: {formatDate(viewingItinerary.created_at)}
                {viewingItinerary.updated_at && (
                  <span style={{ marginLeft: '1rem' }}>
                    更新时间: {formatDate(viewingItinerary.updated_at)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <h4 style={{ marginBottom: '1rem', color: '#333' }}>📋 详细行程</h4>
              {viewingItinerary.daily_plans.map(dayPlan => (
                <div key={dayPlan.day} className="day-plan" style={{ marginLeft: 0 }}>
                  <div className="day-header">
                    <div className="day-number">{dayPlan.day}</div>
                    <div className="day-title">{dayPlan.summary}</div>
                  </div>
                  <div className="activity-list">
                    {dayPlan.activities.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-time">{activity.time}</div>
                        <div className="activity-name">{activity.name}</div>
                        {activity.description && (
                          <div className="activity-details" style={{ marginBottom: '0.25rem' }}>
                            {activity.description}
                          </div>
                        )}
                        <div className="activity-details">
                          {activity.location && (
                            <span className="activity-location">📍 {activity.location}</span>
                          )}
                          {activity.estimated_cost !== undefined && activity.estimated_cost > 0 && (
                            <span className="activity-cost">¥{activity.estimated_cost}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowDetailModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
