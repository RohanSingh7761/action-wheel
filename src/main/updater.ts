import { app, dialog, shell, net } from 'electron'

let isChecking = false

function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const clean2 = v2.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
    const a = clean1[i] || 0
    const b = clean2[i] || 0
    if (a > b) return 1
    if (a < b) return -1
  }
  return 0
}

interface GitHubAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  name: string
  body: string
  assets: GitHubAsset[]
}

export async function checkForUpdates(manual: boolean = true): Promise<void> {
  if (isChecking) return
  isChecking = true

  const currentVersion = app.getVersion()

  try {
    const response = await net.fetch('https://api.github.com/repos/RohanSingh7761/action-wheel/releases/latest', {
      headers: {
        'User-Agent': `Action-Wheel/${currentVersion} (Windows)`
      }
    })

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`)
    }

    const release = (await response.json()) as GitHubRelease
    const latestVersion = release.tag_name.replace(/^v/, '').trim()
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    if (hasUpdate) {
      const setupAsset = release.assets?.find(
        (a) => a.name?.toLowerCase().includes('setup') && a.name?.endsWith('.exe')
      )
      const downloadUrl = setupAsset?.browser_download_url || release.html_url

      const res = await dialog.showMessageBox({
        type: 'info',
        title: 'Action Wheel Update Available',
        message: `Action Wheel v${latestVersion} is now available!`,
        detail: `You are currently using v${currentVersion}.\n\nWould you like to download the latest installer?`,
        buttons: ['Download Update', 'View Release Page', 'Later'],
        defaultId: 0,
        cancelId: 2
      })

      if (res.response === 0) {
        shell.openExternal(downloadUrl)
      } else if (res.response === 1) {
        shell.openExternal(release.html_url)
      }
    } else if (manual) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Action Wheel',
        message: "You're up to date!",
        detail: `Action Wheel v${currentVersion} is currently the newest version available.`,
        buttons: ['OK']
      })
    }
  } catch (err: any) {
    if (manual) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Action Wheel Update',
        message: 'Could not check for updates',
        detail: 'Unable to reach GitHub. Please check your internet connection or try again later.',
        buttons: ['OK']
      })
    }
  } finally {
    isChecking = false
  }
}
