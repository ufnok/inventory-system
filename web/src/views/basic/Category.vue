<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header"><span>商品分类管理</span><el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增分类</el-button></div>
      </template>
      <el-table :data="list" row-key="id" v-loading="loading" default-expand-all :tree-props="{ children: 'children', hasChildren: 'hasChildren' }">
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="sortOrder" label="排序" width="100" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '新增分类'" width="400px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="上级分类"><el-select v-model="form.pid" clearable placeholder="顶级分类" style="width:100%"><el-option v-for="c in topCategories" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item>
        <el-form-item label="分类名称" prop="name"><el-input v-model="form.name" maxlength="100" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" style="width:100%" /></el-form-item>
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
import { categoryApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const form = reactive({ id: null, pid: 0, name: '', sortOrder: 0 })
const rules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

const topCategories = computed(() => list.value.filter(c => !c.pid || c.pid === 0))

async function loadData() {
  loading.value = true
  try { const res = await categoryApi.tree(); list.value = res.data }
  finally { loading.value = false }
}

function openDialog(row) {
  if (row) {
    isEdit.value = true
    Object.assign(form, { id: row.id, pid: row.pid, name: row.name, sortOrder: row.sortOrder })
  } else {
    isEdit.value = false
    Object.assign(form, { id: null, pid: 0, name: '', sortOrder: 0 })
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (isEdit.value) {
    await categoryApi.update(form.id, form)
    ElMessage.success('更新成功')
  } else {
    await categoryApi.create(form)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除后不可恢复，是否继续？', '警告', { type: 'warning' })
  await categoryApi.delete(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(() => loadData())
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
