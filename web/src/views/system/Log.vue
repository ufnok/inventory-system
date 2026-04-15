<template>
  <div class="page-container">
    <el-card>
      <template #header><span>操作日志</span></template>
      <div class="search-bar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:240px" @change="loadData" />
        <el-select v-model="operateType" placeholder="操作类型" clearable style="width:120px;margin-left:10px" @change="loadData">
          <el-option label="登录" value="LOGIN" /><el-option label="新增" value="INSERT" /><el-option label="修改" value="UPDATE" /><el-option label="删除" value="DELETE" />
        </el-select>
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="operateTime" label="操作时间" width="160" />
        <el-table-column prop="operatorName" label="操作员" width="100" />
        <el-table-column prop="operateType" label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.operateType === 'LOGIN' ? 'info' : row.operateType === 'INSERT' ? 'success' : row.operateType === 'DELETE' ? 'danger' : 'warning'">{{ row.operateType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operateContent" label="操作内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="operateResult" label="结果" width="80">
          <template #default="{ row }"><el-tag size="small" :type="row.operateResult === 'SUCCESS' ? 'success' : 'danger'">{{ row.operateResult }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误信息" min-width="150" show-overflow-tooltip />
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { systemApi } from '@/api'

const list = ref([])
const loading = ref(false)
const dateRange = ref(null)
const operateType = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, operateType: operateType.value }
    if (dateRange.value?.length === 2) { params.startDate = dateRange.value[0]; params.endDate = dateRange.value[1] }
    const res = await systemApi.logs(params)
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>

<style scoped>
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
</style>
