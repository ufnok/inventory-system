<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>采购入库</span>
          <el-button type="primary" @click="openFormDialog()"><el-icon><Plus /></el-icon>新建入库单</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="单号/备注" style="width:180px" clearable @clear="loadData" />
        <el-select v-model="searchSupplierId" placeholder="供应商" clearable style="width:150px;margin-left:10px" @change="loadData">
          <el-option v-for="s in supplierList" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="searchStatus" placeholder="单据状态" clearable style="width:120px;margin-left:10px" @change="loadData">
          <el-option label="草稿" :value="0" /><el-option label="正常" :value="1" /><el-option label="作废" :value="-1" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="margin-left:10px;width:240px" @change="loadData" />
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="入库单号" width="150" />
        <el-table-column prop="supplierName" label="供应商" min-width="150" />
        <el-table-column prop="inTime" label="入库时间" width="160" />
        <el-table-column prop="operatorName" label="操作员" width="100" />
        <el-table-column prop="totalAmount" label="总金额" width="120">
          <template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="statusName" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : row.status === -1 ? 'danger' : 'info'">{{ row.statusName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)"><el-icon><View /></el-icon>查看</el-button>
            <template v-if="row.status === 0">
              <el-button type="warning" link size="small" @click="openFormDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
              <el-button type="success" link size="small" @click="handleSubmit(row)"><el-icon><Check /></el-icon>提交</el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
            </template>
            <el-button v-if="row.status === 1" type="warning" link size="small" @click="handleCancel(row)"><el-icon><Close /></el-icon>作废</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <!-- 新建/编辑表单 -->
    <el-dialog v-model="formDialogVisible" :title="isEdit ? '编辑入库单' : '新建入库单'" width="900px" @closed="resetForm">
      <el-form :model="form" label-width="100px" style="max-height:60vh;overflow-y:auto">
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="供应商" required><el-select v-model="form.supplierId" placeholder="请选择供应商" style="width:100%"><el-option v-for="s in supplierList" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="入库时间"><el-date-picker v-model="form.inTime" type="datetime" placeholder="选择时间" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="商品明细">
          <div class="items-toolbar"><el-button size="small" @click="addItem"><el-icon><Plus /></el-icon>添加商品</el-button></div>
          <el-table :data="form.items" border size="small" style="margin-top:10px">
            <el-table-column label="商品" width="250">
              <template #default="{ row, $index }">
                <el-select v-model="row.productId" placeholder="选择商品" filterable @change="onProductChange($index)" style="width:100%">
                  <el-option v-for="p in productList" :key="p.id" :label="`${p.id} - ${p.name}`" :value="p.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column prop="spec" label="规格" width="100" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column label="数量" width="120">
              <template #default="{ row }"><el-input-number v-model="row.quantity" :min="1" size="small" style="width:100%" /></template>
            </el-table-column>
            <el-table-column label="单价" width="120">
              <template #default="{ row }"><el-input-number v-model="row.unitPrice" :min="0" :precision="2" size="small" style="width:100%" /></template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">¥{{ ((row.quantity || 0) * (row.unitPrice || 0)).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="60"><template #default="{ $index }"><el-button type="danger" size="small" link @click="form.items.splice($index,1)"><el-icon><Delete /></el-icon></el-button></template></el-table-column>
          </el-table>
          <div class="total-amount">总金额：¥{{ totalAmount }}</div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" maxlength="200" rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情 -->
    <el-dialog v-model="detailDialogVisible" title="入库单详情" width="800px">
      <el-descriptions :column="2" border v-if="detailData.id">
        <el-descriptions-item label="入库单号">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detailData.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="入库时间">{{ detailData.inTime }}</el-descriptions-item>
        <el-descriptions-item label="操作员">{{ detailData.operatorName }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ detailData.totalAmount?.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="detailData.status === 1 ? 'success' : detailData.status === -1 ? 'danger' : 'info'">{{ detailData.statusName }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detailData.items" border size="small" style="margin-top:15px" v-if="detailData.items?.length">
        <el-table-column prop="productName" label="商品名称" />
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="unitPrice" label="单价" width="100"><template #default="{ row }">¥{{ row.unitPrice?.toFixed(2) }}</template></el-table-column>
        <el-table-column prop="amount" label="金额" width="100"><template #default="{ row }">¥{{ row.amount?.toFixed(2) }}</template></el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { stockInApi, supplierApi, productApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([]), loading = ref(false), formDialogVisible = ref(false), detailDialogVisible = ref(false), isEdit = ref(false)
const supplierList = ref([]), productList = ref([])
const keyword = ref(''), searchSupplierId = ref(''), searchStatus = ref(''), dateRange = ref(null)
const page = ref(1), pageSize = ref(20), total = ref(0)
const detailData = ref({})

const form = reactive({ id: null, supplierId: null, inTime: '', items: [], remark: '' })

const totalAmount = computed(() => form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0))

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, keyword: keyword.value, supplierId: searchSupplierId.value, status: searchStatus.value }
    if (dateRange.value?.length === 2) { params.startDate = dateRange.value[0]; params.endDate = dateRange.value[1] }
    const res = await stockInApi.list(params)
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function loadSuppliers() { const res = await supplierApi.list({ page: 1, pageSize: 1000 }); supplierList.value = res.data.list }
async function loadProducts() { const res = await productApi.list({ page: 1, pageSize: 1000 }); productList.value = res.data.list }

