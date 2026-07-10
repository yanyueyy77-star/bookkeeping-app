/**
 * Firebase 配置
 * 项目：jizhang-53137
 */
const firebaseConfig = {
  apiKey: "AIzaSyA4wyaVOkhh4OJ9S4JR7SLvhuIQImLXL5E",
  authDomain: "jizhang-53137.firebaseapp.com",
  projectId: "jizhang-53137",
  storageBucket: "jizhang-53137.firebasestorage.app",
  messagingSenderId: "68082897783",
  appId: "1:68082897783:web:faaba81af90937a4238772",
  measurementId: "G-EL1DS1HEV5"
};

// 初始化 Firebase（兼容模式）
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
} else {
  console.error('Firebase SDK 未加载，请检查 index.html 中的脚本引用');
}
