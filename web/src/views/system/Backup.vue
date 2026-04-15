<template>
  <div class="page-container">
    <el-card>
      <template #header><span>数据备份与恢复</span></template>
      <div class="backup-section">
        <h3>手动备份</h3>
        <p style="color:#909399;margin-bottom:15px">点击下方按钮，将导出完整数据为 JSON 文件</p>
        <el-button type="primary" :loading="backupLoading" @click="handleBackup"><el-icon><Download /></el-icon>立即备份</el-button>
        <p v-if="lastBackup" style="margin-top:15px;color:#67C23A">上次备份：{{ lastBackup }}</p>
      </div>
      <el-divider />
      <div class="backup-section">
        <h3>数据恢复</h3>
        <p style="color:#909399;margin-bottom:15px">选择之前导出的备份文件进行恢复，注意：恢复操作会覆盖当前所有数据</p>
        <el-upload :before-upload="beforeUpload" :http-request="uploadRequest" accept=".json">
          <el-button type="warning"><el-icon><Upload /></el-icon>选择备份文件</el-button>
        </el-upload>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { systemApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const backupLoading = ref(false)
const lastBackup = ref('')

async function handleBackup() {
  backupLoading.value = true
  try {
    const res = await systemApi.backup()
    ElMessage.success('备份成功，文件已生成')
    lastBackup.value = new Date().toLocaleString()
    // 下载文件
    const link = document.createElement('a')
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({}, null, 2))
    link.download = res.data.filename
    link.click()
  } catch (e) {
    ElMessage.error('备份失败')
  } finally { backupLoading.value = false }
}

function beforeUpload(file) {
  if (!file.name.endsWith('.json')) {
    ElMessage.error('只能上传 JSON 文件')
    return false
  }
  return true
}

async function uploadRequest({ file }) {
  const text = await file.text()
  try {
    const data = JSON.parse(text)
    await ElMessageBox.confirm('恢复将覆盖当前所有数据，是否继续？', '警告', { type: 'warning' })
    await systemApi.restore({ data })
    ElMessage.success('恢复成功')
  } catch (e) {
    if (e.message !== 'cancel') ElMessage.error('文件格式错误或已取消')
  }
}
</script>

<style scoped>
.backup-section { padding: 10px 0; }
.backup-section h3 { margin-bottom: 10px; font-size: 16px; }
</style>
