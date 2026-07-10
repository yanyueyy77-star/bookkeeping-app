/**
 * Firebase 配置
 * 请替换为您的 Firebase 项目配置
 * 获取方式：Firebase 控制台 → 项目设置 → 您的应用 → SDK 配置
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初始化 Firebase（兼容模式）
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
} else {
  console.error('Firebase SDK 未加载，请检查 index.html 中的脚本引用');
}
