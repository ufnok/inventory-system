<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header"><span>客户管理</span><el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增客户</el-button></div>
      </template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="搜索客户编号/名称/联系人" style="width:250px" clearable @clear="loadData" />
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="客户编号" width="120" />
        <el-table-column prop="name" label="客户名称" min-width="150" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="address" label="地址" min-width="150" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑客户' : '新增客户'" width="550px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="客户名称" prop="name"><el-input v-model="form.name" maxlength="100" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" maxlength="50" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" maxlength="50" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" maxlength="200" /></el-form-item>
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
import { ref, reactive, onMounted } from 'vue'
import { customerApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const form = reactive({ id: null, name: '', contact: '', phone: '', address: '', remark: '' })
const rules = { name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }] }

async function loadData() {
  loading.value = true
  try {
    const res = await customerApi.list({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    list.value = res.data.list
    total.value = res.data.total
  } finally { loading.value = false }
}

function openDialog(row) {
  if (row) { isEdit.value = true; Object.assign(form, row) }
  else { isEdit.value = false; Object.assign(form, { id: null, name: '', contact: '', phone: '', address: '', remark: '' }) }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (isEdit.value) { await customerApi.update(form.id, form); ElMessage.success('更新成功') }
  else { await customerApi.create(form); ElMessage.success('添加成功') }
  dialogVisible.value = false
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除后不可恢复，是否继续？', '警告', { type: 'warning' })
  await customerApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(() => loadData())
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { margin-bottom: 15px; }
</style>
