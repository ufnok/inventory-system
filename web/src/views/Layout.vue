<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside">
      <div class="logo">进销存系统</div>
      <el-menu :default-active="$route.path" router class="aside-menu" background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF">
        <el-menu-item index="/dashboard"><el-icon><Odometer /></el-icon>首页</el-menu-item>
        <el-sub-menu index="/basic">
          <template #title><el-icon><Goods /></el-icon>基础资料</template>
          <el-menu-item index="/basic/product">商品管理</el-menu-item>
          <el-menu-item index="/basic/category">商品分类</el-menu-item>
          <el-menu-item index="/basic/supplier">供应商管理</el-menu-item>
          <el-menu-item index="/basic/customer">客户管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/warehouse">
          <template #title><el-icon><House /></el-icon>仓储管理</template>
          <el-menu-item index="/warehouse/stockIn">采购入库</el-menu-item>
          <el-menu-item index="/warehouse/stockOut">销售出库</el-menu-item>
          <el-menu-item index="/warehouse/inventory">库存管理</el-menu-item>
          <el-menu-item index="/warehouse/check">库存盘点</el-menu-item>
          <el-menu-item index="/warehouse/inventoryLog">库存流水</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/document">
          <template #title><el-icon><Document /></el-icon>单据管理</template>
          <el-menu-item index="/document/stockInList">入库单据</el-menu-item>
          <el-menu-item index="/document/stockOutList">出库单据</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/report">
          <template #title><el-icon><DataAnalysis /></el-icon>报表统计</template>
          <el-menu-item index="/report/dashboard">统计报表</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="/system">
          <template #title><el-icon><Setting /></el-icon>系统管理</template>
          <el-menu-item index="/system/user">用户管理</el-menu-item>
          <el-menu-item index="/system/log">操作日志</el-menu-item>
          <el-menu-item index="/system/backup">数据备份</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">{{ $route.meta.title || '' }}</div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info"><el-icon><User /></el-icon>{{ userStore.userInfo.realName }}<el-icon><ArrowDown /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePwd">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main"><router-view /></el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="pwdDialogVisible" title="修改密码" width="400px">
    <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
      <el-form-item label="旧密码" prop="oldPassword">
        <el-input v-model="pwdForm.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="pwdForm.newPassword" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="pwdDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleChangePwd">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { authApi } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const pwdDialogVisible = ref(false)
const pwdFormRef = ref()
const pwdForm = reactive({ oldPassword: '', newPassword: '' })
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }]
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (cmd === 'changePwd') {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdDialogVisible.value = true
  }
}

async function handleChangePwd() {
  const valid = await pwdFormRef.value.validate().catch(() => false)
  if (!valid) return
  await authApi.changePassword(pwdForm)
  ElMessage.success('密码修改成功')
  pwdDialogVisible.value = false
}
</script>

<style scoped>
.layout-container { height: 100vh; }
.aside { background: #304156; }
.logo { height: 60px; line-height: 60px; text-align: center; color: #fff; font-size: 18px; font-weight: bold; background: #263445; }
.aside-menu { border-right: none; }
.header { background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #e6e6e6; }
.header-left { font-size: 18px; font-weight: 500; }
.header-right { display: flex; align-items: center; }
.user-info { cursor: pointer; display: flex; align-items: center; gap: 5px; color: #606266; }
.user-info:hover { color: #409EFF; }
.main { background: #f5f7fa; padding: 20px; }
</style>
