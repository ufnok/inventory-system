<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>库存盘点</span>
          <el-button type="primary" @click="openCreateDialog"><el-icon><Plus /></el-icon>新建盘点单</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="盘点单号" style="width:180px" clearable @clear="loadData" />
        <el-select v-model="searchStatus" placeholder="审核状态" clearable style="width:120px;margin-left:10px" @change="loadData">
          <el-option label="待审核" :value="1" /><el-option label="已审核" :value="2" />
        </el-select>
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="盘点单号" width="180" />
        <el-table-column prop="checkDate" label="盘点日期" width="120" />
        <el-table-column prop="operatorName" label="操作员" width="100" />
        <el-table-column prop="auditorName" label="审核人" width="100" />
        <el-table-column prop="auditorTime" label="审核时间" width="160" />
        <el-table-column prop="statusName" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 1 ? 'warning' : 'success'">{{ row.statusName }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)"><el-icon><View /></el-icon>查看</el-button>
            <template v-if="row.status === 1">
              <el-button type="warning" link size="small" @click="openEditDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
              <el-button type="success" link size="small" @click="handleSubmit(row)"><el-icon><Check /></el-icon>审核</el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <!-- 新建盘点单 -->
    <el-dialog v-model="createDialogVisible" title="新建盘点单" width="600px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="盘点日期"><el-date-picker v-model="createForm.checkDate" type="date" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="盘点范围">
          <el-radio-group v-model="createForm.rangeType">
            <el-radio :label="0">全量盘点</el-radio>
            <el-radio :label="1">指定商品</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="createForm.rangeType === 1" label="选择商品">
          <el-select v-model="createForm.productIds" multiple placeholder="请选择商品" style="width:100%">
            <el-option v-for="p in productList" :key="p.id" :label="`${p.id} - ${p.name}`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="createForm.remark" type="textarea" rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定创建</el-button>
      </template>
    </el-dialog>

    <!-- 查看/编辑盘点明细 -->
    <el-dialog v-model="detailDialogVisible" :title="isEdit ? '编辑盘点单' : '盘点单详情'" width="900px">
      <el-descriptions :column="2" border v-if="detailData.id">
        <el-descriptions-item label="盘点单号">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="盘点日期">{{ detailData.checkDate }}</el-descriptions-item>
        <el-descriptions-item label="操作员">{{ detailData.operatorName }}</el-descriptions-item>
        <el-descriptions-item label="审核人">{{ detailData.auditorName }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="detailData.status === 1 ? 'warning' : 'success'">{{ detailData.statusName }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detailData.items" border size="small" style="margin-top:15px">
        <el-table-column prop="productName" label="商品名称" />
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="systemQty" label="系统库存" width="100" />
        <el-table-column v-if="isEdit" label="实际库存" width="120">
          <template #default="{ row }"><el-input-number v-model="row.actualQty" :min="0" size="small" style="width:100%" /></template>
        </el-table-column>
        <el-table-column v-else label="实际库存" width="100" prop="actualQty" />
        <el-table-column label="差异" width="100">
          <template #default="{ row }"><span :style="{color: row.diffQty > 0 ? '#67C23A' : row.diffQty < 0 ? '#F56C6C' : ''}">{{ row.diffQty > 0 ? '+' : '' }}{{ row.diffQty }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status === 'PROFIT' ? 'success' : row.status === 'LOSS' ? 'danger' : 'info'" size="small">{{ row.statusName }}</el-tag></template>
        </el-table-column>
      </el-table>
      <template #footer v-if="isEdit">
        <el-button @click="detailDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateItems">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { checkApi, productApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const productList = ref([])
const keyword = ref('')
const searchStatus = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const detailData = ref({})

const createForm = reactive({ checkDate: new Date().toISOString().slice(0,10), rangeType: 0, productIds: [], remark: '' })

async function loadData() {
  loading.value = true
  try { const res = await checkApi.list({ keyword: keyword.value, status: searchStatus.value, page: page.value, pageSize: pageSize.value }); list.value = res.data.list; total.value = res.data.total }
  finally { loading.value = false }
}

async function loadProducts() { const res = await productApi.list({ page: 1, pageSize: 1000 }); productList.value = res.data.list }

async function openCreateDialog() {
  createForm.checkDate = new Date().toISOString().slice(0,10)
  createForm.rangeType = 0; createForm.productIds = []; createForm.remark = ''
  createDialogVisible.value = true
}

async function handleCreate() {
  const res = await checkApi.create(createForm)
  ElMessage.success('盘点单创建成功')
  createDialogVisible.value = false
  openEditDialog({ id: res.data.id })
}

async function openEditDialog(row) {
  isEdit.value = true
  detailData.value = (await checkApi.get(row.id)).data
  detailDialogVisible.value = true
}

async function viewDetail(row) {
  isEdit.value = false
  detailData.value = (await checkApi.get(row.id)).data
  detailDialogVisible.value = true
}

async function handleUpdateItems() {
  await checkApi.updateItems(detailData.value.id, { items: detailData.value.items.map(i => ({ id: i.id, actualQty: i.actualQty, systemQty: i.systemQty })) })
  ElMessage.success('盘点数据已保存')
  detailDialogVisible.value = false
  loadData()
}

async function handleSubmit(row) {
  await ElMessageBox.confirm('审核通过后将更新库存，是否继续？', '提示', { type: 'info' })
  await checkApi.submit(row.id)
  ElMessage.success('审核完成，库存已更新')
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除后不可恢复，是否继续？', '警告', { type: 'warning' })
  await checkApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(() => { loadData(); loadProducts() })
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
</style>
