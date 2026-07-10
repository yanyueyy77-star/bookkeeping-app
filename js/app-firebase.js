/**
 * 个人记账 Web 应用 - 核心逻辑
 * 使用原生 JavaScript + Firebase (Firestore + Authentication) 实现
 */

// ========================
// 常量与配置
// ========================

const STORAGE_KEYS = {
  BILLS: 'bookkeeping_bills',
  CATEGORIES: 'bookkeeping_categories',
  ACCOUNTS: 'bookkeeping_accounts',
  SETTINGS: 'bookkeeping_settings'
};

const DEFAULT_ICONS = [
  '🍔', '🚕', '🛒', '🎮', '🏠', '🏥', '📚', '📦',
  '💼', '💰', '🧧', '📈', '💳', '💵', '🏦', '🎁',
  '✈️', '🏨', '☕', '🍎', '👕', '💄', '🐶', '🌿'
];

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

// 默认支出分类
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: '🍔', color: '#FF6B6B' },
  { name: '交通', icon: '🚕', color: '#4ECDC4' },
  { name: '购物', icon: '🛒', color: '#45B7D1' },
  { name: '娱乐', icon: '🎮', color: '#96CEB4' },
  { name: '居住', icon: '🏠', color: '#FFEAA7' },
  { name: '医疗', icon: '🏥', color: '#DDA0DD' },
  { name: '教育', icon: '📚', color: '#98D8C8' },
  { name: '其他', icon: '📦', color: '#F7DC6F' }
];

// 默认收入分类
const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: '💼', color: '#10B981' },
  { name: '奖金', icon: '💰', color: '#34D399' },
  { name: '兼职', icon: '🧧', color: '#6EE7B7' },
  { name: '投资', icon: '📈', color: '#85C1E9' },
  { name: '其他', icon: '📦', color: '#F7DC6F' }
];

// ========================
// 工具函数
// ========================

/**
 * 生成唯一 ID
 */
function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化金额为人民币显示
 */
