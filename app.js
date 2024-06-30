document.getElementById('generateBtn').addEventListener('click', async () => {
  let inputPath = document.getElementById('repoUrl').value.trim();
  const branch = document.getElementById('branch').value || 'main';

  if (inputPath.startsWith('http://') || inputPath.startsWith('https://')) {
    // Normalize the repository URL
    if (inputPath.startsWith('https://github.com/')) {
      inputPath = inputPath.replace('https://github.com/', '');
    }
    if (inputPath.endsWith('/')) {
      inputPath = inputPath.slice(0, -1);
    }

    const repoPath = inputPath;
    const apiUrl = `https://api.github.com/repos/${repoPath}/git/trees/${branch}?recursive=1`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }

      const data = await response.json();
      const tree = data.tree;
      const treeHtml = generateTreeHtml(tree);
      document.getElementById('treeOutput').textContent = treeHtml;
      document.getElementById('copyBtn').style.display = 'block'; // Показываем кнопку после генерации дерева
    } catch (error) {
      document.getElementById('treeOutput').textContent = 'Error: ' + error.message;
      document.getElementById('copyBtn').style.display = 'none'; // Скрываем кнопку при ошибке
    }
  }
});

document.getElementById('selectFolderBtn').addEventListener('click', async () => {
  try {
    console.log('Requesting directory access...');
    const directoryHandle = await window.showDirectoryPicker();
    console.log('Directory selected:', directoryHandle);

    const tree = [];
    await readDirectory(directoryHandle, '', tree);
    const treeHtml = generateLocalTreeHtml(tree);
    document.getElementById('treeOutput').textContent = treeHtml;
    document.getElementById('copyBtn').style.display = 'block'; // Показываем кнопку после генерации дерева
  } catch (error) {
    console.error('Error selecting directory:', error);
    alert('Error selecting directory: ' + error.message);
  }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const treeOutput = document.getElementById('treeOutput').textContent;
  navigator.clipboard.writeText(treeOutput).then(() => {
    alert('Tree copied to clipboard');
  }, (err) => {
    alert('Failed to copy: ', err);
  });
});

async function readDirectory(directoryHandle, path, tree) {
  for await (const [name, handle] of directoryHandle) {
    // Ignore hidden files and folders (those that start with a dot)
    if (name.startsWith('.')) continue;

    const fullPath = path ? `${path}/${name}` : name;
    if (handle.kind === 'directory') {
      await readDirectory(handle, fullPath, tree);
    } else {
      tree.push(fullPath);
    }
  }
}

function generateLocalTreeHtml(tree) {
  const treeMap = {};
  tree.forEach(item => {
    const parts = item.split('/');
    parts.reduce((acc, part, index) => {
      if (!acc[part]) {
        acc[part] = {
          __type: (index === parts.length - 1) ? 'file' : 'folder',
          __children: {}
        };
      }
      return acc[part].__children;
    }, treeMap);
  });

  function buildList(node, prefix = '') {
    let result = '';
    const keys = Object.keys(node);
    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const newPrefix = prefix + (isLast ? '└─' : '├─');
      result += `${newPrefix} ${key}\n`;
      if (Object.keys(node[key].__children).length > 0) {
        result += buildList(node[key].__children, prefix + (isLast ? '  ' : '| '));
      }
    });
    return result;
  }

  return buildList(treeMap);
}

function generateTreeHtml(tree) {
  const treeMap = {};
  tree.forEach(item => {
    const parts = item.path.split('/');
    parts.reduce((acc, part, index) => {
      if (!acc[part]) {
        acc[part] = {
          __path: item.path,
          __type: item.type,
          __children: {}
        };
      }
      if (index === parts.length - 1) {
        acc[part].__type = item.type;
      }
      return acc[part].__children;
    }, treeMap);
  });

  function buildList(node, prefix = '') {
    let result = '';
    const keys = Object.keys(node);
    keys.forEach((key, index) => {
      if (key.startsWith('__')) return;
      const isLast = index === keys.length - 1;
      const newPrefix = prefix + (isLast ? '└─' : '├─');
      result += `${newPrefix} ${key}\n`;
      if (node[key].__type === 'tree') {
        result += buildList(node[key].__children, prefix + (isLast ? '  ' : '| '));
      }
    });
    return result;
  }

  return buildList(treeMap);
}