function openFormDialog(row) {
  if (row) {
    isEdit.value = true
    stockInApi.get(row.id).then(r => {
      Object.assign(form, { id: r.data.id, supplierId: r.data.supplierId, inTime: r.data.inTime, items: r.data.items.map(i => ({ productId: i.productId, spec: i.spec, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice })), remark: r.data.remark })
    })
  } else {
    isEdit.value = false
    Object.assign(form, { id: null, supplierId: null, inTime: new Date().toISOString().slice(0,19).replace('T',' '), items: [], remark: '' })
  }
  formDialogVisible.value = true
}

function resetForm() { form.items = [] }

function addItem() { form.items.push({ productId: null, spec: '', unit: '', quantity: 1, unitPrice: 0 }) }

function onProductChange(index) {
  const p = productList.value.find(x => x.id === form.items[index].productId)
  if (p) { form.items[index].spec = p.spec || ''; form.items[index].unit = p.unit || ''; form.items[index].unitPrice = p.costPrice || 0 }
}

async function handleSave() {
  if (!form.supplierId) return ElMessage.warning('请选择供应商')
  if (!form.items.length) return ElMessage.warning('请添加商品')
  if (isEdit.value) { await stockInApi.update(form.id, form); ElMessage.success('更新成功') }
  else { await stockInApi.create(form); ElMessage.success('创建成功') }
  formDialogVisible.value = false
  loadData()
}

async function handleSubmit(row) {
  await ElMessageBox.confirm('提交后将增加库存，是否继续？', '提示', { type: 'info' })
  await stockInApi.submit(row.id)
  ElMessage.success('提交成功，库存已增加')
  loadData()
}

async function handleCancel(row) {
  await ElMessageBox.confirm('撤销后将回滚库存，是否继续？', '警告', { type: 'warning' })
  await stockInApi.cancel(row.id)
  ElMessage.success('已作废，库存已回滚')
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除后不可恢复，是否继续？', '警告', { type: 'warning' })
  await stockInApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

async function viewDetail(row) { detailData.value = (await stockInApi.get(row.id)).data; detailDialogVisible.value = true }

onMounted(() => { loadData(); loadSuppliers(); loadProducts() })
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
.items-toolbar { margin-bottom: 5px; }
.total-amount { text-align: right; padding: 10px 0; font-size: 16px; font-weight: bold; color: #E6A23C; }
</style>
