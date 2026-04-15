<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6"><div class="stat-card blue"><div class="stat-icon"><el-icon><Document /></el-icon></div><div class="stat-info"><p class="stat-label">今日入库</p><p class="stat-value">{{ data.todayInCount }} 单</p><p class="stat-amount">¥{{ data.todayInAmount?.toFixed(2) }}</p></div></div></el-col>
      <el-col :span="6"><div class="stat-card green"><div class="stat-icon"><el-icon><Sell /></el-icon></div><div class="stat-info"><p class="stat-label">今日出库</p><p class="stat-value">{{ data.todayOutCount }} 单</p><p class="stat-amount">¥{{ data.todayOutAmount?.toFixed(2) }}</p></div></div></el-col>
      <el-col :span="6"><div class="stat-card orange"><div class="stat-icon"><el-icon><Goods /></el-icon></div><div class="stat-info"><p class="stat-label">商品总数</p><p class="stat-value">{{ data.totalProduct }} 种</p></div></div></el-col>
      <el-col :span="6"><div class="stat-card red"><div class="stat-icon"><el-icon><Warning /></el-icon></div><div class="stat-info"><p class="stat-label">预警商品</p><p class="stat-value">{{ data.warningCount }} 种</p></div></div></el-col>
    </el-row>
    <el-card class="warning-card" v-if="data.recentWarning?.length">
      <template #header><span>库存预警</span></template>
      <el-table :data="data.recentWarning">
        <el-table-column prop="productName" label="商品名称" />
        <el-table-column prop="quantity" label="当前库存" />
        <el-table-column label="预警信息">
          <template #default="{ row }">
            <span v-if="row.warningMin && row.quantity <= row.warningMin" style="color:#F56C6C">库存不足({{ row.quantity }} &lt; {{ row.warningMin }})</span>
            <span v-else-if="row.warningMax && row.quantity >= row.warningMax" style="color:#E6A23C">库存过高({{ row.quantity }} &gt; {{ row.warningMax }})</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { reportApi } from '@/api'

const data = ref({})
onMounted(async () => {
  const res = await reportApi.dashboard()
  data.value = res.data
})
</script>

<style scoped>
.dashboard { }
.stat-row { margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; padding: 20px; border-radius: 8px; color: #fff; }
.stat-card.blue { background: linear-gradient(135deg, #667eea, #764ba2); }
.stat-card.green { background: linear-gradient(135deg, #11998e, #38ef7d); }
.stat-card.orange { background: linear-gradient(135deg, #f093fb, #f5576c); }
.stat-card.red { background: linear-gradient(135deg, #fa709a, #fee140); }
.stat-icon { font-size: 48px; opacity: 0.8; margin-right: 20px; }
.stat-label { font-size: 14px; opacity: 0.9; }
.stat-value { font-size: 28px; font-weight: bold; }
.stat-amount { font-size: 14px; opacity: 0.8; }
.warning-card { margin-top: 20px; }
</style>
