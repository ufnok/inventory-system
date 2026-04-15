<template>
  <div class="page-container">
    <el-card>
      <template #header><span>统计报表</span></template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="入库汇总" name="in">
          <div class="search-bar">
            <el-date-picker v-model="inDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:240px" @change="loadInReport" />
            <el-button style="margin-left:10px" @click="loadInReport"><el-icon><Search /></el-icon>查询</el-button>
          </div>
          <el-table :data="inData" border v-loading="inLoading" show-summary>
            <el-table-column prop="name" label="供应商" />
            <el-table-column prop="orderCount" label="单据数量" width="120" />
            <el-table-column prop="totalQuantity" label="总数量" width="120" />
            <el-table-column prop="totalAmount" label="总金额" width="140">
              <template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="出库汇总" name="out">
          <div class="search-bar">
            <el-date-picker v-model="outDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:240px" @change="loadOutReport" />
            <el-button style="margin-left:10px" @click="loadOutReport"><el-icon><Search /></el-icon>查询</el-button>
          </div>
          <el-table :data="outData" border v-loading="outLoading" show-summary>
            <el-table-column prop="name" label="客户" />
            <el-table-column prop="orderCount" label="单据数量" width="120" />
            <el-table-column prop="totalQuantity" label="总数量" width="120" />
            <el-table-column prop="totalAmount" label="总金额" width="140">
              <template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="收支利润" name="profit">
          <div class="search-bar">
            <el-date-picker v-model="profitDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:240px" @change="loadProfitReport" />
            <el-button style="margin-left:10px" @click="loadProfitReport"><el-icon><Search /></el-icon>查询</el-button>
          </div>
          <el-card v-if="profitData.salesAmount !== undefined" class="profit-summary">
            <el-row :gutter="20">
              <el-col :span="6"><div class="profit-item"><p class="label">销售收入</p><p class="value">¥{{ profitData.salesAmount?.toFixed(2) }}</p></div></el-col>
              <el-col :span="6"><div class="profit-item"><p class="label">销售成本</p><p class="value">¥{{ profitData.costAmount?.toFixed(2) }}</p></div></el-col>
              <el-col :span="6"><div class="profit-item"><p class="label">毛利润</p><p class="value" style="color:#67C23A">¥{{ profitData.profit?.toFixed(2) }}</p></div></el-col>
              <el-col :span="6"><div class="profit-item"><p class="label">利润率</p><p class="value" style="color:#E6A23C">{{ profitData.profitRate }}%</p></div></el-col>
            </el-row>
          </el-card>
        </el-tab-pane>
        <el-tab-pane label="库存台账" name="inventory">
          <div class="search-bar">
            <el-select v-model="invCategoryId" placeholder="商品分类" clearable style="width:150px" @change="loadInventoryReport">
              <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button style="margin-left:10px" @click="loadInventoryReport"><el-icon><Search /></el-icon>查询</el-button>
          </div>
          <el-table :data="inventoryData" border v-loading="invLoading" show-summary>
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="spec" label="规格" width="100" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="quantity" label="当前库存" width="100" />
            <el-table-column label="成本金额" width="120"><template #default="{ row }">¥{{ row.costAmount?.toFixed(2) }}</template></el-table-column>
            <el-table-column label="销售金额" width="120"><template #default="{ row }">¥{{ row.saleAmount?.toFixed(2) }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="预警报表" name="warning">
          <div class="search-bar">
            <el-select v-model="warningType" placeholder="预警类型" clearable style="width:150px" @change="loadWarningReport">
              <el-option label="库存不足" value="low" /><el-option label="库存过高" value="high" />
            </el-select>
            <el-button style="margin-left:10px" @click="loadWarningReport"><el-icon><Search /></el-icon>查询</el-button>
          </div>
          <el-table :data="warningData" border v-loading="warnLoading">
            <el-table-column prop="productName" label="商品名称" />
            <el-table-column prop="quantity" label="当前库存" width="100" />
            <el-table-column label="预警信息" width="180">
              <template #default="{ row }">
                <span v-if="row.warningMin && row.quantity <= row.warningMin" style="color:#F56C6C">库存不足 ({{ row.quantity }} &lt; {{ row.warningMin }})</span>
                <span v-else-if="row.warningMax && row.quantity >= row.warningMax" style="color:#E6A23C">库存过高 ({{ row.quantity }} &gt; {{ row.warningMax }})</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { reportApi, categoryApi } from '@/api'

const activeTab = ref('in')
const inData = ref([]), outData = ref([]), profitData = ref({}), inventoryData = ref([]), warningData = ref([])
const inLoading = ref(false), outLoading = ref(false), invLoading = ref(false), warnLoading = ref(false)
const categoryList = ref([])
const inDateRange = ref(null), outDateRange = ref(null), profitDateRange = ref(null)
const invCategoryId = ref(''), warningType = ref('')

async function loadInReport() {
  if (!inDateRange.value?.length) return
  inLoading.value = true
  try { const res = await reportApi.stockIn({ startDate: inDateRange.value[0], endDate: inDateRange.value[1] }); inData.value = res.data }
  finally { inLoading.value = false }
}

async function loadOutReport() {
  if (!outDateRange.value?.length) return
  outLoading.value = true
  try { const res = await reportApi.stockOut({ startDate: outDateRange.value[0], endDate: outDateRange.value[1] }); outData.value = res.data }
  finally { outLoading.value = false }
}

async function loadProfitReport() {
  if (!profitDateRange.value?.length) return
  const res = await reportApi.profit({ startDate: profitDateRange.value[0], endDate: profitDateRange.value[1] }); profitData.value = res.data
}

async function loadInventoryReport() {
  invLoading.value = true
  try { const res = await reportApi.inventory({ categoryId: invCategoryId.value }); inventoryData.value = res.data }
  finally { invLoading.value = false }
}

async function loadWarningReport() {
  warnLoading.value = true
  try { const res = await reportApi.warning({ type: warningType.value }); warningData.value = res.data }
  finally { warnLoading.value = false }
}

async function loadCategories() { const res = await categoryApi.tree(); categoryList.value = res.data }

onMounted(() => { loadCategories() })
</script>

<style scoped>
.search-bar { margin-bottom: 15px; display: flex; align-items: center; }
.profit-summary { margin-top: 10px; }
.profit-item { text-align: center; padding: 15px 0; }
.profit-item .label { font-size: 14px; color: #909399; margin-bottom: 8px; }
.profit-item .value { font-size: 24px; font-weight: bold; }
</style>