function formatMoney(amount) {
  const num = Number(amount) || 0;
  return `¥${num.toFixed(2)}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 格式化日期为 MM-DD
 */
function formatShortDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 格式化年月显示
 */
function formatYearMonth(year, month) {
  return `${year}年${month + 1}月`;
}

/**
 * 获取今天的日期字符串
 */
function getTodayString() {
  return formatDate(new Date());
}

/**
 * 深拷贝对象/数组
 * 使用 JSON 序列化实现简单深拷贝，适用于本应用中的纯数据对象
 * @param {*} obj - 待拷贝的对象或数组
 * @returns {*} 深拷贝后的副本
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函数
 * 用于限制搜索输入等高频事件的触发频率，提升性能
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 显示页面加载指示器
 * 在应用初始化期间显示，提升用户感知性能
 */
function showPageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.remove('hidden');
}

/**
 * 隐藏页面加载指示器
 */
function hidePageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.add('hidden');
}

/**
 * 设置按钮加载状态
 * @param {HTMLButtonElement} button - 目标按钮
 * @param {boolean} isLoading - 是否加载中
 * @param {string} loadingText - 加载时显示的文本
 */
function setButtonLoading(button, isLoading, loadingText = '处理中...') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.classList.add('is-loading');
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.classList.remove('is-loading');
    button.disabled = false;
  }
}

/**
 * 锁定页面滚动
 * 模态框打开时调用，防止背景内容滚动
 * @param {boolean} lock - 是否锁定
 */
function lockBodyScroll(lock) {
  document.body.classList.toggle('modal-open', lock);
}

// ========================
// LocalStorage 数据操作（保留用于兼容与本地回退）
// ========================

/**
 * 从 LocalStorage 读取数据
 */
function getStorageData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('读取 LocalStorage 失败:', error);
    return defaultValue;
  }
}

/**
 * 写入数据到 LocalStorage
 */
function setStorageData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('写入 LocalStorage 失败:', error);
    showToast('数据保存失败，可能是存储空间不足');
    return false;
  }
}

// ========================
// 应用状态
// ========================

const appState = {
  currentView: 'dashboard',
  currentDate: new Date(),
  categoryType: 'expense',
  statPeriod: 'month',
  previousFocus: null,
  filter: {
    keyword: '',
    period: 'all',
    type: 'all',
    category: 'all'
  }
};

// ========================
// 内存数据缓存
// ========================

/**
 * 数据缓存对象
 * 用于减少 Firestore 的重复读取，提升性能
 * 所有数据操作优先访问内存缓存，持久化时同步到 Firestore
 */
const dataCache = {
  bills: null,
  categories: null,
  accounts: null,
  settings: null,
  initialized: false
};

/**
 * 缓存键到 LocalStorage 键的映射
 */
const CACHE_KEY_MAP = {
  bills: STORAGE_KEYS.BILLS,
  categories: STORAGE_KEYS.CATEGORIES,
  accounts: STORAGE_KEYS.ACCOUNTS,
  settings: STORAGE_KEYS.SETTINGS
};

/**
 * 从缓存获取数据
 * @param {string} key - 数据类型
 * @param {*} defaultValue - 默认值
 * @returns {*} 缓存数据
 */
function getCachedData(key, defaultValue = null) {
  if (dataCache[key] !== null) {
    return deepClone(dataCache[key]);
  }
  return defaultValue;
}

/**
 * 更新缓存
 * @param {string} key - 数据类型
 * @param {*} value - 新数据
 * @returns {boolean} 是否保存成功
 */
function setCachedData(key, value) {
  dataCache[key] = deepClone(value);
  return true;
}

/**
 * 初始化数据缓存
 * @param {Object|null} data - 可选，从 Firestore 加载的用户数据
 */
function initDataCache(data = null) {
  if (data) {
    dataCache.bills = data.bills || [];
    dataCache.categories = data.categories || [];
    dataCache.accounts = data.accounts || [];
    dataCache.settings = data.settings || { theme: 'light', currency: 'CNY' };
    dataCache.initialized = true;
    return;
  }

  if (dataCache.initialized) return;

  dataCache.bills = [];
  dataCache.categories = [];
  dataCache.accounts = [];
  dataCache.settings = { theme: 'light', currency: 'CNY' };
  dataCache.initialized = true;
}

// ========================
// 数据服务层
// ========================

/**
 * 初始化默认数据
 * 用户未登录时不执行；已登录且缓存未初始化时从 Firestore 加载
 */
async function initDefaultData() {
  const user = getCurrentUser();
  if (!user) return;

  if (!dataCache.initialized) {
    const data = await loadUserData();
    initDataCache(data);
  }

  let categories = getCategories();
  if (!categories || categories.length === 0) {
    categories = [];
    DEFAULT_EXPENSE_CATEGORIES.forEach((cat, index) => {
      categories.push({
        id: generateId('c_'),
        name: cat.name,
        type: 'expense',
        icon: cat.icon,
        color: cat.color,
        sortOrder: index,
        isDefault: true,
        createdAt: new Date().toISOString()
      });
    });
    DEFAULT_INCOME_CATEGORIES.forEach((cat, index) => {
      categories.push({
        id: generateId('c_'),
        name: cat.name,
        type: 'income',
        icon: cat.icon,
        color: cat.color,
        sortOrder: index,
        isDefault: true,
        createdAt: new Date().toISOString()
      });
    });
    dataCache.categories = categories;
    await saveUserData({
      bills: dataCache.bills || [],
      categories: dataCache.categories,
      settings: dataCache.settings || { theme: 'light', currency: 'CNY' }
    });
  }

  if (!dataCache.bills) dataCache.bills = [];
  if (!dataCache.accounts) dataCache.accounts = [];
  if (!dataCache.settings) dataCache.settings = { theme: 'light', currency: 'CNY' };
}

/**
 * 获取所有账单
 * @returns {Array} 账单数组
 */
function getBills() {
  return getCachedData('bills', []);
}

/**
 * 保存所有账单
 * @param {Array} bills - 账单数组
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveBills(bills) {
  dataCache.bills = deepClone(bills);
  await saveUserData({
    bills: dataCache.bills,
    categories: dataCache.categories || [],
    settings: dataCache.settings || { theme: 'light', currency: 'CNY' }
  });
  return true;
}

/**
 * 获取所有分类
 * @returns {Array} 分类数组
 */
function getCategories() {
  return getCachedData('categories', []);
}

/**
 * 保存所有分类
 * @param {Array} categories - 分类数组
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveCategories(categories) {
  dataCache.categories = deepClone(categories);
  await saveUserData({
    bills: dataCache.bills || [],
    categories: dataCache.categories,
    settings: dataCache.settings || { theme: 'light', currency: 'CNY' }
  });
  return true;
}

/**
 * 根据 ID 获取分类
 * @param {string} id - 分类 ID
 * @returns {Object|undefined} 分类对象
 */
function getCategoryById(id) {
  return getCategories().find(c => c.id === id);
}

/**
 * 根据类型获取分类
 * @param {string} type - 'expense' 或 'income'
 * @returns {Array} 按 sortOrder 排序的分类数组
 */
function getCategoriesByType(type) {
  return getCategories()
    .filter(c => c.type === type)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

/**
 * 获取设置
 * @returns {Object} 设置对象
 */
function getSettings() {
  return getCachedData('settings', { theme: 'light', currency: 'CNY' });
}

/**
 * 保存设置
 * @param {Object} settings - 设置对象
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveSettings(settings) {
  dataCache.settings = deepClone(settings);
  await saveUserData({
    bills: dataCache.bills || [],
    categories: dataCache.categories || [],
    settings: dataCache.settings
  });
  return true;
}

// ========================
// DOM 元素缓存
// ========================

const elements = {
  views: {
    dashboard: document.getElementById('dashboardView'),
    bills: document.getElementById('billsView'),
    categories: document.getElementById('categoriesView'),
    statistics: document.getElementById('statisticsView'),
    settings: document.getElementById('settingsView')
  },
  app: document.getElementById('app'),
  navItems: document.querySelectorAll('.nav-item[data-nav]'),
  currentMonth: document.getElementById('currentMonth'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  totalIncome: document.getElementById('totalIncome'),
  totalExpense: document.getElementById('totalExpense'),
  totalBalance: document.getElementById('totalBalance'),
  totalBalanceSmall: document.getElementById('totalBalanceSmall'),
  categoryChart: document.getElementById('categoryChart'),
  recentBillsList: document.getElementById('recentBillsList'),
  searchInput: document.getElementById('searchInput'),
  filterBtn: document.getElementById('filterBtn'),
  filterPanel: document.getElementById('filterPanel'),
  filterPeriod: document.getElementById('filterPeriod'),
  filterType: document.getElementById('filterType'),
  filterCategory: document.getElementById('filterCategory'),
  resetFilter: document.getElementById('resetFilter'),
  applyFilter: document.getElementById('applyFilter'),
  billsList: document.getElementById('billsList'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  categoryTabBtns: document.querySelectorAll('.tab-btn[data-category-type]'),
  categoriesList: document.getElementById('categoriesList'),
  statTabBtns: document.querySelectorAll('.stat-tab[data-stat-period]'),
  statIncome: document.getElementById('statIncome'),
  statExpense: document.getElementById('statExpense'),
  rankingChart: document.getElementById('rankingChart'),
  statCategoryChart: document.getElementById('statCategoryChart'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  exportData: document.getElementById('exportData'),
  importData: document.getElementById('importData'),
  clearData: document.getElementById('clearData'),
  billModal: document.getElementById('billModal'),
  billModalTitle: document.getElementById('billModalTitle'),
  billForm: document.getElementById('billForm'),
  billId: document.getElementById('billId'),
  billType: document.getElementById('billType'),
  billAmount: document.getElementById('billAmount'),
  billCategory: document.getElementById('billCategory'),
  billCategoryChips: document.getElementById('billCategoryChips'),
  billDate: document.getElementById('billDate'),
  billNote: document.getElementById('billNote'),
  typeBtns: document.querySelectorAll('.segment-btn[data-type]'),
  categoryModal: document.getElementById('categoryModal'),
  categoryModalTitle: document.getElementById('categoryModalTitle'),
  categoryForm: document.getElementById('categoryForm'),
  categoryId: document.getElementById('categoryId'),
  categoryTypeInput: document.getElementById('categoryTypeInput'),
  categoryName: document.getElementById('categoryName'),
  categoryIcon: document.getElementById('categoryIcon'),
  categoryColor: document.getElementById('categoryColor'),
  categoryIconPicker: document.getElementById('categoryIconPicker'),
  categoryColorPicker: document.getElementById('categoryColorPicker'),
  confirmModal: document.getElementById('confirmModal'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  confirmCancel: document.getElementById('confirmCancel'),
  confirmOk: document.getElementById('confirmOk'),
  addBillFab: document.getElementById('addBillFab'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage'),
  authView: document.getElementById('authView'),
  authForm: document.getElementById('authForm'),
  authMode: document.getElementById('authMode'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authConfirmPassword: document.getElementById('authConfirmPassword'),
  authConfirmPasswordGroup: document.getElementById('authConfirmPasswordGroup'),
  authError: document.getElementById('authError'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authToggleBtn: document.getElementById('authToggleBtn'),
  authToggleText: document.getElementById('authToggleText'),
  currentUserEmail: document.getElementById('currentUserEmail'),
  logoutBtn: document.getElementById('logoutBtn')
};

// ========================
// 导航与视图切换
// ========================

function switchView(viewName) {
  Object.values(elements.views).forEach(view => {
    view.classList.remove('active');
  });

  const targetView = elements.views[viewName];
  if (targetView) {
    targetView.classList.add('active');
  }

  elements.navItems.forEach(item => {
    const isActive = item.dataset.nav === viewName;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  appState.currentView = viewName;

  requestAnimationFrame(() => {
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'bills') {
      renderFilterCategories();
      renderBillsList();
    }
    if (viewName === 'categories') renderCategories();
    if (viewName === 'statistics') renderStatistics();
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================
// 首页概览渲染
// ========================

function renderDashboard() {
  const year = appState.currentDate.getFullYear();
  const month = appState.currentDate.getMonth();

  elements.currentMonth.textContent = formatYearMonth(year, month);

  const bills = getBills();
  const filteredBills = filterBillsByMonth(bills, year, month);

  const income = filteredBills
    .filter(b => b.type === 'income')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const expense = filteredBills
    .filter(b => b.type === 'expense')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  elements.totalIncome.textContent = formatMoney(income);
  elements.totalExpense.textContent = formatMoney(expense);
  elements.totalBalance.textContent = formatMoney(income - expense);
  if (elements.totalBalanceSmall) {
    elements.totalBalanceSmall.textContent = formatMoney(income - expense);
  }

  renderCategoryChart(filteredBills, elements.categoryChart);
  renderRecentBills(filteredBills);
}

function filterBillsByMonth(bills, year, month) {
  return bills.filter(bill => {
    const date = new Date(bill.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function renderCategoryChart(bills, container) {
  const expenseBills = bills.filter(b => b.type === 'expense');

  if (expenseBills.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无支出数据</div>';
    return;
  }

  const categoryMap = new Map();
  let total = 0;

  expenseBills.forEach(bill => {
    const category = getCategoryById(bill.categoryId);
    const name = category ? category.name : '未分类';
    const color = category ? category.color : '#94a3b8';
    const icon = category ? category.icon : '📦';

    const key = bill.categoryId || 'uncategorized';
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { name, color, icon, amount: 0 });
    }
    categoryMap.get(key).amount += Number(bill.amount);
    total += Number(bill.amount);
  });

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount);

  let gradientStr = '';
  let currentDeg = 0;
  const sortedData = [];

  categories.forEach(cat => {
    const percent = cat.amount / total;
    const deg = percent * 360;
    sortedData.push({ ...cat, percent, startDeg: currentDeg, endDeg: currentDeg + deg });
    gradientStr += `${cat.color} ${currentDeg}deg ${currentDeg + deg}deg, `;
    currentDeg += deg;
  });

  gradientStr = gradientStr.slice(0, -2);

  const html = `
    <div class="donut-chart" style="background: conic-gradient(${gradientStr});">
      <div class="donut-center">
        <div class="label">总支出</div>
        <div class="value">${formatMoney(total)}</div>
      </div>
    </div>
    <div class="legend-list">
      ${categories.map(cat => `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${cat.color}"></span>
          <span class="legend-name">${cat.icon} ${cat.name}</span>
          <span class="legend-value">${formatMoney(cat.amount)}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

function renderRecentBills(bills) {
  const sortedBills = bills
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (sortedBills.length === 0) {
    elements.recentBillsList.innerHTML = '<div class="empty-state">暂无账单记录</div>';
    return;
  }

  elements.recentBillsList.innerHTML = sortedBills.map(bill => createBillItemHtml(bill, false)).join('');
}

// ========================
// 账单列表渲染
// ========================

function createBillItemHtml(bill, showActions = true) {
  const category = getCategoryById(bill.categoryId);
  const name = category ? category.name : '未分类';
  const icon = category ? category.icon : '📦';
  const color = category ? category.color : '#94a3b8';
  const sign = bill.type === 'income' ? '+' : '-';

  return `
    <div class="bill-item" data-id="${bill.id}">
      <div class="bill-icon" style="background-color: ${color}20; color: ${color}">${icon}</div>
      <div class="bill-info">
        <div class="bill-title">${name}</div>
        <div class="bill-meta">${formatDate(bill.date)}${bill.note ? ' · ' + escapeHtml(bill.note) : ''}</div>
      </div>
      <div class="bill-amount ${bill.type}">${sign}${formatMoney(bill.amount)}</div>
      ${showActions ? `
        <div class="bill-actions">
          <button class="btn btn-secondary btn-sm edit-bill" data-id="${bill.id}">编辑</button>
          <button class="btn btn-danger btn-sm delete-bill" data-id="${bill.id}">删除</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderFilterCategories() {
  const categories = getCategories();
  const currentValue = elements.filterCategory.value;

  elements.filterCategory.innerHTML = '<option value="all">全部分类</option>' +
    categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

  if (currentValue) {
    elements.filterCategory.value = currentValue;
  }
}

function renderBillsList() {
  let bills = getBills().sort((a, b) => new Date(b.date) - new Date(a.date));

  const keyword = appState.filter.keyword.trim().toLowerCase();
  if (keyword) {
    bills = bills.filter(bill => {
      const category = getCategoryById(bill.categoryId);
      const categoryName = category ? category.name.toLowerCase() : '';
      const note = (bill.note || '').toLowerCase();
      return categoryName.includes(keyword) || note.includes(keyword);
    });
  }

  bills = filterByPeriod(bills, appState.filter.period);

  if (appState.filter.type !== 'all') {
    bills = bills.filter(b => b.type === appState.filter.type);
  }

  if (appState.filter.category !== 'all') {
    bills = bills.filter(b => b.categoryId === appState.filter.category);
  }

  if (bills.length === 0) {
    elements.billsList.innerHTML = '<div class="empty-state">没有找到符合条件的账单</div>';
    return;
  }

  const grouped = groupBillsByDate(bills);

  elements.billsList.innerHTML = Object.entries(grouped).map(([date, groupBills]) => `
    <div class="bill-group">
      <div class="bill-group-header">${date}</div>
      ${groupBills.map(bill => createBillItemHtml(bill)).join('')}
    </div>
  `).join('');
}

function groupBillsByDate(bills) {
  const grouped = {};
  bills.forEach(bill => {
    const dateKey = formatDate(bill.date);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(bill);
  });
  return grouped;
}

function filterByPeriod(bills, period) {
  if (period === 'all') return bills;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return bills.filter(bill => {
    const billDate = new Date(bill.date);

    switch (period) {
      case 'today':
        return billDate >= today;
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return billDate >= weekStart;
      }
      case 'month':
        return billDate.getFullYear() === now.getFullYear() && billDate.getMonth() === now.getMonth();
      case 'year':
        return billDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });
}

// ========================
// 账单表单操作
// ========================

function openBillModal(bill = null) {
  const isEdit = !!bill;
  elements.billModalTitle.textContent = isEdit ? '编辑账单' : '记一笔';
  elements.billId.value = isEdit ? bill.id : '';
  elements.billAmount.value = isEdit ? bill.amount : '';
  elements.billDate.value = isEdit ? formatDate(bill.date) : getTodayString();
  elements.billNote.value = isEdit ? (bill.note || '') : '';

  appState.previousFocus = document.activeElement;

  const type = isEdit ? bill.type : 'expense';
  setBillType(type);

  if (isEdit && bill.categoryId) {
    elements.billCategory.value = bill.categoryId;
  } else {
    elements.billCategory.value = '';
  }

  renderBillCategoryOptions(type);

  elements.billModal.classList.remove('hidden');
  lockBodyScroll(true);

  requestAnimationFrame(() => {
    elements.billAmount.focus();
  });
}

function setBillType(type) {
  elements.billType.value = type;
  elements.typeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
}

function renderBillCategoryOptions(type) {
  const categories = getCategoriesByType(type);
  const currentValue = elements.billCategory.value;

  if (categories.length === 0) {
    elements.billCategoryChips.innerHTML = '<span class="empty-state" style="padding: 16px 0;">暂无分类</span>';
    elements.billCategory.value = '';
    return;
  }

  elements.billCategoryChips.innerHTML = categories.map(c => `
    <button type="button" class="category-chip ${c.id === currentValue ? 'active' : ''}" data-value="${c.id}">
      <span class="chip-icon">${c.icon}</span>
      <span>${c.name}</span>
    </button>
  `).join('');

  const exists = categories.some(c => c.id === currentValue);
  if (!exists) {
    elements.billCategory.value = '';
  }
}

function selectBillCategoryChip(chip) {
  if (!chip) return;
  elements.billCategoryChips.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  elements.billCategory.value = chip.dataset.value;
}

function closeBillModal() {
  elements.billModal.classList.add('hidden');
  lockBodyScroll(false);
  elements.billForm.reset();

  if (appState.previousFocus && appState.previousFocus.focus) {
    appState.previousFocus.focus();
  }
}

async function saveBill(formData) {
  const bills = getBills();
  const now = new Date().toISOString();

  if (formData.id) {
    const index = bills.findIndex(b => b.id === formData.id);
    if (index === -1) return false;

    bills[index] = {
      ...bills[index],
      type: formData.type,
      amount: Number(formData.amount),
      categoryId: formData.categoryId,
      date: formData.date,
      note: formData.note,
      updatedAt: now
    };
  } else {
    bills.push({
      id: generateId('b_'),
      type: formData.type,
      amount: Number(formData.amount),
      categoryId: formData.categoryId,
      date: formData.date,
      note: formData.note,
      createdAt: now,
      updatedAt: now
    });
  }

  await saveBills(bills);
  showToast(formData.id ? '账单已更新' : '账单已保存');
  return true;
}

function deleteBill(id) {
  showConfirm('删除账单', '确定要删除这条账单吗？删除后不可恢复。', async () => {
    const bills = getBills().filter(b => b.id !== id);
    await saveBills(bills);
    showToast('账单已删除');
    renderCurrentView();
  });
}

// ========================
// 分类管理
// ========================

function renderCategories() {
  const categories = getCategoriesByType(appState.categoryType);

  if (categories.length === 0) {
    elements.categoriesList.innerHTML = '<div class="empty-state">暂无分类</div>';
    return;
  }

  elements.categoriesList.innerHTML = categories.map(cat => `
    <div class="category-item" data-id="${cat.id}">
      <div class="category-icon" style="background-color: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
      <div class="category-name">${cat.name}</div>
      ${cat.isDefault ? '<span class="category-badge">默认</span>' : ''}
      <div class="category-actions">
        <button class="btn btn-secondary btn-sm edit-category" data-id="${cat.id}">编辑</button>
        ${!cat.isDefault ? `<button class="btn btn-danger btn-sm delete-category" data-id="${cat.id}">删除</button>` : ''}
      </div>
    </div>
  `).join('');
}

function openCategoryModal(category = null) {
  const isEdit = !!category;
  elements.categoryModalTitle.textContent = isEdit ? '编辑分类' : '新增分类';
  elements.categoryId.value = isEdit ? category.id : '';
  elements.categoryName.value = isEdit ? category.name : '';
  elements.categoryColor.value = isEdit ? category.color : DEFAULT_COLORS[0];
  elements.categoryIcon.value = isEdit ? category.icon : DEFAULT_ICONS[0];
  elements.categoryTypeInput.value = appState.categoryType;

  appState.previousFocus = document.activeElement;

  renderIconPicker(isEdit ? category.icon : DEFAULT_ICONS[0]);
  renderColorPicker(isEdit ? category.color : DEFAULT_COLORS[0]);

  elements.categoryModal.classList.remove('hidden');
  lockBodyScroll(true);

  requestAnimationFrame(() => {
    elements.categoryName.focus();
  });
}

function renderIconPicker(selectedIcon) {
  elements.categoryIconPicker.innerHTML = DEFAULT_ICONS.map(icon => `
    <button type="button" class="icon-option ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}">
      ${icon}
    </button>
  `).join('');
}

function renderColorPicker(selectedColor) {
  elements.categoryColorPicker.innerHTML = DEFAULT_COLORS.map(color => `
    <button type="button" class="color-option ${color === selectedColor ? 'selected' : ''}" data-color="${color}" style="background-color: ${color};" aria-label="选择颜色 ${color}"></button>
  `).join('');
}

function selectCategoryColor(colorOption) {
  if (!colorOption) return;
  elements.categoryColorPicker.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
  colorOption.classList.add('selected');
  elements.categoryColor.value = colorOption.dataset.color;
}

function closeCategoryModal() {
  elements.categoryModal.classList.add('hidden');
  lockBodyScroll(false);
  elements.categoryForm.reset();

  if (appState.previousFocus && appState.previousFocus.focus) {
    appState.previousFocus.focus();
  }
}

async function saveCategory(formData) {
  const categories = getCategories();
  const now = new Date().toISOString();

  // 检查名称是否重复（同类型下）
  const exists = categories.some(c =>
    c.type === formData.type &&
    c.name === formData.name &&
    c.id !== formData.id
  );

  if (exists) {
    showToast('该分类名称已存在');
    return false;
  }

  if (formData.id) {
    const index = categories.findIndex(c => c.id === formData.id);
    if (index === -1) return false;

    categories[index] = {
      ...categories[index],
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      updatedAt: now
    };
  } else {
    categories.push({
      id: generateId('c_'),
      name: formData.name,
      type: formData.type,
      icon: formData.icon,
      color: formData.color,
      sortOrder: categories.filter(c => c.type === formData.type).length,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    });
  }

  await saveCategories(categories);
  showToast(formData.id ? '分类已更新' : '分类已添加');
  return true;
}

function deleteCategory(id) {
  const categories = getCategories();
  const category = categories.find(c => c.id === id);

  if (!category) return;

  if (category.isDefault) {
    showToast('默认分类不能删除');
    return;
  }

  // 检查是否有账单使用该分类
  const bills = getBills();
  const relatedBills = bills.filter(b => b.categoryId === id);

  showConfirm(
    '删除分类',
    `确定要删除「${category.name}」分类吗？${relatedBills.length > 0 ? `该分类下有 ${relatedBills.length} 条账单将被移至「其他」分类。` : ''}`,
    async () => {
      // 将相关账单移至同类型的"其他"分类
      if (relatedBills.length > 0) {
        const otherCategory = categories.find(c => c.type === category.type && c.name === '其他');
        const targetId = otherCategory ? otherCategory.id : null;

        const updatedBills = bills.map(b => {
          if (b.categoryId === id) {
            return { ...b, categoryId: targetId };
          }
          return b;
        });
        await saveBills(updatedBills);
      }

      await saveCategories(categories.filter(c => c.id !== id));
      showToast('分类已删除');
      renderCategories();
    }
  );
}

// ========================
// 统计报表
// ========================

function renderStatistics() {
  let bills = getBills();
  bills = filterByStatPeriod(bills, appState.statPeriod);

  const income = bills
    .filter(b => b.type === 'income')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const expense = bills
    .filter(b => b.type === 'expense')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  elements.statIncome.textContent = formatMoney(income);
  elements.statExpense.textContent = formatMoney(expense);

  renderRankingChart(bills);
  renderCategoryChart(bills, elements.statCategoryChart);
}

function filterByStatPeriod(bills, period) {
  const now = new Date();

  switch (period) {
    case 'month':
      return bills.filter(b => {
        const date = new Date(b.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      });
    case 'year':
      return bills.filter(b => new Date(b.date).getFullYear() === now.getFullYear());
    case 'all':
    default:
      return bills;
  }
}

function renderRankingChart(bills) {
  const expenseBills = bills.filter(b => b.type === 'expense');

  if (expenseBills.length === 0) {
    elements.rankingChart.innerHTML = '<div class="empty-state">暂无支出数据</div>';
    return;
  }

  const categoryMap = new Map();
  let total = 0;

  expenseBills.forEach(bill => {
    const category = getCategoryById(bill.categoryId);
    const key = bill.categoryId || 'uncategorized';
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: category ? category.name : '未分类',
        icon: category ? category.icon : '📦',
        color: category ? category.color : '#94a3b8',
        amount: 0
      });
    }
    categoryMap.get(key).amount += Number(bill.amount);
    total += Number(bill.amount);
  });

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  elements.rankingChart.innerHTML = categories.map((cat, index) => {
    const percent = total > 0 ? (cat.amount / total * 100).toFixed(1) : 0;
    return `
      <div class="ranking-item">
        <div class="ranking-rank">${index + 1}</div>
        <div class="ranking-icon" style="background-color: ${cat.color}20; color: ${cat.color}">${cat.icon}</div>
        <div class="ranking-info">
          <div class="ranking-name">${cat.name}</div>
          <div class="ranking-bar">
            <div class="ranking-bar-fill" style="width: ${percent}%; background-color: ${cat.color}"></div>
          </div>
        </div>
        <div class="ranking-amount">
          <div class="amount">${formatMoney(cat.amount)}</div>
          <div class="percent">${percent}%</div>
        </div>
      </div>
    `;
  }).join('');
}

// ========================
// 设置功能
// ========================

async function toggleTheme() {
  const settings = getSettings();
  const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
  settings.theme = newTheme;
  await saveSettings(settings);
  applyTheme(newTheme);
  showToast(newTheme === 'dark' ? '已切换到深色模式' : '已切换到浅色模式');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function exportData() {
  const data = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    bills: getBills(),
    categories: getCategories(),
    accounts: dataCache.accounts || [],
    settings: getSettings()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookkeeping_backup_${formatDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('数据已导出');
}

function importData(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      showConfirm(
        '导入数据',
        '导入数据将覆盖当前所有数据，确定要继续吗？',
        async () => {
          if (data.bills) dataCache.bills = data.bills;
          if (data.categories) dataCache.categories = data.categories;
          if (data.accounts) dataCache.accounts = data.accounts;
          if (data.settings) {
            dataCache.settings = data.settings;
            applyTheme(data.settings.theme || 'light');
          }
          await saveUserData({
            bills: dataCache.bills || [],
            categories: dataCache.categories || [],
            settings: dataCache.settings || { theme: 'light', currency: 'CNY' }
          });
          showToast('数据导入成功');
          renderCurrentView();
        }
      );
    } catch (error) {
      console.error('导入数据失败:', error);
      showToast('文件格式错误，导入失败');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  showConfirm(
    '清空所有数据',
    '此操作将删除所有账单、分类和设置，且不可恢复。确定要继续吗？',
    async () => {
      dataCache.bills = [];
      dataCache.categories = [];
      dataCache.accounts = [];
      dataCache.settings = { theme: 'light', currency: 'CNY' };
      await saveUserData({
        bills: [],
        categories: [],
        settings: { theme: 'light', currency: 'CNY' }
      });
      await initDefaultData();
      applyTheme('light');
      showToast('所有数据已清空');
      renderCurrentView();
    }
  );
}

// ========================
// 弹窗与提示
// ========================

function showConfirm(title, message, onConfirm) {
  appState.previousFocus = document.activeElement;
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmModal.classList.remove('hidden');
  lockBodyScroll(true);

  // 移除旧的事件监听器，避免重复绑定
  const newConfirmOk = elements.confirmOk.cloneNode(true);
  elements.confirmOk.parentNode.replaceChild(newConfirmOk, elements.confirmOk);
  elements.confirmOk = newConfirmOk;

  elements.confirmOk.addEventListener('click', () => {
    closeConfirmModal();
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  });
}

function closeConfirmModal() {
  elements.confirmModal.classList.add('hidden');
  lockBodyScroll(false);

  if (appState.previousFocus && appState.previousFocus.focus) {
    appState.previousFocus.focus();
  }
}

let toastTimeout;
function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove('hidden');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2500);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderCurrentView() {
  switchView(appState.currentView);
}

// ========================
// 认证相关函数
// ========================

function showAuthView() {
  // 登出时清空本地缓存，避免数据泄漏
  dataCache.bills = null;
  dataCache.categories = null;
  dataCache.accounts = null;
  dataCache.settings = null;
  dataCache.initialized = false;

  elements.app.classList.add('hidden');
  elements.authView.classList.remove('hidden');
}

function showAppView() {
  elements.authView.classList.add('hidden');
  elements.app.classList.remove('hidden');
}

async function handleAuthStateChange(user) {
  if (user) {
    elements.currentUserEmail.textContent = user.email || '';
    await initDefaultData();
    const settings = getSettings();
    applyTheme(settings.theme || 'light');
    showAppView();
    switchView('dashboard');
  } else {
    showAuthView();
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const isSignUp = elements.authMode.value === 'signup';
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  const confirmPassword = elements.authConfirmPassword.value;

  if (!email || !password) {
    elements.authError.textContent = '请输入邮箱和密码';
    return;
  }

  if (isSignUp && password !== confirmPassword) {
    elements.authError.textContent = '两次输入的密码不一致';
    return;
  }

  setButtonLoading(elements.authSubmitBtn, true, isSignUp ? '注册中...' : '登录中...');
  elements.authError.textContent = '';

  try {
    if (isSignUp) {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
    elements.authForm.reset();
  } catch (error) {
    console.error('认证失败:', error);
    elements.authError.textContent = error.message || '认证失败，请重试';
  } finally {
    setButtonLoading(elements.authSubmitBtn, false);
  }
}

function toggleAuthMode() {
  const isSignUp = elements.authMode.value === 'signup';
  elements.authMode.value = isSignUp ? 'signin' : 'signup';
  const newIsSignUp = elements.authMode.value === 'signup';

  elements.authSubmitBtn.textContent = newIsSignUp ? '注册' : '登录';
  elements.authToggleText.textContent = newIsSignUp ? '已有账号？去登录' : '还没有账号？去注册';
  elements.authConfirmPasswordGroup.classList.toggle('hidden', !newIsSignUp);
  elements.authError.textContent = '';
}

async function handleLogout() {
  try {
    await signOut();
  } catch (error) {
    console.error('退出登录失败:', error);
    showToast('退出登录失败');
  }
}

// ========================
// 事件监听器绑定
// ========================

function bindEvents() {
  // 底部导航
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.nav);
    });
  });

  // 首页月份切换
  elements.prevMonth.addEventListener('click', () => {
    appState.currentDate.setMonth(appState.currentDate.getMonth() - 1);
    renderDashboard();
  });

  elements.nextMonth.addEventListener('click', () => {
    appState.currentDate.setMonth(appState.currentDate.getMonth() + 1);
    renderDashboard();
  });

  // 添加账单按钮
  elements.addBillFab.addEventListener('click', () => {
    openBillModal();
  });

  // 账单类型切换
  elements.typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setBillType(btn.dataset.type);
      renderBillCategoryOptions(btn.dataset.type);
    });
  });

  // 账单表单提交
  elements.billForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.submitter;
    setButtonLoading(submitBtn, true, '保存中...');

    const formData = {
      id: elements.billId.value,
      type: elements.billType.value,
      amount: elements.billAmount.value,
      categoryId: elements.billCategory.value,
      date: elements.billDate.value,
      note: elements.billNote.value.trim()
    };

    // 表单验证
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('请输入有效金额');
      setButtonLoading(submitBtn, false);
      return;
    }

    if (!formData.categoryId) {
      showToast('请选择分类');
      setButtonLoading(submitBtn, false);
      return;
    }

    if (await saveBill(formData)) {
      closeBillModal();
      renderCurrentView();
    }

    setButtonLoading(submitBtn, false);
  });

  // 账单列表事件委托
  elements.billsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-bill');
    const deleteBtn = e.target.closest('.delete-bill');

    if (editBtn) {
      const bill = getBills().find(b => b.id === editBtn.dataset.id);
      if (bill) openBillModal(bill);
      return;
    }

    if (deleteBtn) {
      deleteBill(deleteBtn.dataset.id);
      return;
    }
  });

  // 搜索 - 使用防抖函数优化高频输入性能
  elements.searchInput.addEventListener('input', debounce((e) => {
    appState.filter.keyword = e.target.value;
    renderBillsList();
  }, 250));

  // 筛选面板
  elements.filterBtn.addEventListener('click', () => {
    elements.filterPanel.classList.toggle('hidden');
  });

  elements.applyFilter.addEventListener('click', () => {
    appState.filter.period = elements.filterPeriod.value;
    appState.filter.type = elements.filterType.value;
    appState.filter.category = elements.filterCategory.value;
    renderBillsList();
    elements.filterPanel.classList.add('hidden');
  });

  elements.resetFilter.addEventListener('click', () => {
    elements.filterPeriod.value = 'all';
    elements.filterType.value = 'all';
    elements.filterCategory.value = 'all';
    appState.filter = { keyword: '', period: 'all', type: 'all', category: 'all' };
    elements.searchInput.value = '';
    renderBillsList();
    elements.filterPanel.classList.add('hidden');
  });

  // 分类 Tab 切换
  elements.categoryTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.categoryTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.categoryType = btn.dataset.categoryType;
      renderCategories();
    });
  });

  // 新增分类
  elements.addCategoryBtn.addEventListener('click', () => {
    openCategoryModal();
  });

  // 分类 chips 选择
  elements.billCategoryChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    selectBillCategoryChip(chip);
  });

  // 图标选择
  elements.categoryIconPicker.addEventListener('click', (e) => {
    const iconOption = e.target.closest('.icon-option');
    if (!iconOption) return;

    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    iconOption.classList.add('selected');
    elements.categoryIcon.value = iconOption.dataset.icon;
  });

  // 颜色选择
  elements.categoryColorPicker.addEventListener('click', (e) => {
    const colorOption = e.target.closest('.color-option');
    if (!colorOption) return;
    selectCategoryColor(colorOption);
  });

  // 分类表单提交
  elements.categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.submitter;
    setButtonLoading(submitBtn, true, '保存中...');

    const formData = {
      id: elements.categoryId.value,
      type: elements.categoryTypeInput.value,
      name: elements.categoryName.value.trim(),
      icon: elements.categoryIcon.value,
      color: elements.categoryColor.value
    };

    if (!formData.name) {
      showToast('请输入分类名称');
      setButtonLoading(submitBtn, false);
      return;
    }

    if (await saveCategory(formData)) {
      closeCategoryModal();
      renderCategories();
    }

    setButtonLoading(submitBtn, false);
  });

  // 分类列表事件委托
  elements.categoriesList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-category');
    const deleteBtn = e.target.closest('.delete-category');

    if (editBtn) {
      const category = getCategories().find(c => c.id === editBtn.dataset.id);
      if (category) openCategoryModal(category);
      return;
    }

    if (deleteBtn) {
      deleteCategory(deleteBtn.dataset.id);
      return;
    }
  });

  // 统计周期切换
  elements.statTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.statTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.statPeriod = btn.dataset.statPeriod;
      renderStatistics();
    });
  });

  // 设置
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.exportData.addEventListener('click', exportData);
  elements.importData.addEventListener('change', (e) => importData(e.target.files[0]));
  elements.clearData.addEventListener('click', clearAllData);

  // 认证事件
  if (elements.authForm) {
    elements.authForm.addEventListener('submit', handleAuthSubmit);
  }
  if (elements.authToggleBtn) {
    elements.authToggleBtn.addEventListener('click', toggleAuthMode);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', handleLogout);
  }

  // 关闭弹窗
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeBillModal();
      closeCategoryModal();
    });
  });

  // 点击弹窗遮罩关闭
  elements.billModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeBillModal();
    }
  });

  elements.categoryModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeCategoryModal();
    }
  });

  elements.confirmModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeConfirmModal();
    }
  });

  elements.confirmCancel.addEventListener('click', closeConfirmModal);

  // 文本按钮导航（查看全部）
  document.querySelectorAll('.text-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.nav);
    });
  });

  // 全局键盘快捷键支持
  document.addEventListener('keydown', handleKeyboard);
}

/**
 * 全局键盘事件处理
 * 支持 ESC 关闭弹窗、Enter 提交表单等快捷操作
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function handleKeyboard(e) {
  // ESC 键关闭当前打开的弹窗
  if (e.key === 'Escape') {
    if (!elements.billModal.classList.contains('hidden')) {
      closeBillModal();
    } else if (!elements.categoryModal.classList.contains('hidden')) {
      closeCategoryModal();
    } else if (!elements.confirmModal.classList.contains('hidden')) {
      closeConfirmModal();
    }
  }

  // Ctrl/Cmd + N 快速新增账单
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    openBillModal();
  }

  // Ctrl/Cmd + / 切换主题
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    toggleTheme();
  }
}

// ========================
// 应用初始化
// ========================

/**
 * 应用初始化
 * 绑定事件、监听认证状态，由认证回调控制数据加载和视图显示
 */
async function initApp() {
  showPageLoader();

  try {
    bindEvents();
    onAuthStateChanged(handleAuthStateChange);
  } catch (error) {
    console.error('应用初始化失败:', error);
    showToast('应用加载失败，请刷新页面重试');
  } finally {
    // 延迟隐藏加载指示器，确保首屏渲染完成
    requestAnimationFrame(() => {
      setTimeout(hidePageLoader, 100);
    });
  }
}

// 等待 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
