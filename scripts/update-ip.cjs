#!/usr/bin/env node

const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

function getLocalIP() {
  try {
    const platform = process.platform

    if (platform === 'win32') {
      const output = execSync('powershell -Command "Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Manual, Dhcp | Where-Object { $_.InterfaceAlias -notmatch \'Loopback|Loop|VMware|Bluetooth|虚拟|以太网适配器\' } | Select-Object -ExpandProperty IPAddress"', { encoding: 'utf8' })
      const ips = output.trim().split('\n').map(ip => ip.trim()).filter(ip => ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) && !ip.startsWith('169.254.'))

      console.log('找到的IP:', ips)

      // 优先选择 192.168.x.x 或 10.x.x.x 网段
      const preferred = ips.find(ip => ip.startsWith('192.168.') || ip.startsWith('10.'))
      if (preferred)
        return preferred

      // 否则返回第一个有效的
      return ips[0] || null
    }
    else {
      const output = execSync('hostname -I', { encoding: 'utf8' })
      const ips = output.trim().split(' ')
      return ips[0]
    }
  }
  catch (e) {
    console.error('获取IP失败:', e.message)
    return null
  }
}

function updateEnvFile(ip) {
  if (!ip) {
    console.error('无效的IP地址')
    return false
  }

  const envPath = path.join(__dirname, '..', 'env', '.env.development')
  const content = fs.readFileSync(envPath, 'utf8')

  const newContent = content.replace(
    /VITE_SERVER_BASEURL\s*=\s*['"].+?['"]/,
    `VITE_SERVER_BASEURL = 'http://${ip}:3000'`,
  )

  fs.writeFileSync(envPath, newContent)
  console.log(`✅ 已更新 VITE_SERVER_BASEURL 为 http://${ip}:3000`)
  return true
}

const ip = getLocalIP()
if (ip) {
  updateEnvFile(ip)
}
else {
  console.error('❌ 无法获取本机IP')
  process.exit(1)
}
