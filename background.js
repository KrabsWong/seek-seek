// 监听扩展安装或更新事件
chrome.runtime.onInstalled.addListener(() => {
  // 初始化存储的设置
  chrome.storage.local.set({
    caseSensitive: true
  });
});

// 监听popup关闭事件
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(async () => {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs?.[0]?.id) {
        // 向content script发送清理命令
        try {
          await chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' });
        } catch (error) {
          console.error('清理搜索结果失败:', error);
        }
      }
    });
  }
});

// 由于使用Manifest V3，这个文件作为service worker运行
// 保持扩展在需要时能够响应