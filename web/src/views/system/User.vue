<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header"><span>用户管理</span><el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon>新增用户</el-button></div>
      </template>
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="用户名/姓名" style="width:200px" clearable @clear="loadData" />
        <el-select v-model="searchRoleId" placeholder="角色" clearable style="width:150px;margin-left:10px" @change="loadData">
          <el-option v-for="r in roleList" :key="r.id" :label="r.roleName" :value="r.id" />
        </el-select>
        <el-button style="margin-left:10px" @click="loadData"><el-icon><Search /></el-icon>搜索</el-button>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="用户ID" width="120" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="realName" label="姓名" width="120" />
        <el-table-column prop="roleName" label="角色" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="150" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)"><el-icon><Edit /></el-icon>编辑</el-button>
            <el-button type="warning" link size="small" @click="resetPwd(row)"><el-icon><Key /></el-icon>重置密码</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)"><el-icon><Delete /></el-icon>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:15px" v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="loadData" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="isEdit" maxlength="20" /></el-form-item>
        <el-form-item label="姓名" prop="realName"><el-input v-model="form.realName" maxlength="20" /></el-form-item>
        <el-form-item label="角色" prop="roleId"><el-select v-model="form.roleId" placeholder="请选择角色" style="width:100%"><el-option v-for="r in roleList" :key="r.id" :label="r.roleName" :value="r.id" /></el-select></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" maxlength="20" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" maxlength="100" /></el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password"><el-input v-model="form.password" type="password" show-password maxlength="20" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" /></el-form-item>
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
import { userApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([]), loading = ref(false), dialogVisible = ref(false), isEdit = ref(false), formRef = ref()
const roleList = ref([])
const keyword = ref(''), searchRoleId = ref('')
const page = ref(1), pageSize = ref(20), total = ref(0)

const form = reactive({ id: null, username: '', realName: '', roleId: null, phone: '', email: '', password: '', status: 1 })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function loadData() {
  loading.value = true
  try { const res = await userApi.list({ keyword: keyword.value, roleId: searchRoleId.value, page: page.value, pageSize: pageSize.value }); list.value = res.data.list; total.value = res.data.total }
  finally { loading.value = false }
}

async function loadRoles() { const res = await userApi.roles(); roleList.value = res.data }

function openDialog(row) {
  if (row) { isEdit.value = true; Object.assign(form, { id: row.id, username: row.username, realName: row.realName, roleId: row.roleId, phone: row.phone, email: row.email, password: '', status: row.status }) }
  else { isEdit.value = false; Object.assign(form, { id: null, username: '', realName: '', roleId: null, phone: '', email: '', password: '', status: 1 }) }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (isEdit.value) { await userApi.update(form.id, form); ElMessage.success('更新成功') }
  else { await userApi.create(form); ElMessage.success('添加成功') }
  dialogVisible.value = false; loadData()
}

async function resetPwd(row) {
  await ElMessageBox.confirm('确定重置该用户密码为 admin123？', '提示', { type: 'info' })
  await userApi.resetPassword(row.id, { password: 'admin123' })
  ElMessage.success('密码已重置为 admin123')
}

async function handleDelete(row) {
  await ElMessageBox.confirm('删除后不可恢复，是否继续？', '警告', { type: 'warning' })
  await userApi.delete(row.id)
  ElMessage.success('删除成功'); loadData()
}

onMounted(() => { loadData(); loadRoles() })
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { margin-bottom: 15px; display: flex; flex-wrap: wrap; align-items: center; }
</style>
