<template>
  <div class="page-container">
    <el-card>
      <template #header><span>入库单据列表</span></template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="单号/备注" style="width:180px" clearable @clear="loadData" />
        <el-select v-model="searchSupplierId" placeholder="供应商" clearable style="width:150px;margin-left:10px" @change="loadData">
          <el-option v-for="s in supplierList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="searchStatus" placeholder="单据状态" clearable style="width:120px;margin-left:10px" @change="loadData">
          <el-option label="正常" :value="1" /><el-option label="作废" :value="-1" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="margin-left:10px;width:240px" @change="loadData" />
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="入库单号" width="150" />
        <el-table-column prop="supplierName" label="供应商" min-width="150" />
        <el-table-column prop="inTime" label="入库时间" width="160" />
        <el-table-column prop="operatorName" label="操作员" width="100" />
        <el-table-column prop="totalAmount" label="总金额" width="120"><template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) }}</template></el-table-column>
        <el-table-column prop="statusName" label="状态" width="80"><template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'danger'">{{ row.statusName }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)"><el-icon><View /></el-icon>查看</el-button>
            <el-button v-if="row.status === 1" type="warning" link size="small" @click="handleCancel(row)"><el-icon><Close /></el-icon>作废</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="入库单详情" width="800px">
      <el-descriptions :column="2" border v-if="detailData.id">
        <el-descriptions-item label="入库单号">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detailData.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="入库时间">{{ detailData.inTime }}</el-descriptions-item>
        <el-descriptions-item label="操作员">{{ detailData.operatorName }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ detailData.totalAmount?.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="detailData.status === 1 ? 'success' : 'danger'">{{ detailData.statusName }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detailData.items" border size="small" style="margin-top:15px" v-if="detailData.items?.length">
        <el-table-column prop="productName" label="商品名称" /><el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit" label="单位" width="70" /><el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="unitPrice" label="单价" width="100"><template #default="{ row }">¥{{ row.unitPrice?.toFixed(2) }}</template></el-table-column>
        <el-table-column prop="amount" label="金额" width="100"><template #default="{ row }">¥{{ row.amount?.toFixed(2) }}</template></el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { stockInApi, supplierApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([]), loading = ref(false), detailDialogVisible = ref(false), supplierList = ref([])
const keyword = ref(''), searchSupplierId = ref(''), searchStatus = ref(''), dateRange = ref(null)
const page = ref(1), pageSize = ref(20), total = ref(0)
const detailData = ref({})

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, keyword: keyword.value, supplierId: searchSupplierId.value, status: searchStatus.value }
    if (dateRange.value?.length === 2) { params.startDate = dateRange.value[0]; params.endDate = dateRange.value[1] }
    const res = await stockInApi.list(params); list.value = res.data.list; total.value = res.data.total
  } finally { loading.value = false }
}

async function loadSuppliers() { const res = await supplierApi.list({ page: 1, pageSize: 1000 }); supplierList.value = res.data.list }

async function viewDetail(row) { detailData.value = (await stockInApi.get(row.id)).data; detailDialogVisible.value = true }

async function handleCancel(row) {
  await ElMessageBox.confirm('撤销后将回滚库存，是否继续？', '警告', { type: 'warning' })
  await stockInApi.cancel(row.id)
  ElMessage.success('已作废'); loadData()
}

onMounted(() => { loadData(); loadSuppliers() })
</script>

<style scoped>
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
</style>
