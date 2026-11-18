// 打包离线版：Windows 上的解释器通常叫 python，macOS 和 Linux 上叫 python3，这里依次尝试。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./package_offline.py', import.meta.url));
const candidates = process.env.PYTHON ? [process.env.PYTHON] : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
for (const command of candidates) {
  const run = spawnSync(command, [script], { stdio: 'inherit' });
  if (run.error?.code === 'ENOENT') continue;
  process.exit(run.status ?? 1);
}
console.error('找不到 Python 3。安装后重试，或用环境变量 PYTHON 指定解释器。');
process.exit(1);
