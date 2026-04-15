<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品管理</span>
          <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增商品</el-button>
        </div>
      </template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="搜索商品编号/名称" style="width:200px" clearable @clear="loadData" />
        <el-select v-model="searchCategoryId" placeholder="商品分类" clearable style="width:150px;margin-left:10px" @change="loadData">
          <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading" row-key="id" :tree-props="{ children: 'children', hasChildren: 'hasChildren' }">
        <el-table-column prop="id" label="商品编号" width="120" />
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column prop="spec" label="规格" width="120" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="costPrice" label="成本价" width="100">
          <template #default="{ row }">¥{{ row.costPrice?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="salePrice" label="销售价" width="100">
          <template #default="{ row }">¥{{ row.salePrice?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑商品' : '新增商品'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="商品名称" prop="name"><el-input v-model="form.name" maxlength="50" /></el-form-item>
        <el-form-item label="规格" prop="spec"><el-input v-model="form.spec" maxlength="50" /></el-form-item>
        <el-form-item label="单位" prop="unit"><el-input v-model="form.unit" maxlength="20" /></el-form-item>
        <el-form-item label="商品分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width:100%">
            <el-option v-for="c in flatCategoryList" :key="c.id" :label="c.pid ? '  ' + c.name : c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="成本价" prop="costPrice"><el-input-number v-model="form.costPrice" :min="0" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="销售价" prop="salePrice"><el-input-number v-model="form.salePrice" :min="0" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" maxlength="200" rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { productApi, categoryApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const keyword = ref('')
const searchCategoryId = ref('')
const categoryList = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const form = reactive({ id: null, name: '', spec: '', unit: '', categoryId: null, costPrice: 0, salePrice: 0, remark: '' })
const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  costPrice: [{ required: true, message: '请输入成本价', trigger: 'blur' }],
  salePrice: [{ required: true, message: '请输入销售价', trigger: 'blur' }]
}

const flatCategoryList = computed(() => {
  const flat = []
  categoryList.value.forEach(p => {
    flat.push(p)
    if (p.children?.length) flat.push(...p.children)
  })
  return flat
})

async function loadData() {
  loading.value = true
  try {
    const res = await productApi.list({ keyword: keyword.value, categoryId: searchCategoryId.value, page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

async function loadCategories() {
  const res = await categoryApi.tree()
  categoryList.value = res.data
}

function openDialog(row) {
  if (row) {
    isEdit.value = true
    Object.assign(form, { id: row.id, name: row.name, spec: row.spec, unit: row.unit, categoryId: row.categoryId, costPrice: row.costPrice, salePrice: row.salePrice, remark: row.remark })
  } else {
    isEdit.value = false
    Object.assign(form, { id: null, name: '', spec: '', unit: '', categoryId: null, costPrice: 0, salePrice: 0, remark: '' })
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (isEdit.value) {
    await productApi.update(form.id, form)
    ElMessage.success('更新成功')
  } else {
    await productApi.create(form)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除后不可恢复，是否继续？', '警告', { type: 'warning' })
  await productApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(() => { loadData(); loadCategories() })
</script>

<style scoped>
.page-container {}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { margin-bottom: 15px; display: flex; }
</style>
