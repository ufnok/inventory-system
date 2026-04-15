<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>库存管理</span>
          <el-button type="primary" @click="showWarningDialog = true"><el-icon><Warning /></el-icon>预警设置</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="商品编号/名称" style="width:200px" clearable @clear="loadData" />
        <el-select v-model="searchCategoryId" placeholder="商品分类" clearable style="width:150px;margin-left:10px" @change="loadData">
          <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="warningStatus" placeholder="预警状态" clearable style="width:130px;margin-left:10px" @change="loadData">
          <el-option label="正常" value="normal" /><el-option label="库存不足" value="low" /><el-option label="库存过高" value="high" />
        </el-select>
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="productId" label="商品编号" width="120" />
        <el-table-column prop="productName" label="商品名称" min-width="150" />
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="quantity" label="当前库存" width="100" />
        <el-table-column label="成本金额" width="120">
          <template #default="{ row }">¥{{ row.costAmount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="销售金额" width="120">
          <template #default="{ row }">¥{{ row.saleAmount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="预警状态" width="130">
          <template #default="{ row }">
            <el-tag v-if="row.warningStatus === 'normal'" type="success">正常</el-tag>
            <el-tag v-else-if="row.warningStatus === 'low'" type="danger">库存不足</el-tag>
            <el-tag v-else-if="row.warningStatus === 'high'" type="warning">库存过高</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警设置" width="130">
          <template #default="{ row }">
            <el-button type="info" link size="small" @click="openWarningDialog(row)"><el-icon><Setting /></el-icon>设置</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <el-dialog v-model="warningDialogVisible" title="预警设置" width="400px">
      <el-form :model="warningForm" label-width="80px">
        <el-form-item label="商品">{{ warningForm.productName }}</el-form-item>
        <el-form-item label="当前库存">{{ warningForm.quantity }}</el-form-item>
        <el-form-item label="库存下限"><el-input-number v-model="warningForm.warningMin" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="库存上限"><el-input-number v-model="warningForm.warningMax" :min="0" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="warningDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSetWarning">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { inventoryApi, categoryApi } from '@/api'
import { ElMessage } from 'element-plus'

const list = ref([])
const loading = ref(false)
const categoryList = ref([])
const keyword = ref('')
const searchCategoryId = ref('')
const warningStatus = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const warningDialogVisible = ref(false)
const showWarningDialog = ref(false)
const warningForm = reactive({ productId: '', productName: '', quantity: 0, warningMin: null, warningMax: null })

async function loadData() {
  loading.value = true
  try {
    const res = await inventoryApi.list({ keyword: keyword.value, categoryId: searchCategoryId.value, warningStatus: warningStatus.value, page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function loadCategories() {
  const res = await categoryApi.tree()
  categoryList.value = res.data
}

function openWarningDialog(row) {
  Object.assign(warningForm, { productId: row.productId, productName: row.productName, quantity: row.quantity, warningMin: row.warningMin, warningMax: row.warningMax })
  warningDialogVisible.value = true
}

async function handleSetWarning() {
  await inventoryApi.setWarning(warningForm.productId, { warningMin: warningForm.warningMin, warningMax: warningForm.warningMax })
  ElMessage.success('预警设置成功')
  warningDialogVisible.value = false
  loadData()
}

onMounted(() => { loadData(); loadCategories() })
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
</style>
