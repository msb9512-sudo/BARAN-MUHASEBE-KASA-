import type { Plugin, ViteDevServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function sendJsonResponse(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function vitePluginUpdater(): Plugin {
  return {
    name: 'vite-plugin-baran-updater',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';

        // 1. GET /api/update/version
        if (req.method === 'GET' && url === '/api/update/version') {
          try {
            const rootDir = process.cwd();
            const versionPath = path.resolve(rootDir, 'version.txt');
            const publicVersionPath = path.resolve(rootDir, 'public', 'version.txt');

            let version = '1.0.0';
            if (fs.existsSync(versionPath)) {
              version = fs.readFileSync(versionPath, 'utf-8').trim();
            } else if (fs.existsSync(publicVersionPath)) {
              version = fs.readFileSync(publicVersionPath, 'utf-8').trim();
            }

            return sendJsonResponse(res, 200, { success: true, version });
          } catch (err: any) {
            return sendJsonResponse(res, 500, { success: false, error: err.message, version: '1.0.0' });
          }
        }

        // 2. POST /api/update/check
        if (req.method === 'POST' && url === '/api/update/check') {
          try {
            const body = await parseJsonBody(req);
            const repo = (body.repo || 'msb9512-sudo/BARAN-MUHASEBE-KASA-')
              .trim()
              .replace(/^https?:\/\/github\.com\//i, '')
              .replace(/\/$/, '');
            const branch = (body.branch || 'main').trim();

            const rootDir = process.cwd();
            const versionPath = path.resolve(rootDir, 'version.txt');
            let currentVersion = '1.0.0';
            if (fs.existsSync(versionPath)) {
              currentVersion = fs.readFileSync(versionPath, 'utf-8').trim();
            }

            // Query version.txt directly from GitHub raw
            const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/version.txt?t=${Date.now()}`;
            const rawPublicUrl = `https://raw.githubusercontent.com/${repo}/${branch}/public/version.txt?t=${Date.now()}`;

            let remoteVersion: string | null = null;
            try {
              const rawRes = await fetch(rawUrl, {
                cache: 'no-store',
                headers: { 'User-Agent': 'Baran-Kasa-Updater' },
              });
              if (rawRes.ok) {
                const txt = await rawRes.text();
                if (txt && txt.trim()) remoteVersion = txt.trim();
              }
            } catch {
              // fallback
            }

            if (!remoteVersion) {
              try {
                const rawPubRes = await fetch(rawPublicUrl, {
                  cache: 'no-store',
                  headers: { 'User-Agent': 'Baran-Kasa-Updater' },
                });
                if (rawPubRes.ok) {
                  const txt = await rawPubRes.text();
                  if (txt && txt.trim()) remoteVersion = txt.trim();
                }
              } catch {
                // fallback
              }
            }

            // Get last commit info
            let lastCommit: { sha: string | null; message: string | null; date: string | null } | null = null;
            try {
              const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, {
                headers: { 'User-Agent': 'Baran-Kasa-Updater' },
              });
              if (commitRes.ok) {
                const commitData = (await commitRes.json()) as any;
                lastCommit = {
                  sha: commitData.sha ? commitData.sha.substring(0, 7) : null,
                  message: commitData.commit?.message || null,
                  date: commitData.commit?.committer?.date || null,
                };
              }
            } catch {
              // ignore
            }

            if (!remoteVersion) {
              return sendJsonResponse(res, 404, {
                success: false,
                error: `"${repo}" GitHub deposunda "${branch}" dalında version.txt dosyası bulunamadı veya GitHub bağlantısı sağlanamadı.`,
                currentVersion,
              });
            }

            // Semver check
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

            return sendJsonResponse(res, 200, {
              success: true,
              updateAvailable,
              currentVersion,
              remoteVersion,
              lastCommit,
            });
          } catch (err: any) {
            return sendJsonResponse(res, 500, {
              success: false,
              error: `GitHub güncelleme kontrolü sırasında hata: ${err.message}`,
            });
          }
        }

        // 3. POST /api/update/apply
        if (req.method === 'POST' && url === '/api/update/apply') {
          const rootDir = process.cwd();
          const tempDir = path.resolve(rootDir, '.update_temp');
          const tarballPath = path.resolve(tempDir, 'update.tar.gz');

          try {
            const body = await parseJsonBody(req);
            const repo = (body.repo || 'msb9512-sudo/BARAN-MUHASEBE-KASA-')
              .trim()
              .replace(/^https?:\/\/github\.com\//i, '')
              .replace(/\/$/, '');
            const branch = (body.branch || 'main').trim();

            // Prepare clean temp directory
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(tempDir, { recursive: true });

            // Download tarball from GitHub
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

            // Extract tarball safely inside tempDir
            await execPromise(`tar -xzf "${tarballPath}" -C "${tempDir}"`);

            // Find extracted root directory inside tempDir
            const extractedEntries = fs.readdirSync(tempDir).filter((f) => f !== 'update.tar.gz');
            if (extractedEntries.length === 0) {
              throw new Error('İndirilen arşiv paketi boş veya geçersiz çıktı.');
            }

            const sourceDir = path.resolve(tempDir, extractedEntries[0]);

            // Files & directories to update
            const filesToUpdate = [
              'src',
              'public',
              'index.html',
              'version.txt',
              'package.json',
              'vite.config.ts',
              'tsconfig.json',
              'assets',
              'dist',
            ];

            let updatedCount = 0;
            const updatedItems: string[] = [];

            for (const item of filesToUpdate) {
              const srcPath = path.resolve(sourceDir, item);
              const destPath = path.resolve(rootDir, item);

              if (fs.existsSync(srcPath)) {
                const stat = fs.statSync(srcPath);
                if (stat.isDirectory()) {
                  fs.cpSync(srcPath, destPath, {
                    recursive: true,
                    filter: (source) => {
                      // CRITICAL: NEVER overwrite or touch SQLite databases, data dir, or user local backups
                      const base = path.basename(source);
                      if (
                        base.endsWith('.sqlite') ||
                        base.endsWith('.db') ||
                        base === 'data' ||
                        base.startsWith('.backup')
                      ) {
                        return false;
                      }
                      return true;
                    },
                  });
                  updatedCount++;
                  updatedItems.push(item);
                } else {
                  fs.copyFileSync(srcPath, destPath);
                  updatedCount++;
                  updatedItems.push(item);
                }
              }
            }

            // Update version.txt in both root and public
            const remoteVersionPath = path.resolve(sourceDir, 'version.txt');
            let newVersion = '1.0.0';
            if (fs.existsSync(remoteVersionPath)) {
              newVersion = fs.readFileSync(remoteVersionPath, 'utf-8').trim();
              fs.writeFileSync(path.resolve(rootDir, 'version.txt'), newVersion);
              const pubDir = path.resolve(rootDir, 'public');
              if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
              fs.writeFileSync(path.resolve(pubDir, 'version.txt'), newVersion);
            }

            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });

            return sendJsonResponse(res, 200, {
              success: true,
              message: `GitHub (${repo}/${branch}) üzerindeki en güncel dosyalar başarıyla indirildi ve yüklendi.`,
              newVersion,
              updatedCount,
              updatedItems,
            });
          } catch (err: any) {
            // Clean up temp dir on error to guarantee no corrupted state
            if (fs.existsSync(tempDir)) {
              try {
                fs.rmSync(tempDir, { recursive: true, force: true });
              } catch {
                // ignore
              }
            }

            return sendJsonResponse(res, 500, {
              success: false,
              error: `Güncelleme dosyaları indirilirken veya yazılırken hata oluştu: ${err.message}. Eski çalışan sürümünüz ve kasa verileriniz bozulmadan korunmaktadır.`,
            });
          }
        }

        next();
      });
    },
  };
}
