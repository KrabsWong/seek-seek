document.addEventListener('DOMContentLoaded', () => {
  const initializeElements = () => {
    const elements = {
      searchInput: document.getElementById('ss-searchInput'),
      searchButton: document.getElementById('ss-searchButton'),
      caseSensitiveCheckbox: document.getElementById('caseSensitive'),
      matchCountSpan: document.getElementById('matchCount'),
      customizeShortcutLink: document.getElementById('ss-customizeShortcut'),
      shortcutText: document.getElementById('shortcutText'),
      clearButton: document.getElementById('ss-clearButton')
    };

    // 检查所有必需的元素是否存在
    for (const [key, element] of Object.entries(elements)) {
      if (!element) {
        console.error(`Required element ${key} not found`);
        return null;
      }
    }

    return elements;
  };

  const elements = initializeElements();
  if (!elements) return;

  let lastSearchQuery = '';

  // 获取并显示当前快捷键
  const updateShortcutText = () => {
    chrome.commands.getAll((commands) => {
      const command = commands.find(cmd => cmd.name === '_execute_action');
      if (command && command.shortcut) {
        shortcutText.textContent = command.shortcut;
      }
    });
  };

  // 初始化时更新快捷键显示
  updateShortcutText();

  // 监听快捷键变化
  chrome.commands.onCommand.addListener(() => {
    updateShortcutText();
  });

  // 加载保存的设置
  chrome.storage.local.get(['caseSensitive'], (result) => {
    caseSensitiveCheckbox.checked = result.caseSensitive !== false;
  });

  // 执行搜索
  // 修改所有的DOM元素引用，使用elements对象
  const performSearch = () => {
    const query = elements.searchInput.value;
    const caseSensitive = elements.caseSensitiveCheckbox.checked;
    if (!query) {
      elements.matchCountSpan.textContent = '';
      return;
    }

    lastSearchQuery = query;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        matchCountSpan.textContent = '无法获取当前标签页';
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'search',
        query,
        caseSensitive
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('搜索出错:', chrome.runtime.lastError);
          matchCountSpan.textContent = '搜索过程中出现错误';
          return;
        }

        if (response && typeof response.count === 'number' && typeof response.current === 'number') {
          if (response.count === 0) {
            matchCountSpan.textContent = '未找到匹配项';
          } else {
            matchCountSpan.textContent = `找到 ${response.count} 个匹配项（当前第 ${response.current} 个）`;
          }
        } else {
          console.error('搜索响应无效:', response);
          matchCountSpan.textContent = '搜索过程中出现错误';
        }
      });
    });
  };

  // 跳转到下一个匹配项
  const goToNextMatch = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'next' }, (response) => {
        if (response && typeof response.count === 'number') {
          const current = typeof response.current === 'number' ? response.current : 0;
          matchCountSpan.textContent = `找到 ${response.count} 个匹配项${response.count > 0 ? `（当前第 ${current} 个）` : ''}`;
        } else {
          console.error('下一个匹配项响应无效:', response);
        }
      });
    });
  };

  // 保存设置
  const saveSettings = () => {
    chrome.storage.local.set({
      caseSensitive: caseSensitiveCheckbox.checked
    });
  };

  // 事件监听
  // 更新事件监听器
  elements.searchButton.addEventListener('click', performSearch);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const currentQuery = elements.searchInput.value;
      if (currentQuery === lastSearchQuery) {
        goToNextMatch();
      } else {
        performSearch();
      }
    }
  });
  elements.caseSensitiveCheckbox.addEventListener('change', saveSettings);
  elements.clearButton.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.matchCountSpan.textContent = '';
    
    // 发送清除高亮的消息到content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' }, (response) => {
        // 确保高亮已被清除
        if (response && response.cleared) {
          console.log('所有高亮已清除');
        }
      });
    });
  });

  // 自定义快捷键链接
  elements.customizeShortcutLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
  // 自动聚焦搜索输入框
  elements.searchInput.focus();
});