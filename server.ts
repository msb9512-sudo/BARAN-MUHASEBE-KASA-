import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json());

  // GET /api/update/version - Get current local installed version
  app.get('/api/update/version', async (_req, res) => {
    try {
      let version = '1.0.0';
      const versionPath = path.resolve(__dirname, 'version.txt');
      const publicVersionPath = path.resolve(__dirname, 'public', 'version.txt');

      if (fs.existsSync(versionPath)) {
        version = fs.readFileSync(versionPath, 'utf-8').trim();
      } else if (fs.existsSync(publicVersionPath)) {
        version = fs.readFileSync(publicVersionPath, 'utf-8').trim();
      }

      return res.json({ success: true, version });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message, version: '1.0.0' });
    }
  });

  // POST /api/update/check - Real GitHub update check
  app.post('/api/update/check', async (req, res) => {
    try {
      const repo = (req.body.repo || 'msb9512-sudo/BARAN-MUHASEBE-KASA-').trim();
      const branch = (req.body.branch || 'main').trim();

      // Read current local version
      let currentVersion = '1.0.0';
      const versionPath = path.resolve(__dirname, 'version.txt');
      const publicVersionPath = path.resolve(__dirname, 'public', 'version.txt');

      if (fs.existsSync(versionPath)) {
        currentVersion = fs.readFileSync(versionPath, 'utf-8').trim();
      } else if (fs.existsSync(publicVersionPath)) {
        currentVersion = fs.readFileSync(publicVersionPath, 'utf-8').trim();
      }

      // Query raw version.txt from GitHub
      const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/version.txt?t=${Date.now()}`;
      const rawPublicUrl = `https://raw.githubusercontent.com/${repo}/${branch}/public/version.txt?t=${Date.now()}`;

      let remoteVersion: string | null = null;
      let lastCommitMessage: string | null = null;
      let lastCommitSha: string | null = null;
      let lastCommitDate: string | null = null;

      try {
        const rawRes = await fetch(rawUrl, { cache: 'no-store', headers: { 'User-Agent': 'Baran-Kasa-Updater' } });
        if (rawRes.ok) {
          const txt = await rawRes.text();
          if (txt && txt.trim()) remoteVersion = txt.trim();
        }
      } catch {
        // Continue to fallback
      }

      if (!remoteVersion) {
        try {
          const rawPubRes = await fetch(rawPublicUrl, { cache: 'no-store', headers: { 'User-Agent': 'Baran-Kasa-Updater' } });
          if (rawPubRes.ok) {
            const txt = await rawPubRes.text();
            if (txt && txt.trim()) remoteVersion = txt.trim();
          }
        } catch {
          // Continue to fallback
        }
      }

      // Also get commit info from GitHub API
      try {
        const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, {
          headers: { 'User-Agent': 'Baran-Kasa-Updater' },
        });
        if (commitRes.ok) {
          const commitData = (await commitRes.json()) as any;
          lastCommitSha = commitData.sha ? commitData.sha.substring(0, 7) : null;
          lastCommitMessage = commitData.commit?.message || null;
          lastCommitDate = commitData.commit?.committer?.date || null;
        }
      } catch {
        // ignore
      }

      if (!remoteVersion) {
        return res.status(404).json({
          success: false,
          error: `"${repo}" GitHub deposunda "${branch}" dalında version.txt bulunamadı veya bağlantı kurulamadı.`,
          currentVersion,
        });
      }

      // Semver comparison
      const cleanA = remoteVersion.replace(/^v/i, '').split('.').map(Number);
      const cleanB = currentVersion.replace(/^v/i, '').split('.').map(Number);
      let updateAvailable = false;
      for (let i = 0; i < Math.max(cleanA.length, cleanB.length); i++) {
        const a = cleanA[i] || 0;
        const b = cleanB[i] || 0;
        if (a > b) {
          updateAvailable = true;
          break;
        }
        if (a < b) {
          break;
        }
      }

      return res.json({
        success: true,
        updateAvailable,
        currentVersion,
        remoteVersion,
        lastCommit: {
          sha: lastCommitSha,
          message: lastCommitMessage,
          date: lastCommitDate,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Güncelleme kontrolü sırasında ağ hatası: ${err.message}`,
      });
    }
  });

  // POST /api/update/apply - Real file download and apply update
  app.post('/api/update/apply', async (req, res) => {
    const repo = (req.body.repo || 'msb9512-sudo/BARAN-MUHASEBE-KASA-').trim();
    const branch = (req.body.branch || 'main').trim();

    const tempDir = path.resolve(__dirname, '.update_temp');
    const tarballPath = path.resolve(tempDir, 'update.tar.gz');

    try {
      // Step 1: Create clean temp dir
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      // Step 2: Real download from GitHub with multi-URL fallback
      const urls = [
        `https://github.com/${repo}/archive/refs/heads/${branch}.tar.gz`,
        `https://codeload.github.com/${repo}/legacy.tar.gz/refs/heads/${branch}`,
        `https://api.github.com/repos/${repo}/tarball/${branch}`,
      ];

      let downloaded = false;
      let lastErr = '';

      for (const downloadUrl of urls) {
        try {
          const response = await fetch(downloadUrl, {
            headers: { 'User-Agent': 'Baran-Kasa-Updater' },
          });
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            if (buffer.byteLength > 1000) {
              fs.writeFileSync(tarballPath, Buffer.from(buffer));
              downloaded = true;
              break;
            }
          } else {
            lastErr = `HTTP ${response.status} (${response.statusText})`;
          }
        } catch (e: any) {
          lastErr = e.message;
        }
      }

      if (!downloaded || !fs.existsSync(tarballPath)) {
        throw new Error(
          `GitHub reposundan (${repo} - ${branch}) paket indirilemedi. İnternet bağlantınızı kontrol ediniz. (${lastErr})`
        );
      }

      // Step 3: Extract archive safely inside temp directory
      await execPromise(`tar -xzf "${tarballPath}" -C "${tempDir}"`);

      // Find extracted root directory
      const extractedEntries = fs.readdirSync(tempDir).filter((f) => f !== 'update.tar.gz');
      if (extractedEntries.length === 0) {
        throw new Error('İndirilen arşiv paketi boş çıktı.');
      }
      const sourceDir = path.resolve(tempDir, extractedEntries[0]);

      // Step 4: Copy updated files while strictly PROTECTING user data
      const filesToUpdate = ['src', 'public', 'index.html', 'version.txt', 'package.json', 'vite.config.ts', 'tsconfig.json'];
      let updatedCount = 0;

      for (const item of filesToUpdate) {
        const srcPath = path.resolve(sourceDir, item);
        const destPath = path.resolve(__dirname, item);

        if (fs.existsSync(srcPath)) {
          const stat = fs.statSync(srcPath);
          if (stat.isDirectory()) {
            // Recursive copy directory
            fs.cpSync(srcPath, destPath, {
              recursive: true,
              filter: (source) => {
                // NEVER copy or overwrite database files, data directory, or user local backups
                const base = path.basename(source);
                if (base.endsWith('.sqlite') || base.endsWith('.db') || base === 'data' || base.startsWith('.backup')) {
                  return false;
                }
                return true;
              },
            });
            updatedCount++;
          } else {
            fs.copyFileSync(srcPath, destPath);
            updatedCount++;
          }
        }
      }

      // Step 5: Read new version from extracted repo and sync version.txt
      const remoteVersionPath = path.resolve(sourceDir, 'version.txt');
      let newVersion = '1.0.0';
      if (fs.existsSync(remoteVersionPath)) {
        newVersion = fs.readFileSync(remoteVersionPath, 'utf-8').trim();
        fs.writeFileSync(path.resolve(__dirname, 'version.txt'), newVersion);
        const pubDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
        fs.writeFileSync(path.resolve(pubDir, 'version.txt'), newVersion);
      }

      // Step 6: Clean up temp dir
      fs.rmSync(tempDir, { recursive: true, force: true });

      return res.json({
        success: true,
        message: 'Güncelleme başarıyla tamamlandı. En güncel dosyalar dizine yazıldı.',
        newVersion,
        updatedCount,
      });
    } catch (err: any) {
      // Clean up temp dir on error to prevent corrupted files
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }

      return res.status(500).json({
        success: false,
        error: `Güncelleme indirilirken veya yazılırken hata oluştu: ${err.message}. Eski çalışan sürümünüz korunmuştur.`,
      });
    }
  });

  // Mount Vite dev server middlewares
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
