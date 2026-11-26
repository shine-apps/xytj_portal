/**
 * 距离格式化：< 1km 显示米（整数 + m），否则显示公里（1 位小数 + km）。
 * @param distanceM 后端返回的球面距离，单位米
 */
export function formatDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM)) {
    return '--'
  }
  if (distanceM < 1000) {
    return `${Math.round(distanceM)}m`
  }
  return `${(distanceM / 1000).toFixed(1)}km`
}
