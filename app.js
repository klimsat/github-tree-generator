document.getElementById('generateBtn').addEventListener('click', async () => {
  let repoUrl = document.getElementById('repoUrl').value.trim();
  const branch = document.getElementById('branch').value || 'main';

  // Normalize the repository URL
  if (repoUrl.startsWith('https://github.com/')) {
    repoUrl = repoUrl.replace('https://github.com/', '');
  }
  if (repoUrl.endsWith('/')) {
    repoUrl = repoUrl.slice(0, -1);
  }

  const repoPath = repoUrl;

  const apiUrl = `https://api.github.com/repos/${repoPath}/git/trees/${branch}?recursive=1`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // 'Authorization': `token YOUR_GITHUB_PERSONAL_ACCESS_TOKEN` // Uncomment if using personal access token
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
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const treeOutput = document.getElementById('treeOutput').textContent;
  navigator.clipboard.writeText(treeOutput).then(() => {
    alert('Tree copied to clipboard');
  }, (err) => {
    alert('Failed to copy: ', err);
  });
});

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