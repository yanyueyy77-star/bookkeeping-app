/**
 * Firebase 服务层
 * 封装 Firebase Authentication 和 Firestore 操作
 * 提供用户认证、数据读写、实时同步能力
 */

// ========================
// Firebase 实例引用
// ========================

const auth = firebase.auth();
const db = firebase.firestore();

// ========================
// 用户认证相关
// ========================

/**
 * 用户注册
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<Object>} 用户信息
 */
function signUp(email, password) {
  return auth.createUserWithEmailAndPassword(email, password);
}

/**
 * 用户登录
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<Object>} 用户信息
 */
function signIn(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

/**
 * 用户登出
 * @returns {Promise<void>}
 */
function signOut() {
  return auth.signOut();
}

/**
 * 获取当前登录用户
 * @returns {Object|null} 当前用户
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * 监听认证状态变化
 * @param {Function} callback - 回调函数，接收 user 对象
 */
function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

// ========================
// Firestore 数据操作
// ========================

/**
 * 获取当前用户的文档引用
 * @returns {firebase.firestore.DocumentReference|null}
 */
function getUserDocRef() {
  const user = getCurrentUser();
  if (!user) return null;
  return db.collection('users').doc(user.uid);
}

/**
 * 加载用户的全部数据
 * @returns {Promise<Object>} 包含 bills、categories、settings 的对象
 */
async function loadUserData() {
  const userDocRef = getUserDocRef();
  if (!userDocRef) {
    throw new Error('用户未登录');
  }

  const doc = await userDocRef.get();
  if (doc.exists) {
    const data = doc.data();
    return {
      bills: data.bills || [],
      categories: data.categories || [],
      settings: data.settings || { theme: 'light', currency: 'CNY' }
    };
  }

  // 新用户：初始化默认数据
  const defaultData = {
    bills: [],
    categories: [],
    settings: { theme: 'light', currency: 'CNY' }
  };

  await userDocRef.set(defaultData);
  return defaultData;
}

/**
 * 保存用户的全部数据
 * @param {Object} data - 包含 bills、categories、settings 的对象
 * @returns {Promise<void>}
 */
async function saveUserData(data) {
  const userDocRef = getUserDocRef();
  if (!userDocRef) {
    throw new Error('用户未登录');
  }

  await userDocRef.set({
    bills: data.bills || [],
    categories: data.categories || [],
    settings: data.settings || { theme: 'light', currency: 'CNY' },
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

/**
 * 监听用户数据实时更新
 * @param {Function} callback - 数据变化时的回调
 * @returns {Function} 取消监听的函数
 */
function onUserDataChanged(callback) {
  const userDocRef = getUserDocRef();
  if (!userDocRef) return () => {};

  return userDocRef.onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      callback({
        bills: data.bills || [],
        categories: data.categories || [],
        settings: data.settings || { theme: 'light', currency: 'CNY' }
      });
    }
  });
}
