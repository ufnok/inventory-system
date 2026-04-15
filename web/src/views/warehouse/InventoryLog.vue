<template>
  <div class="page-container">
    <el-card>
      <template #header><span>库存流水</span></template>
      <div class="search-bar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:240px" @change="loadData" />
        <el-select v-model="orderType" placeholder="单据类型" clearable style="width:120px;margin-left:10px" @change="loadData">
          <el-option label="入库" value="RK" /><el-option label="出库" value="CK" /><el-option label="盘点" value="PD" />
        </el-select>
        <el-input v-model="productId" placeholder="商品编号" style="width:150px;margin-left:10px" clearable @clear="loadData" />
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="operateTime" label="操作时间" width="160" />
        <el-table-column prop="orderNo" label="单据号" width="150" />
        <el-table-column prop="orderTypeName" label="单据类型" width="100" />
        <el-table-column prop="operateTypeName" label="操作类型" width="100">
          <template #default="{ row }"><el-tag :type="row.operateType === 'IN' || row.operateType === 'PROFIT' ? 'success' : 'warning'">{{ row.operateTypeName }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="productName" label="商品名称" min-width="150" />
        <el-table-column label="数量变化" width="120">
          <template #default="{ row }"><span :style="{color: row.quantityChange > 0 ? '#67C23A' : '#F56C6C'}">{{ row.quantityChange > 0 ? '+' : '' }}{{ row.quantityChange }}</span></template>
        </el-table-column>
        <el-table-column label="操作前" width="90"><template #default="{ row }">{{ row.inventoryBefore }}</template></el-table-column>
        <el-table-column label="操作后" width="90"><template #default="{ row }">{{ row.inventoryAfter }}</template></el-table-column>
        <el-table-column prop="operatorName" label="操作员" width="100" />
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { inventoryLogApi } from '@/api'

const list = ref([])
const loading = ref(false)
const dateRange = ref(null)
const orderType = ref('')
const productId = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, orderType: orderType.value, productId: productId.value }
    if (dateRange.value?.length === 2) { params.startDate = dateRange.value[0]; params.endDate = dateRange.value[1] }
    const res = await inventoryLogApi.list(params)
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

onMounted(() => loadData())
</script>

<style scoped>
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
</style>
